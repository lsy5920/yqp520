<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PageBanner from '@/components/common/PageBanner.vue'
import { useRevealMotion } from '@/composables/useRevealMotion'
import { useRosterAuth } from '@/composables/useRosterAuth'
import { rosterContent, rosterFreeTimeOptions, rosterGenderOptions, rosterHallOptions, rosterPositionOptions, rosterStatusLabelMap } from '@/data/rosterContent'
import {
  deleteAdminRosterEntry,
  getNextRosterEntryNo,
  listAdminRosterEntries,
  listRosterReviewLogs,
  saveAdminRosterEntry,
} from '@/services/roster'
import type {
  AdminRosterEntryRecord,
  AdminRosterEntrySavePayload,
  RosterEntryStatus,
  RosterGender,
  RosterHallKey,
  RosterReviewLogRecord,
} from '@/types/roster'
import {
  buildAdminSaveSummary,
  extractRosterEntryNo,
  formatRosterDateTime,
  formatRosterEntryNo,
  getRosterDaohaoError,
  getRosterFreeTimeLabels,
  getRosterGenderLabel,
  getRosterHallLabel,
  getRosterPositionLabel,
  normalizeRosterDaohao,
  normalizeRosterLongText,
  normalizeRosterShortText,
  validateAdminRosterEntryPayload,
} from '@/utils/roster'

/**
 * 后台编辑表单类型
 * 用途：在抽屉里统一维护一份可编辑状态
 */
interface AdminEditingFormState {
  /** 用途：状态 */
  status: RosterEntryStatus
  /** 用途：道号 */
  daohao: string
  /** 用途：俗家姓名 */
  secularName: string
  /** 用途：性别 */
  gender: RosterGender | ''
  /** 用途：现居城市 */
  currentCity: string
  /** 用途：生年 */
  birthYear: string
  /** 用途：俗务 */
  profession: string
  /** 用途：引荐人 */
  referrerName: string
  /** 用途：堂口键名 */
  hallKey: RosterHallKey
  /** 用途：其他堂口说明 */
  hallOtherText: string
  /** 用途：入派本心 */
  entryIntent: string
  /** 用途：微信号 */
  wechatId: string
  /** 用途：小红书或抖音 */
  socialXiaohongshuDouyin: string
  /** 用途：QQ */
  socialQq: string
  /** 用途：其他社交号 */
  socialOther: string
  /** 用途：是否公开传讯号 */
  allowContactPublic: boolean
  /** 用途：门中分工 */
  positionKey: AdminRosterEntryRecord['positionKey']
  /** 用途：身怀所长 */
  strengths: string
  /** 用途：所好雅事 */
  hobbies: string
  /** 用途：闲暇时段 */
  freeTimeSlots: AdminRosterEntryRecord['freeTimeSlots']
  /** 用途：旧版效力意愿，当前不再单独编辑，但保存时需要原样带回 */
  contributionLevel: AdminRosterEntryRecord['contributionLevel']
  /** 用途：弟子签押 */
  oathSignedName: string
  /** 用途：立誓日期 */
  oathSignedDate: string
  /** 用途：公开批语 */
  reviewComment: string
}

/**
 * 动作提示语气类型
 * 用途：统一控制抽屉内反馈条的颜色状态
 */
type ActionFeedbackTone = 'info' | 'success' | 'error'

// 这里保存页面根节点，供审核台静态区块使用统一显现动效。
const pageRef = ref<HTMLElement | null>(null)

// 这里启用页面显现动效，让审核台整体更有层次感。
useRevealMotion({
  rootRef: pageRef,
})

// 这里拿到路由实例，退出或失去权限时要跳回登录页。
const router = useRouter()

// 这里接入名册鉴权状态，审核台靠它读取执事资料和退出登录。
const {
  adminProfile,
  initializeRosterAuth,
  isAdmin,
  logoutRosterAdmin,
} = useRosterAuth()

// 这里保存审核台所有记录。
const entryList = ref<AdminRosterEntryRecord[]>([])

// 这里保存当前搜索关键字。
const keyword = ref<string>('')

// 这里保存堂口筛选值。
const selectedHallKey = ref<RosterHallKey | ''>('')

// 这里记录列表是否正在加载。
const isLoading = ref<boolean>(false)

// 这里记录当前动作提示，用来给执事明确反馈。
const actionMessage = ref<string>('待审核、已通过、暂缓与不予收录四栏都会显示在下方。')

// 这里记录当前提示语气，方便抽屉内把成功和报错区分开来。
const actionTone = ref<ActionFeedbackTone>('info')

// 这里记录当前错误提示。
const errorMessage = ref<string>('')

// 这里记录当前正在查看的记录 id。
const activeEntryId = ref<string>('')

// 这里保存当前记录的审核日志。
const reviewLogs = ref<RosterReviewLogRecord[]>([])

// 这里记录日志加载状态，方便抽屉里展示提示。
const isLoadingLogs = ref<boolean>(false)

// 这里记录当前是否处于编辑模式。
const isEditing = ref<boolean>(false)

// 这里记录后台保存状态，避免重复点击。
const isSaving = ref<boolean>(false)

// 这里记录后台删除状态，避免重复删档。
const isDeleting = ref<boolean>(false)

// 这里记录是否正在获取建议文牒号。
const isLoadingNextEntryNo = ref<boolean>(false)

// 这里记录后台为抽屉和编辑态压入的历史层级，让浏览器返回键优先收起面板而不是直接离开审核台。
const adminHistoryDepth = ref<number>(0)

// 这里标记当前是否是代码主动触发历史回退，避免 popstate 时重复执行收起逻辑。
const isHandlingProgrammaticHistory = ref<boolean>(false)

// 这里保存编辑表单。
const editForm = ref<AdminEditingFormState>(createEmptyEditingForm())

// 这里单独保存文牒号输入框文本，方便支持手输数字和自动预填。
const editEntryNoText = ref<string>('')

// 这里保存搜索防抖定时器，避免输入时疯狂请求。
let searchTimer: number | null = null

/**
 * 当前抽屉记录
 * 用途：从列表中实时找到当前被查看的那一条记录
 */
const activeEntry = computed<AdminRosterEntryRecord | null>(() => (
  entryList.value.find((item) => item.id === activeEntryId.value) ?? null
))

/**
 * 当前是否选中了“其他堂口”
 * 用途：编辑时决定是否显示“其他堂口说明”
 */
const isOtherHallSelected = computed<boolean>(() => editForm.value.hallKey === 'other')

/**
 * 后台保存摘要
 * 用途：编辑模式下给执事一眼看清保存结果
 */
