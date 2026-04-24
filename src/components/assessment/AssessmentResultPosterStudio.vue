<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { toPng } from 'html-to-image'
import { toDataURL } from 'qrcode'
import AssessmentResultPosterCard from './AssessmentResultPosterCard.vue'

/**
 * 组件入参类型
 * 用途：让结果页把成绩数据和海报配置传给结果海报组件
 */
interface AssessmentResultPosterStudioProps {
  /** 用途：同门称呼 */
  participantTitle?: string
  /** 用途：本次得分 */
  score: number
  /** 用途：总分 */
  totalScore: number
  /** 用途：是否合格 */
  passed: boolean
  /** 用途：答对题数 */
  correctCount: number
  /** 用途：总题数 */
  questionCount: number
  /** 用途：合格线 */
  passScore: number
  /** 用途：完成时间文本 */
  completedAtText: string
  /** 用途：用时文本 */
  durationText: string
  /** 用途：海报主标题 */
  title?: string
  /** 用途：海报副标题 */
  subtitle?: string
  /** 用途：海报落款 */
  signature?: string
  /** 用途：合格状态标题 */
  passHeadline?: string
  /** 用途：未合格状态标题 */
  failHeadline?: string
  /** 用途：合格状态文案 */
  passCopy?: string
  /** 用途：未合格状态文案 */
  failCopy?: string
  /** 用途：二维码标题 */
  qrLabel?: string
  /** 用途：二维码目标路径 */
  qrTargetPath?: string
  /** 用途：导出宽度 */
  exportWidth?: number
  /** 用途：导出高度 */
  exportHeight?: number
  /** 用途：是否减少动态效果 */
  reduceMotion?: boolean
}

/**
 * 组件事件类型
 * 用途：把海报导出和分享结果通知给外层页面
 */
interface AssessmentResultPosterStudioEmits {
  /** 用途：导出成功后通知外部 */
  (event: 'export-success', payload: { fileName: string }): void
  /** 用途：导出失败后通知外部 */
  (event: 'export-error', payload: string): void
  /** 用途：分享成功后通知外部 */
  (event: 'share-success', payload: string): void
}

const props = withDefaults(defineProps<AssessmentResultPosterStudioProps>(), {
  participantTitle: '云中同门',
  title: '云栖派问心考核',
  subtitle: '问心而入 · 以诚为先',
  signature: '云栖派 · 问心录',
  passHeadline: '考核已过',
  failHeadline: '再温原文',
  passCopy: '已知门风，可从容入云栖。',
  failCopy: '未过不急，先读原文，再来问心。',
  qrLabel: '扫码赴考',
  qrTargetPath: 'join#exam',
  exportWidth: 1080,
  exportHeight: 1920,
  reduceMotion: false,
})

const emit = defineEmits<AssessmentResultPosterStudioEmits>()

/** 用途：页面内真正的海报源节点，预览与导出都使用同一份内容。 */
const posterSourceElement = ref<HTMLElement | null>(null)
/** 用途：预览容器节点，用来计算海报缩放比例。 */
const previewViewportElement = ref<HTMLElement | null>(null)
/** 用途：导出状态，避免用户连续点击重复生成。 */
const isExporting = ref<boolean>(false)
/** 用途：给用户展示当前海报准备状态、导出状态和错误提示。 */
const actionMessage = ref<string>('考核结果海报已就绪，可以保存或分享')
/** 用途：保存最近一次错误，方便提供重试按钮。 */
const lastError = ref<string>('')
/** 用途：二维码实际目标地址，用于预览、导出和分享。 */
const qrTargetUrl = ref<string>('')
/** 用途：二维码图片地址，结果海报预览和导出都复用这张图。 */
const qrCodeUrl = ref<string>('')
/** 用途：二维码是否已准备好，避免导出时缺少关键内容。 */
const isQrReady = ref<boolean>(false)
/** 用途：预览缩放比例，保证页面预览与下载结果一致。 */
const previewScale = ref<number>(Math.min(1, 420 / props.exportWidth))

