<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { toPng } from 'html-to-image'
import MemberCardCard from './MemberCardCard.vue'
import { createDefaultMemberCardForm, memberCardCopy, memberCardFields, memberCardTemplates } from '@/data/memberCardContent'
import { useMemberCardStorage } from '@/composables/useMemberCardStorage'
import type {
  MemberCardArchiveRecord,
  MemberCardFormValue,
  MemberCardTemplateConfig,
  MemberCardTemplateKey,
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
  exportHeight: 1320,
})

// 这里接入同门名帖专用本机存储，负责草稿、档案和删除。
const memberCardStorage = useMemberCardStorage()

// 这里保存当前编辑中的名帖内容。
const formValue = ref<MemberCardFormValue>(createDefaultMemberCardForm())

// 这里保存已经归档的同门名帖列表。
const archiveList = ref<MemberCardArchiveRecord[]>([])

// 这里记录当前门帖正在展示的编号，保证预览和导出一致。
const activeCardNumber = ref<number>(1)

// 这里记录最近一次生成或沿用的时间，方便预览区展示。
const lastGeneratedAtText = ref<string>('待生成')

// 这里记录当前动作提示，给用户更明确的反馈。
const actionMessage = ref<string>('先写道号、短签与初心，再生成云栖门帖。')

// 这里记录最近一次错误提示，方便用户知道哪一步出了问题。
const lastError = ref<string>('')

// 这里记录草稿和档案是否还在初始化，避免一加载就立刻写回存储。
const isHydrating = ref<boolean>(true)

// 这里记录是否正在做程序内的批量更新，避免自动保存把编号和时间覆盖掉。
const isProgrammaticChange = ref<boolean>(false)

// 这里保存当前名帖正在导出的根节点。
const cardSourceElement = ref<HTMLElement | null>(null)

// 这里保存预览容器节点，方便按容器大小重算缩放比例。
const previewViewportElement = ref<HTMLElement | null>(null)

// 这里保存文件选择框节点，方便清空头像后重新选择同一张图。
const avatarInputElement = ref<HTMLInputElement | null>(null)

// 这里记录是否正在导出，防止用户重复点击保存按钮。
const isExporting = ref<boolean>(false)

// 这里记录预览缩放比例，让页面内看到的门帖和导出结果保持一致。
const previewScale = ref<number>(Math.min(1, 400 / props.exportWidth))

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
 * 用途：根据表单里的模板编号切换门帖样式
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
 * 规范化后的表单
 * 用途：统一清洗表单内容，供预览和复制使用
 */
const normalizedForm = computed<MemberCardFormValue>(() => normalizeMemberCardFormValue(formValue.value))

/**
 * 生成文字版名帖内容
 * 用途：把表单内容整理成可直接发群的文字版
 */
const copyText = computed<string>(() => buildCopyText(normalizedForm.value, previewNumber.value, lastGeneratedAtText.value))

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
 * 预览区标题文本
 * 用途：给用户明确提示现在看到的是哪一位同门
 */
const previewHeadline = computed<string>(() => (
  `${normalizeMemberCardShortText(normalizedForm.value.daoName, memberCardCopy.generated.fallbackDaoName)} · ${formatMemberCardNumber(previewNumber.value)}`
))

/**
 * 预览区说明文本
 * 用途：说明当前门帖为什么看起来就是最终效果
 */
const previewLead = computed<string>(() => {
  if (formValue.value.avatarDataUrl.trim()) {
    return '头像已入册，预览与下载会连同头像一起导出。'
  }

  if (shortTagList.value.length > 1) {
    return '短签已自动拆开，当前看到的就是最终导出版式。'
  }

  return '预览与下载共用同一张门帖，填写完成后即可直接保存。'
})

/**
 * 门中短签列表
 * 用途：把短签拆成几枚标签，减少空白并让卡面更像门派名帖
 */
const shortTagList = computed<string[]>(() => splitMemberCardTags(normalizedForm.value.shortTags, memberCardCopy.generated.fallbackShortTags))

/**
 * 生成年份与时记文本
 * 用途：把最后一次生成时间整理成适合展示的文本
 */