const saveSummary = computed<string>(() => {
  const parsedEntryNo = editForm.value.status === 'approved'
    ? extractRosterEntryNo(editEntryNoText.value)
    : null

  return buildAdminSaveSummary({
    entryId: activeEntry.value?.id || '',
    status: editForm.value.status,
    entryNo: parsedEntryNo,
    daohao: normalizeRosterDaohao(editForm.value.daohao),
    secularName: normalizeRosterShortText(editForm.value.secularName),
    gender: editForm.value.gender,
    currentCity: normalizeRosterShortText(editForm.value.currentCity),
    birthYear: normalizeRosterShortText(editForm.value.birthYear),
    profession: normalizeRosterShortText(editForm.value.profession),
    referrerName: normalizeRosterShortText(editForm.value.referrerName),
    hallKey: editForm.value.hallKey,
    hallOtherText: normalizeRosterShortText(editForm.value.hallOtherText),
    entryIntent: normalizeRosterLongText(editForm.value.entryIntent),
    wechatId: normalizeRosterShortText(editForm.value.wechatId),
    socialXiaohongshuDouyin: normalizeRosterShortText(editForm.value.socialXiaohongshuDouyin),
    socialQq: normalizeRosterShortText(editForm.value.socialQq),
    socialOther: normalizeRosterShortText(editForm.value.socialOther),
    allowContactPublic: editForm.value.allowContactPublic,
    positionKey: editForm.value.positionKey,
    strengths: normalizeRosterLongText(editForm.value.strengths),
    hobbies: normalizeRosterLongText(editForm.value.hobbies),
    freeTimeSlots: [...new Set(editForm.value.freeTimeSlots)],
    contributionLevel: editForm.value.contributionLevel,
    oathSignedName: normalizeRosterShortText(editForm.value.oathSignedName),
    oathSignedDate: normalizeRosterShortText(editForm.value.oathSignedDate),
    reviewComment: normalizeRosterLongText(editForm.value.reviewComment),
  })
})

/**
 * 按状态分组后的记录
 * 用途：审核台固定按四栏展示
 */
const groupedEntryMap = computed<Record<RosterEntryStatus, AdminRosterEntryRecord[]>>(() => ({
  pending: entryList.value.filter((item) => item.status === 'pending'),
  approved: entryList.value.filter((item) => item.status === 'approved'),
  deferred: entryList.value.filter((item) => item.status === 'deferred'),
  rejected: entryList.value.filter((item) => item.status === 'rejected'),
}))

/**
 * 审核栏配置
 * 用途：模板里统一循环四个状态栏
 */
const columnList = computed<Array<{ status: RosterEntryStatus; title: string }>>(() => ([
  { status: 'pending', title: rosterStatusLabelMap.pending },
  { status: 'approved', title: rosterStatusLabelMap.approved },
  { status: 'deferred', title: rosterStatusLabelMap.deferred },
  { status: 'rejected', title: rosterStatusLabelMap.rejected },
]))

/**
 * 创建空编辑表单
 * 用途：抽屉关闭或记录切换时重置编辑态
 * 入参：无
 * 返回值：返回空表单
 */
function createEmptyEditingForm(): AdminEditingFormState {
  return {
    status: 'pending',
    daohao: '',
    secularName: '',
    gender: '',
    currentCity: '',
    birthYear: '',
    profession: '',
    referrerName: '自行登门',
    hallKey: 'other',
    hallOtherText: '',
    entryIntent: '',
    wechatId: '',
    socialXiaohongshuDouyin: '',
    socialQq: '',
    socialOther: '',
    allowContactPublic: false,
    positionKey: 'tongmen',
    strengths: '',
    hobbies: '',
    freeTimeSlots: [],
    contributionLevel: 'focus_on_learning',
    oathSignedName: '',
    oathSignedDate: '',
    reviewComment: '',
  }
}

/**
 * 压入后台历史层
 * 用途：让浏览器返回键先退出编辑态或收起抽屉，而不是直接离开审核台
 * 入参：无
 * 返回值：无返回值
 */
function pushAdminHistoryLayer(): void {
  if (typeof window === 'undefined' || typeof window.history === 'undefined') {
    return
  }

  window.history.pushState({ rosterAdminLayer: true }, '', window.location.href)
  adminHistoryDepth.value += 1
}

/**
 * 收回一层编辑历史
 * 用途：保存成功后界面已经退出编辑态，需要把多余的编辑历史层同步收回，避免返回层级错位
 * 入参：无
 * 返回值：无返回值
 */
function consumeEditingHistoryLayer(): void {
  if (adminHistoryDepth.value <= 0 || typeof window === 'undefined') {
    return
  }

  adminHistoryDepth.value -= 1
  isHandlingProgrammaticHistory.value = true
  window.history.back()
}

/**
 * 设置动作提示
 * 用途：把页面横幅提示和抽屉内提示统一由这里更新，避免同一类反馈散落在各处
 * 入参：message 为提示文本，tone 为提示语气
 * 返回值：无返回值
 */
function setActionMessage(message: string, tone: ActionFeedbackTone = 'info'): void {
  actionMessage.value = message
  actionTone.value = tone
}

/**
 * 格式化日志动作名称
 * 用途：让后台日志展示更容易读懂
 * 入参：actionType 为日志动作类型
 * 返回值：返回中文动作名
 */
function formatLogActionType(actionType: string): string {
  if (actionType === 'delete') {
    return '删除档案'
  }

  if (actionType === 'status_change') {
    return '状态变更'
  }

  return '档案保存'
}

/**
 * 同步编辑表单
 * 用途：切换不同记录时，把抽屉里的表单一起切过去
 * 入参：entry 为当前记录
 * 返回值：无返回值
 */
function syncEditForm(entry: AdminRosterEntryRecord | null): void {
  if (!entry) {
    editForm.value = createEmptyEditingForm()
    editEntryNoText.value = ''
    return
  }

  editForm.value = {
    status: entry.status,
    daohao: entry.daohao,
    secularName: entry.secularName,
    gender: entry.gender,
    currentCity: entry.currentCity,
    birthYear: entry.birthYear,
    profession: entry.profession,
    referrerName: entry.referrerName || '自行登门',
    hallKey: entry.hallKey,
    hallOtherText: entry.hallOtherText,
    entryIntent: entry.entryIntent,
    wechatId: entry.wechatId,
    socialXiaohongshuDouyin: entry.socialXiaohongshuDouyin,
    socialQq: entry.socialQq,
    socialOther: entry.socialOther,
    allowContactPublic: entry.allowContactPublic,
    positionKey: entry.positionKey,
    strengths: entry.strengths,
    hobbies: entry.hobbies,
    freeTimeSlots: [...entry.freeTimeSlots],
    contributionLevel: entry.contributionLevel,
    oathSignedName: entry.oathSignedName,
    oathSignedDate: entry.oathSignedDate,
    reviewComment: entry.reviewComment,
  }
  editEntryNoText.value = entry.entryNo ? String(entry.entryNo) : ''
}

/**
 * 拉取审核台列表
 * 用途：首屏加载和搜索筛选变更时刷新全部记录
 * 入参：无
 * 返回值：无返回值
 */
