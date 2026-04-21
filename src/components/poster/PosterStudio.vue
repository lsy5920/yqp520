<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { toPng } from 'html-to-image'
import { toDataURL } from 'qrcode'
import PosterCard from './PosterCard.vue'

/**
 * 海报数据类型
 * 用途：统一管理用户填写的称呼和寄语
 */
interface PosterFormValue {
  /** 用途：同门称呼 */
  title: string
  /** 用途：一句寄语 */
  message: string
}

/**
 * 组件入参类型
 * 用途：让主线页面可以自定义默认值和额外文案
 */
interface PosterStudioProps {
  /** 用途：默认称呼 */
  defaultTitle?: string
  /** 用途：默认寄语 */
  defaultMessage?: string
  /** 用途：海报主标题 */
  headline?: string
  /** 用途：海报副标题 */
  subtitle?: string
  /** 用途：海报落款 */
  signature?: string
  /** 用途：分享时的标题 */
  shareTitle?: string
  /** 用途：分享时的文本 */
  shareText?: string
  /** 用途：导出宽度 */
  exportWidth?: number
  /** 用途：导出高度 */
  exportHeight?: number
  /** 用途：二维码标题 */
  qrLabel?: string
  /** 用途：是否减少动态效果 */
  reduceMotion?: boolean
}

/**
 * 组件事件类型
 * 用途：把导出和分享结果通知外部
 */
interface PosterStudioEmits {
  /** 用途：导出成功后通知外部 */
  (event: 'export-success', payload: { fileName: string }): void
  /** 用途：导出失败后通知外部 */
  (event: 'export-error', payload: string): void
  /** 用途：分享成功后通知外部 */
  (event: 'share-success', payload: string): void
}

const props = withDefaults(defineProps<PosterStudioProps>(), {
  defaultTitle: '',
  defaultMessage: '',
  headline: '云栖派海报分享',
  subtitle: '把温柔和祝福装进一张海报里',
  signature: '云栖派官网',
  shareTitle: '云栖派海报分享',
  shareText: '我在云栖派生成了一张分享海报，送给你。',
  exportWidth: 1080,
  exportHeight: 1920,
  qrLabel: '扫码入云栖',
  reduceMotion: false,
})

const emit = defineEmits<PosterStudioEmits>()

/** 用途：页面里真正的海报内容源，预览与导出都从这一份内容出发。 */
const posterSourceElement = ref<HTMLElement | null>(null)
/** 用途：预览窗口容器，用来计算缩放比例。 */
const previewViewportElement = ref<HTMLElement | null>(null)
/** 用途：表单数据 */
const formValue = ref<PosterFormValue>({
  title: props.defaultTitle,
  message: props.defaultMessage,
})
/** 用途：导出中状态，防止用户重复点击 */
const isExporting = ref<boolean>(false)
/** 用途：给用户展示中文提示 */
const actionMessage = ref<string>('请填写海报内容，右侧会实时预览')
/** 用途：记录最近一次失败，方便重试 */
const lastError = ref<string>('')
/** 用途：当前页面地址，用来生成海报二维码 */
const currentPageUrl = ref<string>('')
/** 用途：二维码图片地址，导出和预览都会复用 */
const qrCodeUrl = ref<string>('')
/** 用途：二维码是否已准备好，避免导出时缺少关键内容 */
const isQrReady = ref<boolean>(false)
/** 用途：预览缩放比例，保证页面预览和导出版式完全一致。 */
const previewScale = ref<number>(Math.min(1, 420 / props.exportWidth))

/** 用途：称呼最大长度 */
const TITLE_MAX_LENGTH = 12
/** 用途：寄语最大长度 */
const MESSAGE_MAX_LENGTH = 60

/** 用途：保存预览区尺寸监听器，组件销毁时要手动清理。 */
let previewResizeObserver: ResizeObserver | null = null

/**
 * 基础字符过滤
 * 用途：移除尖括号、反引号等容易带来干扰的字符
 * 入参：rawValue 为原始输入
 * 返回值：返回过滤后的安全文本
 */
