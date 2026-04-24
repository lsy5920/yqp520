<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { toPng } from 'html-to-image'
import { toDataURL } from 'qrcode'
import MemberCardCard from './MemberCardCard.vue'
import {
  createDefaultMemberCardForm,
  memberCardCopy,
  memberCardFieldGroups,
  memberCardFields,
} from '@/data/memberCardContent'
import { useMemberCardStorage } from '@/composables/useMemberCardStorage'
import type {
  MemberCardEditableFieldKey,
  MemberCardFieldConfig,
  MemberCardFormValue,
} from '@/types/memberCard'
import {
  formatMemberCardDateTime,
  formatMemberCardNumber,
  normalizeMemberCardFormValue,
  normalizeMemberCardLongText,
  normalizeMemberCardShortText,
  splitMemberCardTags,
} from '@/utils/memberCard'

/**
 * 组件入参类型
 * 用途：允许页面统一控制导出尺寸
 */
interface MemberCardStudioProps {
  /** 用途：导出图片宽度。 */
  exportWidth?: number
  /** 用途：导出图片高度。 */
  exportHeight?: number
}

// 这里定义江湖名帖默认成图宽度，按 57 比 84 的成品比例换算成像素宽度。
const memberCardDefaultExportWidth = 1080

// 这里定义江湖名帖默认成图高度，和上面的宽度一起保持 57 比 84 的固定比例。
const memberCardDefaultExportHeight = 1350

const props = withDefaults(defineProps<MemberCardStudioProps>(), {
  exportWidth: memberCardDefaultExportWidth,
  exportHeight: memberCardDefaultExportHeight,
})

// 这里接入江湖名帖专用存储工具，统一处理草稿恢复与帖号顺延。
const memberCardStorage = useMemberCardStorage()

// 这里保存当前编辑中的江湖名帖内容。
const formValue = ref<MemberCardFormValue>(createDefaultMemberCardForm())

// 这里保存历史已经立成多少帖，方便下一帖继续顺延编号。
const issuedCount = ref<number>(0)

// 这里保存当前草稿已经拿到的帖号，没有立帖时为空。
const currentIssuedNumber = ref<number | null>(null)

// 这里保存当前草稿最近一次立帖的时间文字，方便页面直接展示。
const lastIssuedAtText = ref<string>('待立帖')

// 这里保存当前动作提示，给用户明确知道现在能做什么。
const actionMessage = ref<string>('先写名号、身份一句与缘起，再立成一纸江湖名帖。')

// 这里保存最近一次错误提示，方便定位是哪一步出了问题。
const lastError = ref<string>('')

// 这里记录页面是否仍在初始化，避免一挂载就立刻触发自动保存。
const isHydrating = ref<boolean>(true)

// 这里记录是否正在程序内部批量写值，避免自动保存误触。
const isProgrammaticChange = ref<boolean>(false)

// 这里保存当前要导出的真实卡片节点。
const cardSourceElement = ref<HTMLElement | null>(null)

// 这里保存预览视口节点，方便按容器尺寸重算缩放比例。
const previewViewportElement = ref<HTMLElement | null>(null)

// 这里保存头像选择框节点，便于清空后重新选择同一张图。
const avatarInputElement = ref<HTMLInputElement | null>(null)

// 这里记录当前是否正在导出，防止用户重复点击保存按钮。
const isExporting = ref<boolean>(false)

// 这里保存二维码真实跳转地址，方便扫码后直接回到江湖名帖生成页继续调整。
const qrTargetUrl = ref<string>('')

// 这里保存二维码图片地址，确保预览和导出复用同一张二维码。
const qrCodeUrl = ref<string>('')

// 这里记录二维码是否已经准备完成，避免导出时缺少关键内容。
const isQrReady = ref<boolean>(false)

// 这里记录预览缩放比例，让页面里看到的成品和导出结果保持一致。
const previewScale = ref<number>(Math.min(1, 420 / props.exportWidth))

// 这里保存预览区尺寸监听器，组件卸载时要记得释放。
let previewResizeObserver: ResizeObserver | null = null

// 这里建立字段配置映射，方便按字段键名快速取配置。
const fieldConfigMap = new Map<MemberCardEditableFieldKey, MemberCardFieldConfig>(
  memberCardFields.map((field) => [field.key, field]),
)

// 这里准备一个稳定兜底字段，避免异常场景下取配置时报错。
const fallbackFieldConfig = memberCardFields[0] as MemberCardFieldConfig

/**
 * 当前存储状态文本
 * 用途：告诉用户草稿是保存在本机还是当前会话里
 */
const storageModeText = computed<string>(() => (
  memberCardStorage.storageMode.value === 'local' ? '本机自动存草稿' : '当前会话草稿'
))

/**
 * 当前预览编号
 * 用途：如果当前草稿已立帖就显示旧帖号，否则预显示下一帖号
 */
const previewNumber = computed<number>(() => (
  currentIssuedNumber.value ?? (issuedCount.value + 1)
))

/**
 * 规范化后的表单
 * 用途：统一清洗当前填写内容，供预览、复制和导出共用
 */
const normalizedForm = computed<MemberCardFormValue>(() => normalizeMemberCardFormValue(formValue.value))

/**
 * 当前江湖短签列表
 * 用途：提前把短签拆成多枚标签，方便成品预览和提示统一使用
 */
const skillTagList = computed<string[]>(() => (
  splitMemberCardTags(normalizedForm.value.skillTags, memberCardCopy.generated.fallbackSkillTags)
))

/**
 * 成品预览标题
 * 用途：让用户一眼知道左侧这张帖当前对应的是谁、哪一帖
 */
const previewHeadline = computed<string>(() => (
  `${normalizeMemberCardShortText(normalizedForm.value.jianghuName, memberCardCopy.generated.fallbackJianghuName)} · ${formatMemberCardNumber(previewNumber.value)}`
))