async function loadEntryList(): Promise<void> {
  isLoading.value = true
  errorMessage.value = ''

  try {
    entryList.value = await listAdminRosterEntries({
      keyword: keyword.value,
      hallKey: selectedHallKey.value,
    })

    if (activeEntryId.value) {
      const stillExists = entryList.value.some((item) => item.id === activeEntryId.value)

      if (!stillExists) {
        activeEntryId.value = ''
        isEditing.value = false
      }
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '审核台记录加载失败，请稍后再试'
    entryList.value = []
  } finally {
    isLoading.value = false
  }
}

/**
 * 拉取审核日志
 * 用途：抽屉打开后查看该记录的审批历史
 * 入参：entryId 为记录 id
 * 返回值：无返回值
 */
async function loadReviewLogs(entryId: string): Promise<void> {
  if (!entryId) {
    reviewLogs.value = []
    return
  }

  isLoadingLogs.value = true

  try {
    reviewLogs.value = await listRosterReviewLogs(entryId)
  } catch (error) {
    console.warn('读取审核日志失败：', error)
    reviewLogs.value = []
  } finally {
    isLoadingLogs.value = false
  }
}

/**
 * 打开详情抽屉
 * 用途：执事点击某条记录时查看完整原始字段
 * 入参：entry 为当前记录
 * 返回值：无返回值
 */
function openEntryDrawer(entry: AdminRosterEntryRecord): void {
  const hadActiveEntry = Boolean(activeEntryId.value)
  activeEntryId.value = entry.id
  isEditing.value = false
  syncEditForm(entry)
  setActionMessage(`已载入“${entry.daohao || '未命名档案'}”当前登记内容，切到编辑模式时会自动带出之前所填信息。`)
  void loadReviewLogs(entry.id)

  if (!hadActiveEntry) {
    pushAdminHistoryLayer()
  }
}

/**
 * 关闭详情抽屉
 * 用途：让执事退出当前记录详情
 * 入参：无
 * 返回值：无返回值
 */
function closeEntryDrawer(consumeHistory = true): void {
  const wasEditing = isEditing.value
  activeEntryId.value = ''
  isEditing.value = false
  reviewLogs.value = []
  syncEditForm(null)

  if (consumeHistory && adminHistoryDepth.value > 0 && typeof window !== 'undefined') {
    const stepCount = Math.min(wasEditing ? 2 : 1, adminHistoryDepth.value)
    adminHistoryDepth.value -= stepCount
    isHandlingProgrammaticHistory.value = true
    window.history.go(-stepCount)
  }
}

/**
 * 进入编辑模式
 * 用途：执事在抽屉里切到可编辑状态
 * 入参：无
 * 返回值：无返回值
 */
async function enterEditMode(): Promise<void> {
  if (!activeEntry.value) {
    return
  }

  isEditing.value = true
  syncEditForm(activeEntry.value)
  setActionMessage(`已自动带入“${activeEntry.value.daohao || '未命名档案'}”的原始内容，可直接修改后保存。`)
  pushAdminHistoryLayer()

  if (editForm.value.status === 'approved' && !editEntryNoText.value) {
    await fillNextEntryNo()
  }
}

/**
 * 退出编辑模式
 * 用途：取消当前未保存的编辑
 * 入参：无
 * 返回值：无返回值
 */
function cancelEditing(consumeHistory = true): void {
  isEditing.value = false
  syncEditForm(activeEntry.value)
  setActionMessage('已取消本次编辑，并恢复成当前档案最近一次保存的内容。')

  if (consumeHistory && adminHistoryDepth.value > 0 && typeof window !== 'undefined') {
    adminHistoryDepth.value -= 1
    isHandlingProgrammaticHistory.value = true
    window.history.back()
  }
}

/**
 * 获取默认文牒号
 * 用途：进入准予状态时自动带出建议号
 * 入参：无
 * 返回值：无返回值
 */
async function fillNextEntryNo(): Promise<void> {
  if (isLoadingNextEntryNo.value || editForm.value.status !== 'approved' || editEntryNoText.value) {
    return
  }

  isLoadingNextEntryNo.value = true

  try {
    const nextEntryNo = await getNextRosterEntryNo()
    editEntryNoText.value = String(nextEntryNo)
  } catch (error) {
    setActionMessage(error instanceof Error ? error.message : '默认文牒号获取失败，请稍后再试', 'error')
  } finally {
    isLoadingNextEntryNo.value = false
  }
}

/**
 * 切换空闲时段
 * 用途：后台编辑时统一处理多选时段
 * 入参：slot 为时段键名
 * 返回值：无返回值
 */
function toggleFreeTimeSlot(slot: AdminEditingFormState['freeTimeSlots'][number]): void {
  const currentList = new Set(editForm.value.freeTimeSlots)

  if (currentList.has(slot)) {
    currentList.delete(slot)
  } else {
    currentList.add(slot)
  }

  editForm.value.freeTimeSlots = Array.from(currentList)
}

/**
 * 组装后台保存载荷
 * 用途：提交前把编辑表单统一清洗成服务层需要的结构
 * 入参：无
 * 返回值：返回保存载荷
 */
function buildSavePayload(): AdminRosterEntrySavePayload | null {
  if (!activeEntry.value) {
    return null
  }

  const payload: AdminRosterEntrySavePayload = {
    entryId: activeEntry.value.id,
    status: editForm.value.status,
    entryNo: editForm.value.status === 'approved' ? extractRosterEntryNo(editEntryNoText.value) : null,
    daohao: normalizeRosterDaohao(editForm.value.daohao),
    secularName: normalizeRosterShortText(editForm.value.secularName),
    gender: editForm.value.gender,
    currentCity: normalizeRosterShortText(editForm.value.currentCity),
    birthYear: normalizeRosterShortText(editForm.value.birthYear),
    profession: normalizeRosterShortText(editForm.value.profession),
    referrerName: normalizeRosterShortText(editForm.value.referrerName),
    hallKey: editForm.value.hallKey,
    hallOtherText: normalizeRosterShortText(editForm.value.hallOtherText),
    entryIntent: normalizeRosterLongText(editForm.value.entryIntent),
    wechatId: normalizeRosterShortText(editForm.value.wechatId),
    socialXiaohongshuDouyin: normalizeRosterShortText(editForm.value.socialXiaohongshuDouyin),
    socialQq: normalizeRosterShortText(editForm.value.socialQq),
    socialOther: normalizeRosterShortText(editForm.value.socialOther),
    allowContactPublic: Boolean(editForm.value.allowContactPublic),
    positionKey: editForm.value.positionKey,
    strengths: normalizeRosterLongText(editForm.value.strengths),
    hobbies: normalizeRosterLongText(editForm.value.hobbies),
    freeTimeSlots: [...new Set(editForm.value.freeTimeSlots)],
    contributionLevel: editForm.value.contributionLevel,
    oathSignedName: normalizeRosterShortText(editForm.value.oathSignedName),
    oathSignedDate: normalizeRosterShortText(editForm.value.oathSignedDate),
    reviewComment: normalizeRosterLongText(editForm.value.reviewComment),
  }

  return payload
}

/**
 * 退出审核台
 * 用途：执事退出按钮统一走这里
 * 入参：无
 * 返回值：无返回值
 */
async function handleLogout(): Promise<void> {
  try {
    await logoutRosterAdmin()
    await router.replace('/roster/admin/login')
  } catch (error) {
    setActionMessage(error instanceof Error ? error.message : '退出失败，请稍后再试', 'error')
  }
}

/**
 * 保存后台档案
 * 用途：把编辑后的全部字段、状态和文牒号一次提交
 * 入参：无
 * 返回值：无返回值
 */
async function handleSaveEntry(): Promise<void> {
  const payload = buildSavePayload()

  if (!payload) {
    setActionMessage('请先选择一条记录再保存', 'error')
    return
  }

  const daohaoError = getRosterDaohaoError(payload.daohao)

  if (daohaoError) {
    setActionMessage(daohaoError, 'error')
    return
  }

  const validationMessage = validateAdminRosterEntryPayload(payload)

  if (validationMessage) {
    setActionMessage(validationMessage, 'error')
    return
  }

  isSaving.value = true
  setActionMessage(saveSummary.value)

  try {
    await saveAdminRosterEntry(payload)
    isEditing.value = false
    consumeEditingHistoryLayer()
    await loadEntryList()

    if (activeEntryId.value) {
      syncEditForm(entryList.value.find((item) => item.id === activeEntryId.value) ?? null)
      await loadReviewLogs(activeEntryId.value)
    }

    setActionMessage('档案已保存，抽屉内容、列表与公开页会同步刷新。', 'success')
  } catch (error) {
    setActionMessage(error instanceof Error ? error.message : '档案保存失败，请稍后再试', 'error')
  } finally {
    isSaving.value = false
  }
}

/**
 * 删除后台档案
 * 用途：执事确认后彻底删除一条记录
 * 入参：无
 * 返回值：无返回值
 */
async function handleDeleteEntry(): Promise<void> {
  if (!activeEntry.value) {
    setActionMessage('请先选择一条记录再删除', 'error')
    return
  }

  if (typeof window !== 'undefined') {
    const confirmed = window.confirm(`确定要彻底删除“${activeEntry.value.daohao}”这条档案吗？删除后无法恢复。`)

    if (!confirmed) {
      return
    }
  }

  isDeleting.value = true
  setActionMessage('正在删除档案，请稍候...')

  try {
    await deleteAdminRosterEntry(activeEntry.value.id)
    setActionMessage('档案已彻底删除，公开页与后台都不会再显示这条记录。', 'success')
    closeEntryDrawer()
    await loadEntryList()
  } catch (error) {
    setActionMessage(error instanceof Error ? error.message : '删除档案失败，请稍后再试', 'error')
  } finally {
    isDeleting.value = false
  }
}

/**
 * 处理顶部编辑按钮
 * 用途：统一控制“编辑档案 / 取消编辑”这一组按钮行为
 * 入参：无
 * 返回值：无返回值
 */
function handleEditToggle(): void {
  if (isEditing.value) {
    cancelEditing()
    return
  }

  void enterEditMode()
}

/**
 * 处理抽屉返回上一步
 * 用途：让顶部按钮、遮罩点击和浏览器返回都尽量保持一致，先退编辑，再收起详情
 * 入参：无
 * 返回值：无返回值
 */
function handleDrawerBackStep(): void {
  if (isEditing.value) {
    cancelEditing()
    return
  }

  setActionMessage('已收起当前档案，仍停留在执事审核台列表。')
  closeEntryDrawer()
}

/**
 * 处理抽屉遮罩点击
 * 用途：点到抽屉外层时也按“返回上一步”处理，避免一键丢掉当前上下文
 * 入参：无
 * 返回值：无返回值
 */
function handleDrawerBackdropClick(): void {
  handleDrawerBackStep()
}

/**
 * 处理浏览器返回事件
 * 用途：移动端或浏览器直接点返回时，优先退出编辑态或收起抽屉
 * 入参：无
 * 返回值：无返回值
 */
function handleAdminPopState(): void {
  if (isHandlingProgrammaticHistory.value) {
    isHandlingProgrammaticHistory.value = false
    return
  }

  if (isEditing.value) {
    adminHistoryDepth.value = Math.max(adminHistoryDepth.value - 1, 0)
    cancelEditing(false)
    return
  }

  if (activeEntry.value) {
    adminHistoryDepth.value = Math.max(adminHistoryDepth.value - 1, 0)
    setActionMessage('已通过浏览器返回键收起当前档案，仍停留在执事审核台。')
    closeEntryDrawer(false)
  }
}

watch(
  () => [keyword.value, selectedHallKey.value],
  () => {
    if (typeof window === 'undefined') {
      return
    }

    if (searchTimer) {
      window.clearTimeout(searchTimer)
    }

    // 这里做轻量防抖，避免执事输入搜索词时频繁打请求。
    searchTimer = window.setTimeout(() => {
      void loadEntryList()
    }, 220)
  },
)

watch(
  activeEntry,
  (entry) => {
    if (!entry) {
      syncEditForm(null)
      return
    }

    if (!isEditing.value) {
      syncEditForm(entry)
    }
  },
)

watch(
  () => editForm.value.status,
  async (status) => {
    if (!isEditing.value) {
      return
    }

    if (status !== 'approved') {
      editEntryNoText.value = ''
      return
    }

    if (!editEntryNoText.value) {
      await fillNextEntryNo()
    }
  },
)

onMounted(async () => {
  if (typeof window !== 'undefined') {
    window.addEventListener('popstate', handleAdminPopState)
  }

  await initializeRosterAuth()

  if (!isAdmin.value) {
    await router.replace('/roster/admin/login')
    return
  }

  await loadEntryList()
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('popstate', handleAdminPopState)
  }
})
</script>