/** 用途：保存预览尺寸监听器，组件卸载时统一清理。 */
let previewResizeObserver: ResizeObserver | null = null

/**
 * 状态标题
 * 用途：根据成绩结果切换海报里的状态抬头
 */
const statusHeadline = computed<string>(() => (props.passed ? props.passHeadline : props.failHeadline))

/**
 * 结果文案
 * 用途：根据是否合格切换结果海报里的官方文案
 */
const officialCopy = computed<string>(() => (props.passed ? props.passCopy : props.failCopy))

/**
 * 二维码说明文案
 * 用途：把二维码真实目标地址展示成海报里的网址说明
 */
const qrHint = computed<string>(() => {
  if (!qrTargetUrl.value) {
    return '云栖入派指引页'
  }

  return qrTargetUrl.value.replace(/^https?:\/\//, '')
})

/**
 * 预览外壳样式
 * 用途：让页面内预览始终保持与导出一致的海报比例
 */
const previewCardStyle = computed<Record<string, string>>(() => ({
  aspectRatio: `${props.exportWidth} / ${props.exportHeight}`,
}))

/**
 * 真实海报源样式
 * 用途：把页面里的海报做成原尺寸海报的缩放版，保证预览与导出完全一致
 */
const previewSourceStyle = computed<Record<string, string>>(() => ({
  width: `${props.exportWidth}px`,
  height: `${props.exportHeight}px`,
  transform: `scale(${previewScale.value})`,
}))

/**
 * 解析二维码目标地址
 * 用途：让结果海报扫码后固定跳到入派指引页的问心考核区，并兼容 GitHub Pages 子路径部署
 * 入参：无
 * 返回值：返回二维码应跳转的完整网址
 */
function resolveQrTargetUrl(): string {
  if (typeof window === 'undefined') {
    return ''
  }

  const normalizedTargetPath = props.qrTargetPath.replace(/^\/+/, '')
  const siteBaseUrl = new URL(import.meta.env.BASE_URL || '/', window.location.origin)
  return new URL(normalizedTargetPath, siteBaseUrl).href
}

/**
 * 获取海报源节点
 * 用途：从模板里拿到真正参与导出的海报元素
 * 入参：无
 * 返回值：返回海报源节点，不存在时返回 null
 */
function getPosterElement(): HTMLElement | null {
  return posterSourceElement.value
}

/**
 * 更新预览缩放比例
 * 用途：窗口变化时自动重算预览大小，保持页面内预览和导出成图比例一致
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
 * 用途：窗口尺寸变化时自动更新预览海报的缩放比例
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
 * 用途：组件销毁时释放监听器，避免长期运行后残留无效引用
 * 入参：无
 * 返回值：无返回值
 */
function clearPreviewObserver(): void {
  previewResizeObserver?.disconnect()
  previewResizeObserver = null
}

/**
 * 等待字体加载完成
 * 用途：避免导出时字体还没完全加载好，导致成图和页面预览不一致
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
    // 这里兜底字体接口异常，继续导出，避免页面卡死在等待阶段。
    console.warn('等待结果海报字体加载完成失败：', error)
  }
}

/**
 * 等待图片加载完成
 * 用途：确保二维码图片已经真正绘制到节点里，再开始截图导出
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
 * 创建导出舞台
 * 用途：把结果海报克隆到离屏区域，避免页面缩放影响最终导出
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
 * 克隆海报节点
 * 用途：去掉页面预览时的缩放，只保留原尺寸的海报内容参与导出
 * 入参：source 为页面里的海报源节点
 * 返回值：返回可直接导出的克隆节点
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
 * 用途：确保最新数据、字体和二维码图片都已经就绪，再开始截图导出
 * 入参：target 为准备导出的海报节点
 * 返回值：无返回值
 */
async function waitForPosterReady(target: HTMLElement): Promise<void> {
  await nextTick()
  await waitForFontsReady()
  await waitForImagesReady(target)
}

/**
 * 生成结果海报二维码
 * 用途：让结果海报扫码后直接跳回入派指引页的问心考核区
 * 入参：无
 * 返回值：无返回值
 */
async function generatePosterQr(): Promise<void> {
  if (typeof window === 'undefined') {
    return
  }

  qrTargetUrl.value = resolveQrTargetUrl()
  isQrReady.value = false

  try {
    qrCodeUrl.value = await toDataURL(qrTargetUrl.value, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 240,
      color: {
        dark: '#173d42',
        light: '#173d42',
      },
    })
    isQrReady.value = true
  } catch (error) {
    // 这里兜底二维码生成失败，让页面保留明确提示并允许用户重试。
    console.warn('生成考核结果海报二维码失败：', error)
    qrCodeUrl.value = ''
    isQrReady.value = false
    lastError.value = '赴考二维码生成失败，请稍后重试'
    actionMessage.value = lastError.value
  }
}

