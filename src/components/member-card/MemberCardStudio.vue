<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { toPng } from 'html-to-image'
import MemberCardCard from './MemberCardCard.vue'
import { memberCardCopy, memberCardFields, memberCardTemplates, createDefaultMemberCardForm } from '@/data/memberCardContent'
import { useMemberCardStorage } from '@/composables/useMemberCardStorage'
import type {
  MemberCardArchiveRecord,
  MemberCardEditableFieldKey,
  MemberCardFormValue,
  MemberCardTemplateConfig,
  MemberCardTemplateKey,
} from '@/types/memberCard'

/**
 * 组件入参类型
 * 用途：让页面可以控制导出尺寸和少量展示文案
 */
interface MemberCardStudioProps {
  /** 用途：导出宽度 */
  exportWidth?: number
  /** 用途：导出高度 */
  exportHeight?: number
}

const props = withDefaults(defineProps<MemberCardStudioProps>(), {
  exportWidth: 1080,
  exportHeight: 1440,
})

// 这里接入同门名片专用本机存储，负责草稿、档案和删除。
const memberCardStorage = useMemberCardStorage()

// 这里保存当前编辑中的名片内容。
const formValue = ref<MemberCardFormValue>(createDefaultMemberCardForm())

// 这里保存已经归档的同门名片列表。
const archiveList = ref<MemberCardArchiveRecord[]>([])

// 这里记录最近一次成功归档的时间，方便预览区展示。
const lastGeneratedAtText = ref<string>('待生成')

// 这里记录当前动作提示，给用户更明确的反馈。
const actionMessage = ref<string>('先写下七项基础信息，再生成云栖同门名片。')

// 这里记录最近一次错误提示，方便用户知道哪一步出了问题。
const lastError = ref<string>('')

// 这里记录草稿和档案是否还在初始化，避免一加载就立刻写回存储。
const isHydrating = ref<boolean>(true)

// 这里记录是否正在做程序内的批量更新，避免自动保存把编号和时间覆盖掉。
const isProgrammaticChange = ref<boolean>(false)

// 这里保存当前卡片正在展示的编号，保证复制和导出时和页面预览一致。
const activeCardNumber = ref<number>(1)

// 这里保存导出区域根节点，供图片导出和预览缩放使用。
const cardSourceElement = ref<HTMLElement | null>(null)

// 这里保存预览容器节点，方便按容器大小重算缩放比例。
const previewViewportElement = ref<HTMLElement | null>(null)

// 这里保存文件选择框节点，方便清空头像后重新选择同一张图。
const avatarInputElement = ref<HTMLInputElement | null>(null)

// 这里记录是否正在导出，防止用户重复点击保存按钮。
const isExporting = ref<boolean>(false)

// 这里记录预览缩放比例，让页面内看到的卡片和导出结果保持一致。
const previewScale = ref<number>(Math.min(1, 420 / props.exportWidth))

// 这里保存预览尺寸监听器，组件销毁时要记得清理。
let previewResizeObserver: ResizeObserver | null = null

// 这里把模板列表按编号建立映射，方便快速取当前模板。
const templateMap = new Map<MemberCardTemplateKey, MemberCardTemplateConfig>(
  memberCardTemplates.map((template) => [template.key, template]),
)

// 这里准备一个稳定的模板兜底值，避免空映射时类型检查报错。
const fallbackTemplate = memberCardTemplates[0] as MemberCardTemplateConfig

/**
 * 当前模板配置
 * 用途：根据表单里的模板编号切换卡片样式
 */
const currentTemplate = computed<MemberCardTemplateConfig>(() => templateMap.get(formValue.value.templateKey) ?? fallbackTemplate)

/**
 * 当前预计编号
 * 用途：给新同门一个“生成后将成为第几位同门”的实时提示
 */
const previewNumber = computed<number>(() => activeCardNumber.value)

/**
 * 已归档同门数量
 * 用途：给用户展示同门录里已经存了多少位同门
 */
const archiveCount = computed<number>(() => archiveList.value.length)

/**
 * 同门录状态文本
 * 用途：告诉用户当前是本机持久记录还是当前会话记录
 */
const storageModeText = computed<string>(() => (memberCardStorage.storageMode.value === 'local' ? '本机记录模式' : '当前会话模式'))

/**
 * 生成文本版名片内容
 * 用途：把表单内容整理成可直接发群的文字版
 */
const copyText = computed<string>(() => buildCopyText(formValue.value, previewNumber.value))

/**
 * 预览卡片根节点样式
 * 用途：让页面里的预览卡保持和导出图一致的比例
 */
const previewCardStyle = computed<Record<string, string>>(() => ({
  aspectRatio: `${props.exportWidth} / ${props.exportHeight}`,
}))

/**
 * 真正导出节点的样式
 * 用途：把预览卡缩放成导出尺寸，保证截图时排版不走样
 */
const previewSourceStyle = computed<Record<string, string>>(() => ({
  width: `${props.exportWidth}px`,
  height: `${props.exportHeight}px`,
  transform: `scale(${previewScale.value})`,
}))

/**
 * 当前表单是否有头像
 * 用途：控制头像区域显示图片还是默认占位字
 */
const hasAvatar = computed<boolean>(() => Boolean(formValue.value.avatarDataUrl.trim()))

/**
 * 预览区标题文本
 * 用途：给用户明确提示现在看到的是哪一位同门
 */