<template>
  <div ref="pageRef" class="page roster-admin-page">
    <PageBanner
      eyebrow="云栖名册"
      title="执事审核台"
      :lead="`当前登录执事：${adminProfile?.displayName || '未识别'}。这里可按道号或文牒号检索档案、编辑全部字段、调整牒号并彻底删除记录。`"
      :note="actionMessage"
    />

    <section class="roster-admin-toolbar content-card" data-reveal>
      <div class="roster-admin-toolbar__head">
        <div>
          <p class="content-card__eyebrow">筛选与检索</p>
          <h2>按道号、文牒号和堂口快速翻卷</h2>
          <p>{{ errorMessage || '点击任意记录可打开详情抽屉，查看完整原始字段并切换编辑模式。' }}</p>
        </div>

        <button type="button" class="ink-button ink-button--ghost" @click="handleLogout">
          {{ rosterContent.admin.logoutButton }}
        </button>
      </div>

      <div class="roster-admin-toolbar__controls">
        <label class="roster-admin-toolbar__search">
          <span>关键词</span>
          <input
            v-model="keyword"
            class="roster-admin-toolbar__input"
            :placeholder="rosterContent.admin.searchPlaceholder"
            type="text"
          />
        </label>

        <div class="roster-admin-toolbar__hall-filter">
          <span>堂口</span>
          <div class="roster-admin-toolbar__chips">
            <button
              type="button"
              class="roster-admin-toolbar__chip"
              :class="{ 'roster-admin-toolbar__chip--active': selectedHallKey === '' }"
              @click="selectedHallKey = ''"
            >
              全部堂口
            </button>
            <button
              v-for="hall in rosterHallOptions"
              :key="hall.key"
              type="button"
              class="roster-admin-toolbar__chip"
              :class="{ 'roster-admin-toolbar__chip--active': selectedHallKey === hall.key }"
              @click="selectedHallKey = hall.key"
            >
              {{ hall.label }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <section v-if="isLoading" class="content-card roster-admin-state" data-reveal>
      <p class="content-card__eyebrow">加载中</p>
      <h3>审核台记录正在整理，请稍候</h3>
      <p>档案司正在翻阅名册文牒。</p>
    </section>

    <section v-else class="roster-admin-columns" data-reveal>
      <article
        v-for="column in columnList"
        :key="column.status"
        class="roster-admin-column"
      >
        <div class="roster-admin-column__head">
          <strong>{{ column.title }}</strong>
          <span>{{ groupedEntryMap[column.status].length }} 条</span>
        </div>

        <div class="roster-admin-column__list">
          <button
            v-for="entry in groupedEntryMap[column.status]"
            :key="entry.id"
            type="button"
            class="roster-admin-entry"
            :class="{ 'roster-admin-entry--active': activeEntryId === entry.id }"
            @click="openEntryDrawer(entry)"
          >
            <div class="roster-admin-entry__head">
              <strong>{{ entry.daohao }}</strong>
              <span>{{ entry.status === 'approved' ? formatRosterEntryNo(entry.entryNo) : entry.receiptCode }}</span>
            </div>
            <p>{{ entry.daohao }} · {{ rosterStatusLabelMap[entry.status] }}</p>
            <small>{{ formatRosterDateTime(entry.createdAt) }}</small>
          </button>

          <div v-if="groupedEntryMap[column.status].length === 0" class="roster-admin-column__empty">
            此栏暂无记录
          </div>
        </div>
      </article>
    </section>

    <Transition name="drawer-fade">
      <div v-if="activeEntry" class="roster-admin-drawer">
        <div class="roster-admin-drawer__backdrop" @click="handleDrawerBackdropClick"></div>

        <aside class="roster-admin-drawer__panel">
          <div class="roster-admin-drawer__head">
            <div>
              <p class="eyebrow">文牒详情</p>
              <h2>{{ activeEntry.daohao }}</h2>
              <p>{{ activeEntry.daohao }} · {{ activeEntry.status === 'approved' ? formatRosterEntryNo(activeEntry.entryNo) : activeEntry.receiptCode }} · {{ rosterStatusLabelMap[activeEntry.status] }}</p>
            </div>

            <div class="roster-admin-drawer__head-actions">
              <button
                type="button"
                class="roster-admin-drawer__close"
                @click="handleEditToggle"
              >
                {{ isEditing ? '取消编辑' : '编辑档案' }}
              </button>
              <button type="button" class="roster-admin-drawer__close" @click="handleDrawerBackStep">
                {{ isEditing ? '返回详情' : '返回列表' }}
              </button>
            </div>
          </div>

          <div class="roster-admin-drawer__body">
            <section class="roster-admin-feedback" :class="`roster-admin-feedback--${actionTone}`">
              <strong>{{ actionTone === 'error' ? '当前异常提示' : actionTone === 'success' ? '当前保存结果' : '当前操作提示' }}</strong>
              <p>{{ actionMessage }}</p>
            </section>

            <section class="roster-admin-detail-card">
              <p class="roster-admin-detail-card__eyebrow">弟子名籍</p>

              <div v-if="isEditing" class="roster-admin-form-grid">
                <label class="roster-admin-form-field">
                  <span>道号 *</span>
                  <input v-model="editForm.daohao" class="roster-admin-review-input" maxlength="12" placeholder="请输入道号" type="text" />
                </label>
                <label class="roster-admin-form-field">
                  <span>俗家姓名 *</span>
                  <input v-model="editForm.secularName" class="roster-admin-review-input" maxlength="24" placeholder="请输入俗家姓名" type="text" />
                </label>
                <div class="roster-admin-form-field">
                  <span>性别 *</span>
                  <div class="roster-admin-choice-row">
                    <button
                      v-for="option in rosterGenderOptions"
                      :key="option.key"
                      type="button"
                      class="roster-admin-choice-chip"
                      :class="{ 'roster-admin-choice-chip--active': editForm.gender === option.key }"
                      @click="editForm.gender = option.key"
                    >
                      {{ option.label }}
                    </button>
                  </div>
                </div>
                <label class="roster-admin-form-field">
                  <span>现居洞府 *</span>
                  <input v-model="editForm.currentCity" class="roster-admin-review-input" maxlength="32" placeholder="精确到市" type="text" />
                </label>
                <label class="roster-admin-form-field">
                  <span>生年 *</span>
                  <input v-model="editForm.birthYear" class="roster-admin-review-input" maxlength="8" placeholder="例如：1998" type="text" />
                </label>
                <label class="roster-admin-form-field roster-admin-form-field--full">
                  <span>俗务 *</span>
                  <input v-model="editForm.profession" class="roster-admin-review-input" maxlength="40" placeholder="请输入俗务" type="text" />
                </label>
              </div>

              <div v-else class="roster-admin-detail-card__grid">
                <div><span>道号</span><strong>{{ activeEntry.daohao }}</strong></div>
                <div><span>俗家姓名</span><strong>{{ activeEntry.secularName || '未填' }}</strong></div>
                <div><span>性别</span><strong>{{ getRosterGenderLabel(activeEntry.gender) }}</strong></div>
                <div><span>现居洞府</span><strong>{{ activeEntry.currentCity }}</strong></div>
                <div><span>生年</span><strong>{{ activeEntry.birthYear || '未填' }}</strong></div>
                <div><span>俗务</span><strong>{{ activeEntry.profession || '未填' }}</strong></div>
                <div><span>引荐人</span><strong>{{ activeEntry.referrerName || '自行登门' }}</strong></div>
              </div>
            </section>

            <section class="roster-admin-detail-card">
              <p class="roster-admin-detail-card__eyebrow">门派司职</p>

              <div v-if="isEditing" class="roster-admin-form-grid">
                <label class="roster-admin-form-field">
                  <span>引荐人 *</span>
                  <input v-model="editForm.referrerName" class="roster-admin-review-input" maxlength="32" placeholder="无引荐人请填写：自行登门" type="text" />
                </label>

                <label class="roster-admin-form-field">
                  <span>状态 *</span>
                  <select v-model="editForm.status" class="roster-admin-review-input">
                    <option value="pending">待审核</option>
                    <option value="approved">准予入册</option>
                    <option value="deferred">暂缓入册</option>
                    <option value="rejected">不予收录</option>
                  </select>
                </label>

                <label v-if="editForm.status === 'approved'" class="roster-admin-form-field">
                  <span>正式文牒号 *</span>
                  <input
                    v-model="editEntryNoText"
                    class="roster-admin-review-input"
                    maxlength="12"
                    placeholder="只填数字，例如：12"
                    type="text"
                  />
                  <small>{{ isLoadingNextEntryNo ? '正在获取建议文牒号...' : '只需填写数字，系统会自动渲染为“云栖-第0001号”' }}</small>
                </label>

                <div class="roster-admin-form-field roster-admin-form-field--full">
                  <span>门中分工 *</span>
                  <div class="roster-admin-choice-grid">
                    <button
                      v-for="option in rosterPositionOptions"
                      :key="option.key"
                      type="button"
                      class="roster-admin-choice-card"
                      :class="{ 'roster-admin-choice-card--active': editForm.positionKey === option.key }"
                      @click="editForm.positionKey = option.key"
                    >
                      <strong>{{ option.label }}</strong>
                      <small>{{ option.description }}</small>
                    </button>
                  </div>
                </div>

                <div class="roster-admin-form-field roster-admin-form-field--full">
                  <span>归属堂口 *</span>
                  <div class="roster-admin-choice-grid">
                    <button
                      v-for="hall in rosterHallOptions"
                      :key="hall.key"
                      type="button"
                      class="roster-admin-choice-card"
                      :class="{ 'roster-admin-choice-card--active': editForm.hallKey === hall.key }"
                      @click="editForm.hallKey = hall.key"
                    >
                      <strong>{{ hall.label }}</strong>
                      <small>{{ hall.description }}</small>
                    </button>
                  </div>
                </div>

                <label v-if="isOtherHallSelected" class="roster-admin-form-field roster-admin-form-field--full">
                  <span>其他堂口说明 *</span>
                  <input v-model="editForm.hallOtherText" class="roster-admin-review-input" maxlength="32" placeholder="请补充堂口方向" type="text" />
                </label>

                <label class="roster-admin-form-field roster-admin-form-field--full">
                  <span>入派本心 *</span>
                  <textarea
                    v-model="editForm.entryIntent"
                    class="roster-admin-review-input roster-admin-review-input--textarea"
                    maxlength="220"
                    rows="4"
                    placeholder="请输入入派本心"
                  ></textarea>
                </label>
              </div>

              <div v-else class="roster-admin-detail-card__grid">
                <div><span>当前状态</span><strong>{{ rosterStatusLabelMap[activeEntry.status] }}</strong></div>
                <div><span>正式文牒号</span><strong>{{ activeEntry.entryNo ? formatRosterEntryNo(activeEntry.entryNo) : '未分配' }}</strong></div>
                <div><span>门中分工</span><strong>{{ getRosterPositionLabel(activeEntry.positionKey) }}</strong></div>
                <div><span>归属堂口</span><strong>{{ getRosterHallLabel(activeEntry.hallKey) }}</strong></div>
                <div><span>其他堂口说明</span><strong>{{ activeEntry.hallOtherText || '无' }}</strong></div>
              </div>

              <div v-if="!isEditing" class="roster-admin-detail-card__text-block">
                <span>入派本心</span>
                <p>{{ activeEntry.entryIntent }}</p>
              </div>
            </section>

            <section class="roster-admin-detail-card">
              <p class="roster-admin-detail-card__eyebrow">传讯方式</p>

              <div v-if="isEditing" class="roster-admin-form-grid">
                <label class="roster-admin-form-field">
                  <span>核心传讯 *</span>
                  <input v-model="editForm.wechatId" class="roster-admin-review-input" maxlength="48" placeholder="请输入微信号" type="text" />
                </label>
                <label class="roster-admin-form-field">
                  <span>小红书 / 抖音 *</span>
                  <input v-model="editForm.socialXiaohongshuDouyin" class="roster-admin-review-input" maxlength="48" placeholder="请输入小红书或抖音账号" type="text" />
                </label>
                <label class="roster-admin-form-field">
                  <span>QQ *</span>
                  <input v-model="editForm.socialQq" class="roster-admin-review-input" maxlength="48" placeholder="请输入 QQ" type="text" />
                </label>
                <label class="roster-admin-form-field">
                  <span>其他 *</span>
                  <input v-model="editForm.socialOther" class="roster-admin-review-input" maxlength="48" placeholder="请输入其他传讯方式" type="text" />
                </label>
                <label class="roster-admin-form-check roster-admin-form-field--full">
                  <input v-model="editForm.allowContactPublic" type="checkbox" />
                  <span>同意核心传讯号在同门间公开，用于活动联络</span>
                </label>
              </div>

              <div v-else class="roster-admin-detail-card__grid">
                <div><span>微信号</span><strong>{{ activeEntry.wechatId }}</strong></div>
                <div><span>小红书 / 抖音</span><strong>{{ activeEntry.socialXiaohongshuDouyin || '未填' }}</strong></div>
                <div><span>QQ</span><strong>{{ activeEntry.socialQq || '未填' }}</strong></div>
                <div><span>其他</span><strong>{{ activeEntry.socialOther || '未填' }}</strong></div>
                <div><span>是否公开传讯</span><strong>{{ activeEntry.allowContactPublic ? '同意' : '不同意' }}</strong></div>
              </div>
            </section>

            <section class="roster-admin-detail-card">
              <p class="roster-admin-detail-card__eyebrow">所长与愿</p>

              <div v-if="isEditing" class="roster-admin-form-grid">
                <label class="roster-admin-form-field roster-admin-form-field--full">
                  <span>身怀所长 *</span>
                  <textarea
                    v-model="editForm.strengths"
                    class="roster-admin-review-input roster-admin-review-input--textarea"
                    maxlength="160"
                    rows="3"
                    placeholder="请输入身怀所长"
                  ></textarea>
                </label>

                <label class="roster-admin-form-field roster-admin-form-field--full">
                  <span>所好雅事 *</span>
                  <textarea
                    v-model="editForm.hobbies"
                    class="roster-admin-review-input roster-admin-review-input--textarea"
                    maxlength="160"
                    rows="3"
                    placeholder="请输入所好雅事"
                  ></textarea>
                </label>

                <div class="roster-admin-form-field roster-admin-form-field--full">
                  <span>闲暇时辰</span>
                  <div class="roster-admin-choice-row">
                    <button
                      v-for="option in rosterFreeTimeOptions"
                      :key="option.key"
                      type="button"
                      class="roster-admin-choice-chip"
                      :class="{ 'roster-admin-choice-chip--active': editForm.freeTimeSlots.includes(option.key) }"
                      @click="toggleFreeTimeSlot(option.key)"
                    >
                      {{ option.label }}
                    </button>
                  </div>
                </div>
              </div>

              <template v-else>
                <div class="roster-admin-detail-card__text-block">
                  <span>身怀所长</span>
                  <p>{{ activeEntry.strengths || '未填' }}</p>
                </div>
                <div class="roster-admin-detail-card__text-block">
                  <span>所好雅事</span>
                  <p>{{ activeEntry.hobbies || '未填' }}</p>
                </div>
                <div class="roster-admin-detail-card__grid">
                  <div><span>闲暇时辰</span><strong>{{ getRosterFreeTimeLabels(activeEntry.freeTimeSlots).join('、') || '未填' }}</strong></div>
                </div>
              </template>
            </section>

            <section class="roster-admin-detail-card">
              <p class="roster-admin-detail-card__eyebrow">誓约与时间</p>

              <div v-if="isEditing" class="roster-admin-form-grid">
                <label class="roster-admin-form-field">
                  <span>弟子签押 *</span>
                  <input v-model="editForm.oathSignedName" class="roster-admin-review-input" maxlength="32" placeholder="请输入签押" type="text" />
                </label>
                <label class="roster-admin-form-field">
                  <span>立誓日期 *</span>
                  <input v-model="editForm.oathSignedDate" class="roster-admin-review-input" type="date" />
                </label>
                <label class="roster-admin-form-field roster-admin-form-field--full">
                  <span>公开批语</span>
                  <textarea
                    v-model="editForm.reviewComment"
                    class="roster-admin-review-input roster-admin-review-input--textarea"
                    maxlength="220"
                    rows="4"
                    placeholder="这段文字会出现在公开详情页状态区，请按公开口径填写"
                  ></textarea>
                </label>
              </div>

              <div v-else class="roster-admin-detail-card__grid">
                <div><span>弟子签押</span><strong>{{ activeEntry.oathSignedName }}</strong></div>
                <div><span>立誓日期</span><strong>{{ activeEntry.oathSignedDate }}</strong></div>
                <div><span>创建时间</span><strong>{{ formatRosterDateTime(activeEntry.createdAt) }}</strong></div>
                <div><span>最近更新</span><strong>{{ formatRosterDateTime(activeEntry.updatedAt) }}</strong></div>
                <div><span>审核执事</span><strong>{{ activeEntry.reviewedByName || '未记录' }}</strong></div>
                <div><span>审核时间</span><strong>{{ activeEntry.reviewedAt ? formatRosterDateTime(activeEntry.reviewedAt) : '未记录' }}</strong></div>
              </div>

              <div v-if="!isEditing" class="roster-admin-detail-card__text-block">
                <span>公开批语</span>
                <p>{{ activeEntry.reviewComment || '未留批语' }}</p>
              </div>
            </section>

            <section class="roster-admin-detail-card roster-admin-detail-card--action">
              <p class="roster-admin-detail-card__eyebrow">档案操作</p>

              <template v-if="isEditing">
                <div class="roster-admin-review-actions">
                  <button
                    type="button"
                    class="ink-button ink-button--primary"
                    :disabled="isSaving"
                    @click="handleSaveEntry"
                  >
                    {{ isSaving ? '保存中...' : rosterContent.admin.reviewButton }}
                  </button>
                  <button
                    type="button"
                    class="ink-button ink-button--ghost"
                    :disabled="isSaving"
                    @click="handleEditToggle"
                  >
                    取消编辑
                  </button>
                </div>
                <span class="roster-admin-review-summary">{{ saveSummary }}</span>
              </template>

              <template v-else>
                <div class="roster-admin-detail-card__grid">
                  <div><span>公开详情</span><strong>{{ activeEntry.publicSlug }}</strong></div>
                  <div><span>当前文牒号</span><strong>{{ activeEntry.entryNo ? formatRosterEntryNo(activeEntry.entryNo) : '未分配' }}</strong></div>
                </div>
              </template>
            </section>

            <section class="roster-admin-detail-card roster-admin-detail-card--danger">
              <p class="roster-admin-detail-card__eyebrow">高风险操作</p>
              <div class="roster-admin-danger-row">
                <div>
                  <strong>彻底删除档案</strong>
                  <p>删除后主表、公开详情和后台记录都会一起消失，且无法恢复。</p>
                </div>
                <button
                  type="button"
                  class="roster-admin-danger-button"
                  :disabled="isDeleting"
                  @click="handleDeleteEntry"
                >
                  {{ isDeleting ? '删除中...' : '删除档案' }}
                </button>
              </div>
            </section>

            <section class="roster-admin-detail-card">
              <p class="roster-admin-detail-card__eyebrow">审核日志</p>
              <div v-if="isLoadingLogs" class="roster-admin-log-list">
                <span>审核日志加载中...</span>
              </div>
              <div v-else-if="reviewLogs.length === 0" class="roster-admin-log-list">
                <span>当前还没有审核日志</span>
              </div>
              <div v-else class="roster-admin-log-list">
                <article
                  v-for="log in reviewLogs"
                  :key="log.id"
                  class="roster-admin-log-item"
                >
                  <strong>{{ log.reviewedByName || '执事' }} · {{ formatRosterDateTime(log.createdAt) }}</strong>
                  <p>{{ formatLogActionType(log.actionType) }}：{{ log.previousStatus ? rosterStatusLabelMap[log.previousStatus] : '首次记录' }} → {{ rosterStatusLabelMap[log.nextStatus] }}</p>
                  <p>道号：{{ log.previousDaohao || '未定' }} → {{ log.nextDaohao || '未定' }}</p>
                  <p>文牒号：{{ log.previousEntryNo ? formatRosterEntryNo(log.previousEntryNo) : '无' }} → {{ log.nextEntryNo ? formatRosterEntryNo(log.nextEntryNo) : '无' }}</p>
                  <small>{{ log.reviewComment || '未留批语' }}</small>
                </article>
              </div>
            </section>
          </div>
        </aside>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.roster-admin-page {
  gap: 30px;
}

.roster-admin-toolbar,
.roster-admin-columns {
  display: grid;
  gap: 18px;
}

.roster-admin-toolbar__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.roster-admin-toolbar__head h2 {
  margin: 0 0 12px;
  font-size: clamp(1.5rem, 3vw, 2.2rem);
  line-height: 1.24;
}

.roster-admin-toolbar__head p:last-child {
  margin: 0;
  color: var(--color-text-soft);
  line-height: 1.78;
}

.roster-admin-toolbar__controls {
  display: grid;
  gap: 16px;
}

.roster-admin-toolbar__search,
.roster-admin-toolbar__hall-filter {
  display: grid;
  gap: 10px;
}

.roster-admin-toolbar__search span,
.roster-admin-toolbar__hall-filter span {
  color: var(--color-cyan);
  font-size: 0.84rem;
  letter-spacing: 0.16em;
}

.roster-admin-toolbar__input,
.roster-admin-review-input {
  width: 100%;
  min-height: 48px;
  padding: 12px 14px;
  border: 1px solid rgba(216, 185, 114, 0.18);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--color-text);
  outline: none;
}