/**
 * 成品预览说明
 * 用途：根据当前状态给用户最有用的一句说明
 */
const previewLead = computed<string>(() => {
  if (currentIssuedNumber.value !== null) {
    return '这是一张已经立成的江湖帖，继续修改后仍可再次立新帖。'
  }

  if (normalizedForm.value.portraitDataUrl.trim()) {
    return '人像已经入帖，左侧看到的就是保存成图后的最终样子。'
  }

  if (skillTagList.value.length > 1) {
    return '江湖短签已经自动拆开，当前排版就是最后的导出版式。'
  }

  return memberCardCopy.studio.previewLead
})

/**
 * 当前立帖状态文本
 * 用途：让页面醒目标出当前是草稿状态还是已经立帖
 */
const currentStatusText = computed<string>(() => (
  currentIssuedNumber.value === null ? '待立帖' : '已立帖'
))

/**
 * 当前立帖时间标签
 * 用途：给页面和导出共用一份清晰时间文本
 */
const generatedAtLabel = computed<string>(() => (
  currentIssuedNumber.value === null ? '待立帖' : lastIssuedAtText.value
))

/**
 * 文字版内容
 * 用途：把当前表单整理成适合直接发群的简洁文字版
 */
const copyText = computed<string>(() => (
  buildCopyText(normalizedForm.value, previewNumber.value, generatedAtLabel.value)
))

/**
 * 预览卡片视口样式
 * 用途：让页面里的预览容器始终和导出比例一致
 */
const previewCardStyle = computed<Record<string, string>>(() => ({
  aspectRatio: `${props.exportWidth} / ${props.exportHeight}`,
}))

/**
 * 预览画布样式
 * 用途：让缩放后的外层尺寸和真实视觉尺寸保持一致，避免预览被裁切
 */
const previewCanvasStyle = computed<Record<string, string>>(() => ({
  width: `${Math.round(props.exportWidth * previewScale.value)}px`,
  height: `${Math.round(props.exportHeight * previewScale.value)}px`,
}))

/**
 * 预览源节点样式
 * 用途：把真实成品卡按缩放比例放进页面里展示
 */
const previewSourceStyle = computed<Record<string, string>>(() => ({
  width: `${props.exportWidth}px`,
  height: `${props.exportHeight}px`,
  transform: `scale(${previewScale.value})`,
}))

/**
 * 获取字段配置
 * 用途：按字段键名取到对应的标题、提示和输入规则
 * 入参：fieldKey 为字段键名
 * 返回值：返回对应的字段配置对象
 */
function resolveFieldConfig(fieldKey: MemberCardEditableFieldKey): MemberCardFieldConfig {
  return fieldConfigMap.get(fieldKey) ?? fallbackFieldConfig
}

/**
 * 判断字段是否为多行输入
 * 用途：统一决定当前字段该渲染 input 还是 textarea
 * 入参：field 为字段配置
 * 返回值：多行字段返回 true，单行字段返回 false
 */
function isTextareaField(field: MemberCardFieldConfig): boolean {
  return typeof field.rows === 'number' && field.rows > 0
}

/**
 * 生成文字版内容
 * 用途：把当前江湖名帖内容整理成简洁文字版
 * 入参：form 为表单内容，number 为帖号，createdAtText 为立帖时间
 * 返回值：返回适合直接复制的文字版文本
 */
function buildCopyText(form: MemberCardFormValue, number: number, createdAtText: string): string {
  const jianghuName = normalizeMemberCardShortText(form.jianghuName, memberCardCopy.generated.fallbackJianghuName)
  const formerName = normalizeMemberCardShortText(form.formerName, memberCardCopy.generated.fallbackFormerName)
  const fromPlace = normalizeMemberCardShortText(form.fromPlace, memberCardCopy.generated.fallbackFromPlace)
  const identityLine = normalizeMemberCardShortText(form.identityLine, memberCardCopy.generated.fallbackIdentityLine)
  const skillTags = splitMemberCardTags(form.skillTags, memberCardCopy.generated.fallbackSkillTags).join('、')
  const entryStory = normalizeMemberCardLongText(form.entryStory, memberCardCopy.generated.fallbackEntryStory)
  const signatureLine = normalizeMemberCardLongText(form.signatureLine, memberCardCopy.generated.fallbackSignatureLine)
  const safeCreatedAt = createdAtText.trim() || '待立帖'

  return [
    memberCardCopy.generated.title,
    memberCardCopy.generated.subtitle,
    `◇ 江湖名号：${jianghuName}`,
    `◇ 旧名或本名：${formerName}`,
    `◇ 来处：${fromPlace}`,
    `◇ 身份一句：${identityLine}`,
    `◇ 江湖短签：${skillTags}`,
    `◇ 入门缘起：${entryStory}`,
    `◇ 留名一句：${signatureLine}`,
    '——',
    `${memberCardCopy.generated.signaturePrefix} · ${formatMemberCardNumber(number)}`,
    `立帖时记 · ${safeCreatedAt}`,
  ].join('\n')
}

/**
 * 统一写入表单内容
 * 用途：在初始化、恢复草稿和清空草稿时避免自动保存误触
 * 入参：nextForm 为下一份表单内容
 * 返回值：无返回值
 */
async function applyFormValue(nextForm: MemberCardFormValue): Promise<void> {
  isProgrammaticChange.value = true
  formValue.value = normalizeMemberCardFormValue(nextForm)
  await nextTick()
  isProgrammaticChange.value = false
}

/**
 * 规范化当前草稿
 * 用途：在立帖、导出和复制前统一清洗表单内容
 * 入参：无
 * 返回值：返回清洗后的草稿对象
 */
function normalizeDraft(): MemberCardFormValue {
  return normalizeMemberCardFormValue(formValue.value)
}

/**
 * 复制文本到剪贴板
 * 用途：优先走现代剪贴板接口，失败时自动退回备用方案
 * 入参：text 为要复制的文字
 * 返回值：复制成功返回 true，失败返回 false
 */