const previewHeadline = computed<string>(() => {
  const title = normalizeShortText(formValue.value.title, memberCardCopy.generated.fallbackTitle)
  return `${title} · 第 ${String(previewNumber.value).padStart(2, '0')} 位同门`
})

/**
 * 预览区说明文本
 * 用途：说明文字版和图片版分别适合什么场景
 */
const previewLead = computed<string>(() => {
  if (hasAvatar.value) {
    return '当前名片已配置头像，保存图片后会连同头像一起导出。'
  }

  return '当前名片还没上传头像，也能先生成，后面再补图。'
})

/**
 * 生成固定格式的时间文本
 * 用途：把时间戳变成适合名片落款的中文时间
 * 入参：timestamp 为时间戳
 * 返回值：返回中文日期时间文本
 */
function formatDateTime(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)
}

/**
 * 规范化短文本
 * 用途：清理掉容易把卡片撑坏的特殊字符和多余空格
 * 入参：rawValue 为原始文本，fallback 为兜底文本
 * 返回值：返回可直接展示或保存的短文本
 */
function normalizeShortText(rawValue: string, fallback: string): string {
  const safeValue = rawValue
    .replace(/[<>{}\[\]`'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  return safeValue || fallback
}

/**
 * 规范化长文本
 * 用途：保留换行和句意，但清掉多余空白
 * 入参：rawValue 为原始文本，fallback 为兜底文本
 * 返回值：返回可直接展示的长文本
 */
function normalizeLongText(rawValue: string, fallback: string): string {
  const safeValue = rawValue
    .replace(/[<>{}\[\]`'"]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return safeValue || fallback
}

/**
 * 整理草稿内容
 * 用途：把用户当前填写的内容清洗一遍，避免保存和导出时出现脏数据
 * 入参：rawForm 为当前原始表单
 * 返回值：返回清洗后的表单对象
 */
function normalizeFormValue(rawForm: MemberCardFormValue): MemberCardFormValue {
  return {
    title: normalizeShortText(rawForm.title, ''),
    secularName: normalizeShortText(rawForm.secularName, ''),
    region: normalizeShortText(rawForm.region, ''),
    hobbies: normalizeLongText(rawForm.hobbies, ''),
    origin: normalizeLongText(rawForm.origin, ''),
    motto: normalizeLongText(rawForm.motto, ''),
    avatarDataUrl: rawForm.avatarDataUrl.trim(),
    templateKey: rawForm.templateKey,
  }
}

/**
 * 更新单个表单项
 * 用途：把输入框里的最新内容稳稳写回名片表单，避免动态绑定漏值
 * 入参：fieldKey 为字段键名，fieldValue 为用户刚输入的内容
 * 返回值：无返回值
 */
function handleFieldInput(fieldKey: MemberCardEditableFieldKey, fieldValue: string): void {
  formValue.value = {
    ...formValue.value,
    [fieldKey]: fieldValue,
  }
}

/**
 * 读取输入框当前值
 * 用途：把原生输入事件里的内容统一取出来，避免模板里写太多判断
 * 入参：event 为输入事件
 * 返回值：返回当前输入框的文本
 */
function readInputValue(event: Event): string {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement | null
  return target?.value ?? ''
}

/**
 * 生成文字版内容
 * 用途：把表单内容拼成能直接发群的云栖同门录文案
 * 入参：form 为表单内容，number 为编号
 * 返回值：返回排版好的文字内容
 */
function buildCopyText(form: MemberCardFormValue, number: number): string {
  const normalizedForm = normalizeFormValue(form)
  const title = normalizeShortText(normalizedForm.title, memberCardCopy.generated.fallbackTitle)
  const secularName = normalizeShortText(normalizedForm.secularName, '')
  const region = normalizeShortText(normalizedForm.region, memberCardCopy.generated.fallbackRegion)
  const hobbies = normalizeLongText(normalizedForm.hobbies, memberCardCopy.generated.fallbackHobbies)
  const origin = normalizeLongText(normalizedForm.origin, memberCardCopy.generated.fallbackOrigin)
  const motto = normalizeLongText(normalizedForm.motto, memberCardCopy.generated.fallbackMotto)
  const numberText = `第 ${String(number).padStart(2, '0')} 位同门`

  const textLines = [
    memberCardCopy.generated.title,
    `▷ 道号：${title}`,
    secularName ? `▷ 俗世名号：${secularName}` : '',
    `▷ 居所：${region}`,
    `▷ 所好：${hobbies}`,
    `▷ 入栖初心：${origin}`,
    `▷ 一己心语：${motto}`,
    memberCardCopy.generated.divider,
    `${memberCardCopy.generated.signaturePrefix} · ${numberText}`,
    memberCardCopy.generated.yearText,
  ].filter(Boolean)

  return textLines.join('\n')
}

/**
 * 读取文件为 dataUrl
 * 用途：把上传的头像转成浏览器可以直接预览和保存的图片地址
 * 入参：file 为用户选择的头像文件
 * 返回值：返回 dataUrl 字符串
 */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      if (!result) {
        reject(new Error('头像文件读取失败'))
        return
      }

      resolve(result)
    }

    reader.onerror = () => {
      reject(new Error('头像文件读取失败'))
    }

    reader.readAsDataURL(file)
  })
}

/**
 * 压缩头像图片
 * 用途：控制头像体积，避免本机存储被一张大图撑爆
 * 入参：dataUrl 为原始图片地址
 * 返回值：返回压缩后的图片地址
 */