/**
 * 校验当前海报是否可以导出
 * 用途：在保存或分享前统一检查关键内容是否已经准备好
 * 入参：无
 * 返回值：可导出返回 true，否则返回 false
 */
function validatePoster(): boolean {
  if (!isQrReady.value) {
    actionMessage.value = '赴考二维码还在准备中，请稍候再导出'
    return false
  }

  actionMessage.value = '考核结果海报已就绪，可以保存或分享'
  return true
}

/**
 * 把 dataUrl 转成文件对象
 * 用途：系统原生分享文件时需要 File 类型
 * 入参：dataUrl 为导出的图片地址，fileName 为文件名
 * 返回值：返回图片文件对象
 */
async function dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  return new File([blob], fileName, { type: blob.type || 'image/png' })
}

/**
 * 导出结果海报图片
 * 用途：统一处理离屏截图、异常提示和文件名生成
 * 入参：无
 * 返回值：成功时返回 dataUrl 和文件名，失败时返回 null
 */
async function exportPosterImage(): Promise<{ dataUrl: string; fileName: string } | null> {
  if (!isQrReady.value) {
    await generatePosterQr()
  }

  if (!validatePoster()) {
    return null
  }

  const sourceElement = getPosterElement()

  if (!sourceElement || typeof document === 'undefined') {
    lastError.value = '结果海报预览区域还没有准备好，请稍后重试'
    actionMessage.value = lastError.value
    emit('export-error', lastError.value)
    return null
  }

  isExporting.value = true
  actionMessage.value = '正在生成结果海报，请稍候...'
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
      backgroundColor: '#edf7f1',
      width: props.exportWidth,
      height: props.exportHeight,
      canvasWidth: props.exportWidth,
      canvasHeight: props.exportHeight,
    })

    const fileName = `云栖派问心考核结果-${Date.now()}.png`
    actionMessage.value = '结果海报生成成功'
    emit('export-success', { fileName })
    return { dataUrl, fileName }
  } catch (error) {
    // 这里兜底导出失败，比如节点尚未绘制完成或浏览器截图能力受限。
    console.warn('导出考核结果海报失败：', error)
    lastError.value = '结果海报导出失败，请点击重试'
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
 * 用途：当前环境不支持系统分享时，把结果海报直接下载到本地
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
    // 这里兜底下载触发失败，避免异常场景下没有任何反馈。
    console.warn('下载考核结果海报失败：', error)
    lastError.value = '下载结果海报失败，请稍后重试'
    actionMessage.value = lastError.value
    emit('export-error', lastError.value)
    return false
  }
}

/**
 * 保存结果海报
 * 用途：用户点击保存按钮时导出并下载海报
 * 入参：无
 * 返回值：无返回值
 */