.roster-admin-toolbar__input:focus,
.roster-admin-review-input:focus {
  border-color: rgba(216, 185, 114, 0.34);
  box-shadow: 0 0 0 3px rgba(216, 185, 114, 0.1);
}

.roster-admin-toolbar__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.roster-admin-toolbar__chip,
.roster-admin-entry,
.roster-admin-choice-card,
.roster-admin-choice-chip {
  cursor: pointer;
}

.roster-admin-toolbar__chip {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(216, 185, 114, 0.14);
  background: rgba(255, 255, 255, 0.62);
  color: var(--color-text-soft);
}

.roster-admin-toolbar__chip--active {
  border-color: rgba(216, 185, 114, 0.32);
  background:
    linear-gradient(180deg, rgba(230, 197, 116, 0.28), rgba(255, 248, 230, 0.84)),
    rgba(23, 17, 8, 0.88);
  color: #173d42;
}

.roster-admin-columns {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.roster-admin-column {
  display: grid;
  gap: 14px;
  min-height: 420px;
  padding: 18px;
  border-radius: 28px;
  border: 1px solid rgba(216, 185, 114, 0.16);
  background:
    linear-gradient(180deg, rgba(249, 253, 250, 0.92), rgba(224, 243, 237, 0.96)),
    rgba(236, 248, 244, 0.9);
  box-shadow: var(--shadow-soft);
}

.roster-admin-column__head,
.roster-admin-entry__head,
.roster-admin-danger-row,
.roster-admin-review-actions,
.roster-admin-drawer__head-actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.roster-admin-column__head strong {
  font-size: 1.1rem;
}

.roster-admin-column__head span {
  color: var(--color-gold-strong);
}

.roster-admin-column__list {
  display: grid;
  gap: 12px;
  align-content: start;
}

.roster-admin-entry {
  display: grid;
  gap: 8px;
  padding: 16px;
  border-radius: 22px;
  border: 1px solid rgba(147, 203, 198, 0.14);
  background: rgba(239, 249, 246, 0.74);
  text-align: left;
  transition:
    transform var(--transition-base),
    border-color var(--transition-base),
    background-color var(--transition-base);
}

.roster-admin-entry:hover,
.roster-admin-choice-card:hover,
.roster-admin-choice-chip:hover {
  transform: translateY(-2px);
}

.roster-admin-entry--active {
  border-color: rgba(216, 185, 114, 0.32);
  background:
    linear-gradient(135deg, rgba(230, 197, 116, 0.2), rgba(218, 242, 236, 0.9)),
    rgba(238, 248, 244, 0.9);
}

.roster-admin-entry strong,
.roster-admin-entry span,
.roster-admin-entry p,
.roster-admin-entry small {
  margin: 0;
}

.roster-admin-entry__head span {
  color: var(--color-gold-strong);
}

.roster-admin-entry p,
.roster-admin-entry small {
  color: var(--color-text-soft);
  line-height: 1.7;
}

.roster-admin-column__empty {
  padding: 14px;
  border-radius: 18px;
  background: rgba(239, 249, 246, 0.64);
  color: var(--color-text-faint);
}

.roster-admin-drawer {
  position: fixed;
  inset: 0;
  z-index: 40;
}

.roster-admin-drawer__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(225, 242, 238, 0.72);
  backdrop-filter: blur(10px);
}