async function compressAvatarDataUrl(dataUrl: string): Promise<string> {
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

      // 这里先铺一层浅色底，避免透明头像导出后出现黑底。
      context.fillStyle = '#f4efe2'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0, canvas.width, canvas.height)

      try {
        resolve(canvas.toDataURL('image/jpeg', 0.88))
      } catch (error) {
        // 这里兜底转图失败，直接回退原图，避免头像上传卡住。
        console.warn('压缩云栖同门头像失败：', error)
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
 * 处理头像文件上传
 * 用途：读取用户选择的头像并压缩后写回表单
 * 入参：event 为文件选择事件
 * 返回值：无返回值
 */
async function handleAvatarChange(event: Event): Promise<void> {
  const inputElement = event.target as HTMLInputElement | null
  const selectedFile = inputElement?.files?.[0]

  if (!selectedFile) {
    return
  }

  if (!selectedFile.type.startsWith('image/')) {
    lastError.value = '头像只能上传图片文件'
    actionMessage.value = lastError.value
    if (avatarInputElement.value) {
      avatarInputElement.value.value = ''
    }
    return
  }

  try {
    const rawDataUrl = await readFileAsDataUrl(selectedFile)
    const compressedDataUrl = await compressAvatarDataUrl(rawDataUrl)
    formValue.value.avatarDataUrl = compressedDataUrl
    actionMessage.value = '头像已载入，保存后会自动写入同门录'
    lastError.value = ''
  } catch (error) {
    // 这里兜底头像读取失败，给用户明确中文提示。
    console.warn('读取云栖同门头像失败：', error)
    lastError.value = '头像读取失败，请换一张图片再试'
    actionMessage.value = lastError.value
  } finally {
    if (avatarInputElement.value) {
      avatarInputElement.value.value = ''
    }
  }
}

/**
 * 清空头像
 * 用途：给用户一个明确的撤回入口
 * 入参：无
 * 返回值：无返回值
 */
function clearAvatar(): void {
  formValue.value.avatarDataUrl = ''
  if (avatarInputElement.value) {
    avatarInputElement.value.value = ''
  }
  actionMessage.value = '头像已清空，可继续编辑'
}

/**
 * 更新预览缩放
 * 用途：让页面内看到的卡片始终按容器大小缩放
 * 入参：无
 * 返回值：无返回值
 */
function updatePreviewScale(): void {
  const viewport = previewViewportElement.value

  if (!viewport) {
    return
  }

  const viewportWidth = viewport.clientWidth
  const viewportHeight = viewport.clientHeight

  if (!viewportWidth || !viewportHeight) {
    return
  }

  const nextScale = Math.min(
    viewportWidth / props.exportWidth,
    viewportHeight / props.exportHeight,
  )

  if (Number.isFinite(nextScale) && nextScale > 0) {
    previewScale.value = nextScale
  }
}

/**
 * 绑定预览尺寸监听
 * 用途：窗口尺寸变化时自动重算缩放比例
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
 * 清理预览尺寸监听
 * 用途：组件销毁时释放监听器，避免残留引用
 * 入参：无
 * 返回值：无返回值
 */
function clearPreviewObserver(): void {
  previewResizeObserver?.disconnect()
  previewResizeObserver = null
}

/**
 * 等待字体加载完成
 * 用途：避免导出图片时字体还没准备好，导致画面和页面不一致
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
    console.warn('等待云栖同门名片字体加载完成失败：', error)
  }
}

/**
 * 等待图片加载完成
 * 用途：确保头像图片真正进入节点后再开始截图
 * 入参：target 为准备导出的节点
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
 * 创建导出舞台
 * 用途：把预览卡克隆到离屏区域，避免页面缩放影响最终导出
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
 * 用途：去掉页面预览时的缩放，只保留原尺寸卡片
 * 入参：source 为页面里的真实卡片节点
 * 返回值：返回可直接用于导出的克隆节点
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
  cloneElement.style.borderRadius = '34px'
  return cloneElement
}

/**
 * 等待导出前状态稳定
 * 用途：确保字体、图片和最新表单都已经就绪，再开始截图
 * 入参：target 为准备导出的节点
 * 返回值：无返回值
 */
async function waitForCardReady(target: HTMLElement): Promise<void> {
  await nextTick()
  await waitForFontsReady()
  await waitForImagesReady(target)
}

/**
 * 导出名片图片
 * 用途：统一生成高清 PNG 图片，供保存和分享使用
 * 入参：无
 * 返回值：成功返回 dataUrl，失败返回 null
 */
async function exportCardImage(): Promise<string | null> {
  const sourceElement = cardSourceElement.value

  if (!sourceElement || typeof document === 'undefined') {
    lastError.value = '名片预览区还没有准备好，请稍后再试'
    actionMessage.value = lastError.value
    return null
  }

  isExporting.value = true
  actionMessage.value = '正在生成高清名片，请稍候...'
  lastError.value = ''

  const exportStage = createExportStage()
  const exportElement = cloneCardElement(sourceElement)

  try {
    document.body.appendChild(exportStage)
    exportStage.appendChild(exportElement)

    await waitForCardReady(exportElement)

    return await toPng(exportElement, {
      cacheBust: true,
      pixelRatio: 1,
      backgroundColor: '#07131b',
      width: props.exportWidth,
      height: props.exportHeight,
      canvasWidth: props.exportWidth,
      canvasHeight: props.exportHeight,
    })
  } catch (error) {
    // 这里兜底截图失败，比如浏览器限制、图片未准备好或节点渲染异常。
    console.warn('导出云栖同门名片失败：', error)
    lastError.value = '保存图片失败，请稍后重试'
    actionMessage.value = lastError.value
    return null
  } finally {
    isExporting.value = false
    exportStage.remove()
  }
}

/**
 * 触发浏览器下载
 * 用途：把导出的图片保存到本地
 * 入参：dataUrl 为图片地址，fileName 为文件名
 * 返回值：成功返回 true，失败返回 false
 */
function downloadCardImage(dataUrl: string, fileName: string): boolean {
  try {
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    return true
  } catch (error) {
    // 这里兜底触发下载失败，避免静默报错。
    console.warn('下载云栖同门名片失败：', error)
    lastError.value = '下载图片失败，请稍后重试'
    actionMessage.value = lastError.value
    return false
  }
}

/**
 * 复制文字版到剪贴板
 * 用途：让用户可以直接把文字版发进微信群
 * 入参：text 为要复制的内容
 * 返回值：复制成功返回 true，失败返回 false
 */
async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (error) {
      // 这里兜底剪贴板权限问题，继续走下面的旧式回退。
      console.warn('现代剪贴板复制失败，准备回退：', error)
    }
  }

  if (typeof document === 'undefined') {
    return false
  }

  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', 'true')
    textarea.style.position = 'fixed'
    textarea.style.left = '-10000px'
    textarea.style.top = '-10000px'
    document.body.appendChild(textarea)
    textarea.select()
    const isCopied = document.execCommand('copy')
    textarea.remove()
    return isCopied
  } catch (error) {
    // 这里兜底旧式复制也失败的情况。
    console.warn('回退复制云栖同门名片文字版失败：', error)
    return false
  }
}