const generatedAtLabel = computed<string>(() => {
  const safeText = lastGeneratedAtText.value.trim()
  return safeText && safeText !== '待生成' ? safeText : '刚刚制成'
})

/**
 * 生成文字版内容
 * 用途：把表单内容拼成能直接发群的云栖门帖文案
 * 入参：form 为表单内容，number 为编号，createdAtText 为生成时间
 * 返回值：返回排版好的文字内容
 */
function buildCopyText(form: MemberCardFormValue, number: number, createdAtText: string): string {
  const daoName = normalizeMemberCardShortText(form.daoName, memberCardCopy.generated.fallbackDaoName)
  const worldName = normalizeMemberCardShortText(form.worldName, memberCardCopy.generated.fallbackWorldName)
  const residence = normalizeMemberCardShortText(form.residence, memberCardCopy.generated.fallbackResidence)
  const shortTags = splitMemberCardTags(form.shortTags, memberCardCopy.generated.fallbackShortTags).join('、')
  const origin = normalizeMemberCardLongText(form.origin, memberCardCopy.generated.fallbackOrigin)
  const motto = normalizeMemberCardLongText(form.motto, memberCardCopy.generated.fallbackMotto)
  const safeCreatedAt = createdAtText.trim() && createdAtText.trim() !== '待生成'
    ? createdAtText.trim()
    : '刚刚制成'

  return [
    memberCardCopy.generated.title,
    memberCardCopy.generated.subtitle,
    `▷ 道号：${daoName}`,
    `▷ 俗世名号：${worldName}`,
    `▷ 所居地域：${residence}`,
    `▷ 门中短签：${shortTags}`,
    `▷ 入栖初心：${origin}`,
    `▷ 心之所语：${motto}`,
    '——————————',
    `${memberCardCopy.generated.signaturePrefix} · ${formatMemberCardNumber(number)}`,
    `${memberCardCopy.generated.yearText} · ${safeCreatedAt}`,
  ].join('\n')
}

/**
 * 统一应用表单内容
 * 用途：在初始化、恢复档案和清空草稿时，避免自动保存误触
 * 入参：nextForm 为要写回的表单内容
 * 返回值：无返回值
 */
async function applyFormValue(nextForm: MemberCardFormValue): Promise<void> {
  isProgrammaticChange.value = true
  formValue.value = normalizeMemberCardFormValue(nextForm)
  await nextTick()
  isProgrammaticChange.value = false
}

/**
 * 规范化草稿内容
 * 用途：把用户当前填写的内容清洗一遍，避免保存和导出时出现脏数据
 * 入参：无
 * 返回值：返回清洗后的表单对象
 */
function normalizeDraft(): MemberCardFormValue {
  return normalizeMemberCardFormValue(formValue.value)
}

/**
 * 复制文字版内容
 * 用途：把整理好的文字版名帖复制到剪贴板
 * 入参：text 为要复制的内容
 * 返回值：复制成功返回 true，失败返回 false
 */
async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (error) {
      // 这里兜底剪贴板接口异常，继续走传统复制方式，不让功能直接失效。
      console.warn('剪贴板写入失败，准备改用备用复制方式：', error)
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
    console.warn('备用复制方式失败：', error)
    return false
  } finally {
    textarea.remove()
  }
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
 * 切换模板
 * 用途：在清雅门帖和朱印典藏之间切换
 * 入参：templateKey 为目标模板编号
 * 返回值：无返回值
 */
function handleTemplateSwitch(templateKey: MemberCardTemplateKey): void {
  if (formValue.value.templateKey === templateKey) {
    return
  }

  formValue.value.templateKey = templateKey
  actionMessage.value = `已切换到「${templateMap.get(templateKey)?.name ?? '当前模板'}」`
}

/**
 * 更新预览缩放
 * 用途：让页面内看到的门帖始终按容器大小缩放
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
    console.warn('等待云栖同门门帖字体加载完成失败：', error)
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
 * 用途：把预览门帖克隆到离屏区域，避免页面缩放影响最终导出
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
 * 用途：去掉页面预览时的缩放，只保留原尺寸门帖
 * 入参：source 为页面里的真实门帖节点
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
  cloneElement.style.borderRadius = '38px'
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
 * 导出名帖图片
 * 用途：统一生成高清 PNG 图片，供保存和分享使用
 * 入参：无
 * 返回值：成功返回图片地址和文件名，失败返回 null
 */