.roster-admin-drawer__panel {
  position: absolute;
  top: 0;
  right: 0;
  width: min(860px, 100%);
  height: 100%;
  display: grid;
  grid-template-rows: auto 1fr;
  padding: 22px 20px;
  border-left: 1px solid rgba(216, 185, 114, 0.16);
  background:
    linear-gradient(180deg, rgba(249, 253, 250, 0.98), rgba(224, 243, 237, 0.99)),
    rgba(236, 248, 244, 0.96);
  box-shadow: -24px 0 64px rgba(0, 0, 0, 0.28);
}

.roster-admin-drawer__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 16px;
}

.roster-admin-drawer__head h2 {
  margin: 0 0 10px;
  font-size: clamp(1.45rem, 3vw, 2rem);
  line-height: 1.26;
}

.roster-admin-drawer__head p:last-child {
  margin: 0;
  color: var(--color-text-soft);
  line-height: 1.72;
}

.roster-admin-drawer__close,
.roster-admin-danger-button {
  min-height: 42px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(216, 185, 114, 0.2);
  background: rgba(239, 249, 246, 0.74);
  color: var(--color-text);
}

.roster-admin-danger-button {
  border-color: rgba(208, 96, 96, 0.3);
  background: rgba(255, 239, 230, 0.76);
}