/**
 * 生成并保存栖卡
 * 用途：把当前草稿归档成新的同门记录
 * 入参：无
 * 返回值：无返回值
 */
async function handleGenerateCard(): Promise<void> {
  await nextTick()
  isProgrammaticChange.value = true
  const normalizedForm = normalizeFormValue({ ...formValue.value })
  formValue.value = normalizedForm
  memberCardStorage.saveDraft(normalizedForm)

  const nextArchive = memberCardStorage.appendArchive(normalizedForm)
  archiveList.value = [nextArchive, ...archiveList.value]
  activeCardNumber.value = nextArchive.number
  lastGeneratedAtText.value = formatDateTime(nextArchive.createdAt)
  actionMessage.value = `已归档为第 ${String(nextArchive.number).padStart(2, '0')} 位同门，可直接复制或保存图片。`
  lastError.value = ''
  await nextTick()
  isProgrammaticChange.value = false
}

/**
 * 复制文字版
 * 用途：把排版好的文字版名片复制到剪贴板
 * 入参：无
 * 返回值：无返回值
 */
async function handleCopyText(): Promise<void> {
  const copied = await copyTextToClipboard(copyText.value)

  if (copied) {
    actionMessage.value = '文字版已复制，可直接发到微信群'
    lastError.value = ''
    return
  }

  lastError.value = '复制失败，请手动全选文字版再发群'
  actionMessage.value = lastError.value
}

/**
 * 保存高清图片
 * 用途：导出一张清晰的云栖同门名片 PNG
 * 入参：无
 * 返回值：无返回值
 */
async function handleSaveImage(): Promise<void> {
  const dataUrl = await exportCardImage()

  if (!dataUrl) {
    return
  }

  const fileName = `云栖同门名片-第${String(previewNumber.value).padStart(2, '0')}位同门.png`

  if (downloadCardImage(dataUrl, fileName)) {
    actionMessage.value = '高清名片已开始下载'
    lastError.value = ''
  }
}

/**
 * 沿用某条档案
 * 用途：把历史档案重新放回编辑区，方便同门继续修改
 * 入参：record 为要恢复的档案
 * 返回值：无返回值
 */
async function handleRestoreArchive(record: MemberCardArchiveRecord): Promise<void> {
  isProgrammaticChange.value = true
  formValue.value = {
    ...record.form,
    templateKey: record.form.templateKey ?? 'simple',
  }
  activeCardNumber.value = memberCardStorage.getNextArchiveNumber(archiveList.value)
  actionMessage.value = `已载入第 ${String(record.number).padStart(2, '0')} 位同门的档案，可继续修改。`
  lastError.value = ''

  await nextTick()
  lastGeneratedAtText.value = formatDateTime(record.createdAt)
  isProgrammaticChange.value = false
}

/**
 * 删除一条档案
 * 用途：把不需要的同门记录从本机同门录里移除
 * 入参：recordId 为档案编号
 * 返回值：无返回值
 */
function handleDeleteArchive(recordId: string): void {
  const removed = memberCardStorage.removeArchive(recordId)

  if (!removed) {
    lastError.value = '删除档案失败，请稍后重试'
    actionMessage.value = lastError.value
    return
  }

  archiveList.value = archiveList.value.filter((item) => item.id !== recordId)
  activeCardNumber.value = memberCardStorage.getNextArchiveNumber(archiveList.value)
  actionMessage.value = '档案已删除'
  lastError.value = ''
}

/**
 * 清空草稿
 * 用途：把当前编辑内容恢复到初始状态，但不删除已归档记录
 * 入参：无
 * 返回值：无返回值
 */