async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (error) {
      // 这里兜底剪贴板接口异常，继续走备用方式，不让复制功能直接失效。
      console.warn('江湖名帖剪贴板写入失败，准备改用备用方式：', error)
    }
  }

  if (typeof document === 'undefined') {
    return false
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  textarea.style.top = '0'
  document.body.appendChild(textarea)
  textarea.select()

  try {
    return document.execCommand('copy')
  } catch (error) {
    console.warn('江湖名帖备用复制方式失败：', error)
    return false
  } finally {
    textarea.remove()
  }
}

/**
 * 处理人像上传
 * 用途：读取用户选择的人像并压缩后写回表单
 * 入参：event 为文件选择事件
 * 返回值：无返回值
 */
async function handlePortraitChange(event: Event): Promise<void> {
  const inputElement = event.target as HTMLInputElement | null
  const selectedFile = inputElement?.files?.[0]

  if (!selectedFile) {
    return
  }

  if (!selectedFile.type.startsWith('image/')) {
    lastError.value = '人像只能上传图片文件'
    actionMessage.value = lastError.value
    if (avatarInputElement.value) {
      avatarInputElement.value.value = ''
    }
    return
  }

  try {
    const rawDataUrl = await readFileAsDataUrl(selectedFile)
    const compressedDataUrl = await compressPortraitDataUrl(rawDataUrl)
    formValue.value.portraitDataUrl = compressedDataUrl
    actionMessage.value = '人像已经载入，保存成图时会一并写进江湖名帖。'
    lastError.value = ''
  } catch (error) {
    // 这里兜底读取失败场景，给用户明确中文提示。
    console.warn('读取江湖名帖人像失败：', error)
    lastError.value = '人像读取失败，请换一张图片再试'
    actionMessage.value = lastError.value
  } finally {
    if (avatarInputElement.value) {
      avatarInputElement.value.value = ''
    }
  }
}

/**
 * 读取文件为数据地址
 * 用途：把上传的人像转成浏览器可以直接预览和保存的地址
 * 入参：file 为用户选择的文件
 * 返回值：返回图片数据地址
 */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''

      if (!result) {
        reject(new Error('人像文件读取失败'))
        return
      }

      resolve(result)
    }

    reader.onerror = () => {
      reject(new Error('人像文件读取失败'))
    }

    reader.readAsDataURL(file)
  })
}

/**
 * 压缩人像图片
 * 用途：控制图片体积，避免本机草稿被一张大图撑满
 * 入参：dataUrl 为原始图片地址
 * 返回值：返回压缩后的图片地址
 */
async function compressPortraitDataUrl(dataUrl: string): Promise<string> {
  if (typeof window === 'undefined') {
    return dataUrl
  }

  return new Promise((resolve) => {
    const image = new Image()

    image.onload = () => {
      const maxSize = 720
      const scale = Math.min(maxSize / image.width, maxSize / image.height, 1)
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')

      if (!context) {
        resolve(dataUrl)
        return
      }

      canvas.width = Math.max(1, Math.round(image.width * scale))
      canvas.height = Math.max(1, Math.round(image.height * scale))

      // 这里先铺一层暖色底，避免透明图片导出后出现黑底或锯齿边。
      context.fillStyle = '#efe4c7'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0, canvas.width, canvas.height)

      try {
        resolve(canvas.toDataURL('image/jpeg', 0.88))
      } catch (error) {
        // 这里兜底转图失败，直接回退原图，保证上传流程不断掉。
        console.warn('压缩江湖名帖人像失败：', error)
        resolve(dataUrl)
      }
    }

    image.onerror = () => {
      resolve(dataUrl)
    }

    image.src = dataUrl
  })
}

/**
 * 清空人像
 * 用途：给用户明确的撤回入口，不喜欢当前人像时可以一键清掉
 * 入参：无
 * 返回值：无返回值
 */
function clearPortrait(): void {
  formValue.value.portraitDataUrl = ''

  if (avatarInputElement.value) {
    avatarInputElement.value.value = ''
  }

  actionMessage.value = '人像已经清空，可以继续调整江湖名帖。'
}

/**
 * 更新预览缩放
 * 用途：让页面里的江湖名帖始终跟随容器尺寸缩放
 * 入参：无
 * 返回值：无返回值
 */
function updatePreviewScale(): void {
  const viewport = previewViewportElement.value

  if (!viewport) {
    return
  }

  const viewportStyle = window.getComputedStyle(viewport)
  const paddingX = Number.parseFloat(viewportStyle.paddingLeft) + Number.parseFloat(viewportStyle.paddingRight)
  const paddingY = Number.parseFloat(viewportStyle.paddingTop) + Number.parseFloat(viewportStyle.paddingBottom)
  const viewportWidth = viewport.clientWidth - paddingX - 6
  const viewportHeight = viewport.clientHeight - paddingY - 6

  if (!viewportWidth || !viewportHeight) {
    return
  }

  const nextScale = Math.min(
    viewportWidth / props.exportWidth,
    viewportHeight / props.exportHeight,
    1,
  )

  if (Number.isFinite(nextScale) && nextScale > 0) {
    previewScale.value = nextScale
  }
}

/**
 * 绑定预览尺寸监听
 * 用途：窗口尺寸变化时自动重算江湖名帖的缩放比例
 * 入参：无
 * 返回值：无返回值
 */
function bindPreviewObserver(): void {
  const viewport = previewViewportElement.value

  if (!viewport || typeof ResizeObserver === 'undefined') {
    updatePreviewScale()
    return
  }

  previewResizeObserver = new ResizeObserver(() => {
    updatePreviewScale()
  })
  previewResizeObserver.observe(viewport)
  updatePreviewScale()
}

/**
 * 清理预览监听
 * 用途：组件卸载时释放监听器，避免残留引用
 * 入参：无
 * 返回值：无返回值
 */