.roster-admin-drawer__body {
  display: grid;
  gap: 16px;
  overflow-y: auto;
  padding-right: 4px;
}

.roster-admin-detail-card {
  display: grid;
  gap: 14px;
  padding: 18px;
  border-radius: 24px;
  border: 1px solid rgba(147, 203, 198, 0.14);
  background: rgba(239, 249, 246, 0.74);
}

.roster-admin-feedback {
  display: grid;
  gap: 10px;
  padding: 16px 18px;
  border-radius: 22px;
  border: 1px solid rgba(147, 203, 198, 0.16);
  background: rgba(239, 249, 246, 0.74);
}

.roster-admin-feedback strong,
.roster-admin-feedback p {
  margin: 0;
}

.roster-admin-feedback strong {
  color: var(--color-cyan);
  letter-spacing: 0.12em;
  font-size: 0.82rem;
}

.roster-admin-feedback p {
  color: var(--color-text-soft);
  line-height: 1.76;
}

.roster-admin-feedback--success {
  border-color: rgba(96, 186, 138, 0.28);
  background: rgba(229, 247, 237, 0.78);
}

.roster-admin-feedback--success strong {
  color: #276b4a;
}

.roster-admin-feedback--error {
  border-color: rgba(208, 96, 96, 0.28);
  background: rgba(255, 234, 234, 0.78);
}