async function exportCardImage(): Promise<{ dataUrl: string; fileName: string } | null> {
  const sourceElement = cardSourceElement.value

  if (!sourceElement || typeof document === 'undefined') {
    lastError.value = '名帖预览区还没有准备好，请稍后再试'
    actionMessage.value = lastError.value
    return null
  }

  isExporting.value = true
  actionMessage.value = '正在生成高清名帖，请稍候...'
  lastError.value = ''

  const exportStage = createExportStage()
  const exportElement = cloneCardElement(sourceElement)

  try {
    document.body.appendChild(exportStage)
    exportStage.appendChild(exportElement)

    await waitForCardReady(exportElement)

    const dataUrl = await toPng(exportElement, {
      cacheBust: true,
      pixelRatio: 1,
      backgroundColor: '#06131b',
      width: props.exportWidth,
      height: props.exportHeight,
      canvasWidth: props.exportWidth,
      canvasHeight: props.exportHeight,
    })

    const fileName = `云栖派名帖-${Date.now()}.png`
    actionMessage.value = '名帖生成成功'
    return { dataUrl, fileName }
  } catch (error) {
    // 这里兜底截图失败，比如克隆节点未渲染完成或浏览器截图能力受限。
    console.warn('导出云栖同门名帖失败：', error)
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
function downloadPoster(dataUrl: string, fileName: string): boolean {
  try {
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    return true
  } catch (error) {
    // 这里兜底下载触发失败，避免浏览器环境异常时静默失败。
    console.warn('触发名帖下载失败：', error)
    lastError.value = '下载名帖失败，请稍后重试'
    actionMessage.value = lastError.value
    return false
  }
}

/**
 * 复制文字版
 * 用途：把排好的文字版名帖复制到剪贴板
 * 入参：无
 * 返回值：无返回值
 */
async function handleCopyText(): Promise<void> {
  const copied = await copyTextToClipboard(copyText.value)

  if (copied) {
    actionMessage.value = '文字版已复制，可直接发进微信群'
    lastError.value = ''
    return
  }

  lastError.value = '复制失败，请手动选择文字后再试'
  actionMessage.value = lastError.value
}

/**
 * 保存名帖图片
 * 用途：导出并下载高清门帖图片
 * 入参：无
 * 返回值：无返回值
 */
async function handleSaveImage(): Promise<void> {
  const exported = await exportCardImage()

  if (!exported) {
    return
  }

  if (downloadPoster(exported.dataUrl, exported.fileName)) {
    actionMessage.value = '名帖已开始下载'
    lastError.value = ''
  }
}

/**
 * 生成门帖并归档
 * 用途：把当前填写内容写入本机同门录，并顺延门派编号
 * 入参：无
 * 返回值：无返回值
 */
function handleGenerateCard(): void {
  const normalizedFormValue = normalizeDraft()
  const nextArchive = memberCardStorage.appendArchive(normalizedFormValue)
  archiveList.value = memberCardStorage.loadArchives()
  activeCardNumber.value = nextArchive.number
  lastGeneratedAtText.value = formatMemberCardDateTime(nextArchive.createdAt)
  actionMessage.value = `名帖已生成并归档为第 ${String(nextArchive.number).padStart(2, '0')} 位同门`
  lastError.value = ''
}

/**
 * 恢复同门档案
 * 用途：把某一张已生成的名帖重新拿来继续编辑
 * 入参：record 为要恢复的档案
 * 返回值：无返回值
 */
async function handleRestoreArchive(record: MemberCardArchiveRecord): Promise<void> {
  await applyFormValue(record.form)
  activeCardNumber.value = record.number
  lastGeneratedAtText.value = formatMemberCardDateTime(record.createdAt)
  actionMessage.value = `已沿用第 ${String(record.number).padStart(2, '0')} 位同门名帖，可以继续修改`
  lastError.value = ''
}

/**
 * 删除档案
 * 用途：允许用户从同门录里移除某一条记录
 * 入参：archiveId 为要删除的档案编号
 * 返回值：无返回值
 */
function handleDeleteArchive(archiveId: string): void {
  const removed = memberCardStorage.removeArchive(archiveId)

  if (!removed) {
    lastError.value = '删除档案失败，请稍后重试'
    actionMessage.value = lastError.value
    return
  }

  archiveList.value = memberCardStorage.loadArchives()
  activeCardNumber.value = memberCardStorage.getNextArchiveNumber(archiveList.value)
  actionMessage.value = '档案已删除'
  lastError.value = ''
}

/**
 * 清空草稿
 * 用途：把当前编辑内容彻底清空
 * 入参：无
 * 返回值：无返回值
 */
async function clearDraft(): Promise<void> {
  const resetForm = createDefaultMemberCardForm()
  const cleared = memberCardStorage.clearDraft()

  if (!cleared) {
    lastError.value = '清空草稿失败，请稍后重试'
    actionMessage.value = lastError.value
    return
  }

  await applyFormValue(resetForm)
  activeCardNumber.value = memberCardStorage.getNextArchiveNumber(archiveList.value)
  lastGeneratedAtText.value = '待生成'
  actionMessage.value = '草稿已清空，可重新开始填写'
  lastError.value = ''
}

/**
 * 初始化名帖页
 * 用途：页面加载后恢复草稿和同门录
 * 入参：无
 * 返回值：无返回值
 */
async function initializeStudio(): Promise<void> {
  archiveList.value = memberCardStorage.loadArchives()
  activeCardNumber.value = memberCardStorage.getNextArchiveNumber(archiveList.value)

  const savedDraft = memberCardStorage.loadDraft()

  if (savedDraft) {
    await applyFormValue(savedDraft)
    actionMessage.value = '已恢复上次草稿，可以继续往下写'
  } else {
    await applyFormValue(createDefaultMemberCardForm())
    actionMessage.value = memberCardCopy.banner.lead
  }

  lastError.value = ''
  await nextTick()
  isHydrating.value = false
  bindPreviewObserver()
  updatePreviewScale()
}

// 这里监听表单变化，等初始化结束后自动保存草稿。
watch(
  () => formValue.value,
  () => {
    if (isHydrating.value || isProgrammaticChange.value) {
      return
    }

    memberCardStorage.saveDraft(normalizeDraft())
  },
  { deep: true },
)

// 这里监听导出尺寸变化，保证预览缩放比例始终和真实尺寸同步。
watch(
  () => [props.exportWidth, props.exportHeight],
  async () => {
    await nextTick()
    updatePreviewScale()
  },
)

onMounted(() => {
  void initializeStudio()
})

onBeforeUnmount(() => {
  clearPreviewObserver()
})
</script>

<template>
  <section class="member-card-studio">
    <article class="member-card-studio__hero content-card content-card--soft" data-reveal>
      <div class="member-card-studio__hero-copy">
        <p class="eyebrow">{{ memberCardCopy.banner.eyebrow }}</p>
        <h2>{{ memberCardCopy.banner.title }}</h2>
        <p>{{ memberCardCopy.banner.lead }}</p>

        <div class="member-card-studio__hero-meta">
          <span class="member-card-studio__hero-chip">同门录：{{ archiveCount }} 位</span>
          <span class="member-card-studio__hero-chip">存储：{{ storageModeText }}</span>
          <span class="member-card-studio__hero-chip">{{ currentTemplate.name }}</span>
        </div>

        <p class="member-card-studio__hero-note">{{ memberCardCopy.banner.note }}</p>
      </div>

      <div class="member-card-studio__hero-actions">
        <button type="button" class="ink-button ink-button--primary" @click="handleGenerateCard">
          生成门帖
        </button>
        <button type="button" class="ink-button ink-button--secondary" @click="handleCopyText">
          复制文字版
        </button>
        <button type="button" class="ink-button ink-button--ghost" @click="handleSaveImage">
          保存高清图
        </button>
      </div>
    </article>

    <div class="member-card-studio__workspace">
      <aside class="member-card-studio__preview content-card content-card--soft" data-reveal>
        <div class="member-card-studio__preview-head">
          <div class="section-heading section-heading--compact">
            <p class="eyebrow">门帖预览</p>
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
              :card-subtitle="memberCardCopy.generated.subtitle"
              :card-title="memberCardCopy.generated.title"
              :created-at-text="generatedAtLabel"
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

      <article class="member-card-studio__form content-card" data-reveal>
        <div class="section-heading section-heading--compact">
          <p class="eyebrow">基础信息</p>
          <h2>轻量填写，先从道号开始</h2>
          <p>先把道号、俗世名号、所居地域与门中短签写好，门帖会自动排成更有江湖味的样子。</p>
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

        <div class="member-card-studio__template-switch">
          <button
            v-for="template in memberCardTemplates"
            :key="template.key"
            type="button"
            class="member-card-studio__template-button"
            :class="{ 'member-card-studio__template-button--active': formValue.templateKey === template.key }"
            @click="handleTemplateSwitch(template.key)"
          >
            <strong>{{ template.name }}</strong>
            <span>{{ template.description }}</span>
          </button>
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
              v-model="formValue[field.key]"
              class="member-card-studio__input member-card-studio__input--textarea"
              :maxlength="field.maxLength"
              :placeholder="field.placeholder"
              :rows="field.rows"
            ></textarea>
            <input
              v-else
              v-model="formValue[field.key]"
              class="member-card-studio__input"
              :maxlength="field.maxLength"
              :placeholder="field.placeholder"
              type="text"
            />
            <span class="member-card-studio__field-help">{{ field.help }}</span>
          </label>
        </div>
      </article>
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
          <div class="member-card-studio__archive-head">
            <div>
              <p class="member-card-studio__archive-number">第 {{ String(record.number).padStart(2, '0') }} 位同门</p>
              <h3 class="member-card-studio__archive-title">{{ record.form.daoName || memberCardCopy.generated.fallbackDaoName }}</h3>
            </div>

            <span class="member-card-studio__archive-badge">{{ templateMap.get(record.form.templateKey)?.name ?? fallbackTemplate.name }}</span>
          </div>

          <p class="member-card-studio__archive-meta">
            {{ record.form.residence || memberCardCopy.generated.fallbackResidence }} · {{ formatMemberCardDateTime(record.createdAt) }}
          </p>

          <div class="member-card-studio__archive-tags">
            <span
              v-for="tag in splitMemberCardTags(record.form.shortTags, memberCardCopy.generated.fallbackShortTags)"
              :key="`${record.id}-${tag}`"
              class="member-card-studio__archive-tag"
            >
              {{ tag }}
            </span>
          </div>

          <p class="member-card-studio__archive-summary">
            {{ normalizeMemberCardLongText(record.form.motto, memberCardCopy.generated.fallbackMotto) }}
          </p>

          <div class="member-card-studio__archive-actions">
            <button type="button" class="ink-button ink-button--secondary" @click="handleRestoreArchive(record)">
              沿用此名帖
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
          生成门帖
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
  padding-bottom: 192px;
}

.member-card-studio__hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px;
  align-items: start;
}