function clearDraft(): void {
  isProgrammaticChange.value = true
  formValue.value = createDefaultMemberCardForm()
  activeCardNumber.value = memberCardStorage.getNextArchiveNumber(archiveList.value)
  lastGeneratedAtText.value = '待生成'
  memberCardStorage.clearDraft()
  if (avatarInputElement.value) {
    avatarInputElement.value.value = ''
  }
  actionMessage.value = '草稿已清空，可重新填写'
  lastError.value = ''
  void nextTick().then(() => {
    isProgrammaticChange.value = false
  })
}

/**
 * 处理模板切换
 * 用途：让用户在两套名片样式之间来回切换
 * 入参：templateKey 为模板编号
 * 返回值：无返回值
 */
function handleTemplateChange(templateKey: MemberCardTemplateKey): void {
  formValue.value.templateKey = templateKey
  actionMessage.value = `已切换到「${templateMap.get(templateKey)?.name ?? '当前模板'}」`
}

onMounted(async () => {
  // 这里先把草稿和档案从本机读回来，再开启自动保存，避免初次挂载时误写。
  const storedDraft = memberCardStorage.loadDraft()
  const storedArchives = memberCardStorage.loadArchives()

  if (storedDraft) {
    formValue.value = {
      ...createDefaultMemberCardForm(),
      ...storedDraft,
    }
    lastGeneratedAtText.value = storedArchives[0] ? formatDateTime(storedArchives[0].createdAt) : '待生成'
    actionMessage.value = '已恢复上次填写内容'
  }

  archiveList.value = storedArchives
  activeCardNumber.value = memberCardStorage.getNextArchiveNumber(storedArchives)
  isHydrating.value = false

  await nextTick()
  bindPreviewObserver()
  updatePreviewScale()
})

onBeforeUnmount(() => {
  clearPreviewObserver()
})

// 这里监听草稿变化，用户每输入一次就自动保存一次，刷新页面也不会丢。
watch(
  formValue,
  () => {
    if (isHydrating.value) {
      return
    }

    if (isProgrammaticChange.value) {
      return
    }

    activeCardNumber.value = memberCardStorage.getNextArchiveNumber(archiveList.value)
    lastGeneratedAtText.value = '待生成'
    memberCardStorage.saveDraft(normalizeFormValue(formValue.value))
  },
  {
    deep: true,
  },
)
</script>

