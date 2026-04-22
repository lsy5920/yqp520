import { readonly, ref } from 'vue'
import { createDefaultMemberCardForm, memberCardStorageKeys } from '@/data/memberCardContent'
import {
  memberCardSchemaVersion,
  type MemberCardFormValue,
  type MemberCardLegacyArchiveRecord,
  type MemberCardLegacyCurrentFormValue,
  type MemberCardLegacyFormValue,
  type MemberCardLegacyPersistedStateV2,
  type MemberCardPersistedState,
} from '@/types/memberCard'
import {
  migrateCurrentMemberCardForm,
  migrateLegacyMemberCardForm,
  normalizeMemberCardFormValue,
} from '@/utils/memberCard'

// 这里记录当前存储模式，方便页面知道本机持久化是否正常。
type MemberCardStorageMode = 'local' | 'session'

// 这里定义宽松的原始状态结构，方便从本机存储里安全读取未知内容。
interface MemberCardRawState {
  version?: unknown
  draft?: unknown
  issuedCount?: unknown
  currentIssuedNumber?: unknown
  lastIssuedAt?: unknown
  archives?: unknown
}

// 这里定义宽松对象结构，方便读取旧字段并做迁移判断。
type MemberCardUnknownObject = Record<string, unknown>

// 这里定义立帖结果结构，方便页面同步最新帖号和时间。
interface MemberCardIssueResult {
  // 这里保存立帖后的完整状态，方便页面一次性更新多个值。
  state: MemberCardPersistedState
  // 这里保存本次新生成的帖号。
  issuedNumber: number
  // 这里保存本次立帖时间。
  issuedAt: number
}