.member-card-studio__hero-copy {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.member-card-studio__hero-copy h2,
.member-card-studio__preview-head h2,
.member-card-studio__archive h2 {
  margin: 0;
  font-size: clamp(1.48rem, 3vw, 2.1rem);
  line-height: 1.24;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.member-card-studio__hero-copy p,
.member-card-studio__preview-head p,
.member-card-studio__archive p {
  margin: 0;
  color: var(--color-text-soft);
  line-height: 1.8;
}

.member-card-studio__hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.member-card-studio__hero-chip,
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

.member-card-studio__hero-note {
  color: var(--color-text-faint) !important;
  font-size: 0.92rem;
  line-height: 1.7;
}

.member-card-studio__hero-actions {
  display: grid;
  gap: 10px;
  justify-items: end;
}

.member-card-studio__hero-actions .ink-button {
  min-width: 176px;
}

.member-card-studio__workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.02fr) minmax(0, 0.98fr);
  gap: 20px;
  align-items: start;
}

.member-card-studio__preview,
.member-card-studio__form,
.member-card-studio__archive {
  display: grid;
  gap: 16px;
}

.member-card-studio__preview {
  order: 1;
}

.member-card-studio__form {
  order: 2;
}

.member-card-studio__preview-head {
  display: grid;
  gap: 12px;
}