function clearPreviewObserver(): void {
  previewResizeObserver?.disconnect()
  previewResizeObserver = null
}

/**
 * 解析江湖名帖二维码目标地址
 * 用途：让二维码始终跳到江湖名帖生成页，方便扫码后直接继续改帖
 * 入参：无
 * 返回值：返回二维码应指向的完整网址
 */
function resolveMemberCardQrTargetUrl(): string {
  if (typeof window === 'undefined') {
    return ''
  }

  const siteBaseUrl = new URL(import.meta.env.BASE_URL || '/', window.location.origin)
  return new URL('member-card', siteBaseUrl).href
}

/**
 * 生成江湖名帖二维码
 * 用途：把江湖名帖生成页做成二维码，供预览和导出复用
 * 入参：无
 * 返回值：无返回值
 */
async function generateMemberCardQr(): Promise<void> {
  if (typeof window === 'undefined') {
    return
  }

  qrTargetUrl.value = resolveMemberCardQrTargetUrl()
  isQrReady.value = false

  if (!qrTargetUrl.value) {
    qrCodeUrl.value = ''
    return
  }

  try {
    qrCodeUrl.value = await toDataURL(qrTargetUrl.value, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 180,
      color: {
        dark: '#102734',
        light: '#f8fffb',
      },
    })
    isQrReady.value = true

    if (lastError.value === '江湖名帖二维码生成失败，请稍后重试') {
      lastError.value = ''
    }

    if (actionMessage.value === '江湖名帖二维码生成失败，请稍后重试') {
      actionMessage.value = memberCardCopy.page.lead
    }
  } catch (error) {
    // 这里兜底二维码生成失败，避免页面直接报错，同时给用户明确提示。
    console.warn('生成江湖名帖二维码失败：', error)
    qrCodeUrl.value = ''
    isQrReady.value = false
    lastError.value = '江湖名帖二维码生成失败，请稍后重试'
    actionMessage.value = lastError.value
  }
}

/**
 * 等待字体加载完成
 * 用途：避免导出图片时字体尚未准备好，导致导出与页面不一致
 * 入参：无
 * 返回值：无返回值
 */
async function waitForFontsReady(): Promise<void> {
  const documentWithFonts = document as Document & { fonts?: FontFaceSet }

  if (!documentWithFonts.fonts) {
    return
  }

  try {
    await documentWithFonts.fonts.ready
  } catch (error) {
    // 这里兜底字体接口异常，继续导出，不让页面卡死。
    console.warn('等待江湖名帖字体加载完成失败：', error)
  }
}

/**
 * 等待图片加载完成
 * 用途：确保人像和二维码都已经真正进入节点后再开始截图
 * 入参：target 为准备导出的真实节点
 * 返回值：无返回值
 */
async function waitForImagesReady(target: HTMLElement): Promise<void> {
  const imageList = Array.from(target.querySelectorAll('img'))

  if (imageList.length === 0 || typeof window === 'undefined') {
    return
  }

  await Promise.all(
    imageList.map((image) => new Promise<void>((resolve) => {
      if (image.complete && image.naturalWidth > 0) {
        resolve()
        return
      }

      const finish = (): void => {
        resolve()
      }

      const timerId = window.setTimeout(() => {
        finish()
      }, 3000)

      const handleDone = (): void => {
        window.clearTimeout(timerId)
        finish()
      }

      image.addEventListener('load', handleDone, { once: true })
      image.addEventListener('error', handleDone, { once: true })
    })),
  )
}

/**
 * 创建离屏导出舞台
 * 用途：把页面里的预览节点克隆到屏幕外，避免缩放影响成图
 * 入参：无
 * 返回值：返回新的离屏容器节点
 */
function createExportStage(): HTMLDivElement {
  const stage = document.createElement('div')
  stage.style.position = 'fixed'
  stage.style.left = '-10000px'
  stage.style.top = '-10000px'
  stage.style.width = `${props.exportWidth}px`
  stage.style.height = `${props.exportHeight}px`
  stage.style.pointerEvents = 'none'
  stage.style.opacity = '0'
  stage.style.zIndex = '-1'
  return stage
}

/**
 * 克隆导出节点
 * 用途：去掉页面里的缩放，只保留原尺寸的真实江湖名帖
 * 入参：source 为页面里的成品预览节点
 * 返回值：返回可直接导出的克隆节点
 */
function cloneCardElement(source: HTMLElement): HTMLElement {
  const cloneElement = source.cloneNode(true) as HTMLElement
  cloneElement.style.position = 'relative'
  cloneElement.style.left = '0'
  cloneElement.style.top = '0'
  cloneElement.style.width = `${props.exportWidth}px`
  cloneElement.style.height = `${props.exportHeight}px`
  cloneElement.style.maxWidth = 'none'
  cloneElement.style.transform = 'none'
  cloneElement.style.transformOrigin = 'top left'
  cloneElement.style.overflow = 'hidden'
  cloneElement.style.borderRadius = '38px'
  return cloneElement
}

/**
 * 等待导出前状态稳定
 * 用途：保证文字、人像和最新表单都准备好后再截图
 * 入参：target 为准备导出的目标节点
 * 返回值：无返回值
 */
async function waitForCardReady(target: HTMLElement): Promise<void> {
  await nextTick()
  await waitForFontsReady()
  await waitForImagesReady(target)
}

/**
 * 导出江湖名帖图片
 * 用途：统一生成高清 PNG 图片，供用户保存成图
 * 入参：无
 * 返回值：成功返回图片数据和文件名，失败返回 null
 */