.roster-admin-feedback--error strong {
  color: #8a3434;
}

.roster-admin-detail-card--danger {
  border-color: rgba(208, 96, 96, 0.2);
  background: rgba(255, 239, 230, 0.72);
}

.roster-admin-detail-card__eyebrow {
  margin: 0;
  color: var(--color-cyan);
  letter-spacing: 0.16em;
  font-size: 0.82rem;
}

.roster-admin-detail-card__grid,
.roster-admin-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.roster-admin-detail-card__grid div,
.roster-admin-detail-card__text-block,
.roster-admin-form-field {
  display: grid;
  gap: 8px;
}

.roster-admin-form-field--full {
  grid-column: 1 / -1;
}

.roster-admin-detail-card__grid span,
.roster-admin-detail-card__text-block span,
.roster-admin-form-field span {
  color: var(--color-cyan);
  font-size: 0.82rem;
  letter-spacing: 0.14em;
}

.roster-admin-detail-card__grid strong,
.roster-admin-detail-card__text-block p {
  margin: 0;
  color: var(--color-text-soft);
  line-height: 1.76;
  overflow-wrap: anywhere;
}

.roster-admin-form-field small,
.roster-admin-review-summary {
  color: var(--color-text-faint);
  line-height: 1.72;
}

.roster-admin-review-input--textarea {
  min-height: 108px;
  resize: vertical;
  line-height: 1.78;
}

.roster-admin-choice-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.roster-admin-choice-grid--single {
  grid-template-columns: 1fr;
}

.roster-admin-choice-card,
.roster-admin-choice-chip {
  border: 1px solid rgba(216, 185, 114, 0.14);
  transition:
    transform var(--transition-base),
    border-color var(--transition-base),
    background-color var(--transition-base);
}

.roster-admin-choice-card {
  display: grid;
  gap: 8px;
  padding: 16px 18px;
  border-radius: 20px;
  background: rgba(239, 249, 246, 0.74);
  text-align: left;
}

.roster-admin-choice-card strong,
.roster-admin-choice-card small {
  margin: 0;
}

.roster-admin-choice-card strong {
  color: var(--color-text);
}

.roster-admin-choice-card small {
  color: var(--color-text-soft);
  line-height: 1.72;
}

.roster-admin-choice-card--active,
.roster-admin-choice-chip--active {
  border-color: rgba(216, 185, 114, 0.34);
  background:
    linear-gradient(135deg, rgba(216, 185, 114, 0.18), rgba(224, 243, 237, 0.9)),
    rgba(238, 248, 244, 0.9);
}

.roster-admin-choice-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.roster-admin-choice-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.62);
  color: var(--color-text-soft);
}

.roster-admin-form-check {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  color: var(--color-text-soft);
  line-height: 1.72;
}

.roster-admin-form-check input {
  margin-top: 4px;
}

.roster-admin-danger-row strong,
.roster-admin-danger-row p,
.roster-admin-log-item strong,
.roster-admin-log-item p,
.roster-admin-log-item small {
  margin: 0;
}

.roster-admin-danger-row {
  align-items: center;
}

.roster-admin-danger-row p {
  color: var(--color-text-soft);
  line-height: 1.7;
}

.roster-admin-log-list {
  display: grid;
  gap: 12px;
}

.roster-admin-log-item {
  display: grid;
  gap: 6px;
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid rgba(216, 185, 114, 0.14);
  background: rgba(255, 255, 255, 0.6);
}

.roster-admin-log-item p,
.roster-admin-log-item small {
  color: var(--color-text-soft);
  line-height: 1.7;
}

@media (max-width: 1180px) {
  .roster-admin-columns {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 920px) {
  .roster-admin-toolbar__head,
  .roster-admin-drawer__head,
  .roster-admin-drawer__head-actions,
  .roster-admin-danger-row {
    flex-direction: column;
  }

  .roster-admin-detail-card__grid,
  .roster-admin-form-grid,
  .roster-admin-choice-grid {
    grid-template-columns: 1fr;
  }

  .roster-admin-drawer__panel {
    width: 100%;
    padding: 18px 14px;
  }
}

@media (max-width: 720px) {
  .roster-admin-columns {
    grid-template-columns: 1fr;
  }

  .roster-admin-column,
  .roster-admin-detail-card {
    padding: 16px 14px;
    border-radius: 22px;
  }

  .roster-admin-review-actions,
  .roster-admin-drawer__head-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
  }

  .roster-admin-review-actions > *:last-child:nth-child(odd),
  .roster-admin-drawer__head-actions > *:last-child:nth-child(odd) {
    grid-column: 1 / -1;
  }

  .roster-admin-toolbar__chips,
  .roster-admin-choice-row {
    gap: 8px;
  }

  .roster-admin-toolbar__chip,
  .roster-admin-choice-chip,
  .roster-admin-danger-button {
    min-height: 36px;
    padding: 0 12px;
    font-size: 0.86rem;
    justify-content: center;
  }

  .roster-admin-toolbar__chip,
  .roster-admin-choice-chip {
    width: 100%;
  }

  .roster-admin-review-actions .ink-button,
  .roster-admin-drawer__head-actions > button {
    width: 100%;
  }

  .roster-admin-danger-button {
    width: 100%;
  }
}
</style>