async function handleSave(): Promise<void> {
  const exported = await exportPosterImage()

  if (!exported) {
    return
  }

  if (downloadPoster(exported.dataUrl, exported.fileName)) {
    actionMessage.value = '结果海报已开始下载'
  }
}

/**
 * 分享结果海报
 * 用途：优先调用系统原生分享，不支持时自动回退为下载图片
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
        title: props.title,
        text: `${props.participantTitle} 的云栖派问心考核结果海报`,
        files: [shareFile],
      })
      actionMessage.value = '结果海报分享成功'
      emit('share-success', 'shared')
      return
    }
  } catch (error) {
    // 这里兜底原生分享失败，比如用户取消分享或当前环境不支持文件分享。
    console.warn('分享考核结果海报失败，准备回退下载：', error)
  }

  if (downloadPoster(exported.dataUrl, exported.fileName)) {
    actionMessage.value = '当前环境不支持原生分享，已回退为下载结果海报'
  }
}

/**
 * 重试导出
 * 用途：二维码或导出失败后提供明确重试入口
 * 入参：无
 * 返回值：无返回值
 */
async function handleRetry(): Promise<void> {
  await generatePosterQr()
  await handleSave()
}

watch(
  () => [props.exportWidth, props.exportHeight],
  async () => {
    await nextTick()
    updatePreviewScale()
  },
)

onMounted(async () => {
  await generatePosterQr()
  await nextTick()
  bindPreviewObserver()
})

onBeforeUnmount(() => {
  clearPreviewObserver()
})
</script>

<template>
  <section class="assessment-result-poster-studio" :class="{ 'assessment-result-poster-studio--reduced': reduceMotion }">
    <div class="assessment-result-poster-studio__panel">
      <div class="assessment-result-poster-studio__header">
        <p class="assessment-result-poster-studio__eyebrow">结果海报</p>
        <h2 class="assessment-result-poster-studio__title">把这张成绩帖保存下来，也可直接分享给同道</h2>
        <p class="assessment-result-poster-studio__desc">{{ actionMessage }}</p>
      </div>

      <div class="assessment-result-poster-studio__meta">
        <p>同门称呼：{{ participantTitle }}</p>
        <p>本次成绩：{{ score }} / {{ totalScore }}</p>
        <p>状态结果：{{ passed ? '已合格' : '未合格' }}</p>
        <p>二维码落点：入派指引页问心考核区</p>
      </div>

      <div class="assessment-result-poster-studio__actions">
        <button type="button" class="assessment-result-poster-studio__button" :disabled="isExporting" @click="handleSave">
          {{ isExporting ? '生成中...' : '保存图片' }}
        </button>
        <button type="button" class="assessment-result-poster-studio__button assessment-result-poster-studio__button--primary" :disabled="isExporting" @click="handleShare">
          {{ isExporting ? '生成中...' : '分享或下载' }}
        </button>
        <button
          v-if="lastError"
          type="button"
          class="assessment-result-poster-studio__button assessment-result-poster-studio__button--ghost"
          :disabled="isExporting"
          @click="handleRetry"
        >
          重试导出
        </button>
      </div>
    </div>

    <div class="assessment-result-poster-studio__preview">
      <div ref="previewViewportElement" class="assessment-result-poster-studio__card-shell" :style="previewCardStyle">
        <div ref="posterSourceElement" class="assessment-result-poster-studio__poster-source" :style="previewSourceStyle">
          <AssessmentResultPosterCard
            :title="title"
            :subtitle="subtitle"
            :participant-title="participantTitle"
            :score="score"
            :total-score="totalScore"
            :passed="passed"
            :status-headline="statusHeadline"
            :official-copy="officialCopy"
            :completed-at-text="completedAtText"
            :duration-text="durationText"
            :correct-count="correctCount"
            :question-count="questionCount"
            :pass-score="passScore"
            :qr-code-url="qrCodeUrl"
            :qr-label="qrLabel"
            :qr-hint="qrHint"
            :signature="signature"
            :reduce-motion="reduceMotion"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.assessment-result-poster-studio {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 420px);
  gap: 24px;
  align-items: start;
}