async function exportCardImage(): Promise<{ dataUrl: string; fileName: string } | null> {
  const sourceElement = cardSourceElement.value

  if (!sourceElement || typeof document === 'undefined') {
    return null
  }

  if (!isQrReady.value) {
    await generateMemberCardQr()
  }

  if (!isQrReady.value) {
    if (!lastError.value) {
      lastError.value = '江湖名帖二维码还在准备中，请稍后再试'
      actionMessage.value = lastError.value
    }
    return null
  }

  const exportStage = createExportStage()
  const cloneElement = cloneCardElement(sourceElement)

  document.body.appendChild(exportStage)
  exportStage.appendChild(cloneElement)

  try {
    await waitForCardReady(cloneElement)

    const dataUrl = await toPng(cloneElement, {
      cacheBust: true,
      pixelRatio: 1,
      backgroundColor: '#edf7f1',
      width: props.exportWidth,
      height: props.exportHeight,
      canvasWidth: props.exportWidth,
      canvasHeight: props.exportHeight,
    })

    return {
      dataUrl,
      fileName: `云栖派-江湖名帖-${Date.now()}.png`,
    }
  } catch (error) {
    // 这里兜底导出失败场景，避免点击保存后直接没有反馈。
    console.warn('导出江湖名帖失败：', error)
    lastError.value = '导出成图失败，请稍后再试'
    actionMessage.value = lastError.value
    return null
  } finally {
    exportStage.remove()
  }
}

/**
 * 下载数据地址为图片
 * 用途：把导出的数据地址触发为浏览器下载
 * 入参：dataUrl 为图片数据地址，fileName 为下载文件名
 * 返回值：无返回值
 */
function downloadDataUrl(dataUrl: string, fileName: string): void {
  const linkElement = document.createElement('a')
  linkElement.href = dataUrl
  linkElement.download = fileName
  linkElement.click()
}

/**
 * 保存成图
 * 用途：导出当前江湖名帖成图并触发下载
 * 入参：无
 * 返回值：无返回值
 */
async function handleSaveImage(): Promise<void> {
  if (isExporting.value) {
    return
  }

  isExporting.value = true
  lastError.value = ''

  try {
    const exportedImage = await exportCardImage()

    if (!exportedImage) {
      return
    }

    downloadDataUrl(exportedImage.dataUrl, exportedImage.fileName)
    actionMessage.value = '成图已经保存到本地。'
  } finally {
    isExporting.value = false
  }
}

/**
 * 复制文字版
 * 用途：把简洁版江湖名帖复制到剪贴板
 * 入参：无
 * 返回值：无返回值
 */
async function handleCopyText(): Promise<void> {
  const didCopy = await copyTextToClipboard(copyText.value)

  if (didCopy) {
    lastError.value = ''
    actionMessage.value = '文字版已经复制好，可以直接发进群里。'
    return
  }

  lastError.value = '复制文字版失败，请稍后再试'
  actionMessage.value = lastError.value
}

/**
 * 立成江湖名帖
 * 用途：为当前草稿分配一个正式帖号，并记录立帖时间
 * 入参：无
 * 返回值：无返回值
 */
function handleIssueCard(): void {
  const issueResult = memberCardStorage.issueCard(normalizeDraft())
  issuedCount.value = issueResult.state.issuedCount
  currentIssuedNumber.value = issueResult.state.currentIssuedNumber
  lastIssuedAtText.value = formatMemberCardDateTime(issueResult.issuedAt)
  lastError.value = ''
  actionMessage.value = `已立成 ${formatMemberCardNumber(issueResult.issuedNumber)}，现在可以保存成图或复制文字版。`
}

/**
 * 清空当前草稿
 * 用途：把工作台恢复为空白状态，并准备下一帖编号
 * 入参：无
 * 返回值：无返回值
 */
async function handleClearDraft(): Promise<void> {
  const nextState = memberCardStorage.clearDraft()
  await applyFormValue(createDefaultMemberCardForm())
  issuedCount.value = nextState.issuedCount
  currentIssuedNumber.value = nextState.currentIssuedNumber
  lastIssuedAtText.value = '待立帖'
  lastError.value = ''
  actionMessage.value = '草稿已经清空，下一次立帖会继续顺延新帖号。'
}

/**
 * 初始化工作台状态
 * 用途：在页面进入时恢复草稿、帖号和立帖时间
 * 入参：无
 * 返回值：无返回值
 */
async function hydrateStudio(): Promise<void> {
  const savedState = memberCardStorage.loadStudioState()
  issuedCount.value = savedState.issuedCount
  currentIssuedNumber.value = savedState.currentIssuedNumber
  lastIssuedAtText.value = savedState.currentIssuedNumber !== null && savedState.lastIssuedAt
    ? formatMemberCardDateTime(savedState.lastIssuedAt)
    : '待立帖'
  await applyFormValue(savedState.draft ?? createDefaultMemberCardForm())
  actionMessage.value = memberCardCopy.page.lead
  isHydrating.value = false
}

onMounted(async () => {
  await Promise.all([
    hydrateStudio(),
    generateMemberCardQr(),
  ])
  await nextTick()
  bindPreviewObserver()
})

onBeforeUnmount(() => {
  clearPreviewObserver()
})

// 这里监听表单变化，保证用户每次输入后都能自动保存草稿。
watch(
  formValue,
  (nextForm) => {
    if (isHydrating.value || isProgrammaticChange.value) {
      return
    }

    memberCardStorage.saveDraft(normalizeMemberCardFormValue(nextForm))
  },
  { deep: true },
)

// 这里监听导出尺寸变化，保证预览缩放比例始终同步到真实成图比例。
watch(
  () => [props.exportWidth, props.exportHeight],
  async () => {
    await nextTick()
    updatePreviewScale()
  },
)
</script>