<template>
  <section class="member-card-studio" data-reveal>
    <article class="member-card-studio__intro content-card content-card--soft" data-reveal>
      <div class="member-card-studio__intro-top">
        <div class="member-card-studio__intro-copy">
          <p class="eyebrow">填写流程</p>
          <h2>{{ memberCardCopy.banner.title }}</h2>
          <p>{{ memberCardCopy.banner.lead }}</p>
        </div>

        <div class="member-card-studio__status">
          <span class="member-card-studio__status-chip">{{ storageModeText }}</span>
          <span class="member-card-studio__status-chip member-card-studio__status-chip--soft">已归档 {{ archiveCount }} 位同门</span>
        </div>
      </div>

      <div class="member-card-studio__intro-lines">
        <article
          v-for="line in memberCardCopy.introLines"
          :key="line"
          class="member-card-studio__intro-line"
        >
          <p>{{ line }}</p>
        </article>
      </div>

      <div class="member-card-studio__template-switch">
        <button
          v-for="template in memberCardTemplates"
          :key="template.key"
          type="button"
          class="member-card-studio__template-button"
          :class="{ 'member-card-studio__template-button--active': formValue.templateKey === template.key }"
          @click="handleTemplateChange(template.key)"
        >
          <strong>{{ template.name }}</strong>
          <span>{{ template.description }}</span>
        </button>
      </div>
    </article>

    <div class="member-card-studio__editor">
      <article class="member-card-studio__form content-card" data-reveal>
        <div class="section-heading section-heading--compact">
          <p class="eyebrow">基础信息</p>
          <h2>轻量填写，先从道号开始</h2>
          <p>第一项就是道号（宗门称谓），其余六项按顺序补齐，名片会自动帮你排好。</p>
        </div>

        <div class="member-card-studio__avatar">
          <div class="member-card-studio__avatar-head">
            <div>
              <p class="member-card-studio__field-label">自定义头像</p>
              <p class="member-card-studio__field-help">可选上传，图片会自动压缩成适合导出的大小。</p>
            </div>

            <div class="member-card-studio__avatar-actions">
              <label class="ink-button ink-button--secondary member-card-studio__avatar-upload">
                上传头像
                <input
                  ref="avatarInputElement"
                  accept="image/*"
                  class="sr-only"
                  type="file"
                  @change="handleAvatarChange"
                />
              </label>
              <button
                type="button"
                class="ink-button ink-button--ghost"
                :disabled="!formValue.avatarDataUrl"
                @click="clearAvatar"
              >
                清除头像
              </button>
            </div>
          </div>

          <div class="member-card-studio__avatar-preview" :class="{ 'member-card-studio__avatar-preview--empty': !formValue.avatarDataUrl }">
            <img
              v-if="formValue.avatarDataUrl"
              :src="formValue.avatarDataUrl"
              alt="头像预览"
            />
            <div v-else class="member-card-studio__avatar-placeholder" aria-hidden="true">
              <span>栖</span>
            </div>
          </div>
        </div>

        <div class="member-card-studio__field-grid">
          <label
            v-for="field in memberCardFields"
            :key="field.key"
            class="member-card-studio__field"
          >
            <span class="member-card-studio__field-label">{{ field.label }}</span>
            <textarea
              v-if="field.rows"
              :value="formValue[field.key]"
              class="member-card-studio__input member-card-studio__input--textarea"
              :maxlength="field.maxLength"
              :placeholder="field.placeholder"
              :rows="field.rows"
              @input="handleFieldInput(field.key, readInputValue($event))"
            ></textarea>
            <input
              v-else
              :value="formValue[field.key]"
              class="member-card-studio__input"
              :maxlength="field.maxLength"
              :placeholder="field.placeholder"
              type="text"
              @input="handleFieldInput(field.key, readInputValue($event))"
            />
            <span class="member-card-studio__field-help">{{ field.help }}</span>
          </label>
        </div>
      </article>

      <aside class="member-card-studio__preview content-card content-card--soft" data-reveal>
        <div class="member-card-studio__preview-head">
          <div class="section-heading section-heading--compact">
            <p class="eyebrow">最终展示效果</p>
            <h2>{{ previewHeadline }}</h2>
            <p>{{ previewLead }}</p>
          </div>

          <div class="member-card-studio__preview-badges">
            <span class="member-card-studio__status-chip">预计编号：第 {{ String(previewNumber).padStart(2, '0') }} 位</span>
            <span class="member-card-studio__status-chip member-card-studio__status-chip--soft">{{ currentTemplate.name }}</span>
          </div>
        </div>

        <div ref="previewViewportElement" class="member-card-studio__preview-viewport" :style="previewCardStyle">
          <div ref="cardSourceElement" class="member-card-studio__preview-source" :style="previewSourceStyle">
            <MemberCardCard
              :card-subtitle="'云深栖心 · 同道同归'"
              :card-title="memberCardCopy.generated.title"
              :created-at-text="lastGeneratedAtText"
              :divider-text="memberCardCopy.generated.divider"
              :form="formValue"
              :number="previewNumber"
              :reduce-motion="false"
              :signature-prefix="memberCardCopy.generated.signaturePrefix"
              :template="currentTemplate"
              :year-text="memberCardCopy.generated.yearText"
            />
          </div>
        </div>

        <div class="member-card-studio__text-preview">
          <div class="member-card-studio__text-preview-head">
            <p class="member-card-studio__field-label">文字版预览</p>
            <span class="member-card-studio__field-help">复制后可直接发进微信群。</span>
          </div>
          <pre class="member-card-studio__text-box">{{ copyText }}</pre>
        </div>
      </aside>
    </div>

    <section class="member-card-studio__archive content-card" data-reveal>
      <div class="section-heading section-heading--compact">
        <p class="eyebrow">云栖同门录</p>
        <h2>{{ memberCardCopy.archive.title }}</h2>
        <p>{{ memberCardCopy.archive.lead }}</p>
      </div>

      <div v-if="archiveList.length" class="member-card-studio__archive-list">
        <article
          v-for="record in archiveList"
          :key="record.id"
          class="member-card-studio__archive-item"
        >
          <div class="member-card-studio__archive-item-head">
            <div>
              <p class="member-card-studio__archive-number">第 {{ String(record.number).padStart(2, '0') }} 位同门</p>
              <h3>{{ record.form.title || memberCardCopy.generated.fallbackTitle }}</h3>
            </div>

            <span class="member-card-studio__archive-tag">{{ templateMap.get(record.form.templateKey)?.name ?? '极简素雅' }}</span>
          </div>

          <p class="member-card-studio__archive-copy">
            {{ record.form.region || memberCardCopy.generated.fallbackRegion }} · {{ formatDateTime(record.createdAt) }}
          </p>

          <p class="member-card-studio__archive-summary">
            {{ normalizeLongText(record.form.motto, memberCardCopy.generated.fallbackMotto) }}
          </p>

          <div class="member-card-studio__archive-actions">
            <button type="button" class="ink-button ink-button--secondary" @click="handleRestoreArchive(record)">
              沿用此名片
            </button>
            <button type="button" class="ink-button ink-button--ghost" @click="handleDeleteArchive(record.id)">
              删除档案
            </button>
          </div>
        </article>
      </div>

      <div v-else class="member-card-studio__archive-empty">
        <p>{{ memberCardCopy.archive.empty }}</p>
      </div>
    </section>

    <div class="member-card-studio__action-bar">
      <div class="member-card-studio__action-copy">
        <p class="member-card-studio__field-label">当前提示</p>
        <p class="member-card-studio__action-message">{{ lastError || actionMessage }}</p>
      </div>

      <div class="member-card-studio__action-buttons">
        <button type="button" class="ink-button ink-button--secondary" @click="handleCopyText">
          复制文字版
        </button>
        <button type="button" class="ink-button ink-button--primary" :disabled="isExporting" @click="handleSaveImage">
          {{ isExporting ? '正在保存...' : '保存高清图' }}
        </button>
        <button type="button" class="ink-button ink-button--ghost" @click="handleGenerateCard">
          生成栖卡
        </button>
        <button type="button" class="ink-button ink-button--ghost" @click="clearDraft">
          清空草稿
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.member-card-studio {
  position: relative;
  display: grid;
  gap: 20px;
  padding-bottom: 156px;
}

.member-card-studio__intro {
  display: grid;
  gap: 18px;
}

.member-card-studio__intro-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.member-card-studio__intro-copy {
  max-width: 760px;
}