.assessment-result-poster-studio__panel,
.assessment-result-poster-studio__preview {
  padding: 24px;
  border-radius: 28px;
  background:
    linear-gradient(180deg, rgba(247, 252, 244, 0.78), rgba(246, 251, 244, 0.9)),
    rgba(246, 251, 244, 0.86);
  border: 1px solid rgba(84, 154, 151, 0.22);
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.28);
}

.assessment-result-poster-studio__header,
.assessment-result-poster-studio__meta {
  display: grid;
  gap: 8px;
}

.assessment-result-poster-studio__eyebrow,
.assessment-result-poster-studio__title,
.assessment-result-poster-studio__desc {
  margin: 0;
  text-align: left;
}

.assessment-result-poster-studio__eyebrow {
  color: #c2410c;
  font-size: 12px;
  letter-spacing: 0.16em;
}

.assessment-result-poster-studio__title {
  color: #173d42;
  font-size: 28px;
  line-height: 1.3;
}

.assessment-result-poster-studio__desc,
.assessment-result-poster-studio__meta {
  color: rgba(35, 83, 86, 0.72);
}

.assessment-result-poster-studio__desc {
  font-size: 14px;
  line-height: 1.7;
}

.assessment-result-poster-studio__meta {
  margin-top: 20px;
  font-size: 0.94rem;
  line-height: 1.8;
}

.assessment-result-poster-studio__meta p {
  margin: 0;
}

.assessment-result-poster-studio__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
}

.assessment-result-poster-studio__button {
  min-height: 46px;
  padding: 0 18px;
  border-radius: 999px;
  border: 1px solid rgba(216, 185, 114, 0.16);
  background: rgba(255, 255, 255, 0.04);
  color: #173d42;
  cursor: pointer;
}

.assessment-result-poster-studio__button--primary {
  background: linear-gradient(135deg, rgba(74, 171, 166, 0.88), rgba(207, 239, 231, 0.96));
  color: #173d42;
}

.assessment-result-poster-studio__button--ghost {
  background: rgba(139, 208, 203, 0.08);
}

.assessment-result-poster-studio__preview {
  display: grid;
  place-items: center;
  overflow: hidden;
}

.assessment-result-poster-studio__card-shell {
  position: relative;
  width: min(100%, 420px);
  overflow: hidden;
  border-radius: 32px;
  background: rgba(234, 245, 239, 0.86);
  box-shadow: 0 24px 56px rgba(0, 0, 0, 0.24);
}

.assessment-result-poster-studio__poster-source {
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  border-radius: 32px;
  transform-origin: top left;
  transition: transform 0.3s ease;
}

.assessment-result-poster-studio--reduced,
.assessment-result-poster-studio--reduced * {
  transition: none !important;
  animation: none !important;
}

@media (max-width: 960px) {
  .assessment-result-poster-studio {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .assessment-result-poster-studio__panel,
  .assessment-result-poster-studio__preview {
    padding: 18px 16px;
    border-radius: 24px;
  }

  .assessment-result-poster-studio__title {
    font-size: 22px;
    line-height: 1.4;
  }

  .assessment-result-poster-studio__desc {
    font-size: 0.94rem;
    line-height: 1.76;
  }

  .assessment-result-poster-studio__actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .assessment-result-poster-studio__button {
    width: 100%;
  }

  .assessment-result-poster-studio__button:last-child:nth-child(odd) {
    grid-column: 1 / -1;
  }

  .assessment-result-poster-studio__meta {
    margin-top: 16px;
    font-size: 0.88rem;
  }

  .assessment-result-poster-studio__card-shell {
    width: 100%;
    border-radius: 24px;
  }

  .assessment-result-poster-studio__poster-source {
    border-radius: 24px;
  }
}
</style>