<template>
  <section class="member-card-studio">
    <section class="member-card-studio__shell" data-reveal>
      <div class="member-card-studio__head">
        <div class="member-card-studio__head-copy">
          <p class="eyebrow">{{ memberCardCopy.page.eyebrow }}</p>
          <h2>{{ memberCardCopy.page.title }}</h2>
          <p>{{ memberCardCopy.page.lead }}</p>
        </div>

        <div class="member-card-studio__head-side">
          <div class="member-card-studio__status-list">
            <span class="member-card-studio__status-chip">{{ currentStatusText }}</span>
            <span class="member-card-studio__status-chip">{{ storageModeText }}</span>
            <span class="member-card-studio__status-chip member-card-studio__status-chip--strong">
              {{ formatMemberCardNumber(previewNumber) }}
            </span>
          </div>

          <p class="member-card-studio__head-note">{{ memberCardCopy.page.note }}</p>

          <div class="member-card-studio__head-actions">
            <button type="button" class="ink-button ink-button--primary" @click="handleIssueCard">
              生成江湖帖
            </button>
            <button type="button" class="ink-button ink-button--ghost" @click="handleClearDraft">
              清空草稿
            </button>
          </div>
        </div>
      </div>

      <div class="member-card-studio__workspace">
        <aside class="member-card-studio__preview-pane">
          <div class="member-card-studio__preview-head">
            <p class="eyebrow">{{ memberCardCopy.studio.previewEyebrow }}</p>
            <h3>{{ previewHeadline }}</h3>
            <p>{{ previewLead }}</p>
          </div>

          <div
            ref="previewViewportElement"
            class="member-card-studio__preview-viewport"
            :style="previewCardStyle"
          >
            <div class="member-card-studio__preview-canvas" :style="previewCanvasStyle">
              <div
                ref="cardSourceElement"
                class="member-card-studio__preview-source"
                :style="previewSourceStyle"
              >
                <MemberCardCard
                  :card-subtitle="memberCardCopy.generated.subtitle"
                  :card-title="memberCardCopy.generated.title"
                  :created-at-text="generatedAtLabel"
                  :form="formValue"
                  :number="previewNumber"
                  :qr-code-url="qrCodeUrl"
                  :qr-hint="memberCardCopy.generated.qrHint"
                  :qr-label="memberCardCopy.generated.qrLabel"
                  :reduce-motion="false"
                  :signature-prefix="memberCardCopy.generated.signaturePrefix"
                  :year-text="memberCardCopy.generated.yearText"
                />
              </div>
            </div>
          </div>

          <div class="member-card-studio__preview-summary">
            <div class="member-card-studio__summary-item">
              <span>当前帖号</span>
              <strong>{{ formatMemberCardNumber(previewNumber) }}</strong>
            </div>
            <div class="member-card-studio__summary-item">
              <span>短签数量</span>
              <strong>{{ skillTagList.length }} 枚</strong>
            </div>
            <div class="member-card-studio__summary-item">
              <span>立帖时记</span>
              <strong>{{ generatedAtLabel }}</strong>
            </div>
          </div>

          <div class="member-card-studio__copy-card">
            <div>
              <p class="member-card-studio__field-label">{{ memberCardCopy.studio.copyTitle }}</p>
              <p class="member-card-studio__field-help">{{ memberCardCopy.studio.copyLead }}</p>
            </div>

            <button type="button" class="ink-button ink-button--secondary" @click="handleCopyText">
              复制文字版
            </button>
          </div>
        </aside>

        <article class="member-card-studio__editor-pane">
          <section class="member-card-studio__portrait-card" data-reveal>
            <div class="member-card-studio__portrait-head">
              <div class="member-card-studio__portrait-copy">
                <p class="eyebrow">人像</p>
                <h3>{{ memberCardCopy.studio.portraitTitle }}</h3>
                <p>{{ memberCardCopy.studio.portraitLead }}</p>
              </div>

              <div class="member-card-studio__portrait-actions">
                <label class="ink-button ink-button--secondary member-card-studio__portrait-upload">
                  上传人像
                  <input
                    ref="avatarInputElement"
                    accept="image/*"
                    class="sr-only"
                    type="file"
                    @change="handlePortraitChange"
                  />
                </label>
                <button
                  type="button"
                  class="ink-button ink-button--ghost"
                  :disabled="!formValue.portraitDataUrl"
                  @click="clearPortrait"
                >
                  清除人像
                </button>
              </div>
            </div>

            <div class="member-card-studio__portrait-body">
              <div
                class="member-card-studio__portrait-preview"
                :class="{ 'member-card-studio__portrait-preview--empty': !formValue.portraitDataUrl }"
              >
                <img
                  v-if="formValue.portraitDataUrl"
                  :src="formValue.portraitDataUrl"
                  alt="江湖名帖人像预览"
                />
                <div v-else class="member-card-studio__portrait-placeholder" aria-hidden="true">
                  <span>{{ normalizeMemberCardShortText(normalizedForm.jianghuName, '栖').slice(0, 1) || '栖' }}</span>
                </div>
              </div>

              <ul class="member-card-studio__intro-list">
                <li v-for="line in memberCardCopy.introLines" :key="line">{{ line }}</li>
              </ul>
            </div>
          </section>

          <section
            v-for="group in memberCardFieldGroups"
            :key="group.key"
            class="member-card-studio__group-card"
            data-reveal
          >
            <div class="member-card-studio__group-head">
              <p class="eyebrow">{{ group.label }}</p>
              <h3>{{ group.title }}</h3>
              <p>{{ group.lead }}</p>
            </div>

            <div
              class="member-card-studio__field-grid"
              :class="{ 'member-card-studio__field-grid--single': group.key === 'closing' }"
            >
              <label
                v-for="fieldKey in group.fieldKeys"
                :key="fieldKey"
                class="member-card-studio__field"
              >
                <span class="member-card-studio__field-label">{{ resolveFieldConfig(fieldKey).label }}</span>
                <textarea
                  v-if="isTextareaField(resolveFieldConfig(fieldKey))"
                  v-model="formValue[fieldKey]"
                  class="member-card-studio__input member-card-studio__input--textarea"
                  :maxlength="resolveFieldConfig(fieldKey).maxLength"
                  :placeholder="resolveFieldConfig(fieldKey).placeholder"
                  :rows="resolveFieldConfig(fieldKey).rows"
                ></textarea>
                <input
                  v-else
                  v-model="formValue[fieldKey]"
                  class="member-card-studio__input"
                  :maxlength="resolveFieldConfig(fieldKey).maxLength"
                  :placeholder="resolveFieldConfig(fieldKey).placeholder"
                  type="text"
                />
                <span class="member-card-studio__field-help">{{ resolveFieldConfig(fieldKey).help }}</span>
              </label>
            </div>
          </section>

          <section class="member-card-studio__note-card" data-reveal>
            <div class="member-card-studio__note-copy">
              <p class="member-card-studio__field-label">当前提示</p>
              <p class="member-card-studio__note-message">{{ lastError || actionMessage }}</p>
            </div>

            <div class="member-card-studio__note-actions">
              <button type="button" class="ink-button ink-button--primary" @click="handleSaveImage">
                {{ isExporting ? '正在保存...' : '保存成图' }}
              </button>
              <button type="button" class="ink-button ink-button--secondary" @click="handleCopyText">
                复制文字版
              </button>
            </div>
          </section>
        </article>
      </div>
    </section>

    <div class="member-card-studio__mobile-actions">
      <button type="button" class="ink-button ink-button--secondary" @click="handleCopyText">
        复制文字版
      </button>
      <button type="button" class="ink-button ink-button--primary" :disabled="isExporting" @click="handleSaveImage">
        {{ isExporting ? '正在保存...' : '保存成图' }}
      </button>
    </div>
  </section>