// 这里导出江湖名帖专用存储工具，统一处理草稿恢复和帖号顺延。
export function useMemberCardStorage() {
  // 这里保存当前存储模式，默认先按本机持久化处理。
  const storageMode = ref<MemberCardStorageMode>('local')

  // 这里保存当前会话中的状态兜底，防止浏览器本机存储失效后直接丢数据。
  const memoryState = ref<MemberCardPersistedState | null>(null)

  /**
   * 读取 JSON 数据
   * 用途：从浏览器本机存储安全读取状态，失败时自动退回会话模式
   * 入参：key 为本地存储键名
   * 返回值：读取成功时返回解析结果，失败时返回 null
   */
  function safeReadJson<T>(key: string): T | null {
    if (typeof window === 'undefined') {
      return null
    }

    try {
      const rawValue = window.localStorage.getItem(key)

      if (!rawValue) {
        return null
      }

      storageMode.value = 'local'
      return JSON.parse(rawValue) as T
    } catch (error) {
      // 这里兜底隐私模式、权限受限或 JSON 损坏的情况，避免页面直接报错。
      console.warn('读取江湖名帖本机记录失败：', error)
      storageMode.value = 'session'
      return null
    }
  }

  /**
   * 写入 JSON 数据
   * 用途：把新版状态安全写入本机，失败时退回当前会话模式
   * 入参：key 为本地存储键名，value 为要保存的对象
   * 返回值：写入成功返回 true，失败返回 false
   */
  function safeWriteJson<T>(key: string, value: T): boolean {
    if (typeof window === 'undefined') {
      return false
    }

    try {
      window.localStorage.setItem(key, JSON.stringify(value))
      storageMode.value = 'local'
      return true
    } catch (error) {
      // 这里兜底本机容量不足或权限异常，避免草稿保存时把页面卡住。
      console.warn('写入江湖名帖本机记录失败：', error)
      storageMode.value = 'session'
      return false
    }
  }

  /**
   * 规范化帖号数字
   * 用途：把未知输入收口成安全的正整数或空值
   * 入参：rawValue 为原始输入
   * 返回值：有效时返回正整数，无效时返回 null
   */
  function normalizeIssuedNumber(rawValue: unknown): number | null {
    if (typeof rawValue !== 'number' || !Number.isFinite(rawValue) || rawValue <= 0) {
      return null
    }

    return Math.floor(rawValue)
  }

  /**
   * 规范化时间戳
   * 用途：把未知时间输入整理成可用时间戳或空值
   * 入参：rawValue 为原始输入
   * 返回值：有效时返回时间戳，无效时返回 null
   */
  function normalizeIssuedTime(rawValue: unknown): number | null {
    if (typeof rawValue !== 'number' || !Number.isFinite(rawValue) || rawValue <= 0) {
      return null
    }

    return rawValue
  }

  /**
   * 规范化任意表单内容
   * 用途：把新字段、旧字段和更早字段统一映射成新版江湖名帖结构
   * 入参：rawForm 为原始表单内容
   * 返回值：返回新版江湖名帖表单
   */
  function normalizeAnyFormValue(rawForm: unknown): MemberCardFormValue {
    if (!rawForm || typeof rawForm !== 'object') {
      return createDefaultMemberCardForm()
    }

    const formObject = rawForm as MemberCardUnknownObject

    if ('jianghuName' in formObject || 'formerName' in formObject || 'fromPlace' in formObject || 'identityLine' in formObject) {
      return normalizeMemberCardFormValue({
        jianghuName: typeof formObject.jianghuName === 'string' ? formObject.jianghuName : '',
        formerName: typeof formObject.formerName === 'string' ? formObject.formerName : '',
        fromPlace: typeof formObject.fromPlace === 'string' ? formObject.fromPlace : '',
        identityLine: typeof formObject.identityLine === 'string' ? formObject.identityLine : '',
        skillTags: typeof formObject.skillTags === 'string' ? formObject.skillTags : '',
        entryStory: typeof formObject.entryStory === 'string' ? formObject.entryStory : '',
        signatureLine: typeof formObject.signatureLine === 'string' ? formObject.signatureLine : '',
        portraitDataUrl: typeof formObject.portraitDataUrl === 'string' ? formObject.portraitDataUrl : '',
      })
    }

    if ('daoName' in formObject || 'worldName' in formObject || 'residence' in formObject || 'shortTags' in formObject) {
      return migrateCurrentMemberCardForm({
        daoName: typeof formObject.daoName === 'string' ? formObject.daoName : '',
        worldName: typeof formObject.worldName === 'string' ? formObject.worldName : '',
        residence: typeof formObject.residence === 'string' ? formObject.residence : '',
        shortTags: typeof formObject.shortTags === 'string' ? formObject.shortTags : '',
        origin: typeof formObject.origin === 'string' ? formObject.origin : '',
        motto: typeof formObject.motto === 'string' ? formObject.motto : '',
        avatarDataUrl: typeof formObject.avatarDataUrl === 'string' ? formObject.avatarDataUrl : '',
      } as MemberCardLegacyCurrentFormValue)
    }

    return migrateLegacyMemberCardForm({
      title: typeof formObject.title === 'string' ? formObject.title : '',
      secularName: typeof formObject.secularName === 'string' ? formObject.secularName : '',
      region: typeof formObject.region === 'string' ? formObject.region : '',
      hobbies: typeof formObject.hobbies === 'string' ? formObject.hobbies : '',
      origin: typeof formObject.origin === 'string' ? formObject.origin : '',
      motto: typeof formObject.motto === 'string' ? formObject.motto : '',
      avatarDataUrl: typeof formObject.avatarDataUrl === 'string' ? formObject.avatarDataUrl : '',
    } as MemberCardLegacyFormValue)
  }

  /**
   * 统计旧归档摘要
   * 用途：从旧同门录里提取最大帖号和最近一次生成时间，方便迁移到新版
   * 入参：rawArchives 为原始旧归档内容
   * 返回值：返回整理后的帖号和时间摘要
   */
  function summarizeLegacyArchives(rawArchives: unknown): { issuedCount: number; lastIssuedAt: number | null } {
    if (!Array.isArray(rawArchives)) {
      return {
        issuedCount: 0,
        lastIssuedAt: null,
      }
    }

    return rawArchives.reduce<{ issuedCount: number; lastIssuedAt: number | null }>((summary, rawRecord) => {
      if (!rawRecord || typeof rawRecord !== 'object') {
        return summary
      }

      const record = rawRecord as MemberCardLegacyArchiveRecord
      const nextNumber = normalizeIssuedNumber(record.number) ?? 0
      const nextTime = normalizeIssuedTime(record.createdAt)

      return {
        issuedCount: Math.max(summary.issuedCount, nextNumber),
        lastIssuedAt: nextTime && (!summary.lastIssuedAt || nextTime > summary.lastIssuedAt)
          ? nextTime
          : summary.lastIssuedAt,
      }
    }, {
      issuedCount: 0,
      lastIssuedAt: null,
    })
  }

  /**
   * 规范化新版状态
   * 用途：把本机读取到的新版状态整理成稳定结构
   * 入参：rawState 为原始状态对象
   * 返回值：可识别时返回新版状态，不可识别时返回 null
   */
  function normalizePersistedState(rawState: unknown): MemberCardPersistedState | null {
    if (!rawState || typeof rawState !== 'object') {
      return null
    }

    const state = rawState as MemberCardRawState

    if (state.version !== memberCardSchemaVersion) {
      return null
    }

    const issuedCount = normalizeIssuedNumber(state.issuedCount) ?? 0
    const currentIssuedNumber = normalizeIssuedNumber(state.currentIssuedNumber)
    const lastIssuedAt = normalizeIssuedTime(state.lastIssuedAt)
    const safeIssuedCount = Math.max(issuedCount, currentIssuedNumber ?? 0)

    return {
      version: memberCardSchemaVersion,
      draft: state.draft ? normalizeAnyFormValue(state.draft) : null,
      issuedCount: safeIssuedCount,
      currentIssuedNumber: currentIssuedNumber && currentIssuedNumber <= safeIssuedCount
        ? currentIssuedNumber
        : null,
      lastIssuedAt: lastIssuedAt,
    }
  }

  /**
   * 读取旧版状态并迁移
   * 用途：把 v2 状态和更早的草稿键一次性迁移到新版江湖名帖状态
   * 入参：无
   * 返回值：存在旧数据时返回迁移后的新版状态，不存在时返回 null
   */
  function loadLegacyState(): MemberCardPersistedState | null {
    const legacyState = safeReadJson<MemberCardLegacyPersistedStateV2 | null>(memberCardStorageKeys.legacyState)
    const legacyDraft = safeReadJson<unknown>(memberCardStorageKeys.legacyDraft)
    const legacyArchives = safeReadJson<unknown>(memberCardStorageKeys.legacyArchives)

    const legacyStateDraft = legacyState?.draft ?? null
    const legacyStateSummary = summarizeLegacyArchives(legacyState?.archives)
    const legacySeparateSummary = summarizeLegacyArchives(legacyArchives)
    const hasLegacyData = legacyStateDraft !== null || legacyDraft !== null || legacyStateSummary.issuedCount > 0 || legacySeparateSummary.issuedCount > 0

    if (!hasLegacyData) {
      return null
    }

    const migratedDraftSource = legacyStateDraft ?? legacyDraft
    const issuedCount = Math.max(legacyStateSummary.issuedCount, legacySeparateSummary.issuedCount)
    const lastIssuedAt = [legacyStateSummary.lastIssuedAt, legacySeparateSummary.lastIssuedAt]
      .filter((item): item is number => typeof item === 'number')
      .sort((left, right) => right - left)[0] ?? null

    return {
      version: memberCardSchemaVersion,
      draft: migratedDraftSource === null ? null : normalizeAnyFormValue(migratedDraftSource),
      issuedCount,
      currentIssuedNumber: null,
      lastIssuedAt,
    }
  }

  /**
   * 保存整份状态
   * 用途：把草稿、帖号和立帖时间统一写进新版状态
   * 入参：state 为要保存的新版状态
   * 返回值：返回整理后并已经缓存的状态
   */
  function saveState(state: MemberCardPersistedState): MemberCardPersistedState {
    const normalizedState: MemberCardPersistedState = {
      version: memberCardSchemaVersion,
      draft: state.draft ? normalizeAnyFormValue(state.draft) : null,
      issuedCount: normalizeIssuedNumber(state.issuedCount) ?? 0,
      currentIssuedNumber: normalizeIssuedNumber(state.currentIssuedNumber),
      lastIssuedAt: normalizeIssuedTime(state.lastIssuedAt),
    }

    normalizedState.issuedCount = Math.max(normalizedState.issuedCount, normalizedState.currentIssuedNumber ?? 0)
    memoryState.value = normalizedState
    safeWriteJson(memberCardStorageKeys.state, normalizedState)
    return normalizedState
  }

  /**
   * 读取当前状态
   * 用途：优先读取新版状态，读不到时自动迁移旧数据
   * 入参：无
   * 返回值：返回当前可用的新版状态
   */
  function loadState(): MemberCardPersistedState {
    const currentState = normalizePersistedState(safeReadJson<unknown>(memberCardStorageKeys.state))

    if (currentState) {
      memoryState.value = currentState
      return currentState
    }

    if (memoryState.value) {
      return memoryState.value
    }

    const legacyState = loadLegacyState()

    if (legacyState) {
      return saveState(legacyState)
    }

    const emptyState: MemberCardPersistedState = {
      version: memberCardSchemaVersion,
      draft: null,
      issuedCount: 0,
      currentIssuedNumber: null,
      lastIssuedAt: null,
    }

    memoryState.value = emptyState
    return emptyState
  }

  /**
   * 读取工作台状态
   * 用途：给页面初始化时一次性拿到草稿、帖号和时间信息
   * 入参：无
   * 返回值：返回当前工作台状态
   */
  function loadStudioState(): MemberCardPersistedState {
    return loadState()
  }

  /**
   * 保存草稿
   * 用途：把当前填写内容实时保存到本机，刷新后还能继续写
   * 入参：draft 为当前表单内容
   * 返回值：返回保存后的新版状态
   */
  function saveDraft(draft: MemberCardFormValue): MemberCardPersistedState {
    const currentState = loadState()
    return saveState({
      ...currentState,
      draft: normalizeAnyFormValue(draft),
    })
  }

  /**
   * 清空草稿
   * 用途：把当前江湖名帖恢复为空白状态，并准备下一帖编号
   * 入参：无
   * 返回值：返回清空后的新版状态
   */
  function clearDraft(): MemberCardPersistedState {
    const currentState = loadState()
    return saveState({
      ...currentState,
      draft: null,
      currentIssuedNumber: null,
      lastIssuedAt: null,
    })
  }

  /**
   * 立成一帖
   * 用途：为当前草稿正式分配一个新帖号，并记录立帖时间
   * 入参：draft 为当前表单内容
   * 返回值：返回本次立帖结果，方便页面同步显示
   */
  function issueCard(draft: MemberCardFormValue): MemberCardIssueResult {
    const currentState = loadState()
    const normalizedDraft = normalizeAnyFormValue(draft)
    const issuedNumber = currentState.issuedCount + 1
    const issuedAt = Date.now()
    const nextState = saveState({
      ...currentState,
      draft: normalizedDraft,
      issuedCount: issuedNumber,
      currentIssuedNumber: issuedNumber,
      lastIssuedAt: issuedAt,
    })

    return {
      state: nextState,
      issuedNumber,
      issuedAt,
    }
  }

  return {
    storageMode: readonly(storageMode),
    loadStudioState,
    saveDraft,
    clearDraft,
    issueCard,
  }
}