.member-card-studio__intro-copy h2,
.member-card-studio__preview-head h2,
.member-card-studio__archive h2 {
  margin: 0 0 12px;
  font-size: clamp(1.55rem, 3vw, 2.2rem);
  line-height: 1.24;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.member-card-studio__intro-copy p,
.member-card-studio__preview-head p,
.member-card-studio__archive p {
  margin: 0;
  color: var(--color-text-soft);
  line-height: 1.8;
}

.member-card-studio__status {
  display: grid;
  gap: 10px;
  justify-items: end;
  text-align: right;
}

.member-card-studio__status-chip {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(216, 185, 114, 0.2);
  background: rgba(7, 31, 43, 0.44);
  color: var(--color-gold-strong);
  font-size: 0.84rem;
  letter-spacing: 0.08em;
}

.member-card-studio__status-chip--soft {
  color: var(--color-text-soft);
}

.member-card-studio__intro-lines {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.member-card-studio__intro-line {
  padding: 16px 18px;
  border-radius: 18px;
  border: 1px solid rgba(147, 203, 198, 0.14);
  background: rgba(7, 27, 37, 0.48);
}

.member-card-studio__intro-line p {
  margin: 0;
  color: var(--color-text-soft);
  line-height: 1.75;
}

.member-card-studio__template-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.member-card-studio__template-button {
  display: grid;
  gap: 8px;
  width: 100%;
  padding: 16px 18px;
  border: 1px solid rgba(147, 203, 198, 0.14);
  border-radius: 20px;
  background: rgba(7, 27, 37, 0.46);
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
  transition:
    transform var(--transition-base),
    border-color var(--transition-base),
    box-shadow var(--transition-base),
    background-color var(--transition-base);
}

.member-card-studio__template-button:hover {
  transform: translateY(-2px);
}

.member-card-studio__template-button--active {
  border-color: rgba(216, 185, 114, 0.38);
  background: linear-gradient(135deg, rgba(216, 185, 114, 0.12), rgba(7, 31, 43, 0.82));
  box-shadow: 0 16px 30px rgba(216, 185, 114, 0.1);
}

.member-card-studio__template-button strong {
  font-size: 1rem;
}

.member-card-studio__template-button span {
  color: var(--color-text-soft);
  line-height: 1.72;
}

.member-card-studio__editor {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.04fr);
  gap: 20px;
  align-items: start;
}

.member-card-studio__form,
.member-card-studio__preview,
.member-card-studio__archive {
  display: grid;
  gap: 18px;
}

.section-heading--compact h2 {
  margin-bottom: 10px;
  font-size: clamp(1.3rem, 2.7vw, 1.95rem);
}

.section-heading--compact p {
  max-width: 760px;
}

.member-card-studio__avatar {
  display: grid;
  gap: 14px;
}

.member-card-studio__avatar-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.member-card-studio__avatar-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.member-card-studio__avatar-upload {
  position: relative;
  overflow: hidden;
}

.member-card-studio__avatar-preview {
  display: grid;
  width: min(100%, 220px);
  aspect-ratio: 1 / 1;
  place-items: center;
  overflow: hidden;
  border-radius: 26px;
  border: 1px solid rgba(216, 185, 114, 0.18);
  background:
    radial-gradient(circle at 32% 28%, rgba(139, 208, 203, 0.16), transparent 30%),
    linear-gradient(180deg, rgba(8, 29, 40, 0.9), rgba(6, 19, 27, 0.96));
}

.member-card-studio__avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.member-card-studio__avatar-preview--empty {
  background:
    radial-gradient(circle at 32% 28%, rgba(216, 185, 114, 0.22), transparent 30%),
    linear-gradient(180deg, rgba(8, 29, 40, 0.9), rgba(6, 19, 27, 0.96));
}

.member-card-studio__avatar-placeholder {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
}

.member-card-studio__avatar-placeholder span {
  font-size: clamp(2.2rem, 6vw, 3.4rem);
  letter-spacing: 0.18em;
  color: var(--color-gold-strong);
}

.member-card-studio__field-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.member-card-studio__field {
  display: grid;
  gap: 10px;
}

.member-card-studio__field-label {
  color: var(--color-cyan);
  letter-spacing: 0.16em;
  font-size: 0.82rem;
  text-transform: uppercase;
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
  color: rgba(244, 239, 226, 0.42);
}

.member-card-studio__input:focus {
  border-color: rgba(216, 185, 114, 0.34);
  box-shadow: 0 0 0 3px rgba(216, 185, 114, 0.1);
}

.member-card-studio__input--textarea {
  min-height: 100px;
  line-height: 1.8;
}

.member-card-studio__preview-head {
  display: grid;
  gap: 14px;
}

.member-card-studio__preview-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.member-card-studio__preview-viewport {
  display: grid;
  place-items: center;
  width: 100%;
  min-height: 520px;
  padding: 12px;
  border-radius: 26px;
  background:
    linear-gradient(180deg, rgba(8, 29, 40, 0.52), rgba(5, 18, 28, 0.72)),
    rgba(5, 18, 28, 0.66);
  overflow: hidden;
}

.member-card-studio__preview-source {
  transform-origin: top left;
}

.member-card-studio__text-preview {
  display: grid;
  gap: 12px;
}

.member-card-studio__text-preview-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.member-card-studio__text-box {
  margin: 0;
  padding: 16px 18px;
  border-radius: 18px;
  border: 1px solid rgba(216, 185, 114, 0.16);
  background: rgba(5, 19, 28, 0.56);
  color: rgba(244, 239, 226, 0.9);
  line-height: 1.78;
  white-space: pre-wrap;
  word-break: break-word;
}

.member-card-studio__archive-list {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.member-card-studio__archive-item {
  display: grid;
  gap: 12px;
  padding: 18px;
  border: 1px solid rgba(147, 203, 198, 0.14);
  border-radius: 22px;
  background: rgba(7, 27, 37, 0.5);
}

.member-card-studio__archive-item-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.member-card-studio__archive-number {
  margin: 0 0 8px;
  color: var(--color-cyan);
  letter-spacing: 0.16em;
  font-size: 0.78rem;
  text-transform: uppercase;
}

.member-card-studio__archive-item h3 {
  margin: 0;
  font-size: 1.28rem;
  line-height: 1.38;
  overflow-wrap: anywhere;
}

.member-card-studio__archive-tag {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(216, 185, 114, 0.16);
  background: rgba(7, 31, 43, 0.42);
  color: var(--color-gold-strong);
  font-size: 0.8rem;
  white-space: nowrap;
}

.member-card-studio__archive-copy,
.member-card-studio__archive-summary {
  margin: 0;
  color: var(--color-text-soft);
  line-height: 1.76;
}

.member-card-studio__archive-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.member-card-studio__archive-empty {
  padding: 24px 18px;
  border-radius: 18px;
  border: 1px dashed rgba(216, 185, 114, 0.2);
  background: rgba(7, 27, 37, 0.46);
}

.member-card-studio__archive-empty p {
  margin: 0;
  color: var(--color-text-soft);
}

.member-card-studio__action-bar {
  position: fixed;
  left: 50%;
  bottom: calc(20px + env(safe-area-inset-bottom));
  z-index: 12;
  display: grid;
  gap: 14px;
  width: min(1120px, calc(100vw - 28px));
  padding: 18px 20px;
  border: 1px solid rgba(216, 185, 114, 0.22);
  border-radius: 26px;
  background:
    linear-gradient(180deg, rgba(8, 29, 40, 0.96), rgba(5, 18, 28, 0.98)),
    rgba(5, 18, 28, 0.94);
  box-shadow: var(--shadow-soft);
  backdrop-filter: blur(22px);
  transform: translateX(-50%);
}

.member-card-studio__action-copy {
  display: grid;
  gap: 8px;
}

.member-card-studio__action-message {
  margin: 0;
  color: var(--color-text-soft);
  line-height: 1.72;
}

.member-card-studio__action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: space-between;
}

.member-card-studio__action-buttons .ink-button {
  flex: 1 1 180px;
}

@media (max-width: 1180px) {
  .member-card-studio__intro-lines,
  .member-card-studio__archive-list {
    grid-template-columns: 1fr 1fr;
  }

  .member-card-studio__editor {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 920px) {
  .member-card-studio__intro-top,
  .member-card-studio__avatar-head,
  .member-card-studio__text-preview-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .member-card-studio__status {
    justify-items: start;
    text-align: left;
  }

  .member-card-studio__intro-lines,
  .member-card-studio__template-switch,
  .member-card-studio__field-grid,
  .member-card-studio__archive-list {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .member-card-studio {
    gap: 12px;
    padding-bottom: calc(24px + env(safe-area-inset-bottom));
  }

  .member-card-studio__intro,
  .member-card-studio__form,
  .member-card-studio__preview,
  .member-card-studio__archive {
    gap: 12px;
  }

  .member-card-studio__intro-copy h2,
  .member-card-studio__preview-head h2,
  .member-card-studio__archive h2 {
    font-size: clamp(1.32rem, 5.6vw, 1.82rem);
    line-height: 1.26;
  }

  .member-card-studio__intro-line,
  .member-card-studio__template-button,
  .member-card-studio__archive-item,
  .member-card-studio__archive-empty,
  .member-card-studio__action-bar {
    border-radius: 18px;
  }

  .member-card-studio__template-button,
  .member-card-studio__field,
  .member-card-studio__archive-item {
    padding: 12px 12px;
  }

  .member-card-studio__avatar-preview {
    width: min(100%, 160px);
  }

  .member-card-studio__preview-viewport {
    width: min(100%, 324px);
    margin-inline: auto;
    padding: 6px;
  }

  .member-card-studio__action-bar {
    position: static;
    left: auto;
    bottom: auto;
    width: 100%;
    margin-top: 4px;
    padding: 12px 12px 14px;
    transform: none;
  }

  .member-card-studio__preview-badges {
    gap: 8px;
  }

  .member-card-studio__text-box {
    padding: 14px;
    font-size: 0.92rem;
    line-height: 1.72;
  }

  .member-card-studio__archive-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .member-card-studio__archive-actions .ink-button {
    width: 100%;
    min-width: 0;
  }

  .member-card-studio__action-copy {
    gap: 4px;
  }

  .member-card-studio__action-message,
  .member-card-studio__field-help,
  .member-card-studio__archive-copy,
  .member-card-studio__archive-summary,
  .member-card-studio__template-button span,
  .member-card-studio__intro-line p {
    line-height: 1.68;
  }

  .member-card-studio__action-buttons {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .member-card-studio__action-buttons .ink-button {
    width: 100%;
    min-width: 0;
    min-height: 42px;
    padding: 10px 12px;
    font-size: 0.92rem;
  }
}
</style>