function sanitizeText(rawValue: string): string {
  return rawValue
    .replace(/[<>{}\[\]`'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * 获取规范化后的称呼
 * 用途：统一处理空值、长度限制和字符过滤
 * 入参：rawValue 为原始称呼
 * 返回值：返回可用于预览和导出的称呼
 */
function normalizeTitle(rawValue: string): string {
  const safeValue = sanitizeText(rawValue).slice(0, TITLE_MAX_LENGTH)
  return safeValue || '亲爱的同门'
}

/**
 * 获取规范化后的寄语
 * 用途：统一处理空值、长度限制和字符过滤
 * 入参：rawValue 为原始寄语
 * 返回值：返回可用于预览和导出的寄语
 */
function normalizeMessage(rawValue: string): string {
  const safeValue = sanitizeText(rawValue).slice(0, MESSAGE_MAX_LENGTH)
  return safeValue || '愿你在云栖派的每一步，都有热爱、有成长、有回响。'
}

/**
 * 表单错误信息
 * 用途：实时给用户明确提示哪里不符合要求
 */
const titleError = computed<string>(() => {
  if (!formValue.value.title.trim()) {
    return ''
  }

  return sanitizeText(formValue.value.title).length > TITLE_MAX_LENGTH ? `同门称呼最多 ${TITLE_MAX_LENGTH} 个字` : ''
})

/**
 * 寄语错误信息
 * 用途：实时给用户明确提示哪里不符合要求
 */
const messageError = computed<string>(() => {
  if (!formValue.value.message.trim()) {
    return ''
  }

  return sanitizeText(formValue.value.message).length > MESSAGE_MAX_LENGTH ? `一句寄语最多 ${MESSAGE_MAX_LENGTH} 个字` : ''
})

/**
 * 预览用的规范化称呼
 * 用途：让用户边输边看到真实导出效果
 */
const previewTitle = computed<string>(() => normalizeTitle(formValue.value.title))

/**
 * 预览用的规范化寄语
 * 用途：让用户边输边看到真实导出效果
 */
const previewMessage = computed<string>(() => normalizeMessage(formValue.value.message))

/**
 * 是否允许导出
 * 用途：当正在导出时禁用按钮，避免重复生成
 */
const canExport = computed<boolean>(() => !isExporting.value)

/**
 * 预览卡片外壳样式
 * 用途：让页面内预览始终保持与导出一致的海报比例
 */
const previewCardStyle = computed<Record<string, string>>(() => ({
  aspectRatio: `${props.exportWidth} / ${props.exportHeight}`,
}))

/**
 * 真实海报源样式
 * 用途：把页面上看到的海报做成“原尺寸海报的缩放版”
 */
const previewSourceStyle = computed<Record<string, string>>(() => ({
  width: `${props.exportWidth}px`,
  height: `${props.exportHeight}px`,
  transform: `scale(${previewScale.value})`,
}))

/**
 * 二维码说明文案
 * 用途：让海报上的二维码不只是一个码块，而是一段看得懂的引导
 */
const qrHint = computed<string>(() => {
  if (!currentPageUrl.value) {
    return '山门页面二维码'
  }

  return currentPageUrl.value.replace(/^https?:\/\//, '')
})

/**
 * 海报内容源
 * 用途：把预览和导出统一收口到同一份数据，避免两边各管一套
 */
const posterContent = computed(() => ({
  title: previewTitle.value,
  message: previewMessage.value,
  headline: props.headline,
  subtitle: props.subtitle,
  signature: props.signature,
  qrCodeUrl: qrCodeUrl.value,
  qrLabel: props.qrLabel,
  qrHint: qrHint.value,
}))

/**
 * 检查当前表单是否通过校验
 * 用途：导出和分享前做统一校验
 * 入参：无
 * 返回值：通过返回 true，不通过返回 false
 */
function validateForm(): boolean {
  if (titleError.value || messageError.value) {
    actionMessage.value = titleError.value || messageError.value
    return false
  }

  if (!isQrReady.value) {
    actionMessage.value = '当前页二维码还在准备中，请稍候再导出'
    return false
  }

  actionMessage.value = '海报内容已就绪，可以保存或分享'
  return true
}

/**
 * 把 dataUrl 转成文件对象
 * 用途：Web Share API 分享文件时需要 File 类型
 * 入参：dataUrl 为导出的图片 base64 地址，fileName 为文件名
 * 返回值：返回图片文件对象
 */
async function dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  return new File([blob], fileName, { type: blob.type || 'image/png' })
}

/**
 * 获取海报内容源节点
 * 用途：从页面模板里拿到真正需要导出的海报元素
 * 入参：无
 * 返回值：返回海报元素，不存在时返回 null
 */
function getPosterElement(): HTMLElement | null {
  return posterSourceElement.value
}

/**
 * 更新预览缩放比例
 * 用途：让页面里看到的海报始终是原尺寸海报的同比缩放版本
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
 * 绑定预览区尺寸监听
 * 用途：窗口大小变化时自动重算海报缩放比例
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
 * 清理预览区尺寸监听
 * 用途：组件销毁时释放监听器，避免长期运行时累积无效引用
 * 入参：无
 * 返回值：无返回值
 */
function clearPreviewObserver(): void {
  previewResizeObserver?.disconnect()
  previewResizeObserver = null
}

/**
 * 等待页面字体准备完成
 * 用途：避免导出时字体还没加载好，导致海报字形和预览不一致
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
    // 这里兜底字体等待失败，继续导出，避免因为字体接口异常直接卡死。
    console.warn('等待字体加载完成失败：', error)
  }
}

/**
 * 等待图片加载完成
 * 用途：确保二维码图片已经真正进入节点，再去截图导出
 * 入参：target 为准备导出的海报节点
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
 * 创建导出舞台节点
 * 用途：把页面里的海报克隆到离屏区域，导出时不受页面缩放影响
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
 * 克隆海报节点用于导出
 * 用途：去掉页面预览时的缩放，只保留同一份海报内容和版式
 * 入参：source 为页面上的真实海报源节点
 * 返回值：返回可直接拿去导出的克隆节点
 */
function clonePosterElement(source: HTMLElement): HTMLElement {
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
  cloneElement.style.borderRadius = '32px'
  return cloneElement
}

/**
 * 等待海报导出前状态稳定
 * 用途：确保最新输入、字体、二维码图片都已经就绪，再开始截图
 * 入参：target 为准备导出的海报节点
 * 返回值：无返回值
 */
async function waitForPosterReady(target: HTMLElement): Promise<void> {
  await nextTick()
  await waitForFontsReady()
  await waitForImagesReady(target)
}

/**
 * 生成当前页面二维码
 * 用途：把海报与当前页面关联起来，用户扫码后能回到当前页面
 * 入参：无
 * 返回值：无返回值
 */
async function generateCurrentPageQr(): Promise<void> {
  if (typeof window === 'undefined') {
    return
  }

  currentPageUrl.value = window.location.href
  isQrReady.value = false

  try {
    qrCodeUrl.value = await toDataURL(currentPageUrl.value, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 240,
      color: {
        dark: '#102734',
        light: '#f4efe2',
      },
    })
    isQrReady.value = true
  } catch (error) {
    // 这里兜底二维码生成失败，避免页面直接报错。
    console.warn('生成当前页二维码失败：', error)
    qrCodeUrl.value = ''
    isQrReady.value = false
    lastError.value = '当前页二维码生成失败，请稍后重试'
    actionMessage.value = lastError.value
  }
}

/**
 * 导出海报图片
 * 用途：统一处理生成图片、异常提示、重试时复用
 * 入参：无
 * 返回值：成功时返回 dataUrl 和文件名，失败时返回 null
 */
async function exportPosterImage(): Promise<{ dataUrl: string; fileName: string } | null> {
  if (!isQrReady.value) {
    await generateCurrentPageQr()
  }

  if (!validateForm()) {
    return null
  }

  const sourceElement = getPosterElement()

  if (!sourceElement || typeof document === 'undefined') {
    lastError.value = '海报预览区域还没有准备好，请稍后重试'
    actionMessage.value = lastError.value
    emit('export-error', lastError.value)
    return null
  }

  isExporting.value = true
  actionMessage.value = '正在生成海报，请稍候...'
  lastError.value = ''

  const exportStage = createExportStage()
  const exportElement = clonePosterElement(sourceElement)

  try {
    document.body.appendChild(exportStage)
    exportStage.appendChild(exportElement)

    await waitForPosterReady(exportElement)

    const dataUrl = await toPng(exportElement, {
      cacheBust: true,
      pixelRatio: 1,
      backgroundColor: '#07161f',
      width: props.exportWidth,
      height: props.exportHeight,
      canvasWidth: props.exportWidth,
      canvasHeight: props.exportHeight,
    })

    const fileName = `云栖派海报-${Date.now()}.png`
    actionMessage.value = '海报生成成功'
    emit('export-success', { fileName })
    return { dataUrl, fileName }
  } catch (error) {
    // 这里兜底导出失败，比如克隆节点未渲染完成或浏览器截图能力受限。
    console.warn('导出海报失败：', error)
    lastError.value = '导出失败，请点击重试'
    actionMessage.value = lastError.value
    emit('export-error', lastError.value)
    return null
  } finally {
    isExporting.value = false
    exportStage.remove()
  }
}

/**
 * 触发浏览器下载
 * 用途：当不支持原生分享时，把图片直接下载到本地
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
    console.warn('触发海报下载失败：', error)
    lastError.value = '下载海报失败，请稍后重试'
    actionMessage.value = lastError.value
    emit('export-error', lastError.value)
    return false
  }
}

/**
 * 保存海报
 * 用途：用户点击保存按钮时下载图片
 * 入参：无
 * 返回值：无返回值
 */
async function handleSave(): Promise<void> {
  const exported = await exportPosterImage()

  if (!exported) {
    return
  }

  if (downloadPoster(exported.dataUrl, exported.fileName)) {
    actionMessage.value = '海报已开始下载'
  }
}

/**
 * 分享海报
 * 用途：优先调用原生分享，无法分享时自动回退下载
 * 入参：无
 * 返回值：无返回值
 */
async function handleShare(): Promise<void> {
  const exported = await exportPosterImage()

  if (!exported) {
    return
  }

  try {
    const shareFile = await dataUrlToFile(exported.dataUrl, exported.fileName)

    if (
      navigator.share
      && navigator.canShare
      && navigator.canShare({ files: [shareFile] })
    ) {
      await navigator.share({
        title: props.shareTitle,
        text: props.shareText,
        files: [shareFile],
      })
      actionMessage.value = '海报分享成功'
      emit('share-success', 'shared')
      return
    }
  } catch (error) {
    // 这里兜底原生分享失败，比如用户取消分享或系统暂不支持文件分享。
    console.warn('原生分享失败，准备回退下载：', error)
  }

  if (downloadPoster(exported.dataUrl, exported.fileName)) {
    actionMessage.value = '当前环境不支持原生分享，已回退为下载海报'
  }
}

/**
 * 重试导出
 * 用途：导出失败后给用户一个明确重试入口
 * 入参：无
 * 返回值：无返回值
 */
async function handleRetry(): Promise<void> {
  await generateCurrentPageQr()
  await handleSave()
}

// 这里监听导出尺寸变化，保证预览缩放比例始终和真实尺寸同步。
watch(
  () => [props.exportWidth, props.exportHeight],
  async () => {
    await nextTick()
    updatePreviewScale()
  },
)

onMounted(async () => {
  await generateCurrentPageQr()
  await nextTick()
  bindPreviewObserver()
})

onBeforeUnmount(() => {
  clearPreviewObserver()
})
</script>

<template>
  <section class="poster-studio" :class="{ 'poster-studio--reduced': reduceMotion }">
    <div class="poster-studio__panel">
      <div class="poster-studio__header">
        <p class="poster-studio__eyebrow">海报分享</p>
        <h2 class="poster-studio__title">填写一句祝福，马上生成分享海报</h2>
        <p class="poster-studio__desc">{{ actionMessage }}</p>
      </div>

      <label class="poster-studio__field">
        <span class="poster-studio__label">同门称呼</span>
        <input
          v-model="formValue.title"
          class="poster-studio__input"
          type="text"
          maxlength="24"
          placeholder="例如：阿云同门"
        />
        <span class="poster-studio__helper">
          {{ titleError || `建议不超过 ${TITLE_MAX_LENGTH} 个字，超出会自动截断` }}
        </span>
      </label>

      <label class="poster-studio__field">
        <span class="poster-studio__label">一句寄语</span>
        <textarea
          v-model="formValue.message"
          class="poster-studio__textarea"
          maxlength="120"
          rows="5"
          placeholder="例如：愿你一路生花，奔赴热爱。"
        />
        <span class="poster-studio__helper">
          {{ messageError || `建议不超过 ${MESSAGE_MAX_LENGTH} 个字，超出会自动截断` }}
        </span>
      </label>

      <div class="poster-studio__actions">
        <button type="button" class="poster-studio__button" :disabled="!canExport" @click="handleSave">
          {{ isExporting ? '生成中...' : '保存图片' }}
        </button>
        <button type="button" class="poster-studio__button poster-studio__button--primary" :disabled="!canExport" @click="handleShare">
          {{ isExporting ? '生成中...' : '分享或下载' }}
        </button>
        <button
          v-if="lastError"
          type="button"
          class="poster-studio__button poster-studio__button--ghost"
          :disabled="!canExport"
          @click="handleRetry"
        >
          重试导出
        </button>
      </div>

      <div class="poster-studio__meta">
        <p>当前页二维码：{{ isQrReady ? '已就绪' : '生成中' }}</p>
        <p>扫码后可直达当前云栖页面，方便海报传播与回流。</p>
      </div>
    </div>

    <div class="poster-studio__preview">
      <div ref="previewViewportElement" class="poster-studio__card-shell" :style="previewCardStyle">
        <div ref="posterSourceElement" class="poster-studio__poster-source" :style="previewSourceStyle">
          <PosterCard
            :title="posterContent.title"
            :message="posterContent.message"
            :headline="posterContent.headline"
            :qr-code-url="posterContent.qrCodeUrl"
            :qr-hint="posterContent.qrHint"
            :qr-label="posterContent.qrLabel"
            :subtitle="posterContent.subtitle"
            :signature="posterContent.signature"
            :reduce-motion="reduceMotion"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.poster-studio {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 420px);
  gap: 24px;
  align-items: start;
}

.poster-studio__panel,
.poster-studio__preview {
  padding: 24px;
  border-radius: 28px;
  background:
    linear-gradient(180deg, rgba(8, 30, 42, 0.92), rgba(5, 18, 28, 0.96)),
    rgba(5, 18, 28, 0.94);
  border: 1px solid rgba(216, 185, 114, 0.18);
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.28);
}

.poster-studio__header,
.poster-studio__field {
  display: grid;
  gap: 8px;
}

.poster-studio__eyebrow,
.poster-studio__title,
.poster-studio__desc {
  margin: 0;
  text-align: left;
}

.poster-studio__eyebrow {
  font-size: 12px;
  letter-spacing: 0.16em;
  color: #c2410c;
}

.poster-studio__title {
  font-size: 28px;
  line-height: 1.3;
  color: #f4efe2;
}

.poster-studio__desc,
.poster-studio__label,
.poster-studio__helper {
  color: rgba(244, 239, 226, 0.72);
}

.poster-studio__desc {
  font-size: 14px;
  line-height: 1.7;
}

.poster-studio__field + .poster-studio__field {
  margin-top: 18px;
}

.poster-studio__input,
.poster-studio__textarea {
  width: 100%;
  border-radius: 18px;
  border: 1px solid rgba(216, 185, 114, 0.18);
  background: rgba(255, 255, 255, 0.04);
  color: #f4efe2;
}

.poster-studio__input {
  min-height: 48px;
  padding: 0 14px;
}

.poster-studio__textarea {
  padding: 14px;
  resize: vertical;
}

.poster-studio__helper {
  font-size: 13px;
}

.poster-studio__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
}

.poster-studio__meta {
  display: grid;
  gap: 8px;
  margin-top: 18px;
  color: rgba(244, 239, 226, 0.68);
  font-size: 0.92rem;
  line-height: 1.7;
}

.poster-studio__meta p {
  margin: 0;
}

.poster-studio__button {
  min-height: 46px;
  padding: 0 18px;
  border-radius: 999px;
  border: 1px solid rgba(216, 185, 114, 0.16);
  background: rgba(255, 255, 255, 0.04);
  color: #f4efe2;
  cursor: pointer;
}

.poster-studio__button--primary {
  background: linear-gradient(135deg, rgba(216, 185, 114, 0.92), rgba(170, 128, 53, 0.94));
  color: #102734;
}

.poster-studio__button--ghost {
  background: rgba(139, 208, 203, 0.08);
}

.poster-studio__preview {
  display: grid;
  place-items: center;
  overflow: hidden;
}

.poster-studio__card-shell {
  position: relative;
  width: min(100%, 420px);
  overflow: hidden;
  border-radius: 32px;
  background: rgba(7, 22, 31, 0.82);
  box-shadow: 0 24px 56px rgba(0, 0, 0, 0.24);
}

.poster-studio__poster-source {
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  border-radius: 32px;
  transform-origin: top left;
  transition: transform 0.3s ease;
}

.poster-studio--reduced,
.poster-studio--reduced * {
  transition: none !important;
  animation: none !important;
}

@media (max-width: 960px) {
  .poster-studio {
    grid-template-columns: 1fr;
  }
}
</style>