.member-card-studio__preview-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.member-card-studio__preview-viewport {
  display: grid;
  place-items: center;
  width: 100%;
  min-height: 560px;
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
  gap: 10px;
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
  width: min(100%, 240px);
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
  min-height: 104px;
  line-height: 1.8;
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

.member-card-studio__archive-head {
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
}

.member-card-studio__archive-title {
  margin: 0;
  font-size: 1.28rem;
  line-height: 1.38;
  overflow-wrap: anywhere;
}

.member-card-studio__archive-badge {
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

.member-card-studio__archive-meta,
.member-card-studio__archive-summary {
  margin: 0;
  color: var(--color-text-soft);
  line-height: 1.76;
}

.member-card-studio__archive-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.member-card-studio__archive-tag {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(216, 185, 114, 0.16);
  background: rgba(8, 31, 43, 0.42);
  color: #f0dfb0;
  font-size: 0.82rem;
  letter-spacing: 0.06em;
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
  padding: 16px 18px;
  border: 1px solid rgba(216, 185, 114, 0.22);
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(8, 29, 40, 0.96), rgba(5, 18, 28, 0.98)),
    rgba(5, 18, 28, 0.94);
  box-shadow: var(--shadow-soft);
  backdrop-filter: blur(22px);
  transform: translateX(-50%);
}

.member-card-studio__action-copy {
  display: grid;
  gap: 6px;
}

.member-card-studio__action-message {
  margin: 0;
  color: var(--color-text-soft);
  line-height: 1.72;
}

.member-card-studio__action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.member-card-studio__action-buttons .ink-button {
  flex: 1 1 180px;
}

@media (max-width: 1180px) {
  .member-card-studio__archive-list {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 920px) {
  .member-card-studio__hero,
  .member-card-studio__workspace {
    grid-template-columns: 1fr;
  }

  .member-card-studio__hero-actions {
    justify-items: start;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .member-card-studio__hero-actions .ink-button {
    min-width: 0;
    width: 100%;
  }

  .member-card-studio__field-grid,
  .member-card-studio__template-switch,
  .member-card-studio__archive-list {
    grid-template-columns: 1fr;
  }

  .member-card-studio__avatar-head,
  .member-card-studio__text-preview-head {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 720px) {
  .member-card-studio {
    gap: 12px;
    padding-bottom: calc(24px + env(safe-area-inset-bottom));
  }

  .member-card-studio__hero,
  .member-card-studio__preview,
  .member-card-studio__form,
  .member-card-studio__archive {
    gap: 12px;
  }

  .member-card-studio__hero-copy h2,
  .member-card-studio__preview-head h2,
  .member-card-studio__archive h2 {
    font-size: clamp(1.3rem, 5.6vw, 1.9rem);
    line-height: 1.26;
  }

  .member-card-studio__hero,
  .member-card-studio__preview,
  .member-card-studio__form,
  .member-card-studio__archive,
  .member-card-studio__action-bar {
    border-radius: 18px;
  }

  .member-card-studio__hero-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .member-card-studio__preview-viewport {
    width: min(100%, 360px);
    min-height: 460px;
    margin-inline: auto;
    padding: 6px;
  }

  .member-card-studio__text-box {
    padding: 14px;
    font-size: 0.92rem;
    line-height: 1.72;
  }

  .member-card-studio__avatar-preview {
    width: min(100%, 180px);
  }

  .member-card-studio__archive-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .member-card-studio__archive-actions .ink-button,
  .member-card-studio__action-buttons .ink-button {
    width: 100%;
    min-width: 0;
    min-height: 42px;
    padding: 10px 12px;
    font-size: 0.92rem;
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

  .member-card-studio__action-buttons {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .member-card-studio__hero-chip,
  .member-card-studio__status-chip {
    min-height: 30px;
    padding: 0 10px;
    font-size: 0.76rem;
  }
}
</style>