</template>

<style scoped>
/* 这里定义整张工作台的外层节奏，负责大结构间距和底部留白。 */
.member-card-studio {
  position: relative;
  display: grid;
  gap: 18px;
  padding-bottom: 108px;
}

.member-card-studio__shell {
  display: grid;
  gap: 22px;
  padding: 28px;
  border: 1px solid rgba(216, 185, 114, 0.16);
  border-radius: 34px;
  background:
    radial-gradient(circle at 18% 10%, rgba(139, 208, 203, 0.1), transparent 18%),
    radial-gradient(circle at 86% 14%, rgba(216, 185, 114, 0.12), transparent 16%),
    linear-gradient(180deg, rgba(248, 253, 249, 0.9), rgba(224, 243, 237, 0.96)),
    rgba(236, 248, 244, 0.88);
  box-shadow: var(--shadow-strong);
}

/* 这里放顶部短标题区，负责用较短文案交代页面定位和当前状态。 */
.member-card-studio__head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(300px, 0.84fr);
  gap: 18px;
  align-items: start;
}

.member-card-studio__head-copy,
.member-card-studio__head-side {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.member-card-studio__head-copy h2,
.member-card-studio__preview-head h3,
.member-card-studio__portrait-copy h3,
.member-card-studio__group-head h3 {
  margin: 0;
  font-size: clamp(1.48rem, 3vw, 2.3rem);
  line-height: 1.2;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.member-card-studio__head-copy p,
.member-card-studio__preview-head p,
.member-card-studio__portrait-copy p,
.member-card-studio__group-head p {
  margin: 0;
  color: var(--color-text-soft);
  line-height: 1.78;
}

.member-card-studio__status-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.member-card-studio__status-chip {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(216, 185, 114, 0.18);
  background: rgba(239, 249, 246, 0.68);
  color: var(--color-text-soft);
  font-size: 0.82rem;
  letter-spacing: 0.08em;
}

.member-card-studio__status-chip--strong {
  color: var(--color-gold-strong);
}

.member-card-studio__head-note {
  margin: 0;
  color: var(--color-text-faint);
  line-height: 1.72;
}

.member-card-studio__head-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

/* 这里放主工作区，左边强调成品，右边负责填写，符合沉浸式单屏结构。 */
.member-card-studio__workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.06fr) minmax(0, 0.94fr);
  gap: 20px;
  align-items: start;
}

.member-card-studio__preview-pane,
.member-card-studio__editor-pane {
  display: grid;
  gap: 14px;
  min-width: 0;
}

.member-card-studio__preview-head {
  display: grid;
  gap: 10px;
  width: 100%;
}

.member-card-studio__preview-viewport {
  display: grid;
  place-items: center;
  width: 100%;
  padding: 12px;
  border-radius: 28px;
  border: 1px solid rgba(216, 185, 114, 0.14);
  background:
    radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.06), transparent 28%),
    linear-gradient(180deg, rgba(248, 253, 249, 0.72), rgba(224, 243, 237, 0.94)),
    rgba(236, 248, 244, 0.78);
  overflow: hidden;
}

.member-card-studio__preview-source {
  flex: none;
  position: relative;
  transform-origin: top left;
}

.member-card-studio__preview-canvas {
  position: relative;
  display: block;
  margin: 0 auto;
}

.member-card-studio__preview-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  width: 100%;
}

.member-card-studio__summary-item {
  display: grid;
  gap: 6px;
  padding: 12px 14px;
  border-radius: 18px;
  border: 1px solid rgba(147, 203, 198, 0.14);
  background: rgba(239, 249, 246, 0.7);
}

.member-card-studio__summary-item span {
  color: var(--color-cyan);
  font-size: 0.78rem;
  letter-spacing: 0.16em;
}

.member-card-studio__summary-item strong {
  color: var(--color-text);
  font-size: 0.92rem;
  line-height: 1.58;
  overflow-wrap: anywhere;
}

.member-card-studio__copy-card,
.member-card-studio__portrait-card,
.member-card-studio__group-card,
.member-card-studio__note-card {
  display: grid;
  gap: 14px;
  padding: 18px;
  border-radius: 24px;
  border: 1px solid rgba(147, 203, 198, 0.14);
  background: rgba(239, 249, 246, 0.72);
}

.member-card-studio__copy-card {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
}

/* 这里放右侧人像卡，负责上传入口和简短填写提示。 */
.member-card-studio__portrait-head {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 14px;
}

.member-card-studio__portrait-copy {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.member-card-studio__portrait-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.member-card-studio__portrait-upload {
  position: relative;
  overflow: hidden;
}

.member-card-studio__portrait-body {
  display: grid;
  grid-template-columns: minmax(180px, 220px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.member-card-studio__portrait-preview {
  display: grid;
  aspect-ratio: 1 / 1;
  place-items: center;
  overflow: hidden;
  border-radius: 26px;
  border: 1px solid rgba(216, 185, 114, 0.18);
  background:
    radial-gradient(circle at 32% 28%, rgba(139, 208, 203, 0.16), transparent 30%),
    linear-gradient(180deg, rgba(248, 253, 249, 0.88), rgba(224, 243, 237, 0.96));
}

.member-card-studio__portrait-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.member-card-studio__portrait-preview--empty {
  background:
    radial-gradient(circle at 32% 28%, rgba(216, 185, 114, 0.22), transparent 30%),
    linear-gradient(180deg, rgba(248, 253, 249, 0.88), rgba(224, 243, 237, 0.96));
}

.member-card-studio__portrait-placeholder {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
}

.member-card-studio__portrait-placeholder span {
  color: var(--color-gold-strong);
  font-size: clamp(2.4rem, 6vw, 3.8rem);
  letter-spacing: 0.18em;
}

.member-card-studio__intro-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding-left: 18px;
  color: var(--color-text-soft);
  line-height: 1.78;
}

/* 这里放分组填写区，负责让字段按“立名、立身、留帖”顺序稳定展开。 */
.member-card-studio__group-head {
  display: grid;
  gap: 8px;
}

.member-card-studio__field-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.member-card-studio__field-grid--single {
  grid-template-columns: 1fr;
}

.member-card-studio__field {
  display: grid;
  gap: 10px;
}

.member-card-studio__field-label {
  color: var(--color-cyan);
  letter-spacing: 0.16em;
  font-size: 0.82rem;
}

.member-card-studio__field-help {
  color: var(--color-text-faint);
  font-size: 0.9rem;
  line-height: 1.72;
}

.member-card-studio__input {
  width: 100%;
  min-height: 48px;
  padding: 12px 14px;
  border: 1px solid rgba(216, 185, 114, 0.18);
  border-radius: 16px;
  background: rgba(5, 19, 28, 0.62);
  color: var(--color-text);
  resize: vertical;
  outline: none;
}

.member-card-studio__input::placeholder {
  color: rgba(35, 83, 86, 0.46);
}

.member-card-studio__input:focus {
  border-color: rgba(216, 185, 114, 0.34);
  box-shadow: 0 0 0 3px rgba(216, 185, 114, 0.1);
}

.member-card-studio__input--textarea {
  min-height: 112px;
  line-height: 1.8;
}

/* 这里放页内提示卡，负责给当前动作反馈和桌面端保存入口。 */
.member-card-studio__note-card {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
}

.member-card-studio__note-copy {
  display: grid;
  gap: 8px;
}

.member-card-studio__note-message {
  margin: 0;
  color: var(--color-text-soft);
  line-height: 1.72;
}

.member-card-studio__note-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

/* 这里定义手机端固定操作区，只保留保存成图和复制文字版两个主动作。 */
.member-card-studio__mobile-actions {
  position: fixed;
  left: 50%;
  bottom: calc(14px + env(safe-area-inset-bottom));
  z-index: 12;
  display: none;
  gap: 10px;
  width: min(560px, calc(100vw - 28px));
  padding: 12px;
  border-radius: 24px;
  border: 1px solid rgba(216, 185, 114, 0.2);
  background:
    linear-gradient(180deg, rgba(248, 253, 249, 0.92), rgba(224, 243, 237, 0.98)),
    rgba(236, 248, 244, 0.94);
  box-shadow: var(--shadow-soft);
  backdrop-filter: blur(22px);
  transform: translateX(-50%);
}

.member-card-studio__mobile-actions .ink-button {
  flex: 1 1 0;
}

@media (max-width: 1180px) {
  .member-card-studio__head,
  .member-card-studio__workspace {
    grid-template-columns: 1fr;
  }

  .member-card-studio__preview-summary,
  .member-card-studio__portrait-body {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 920px) {
  .member-card-studio__copy-card,
  .member-card-studio__note-card {
    grid-template-columns: 1fr;
  }

  .member-card-studio__field-grid {
    grid-template-columns: 1fr;
  }

  .member-card-studio__portrait-head {
    flex-direction: column;
  }
}

@media (max-width: 720px) {
  .member-card-studio {
    gap: 12px;
    padding-bottom: calc(88px + env(safe-area-inset-bottom));
  }

  .member-card-studio__shell {
    gap: 14px;
    padding: 14px;
    border-radius: 24px;
  }

  .member-card-studio__head-copy h2,
  .member-card-studio__preview-head h3,
  .member-card-studio__portrait-copy h3,
  .member-card-studio__group-head h3 {
    font-size: clamp(1.34rem, 5.6vw, 1.86rem);
    line-height: 1.28;
  }

  .member-card-studio__head-actions,
  .member-card-studio__note-actions {
    grid-template-columns: 1fr 1fr;
    display: grid;
  }

  .member-card-studio__preview-viewport {
    padding: 6px;
  }

  .member-card-studio__preview-summary {
    grid-template-columns: 1fr;
  }

  .member-card-studio__copy-card,
  .member-card-studio__portrait-card,
  .member-card-studio__group-card,
  .member-card-studio__note-card {
    padding: 14px;
    border-radius: 18px;
  }

  .member-card-studio__portrait-preview {
    width: min(100%, 180px);
  }

  .member-card-studio__mobile-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .member-card-studio__note-card {
    margin-bottom: 4px;
  }
}
</style>
