<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { toPng } from 'html-to-image'
import { toDataURL } from 'qrcode'
import RosterRegistrationPosterCard from '@/components/roster/RosterRegistrationPosterCard.vue'
import type { RosterRegistrationPosterTemplate } from '@/types/roster'
import { resolveRosterListUrl } from '@/utils/roster'

/**
 * 组件入参类型
 * 用途：约束固定版招募海报工作台需要接收的模板与动画参数
 */
interface RosterRegistrationPosterStudioProps {
  /** 用途：固定版招募海报模板 */
  template: RosterRegistrationPosterTemplate
  /** 用途：是否减少动态效果 */
  reduceMotion?: boolean
}

const props = withDefaults(defineProps<RosterRegistrationPosterStudioProps>(), {
  reduceMotion: false,
})

// 这里保存真实海报节点，保证页面预览和导出截图使用同一份内容源。
const posterSourceElement = ref<HTMLElement | null>(null)

// 这里保存预览视口节点，用来根据可见区域实时计算缩放比例。
const previewViewportElement = ref<HTMLElement | null>(null)

// 这里记录预览缩放比例，确保不同屏幕下都能完整看到同一张海报。
const previewScale = ref<number>(Math.min(1, 420 / props.template.exportWidth))

// 这里记录二维码是否已经准备完成，避免导出时缺少关键内容。
const isQrReady = ref<boolean>(false)

// 这里保存二维码图片地址，预览、导出和分享都共用这一张图。
const qrCodeUrl = ref<string>('')

// 这里保存二维码实际跳转地址，统一落到公开名录页。
const shareUrl = ref<string>('')

// 这里记录当前是否正在导出海报，避免用户连续重复点击。
const isExporting = ref<boolean>(false)

// 这里记录招募海报功能是否展开，默认折叠可以避免公开名录首屏被海报占满。
const isPosterExpanded = ref<boolean>(false)

// 这里给用户展示当前动作提示，便于知道二维码、导出和分享处于什么状态。
const actionMessage = ref<string>('招募海报已经备好，可直接保存成图或分享给同道。')

// 这里记录最近一次异常提示，失败时会显示重试入口。
const lastError = ref<string>('')

// 这里保存预览区尺寸监听器，组件卸载时需要手动释放。
let previewResizeObserver: ResizeObserver | null = null

/**
 * 预览卡片比例样式
 * 用途：让页面里的海报外壳始终保持固定 4:5 比例
 * 入参：无
 * 返回值：返回预览容器样式对象
 */
const previewCardStyle = computed<Record<string, string>>(() => ({
  aspectRatio: `${props.template.exportWidth} / ${props.template.exportHeight}`,
}))

/**
 * 预览画布尺寸样式
 * 用途：让缩放后的海报在视口内以真实宽高呈现
 * 入参：无
 * 返回值：返回预览画布样式对象
 */
const previewCanvasStyle = computed<Record<string, string>>(() => ({
  width: `${Math.round(props.template.exportWidth * previewScale.value)}px`,
  height: `${Math.round(props.template.exportHeight * previewScale.value)}px`,
}))

/**
 * 真实海报源样式
 * 用途：把原始海报按缩放比例绘制到页面预览中
 * 入参：无
 * 返回值：返回真实海报节点样式对象
 */
const previewSourceStyle = computed<Record<string, string>>(() => ({
  width: `${props.template.exportWidth}px`,
  height: `${props.template.exportHeight}px`,
  transform: `scale(${previewScale.value})`,
}))

/**
 * 二维码下方短网址提示
 * 用途：把完整链接转成更适合展示的短文本
 * 入参：无
 * 返回值：返回二维码下方提示文案
 */
const qrHint = computed<string>(() => (
  shareUrl.value ? shareUrl.value.replace(/^https?:\/\//, '') : '云栖名册公开名录页'
))

/**
 * 招募流程摘要
 * 用途：让右侧说明区快速概括官方招募流程
 * 入参：无
 * 返回值：返回流程摘要字符串
 */
const processSummary = computed<string>(() => props.template.processList.join(' · '))

/**
 * 切换招募海报展开状态
 * 用途：让用户点击按钮后再展开或收起招募海报预览与操作区
 * 入参：无
 * 返回值：无返回值
 */
function togglePosterExpanded(): void {
  isPosterExpanded.value = !isPosterExpanded.value
}

/**
 * 更新预览缩放比例
 * 用途：让海报在不同设备和不同容器宽高下都完整显示且不变形
 * 入参：无
 * 返回值：无返回值
 */
function updatePreviewScale(): void {
  const viewport = previewViewportElement.value

  if (!viewport || typeof window === 'undefined') {
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
    viewportWidth / props.template.exportWidth,
    viewportHeight / props.template.exportHeight,
    1,
  )

  if (Number.isFinite(nextScale) && nextScale > 0) {
    previewScale.value = nextScale
  }
}

/**
 * 绑定预览区尺寸监听
 * 用途：窗口尺寸变化时自动重算缩放，保证手机端和桌面端预览一致
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
 * 清理预览区监听
 * 用途：组件销毁时释放监听器，避免长期运行残留无效引用
 * 入参：无
 * 返回值：无返回值
 */
function clearPreviewObserver(): void {
  previewResizeObserver?.disconnect()
  previewResizeObserver = null
}

/**
 * 生成招募海报二维码
 * 用途：把二维码固定指向云栖名册公开名录页
 * 入参：无
 * 返回值：无返回值
 */
async function generatePosterQr(): Promise<void> {
  shareUrl.value = resolveRosterListUrl()
  isQrReady.value = false

  if (!shareUrl.value) {
    qrCodeUrl.value = ''
    lastError.value = '当前环境暂时无法生成公开名录链接，请稍后再试'
    actionMessage.value = lastError.value
    return
  }

  try {
    qrCodeUrl.value = await toDataURL(shareUrl.value, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 220,
      color: {
        dark: '#102734',
        light: '#f8fffb',
      },
    })
    isQrReady.value = true
    lastError.value = ''
    actionMessage.value = '招募海报已经备好，可直接保存成图或分享给同道。'
  } catch (error) {
    // 这里兜底二维码生成失败，避免页面直接报错卡住。
    console.warn('生成云栖名册招募海报二维码失败：', error)
    qrCodeUrl.value = ''
    isQrReady.value = false
    lastError.value = '二维码生成失败，请稍后重试'
    actionMessage.value = lastError.value
  }
}

/**
 * 获取海报源节点
 * 用途：统一拿到页面中真实参与导出的海报元素
 * 入参：无
 * 返回值：返回海报源节点，不存在时返回 null
 */
function getPosterElement(): HTMLElement | null {
  return posterSourceElement.value
}

/**
 * 等待字体加载完成
 * 用途：避免导出时字体还没准备好，导致成图和预览不一致
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
    // 这里兜底字体等待失败，继续后续流程，避免海报导出被彻底阻断。
    console.warn('等待云栖名册招募海报字体加载完成失败：', error)
  }
}

/**
 * 等待图片加载完成
 * 用途：确保二维码图片真正绘制到节点后再执行导出
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

      const timerId = window.setTimeout(() => {
        resolve()
      }, 3000)

      const finish = (): void => {
        window.clearTimeout(timerId)
        resolve()
      }

      image.addEventListener('load', finish, { once: true })
      image.addEventListener('error', finish, { once: true })
    })),
  )
}

/**
 * 创建离屏导出舞台
 * 用途：把海报克隆到屏幕外导出，避免页面缩放影响成图尺寸
 * 入参：无
 * 返回值：返回离屏容器节点
 */
function createExportStage(): HTMLDivElement {
  const stage = document.createElement('div')
  stage.style.position = 'fixed'
  stage.style.left = '-10000px'
  stage.style.top = '-10000px'
  stage.style.width = `${props.template.exportWidth}px`
  stage.style.height = `${props.template.exportHeight}px`
  stage.style.pointerEvents = 'none'
  stage.style.opacity = '0'
  stage.style.zIndex = '-1'
  return stage
}

/**
 * 克隆海报节点
 * 用途：导出时去掉页面预览缩放，只保留原始尺寸的海报内容
 * 入参：source 为页面中的海报源节点
 * 返回值：返回克隆后的导出节点
 */
function clonePosterElement(source: HTMLElement): HTMLElement {
  const cloneElement = source.cloneNode(true) as HTMLElement
  cloneElement.style.position = 'relative'
  cloneElement.style.left = '0'
  cloneElement.style.top = '0'
  cloneElement.style.width = `${props.template.exportWidth}px`
  cloneElement.style.height = `${props.template.exportHeight}px`
  cloneElement.style.maxWidth = 'none'
  cloneElement.style.transform = 'none'
  cloneElement.style.transformOrigin = 'top left'
  cloneElement.style.overflow = 'hidden'
  cloneElement.style.borderRadius = '34px'
  return cloneElement
}

/**
 * 等待海报准备完成
 * 用途：统一等待下一帧、字体和二维码图片都准备就绪后再导出
 * 入参：target 为准备导出的海报节点
 * 返回值：无返回值
 */
async function waitForPosterReady(target: HTMLElement): Promise<void> {
  await nextTick()
  await waitForFontsReady()
  await waitForImagesReady(target)
}

/**
 * 把 dataUrl 转成文件对象
 * 用途：原生分享文件时需要 File 类型
 * 入参：dataUrl 为图片地址，fileName 为文件名
 * 返回值：返回生成好的文件对象
 */
async function dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  return new File([blob], fileName, { type: blob.type || 'image/png' })
}

/**
 * 校验当前是否允许导出
 * 用途：在二维码未准备好时拦住保存和分享操作
 * 入参：无
 * 返回值：允许返回 true，否则返回 false
 */
function validatePosterExport(): boolean {
  if (!isQrReady.value) {
    actionMessage.value = '二维码还在准备中，请稍候再试'
    return false
  }

  return true
}

/**
 * 生成导出文件名
 * 用途：统一保存与分享时的海报文件命名
 * 入参：无
 * 返回值：返回文件名
 */
function buildPosterFileName(): string {
  return `云栖名册登记招募海报-${Date.now()}.png`
}

/**
 * 导出海报图片
 * 用途：统一处理保存和分享前的截图逻辑与异常提示
 * 入参：无
 * 返回值：成功时返回图片地址和文件名，失败时返回 null
 */
async function exportPosterImage(): Promise<{ dataUrl: string; fileName: string } | null> {
  if (!validatePosterExport()) {
    return null
  }

  const sourceElement = getPosterElement()

  if (!sourceElement || typeof document === 'undefined') {
    lastError.value = '海报预览区域还没准备好，请稍后重试'
    actionMessage.value = lastError.value
    return null
  }

  isExporting.value = true
  actionMessage.value = '正在生成招募海报，请稍候...'
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
      width: props.template.exportWidth,
      height: props.template.exportHeight,
      canvasWidth: props.template.exportWidth,
      canvasHeight: props.template.exportHeight,
    })

    const fileName = buildPosterFileName()
    actionMessage.value = '招募海报生成成功'
    return { dataUrl, fileName }
  } catch (error) {
    // 这里兜底导出失败，避免用户点击后没有任何反馈。
    console.warn('导出云栖名册登记招募海报失败：', error)
    lastError.value = '海报导出失败，请点击重试'
    actionMessage.value = lastError.value
    return null
  } finally {
    isExporting.value = false
    exportStage.remove()
  }
}

/**
 * 触发浏览器下载
 * 用途：保存海报，以及原生分享不可用时的回退下载
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
    // 这里兜底下载失败，避免浏览器环境异常时静默失败。
    console.warn('下载云栖名册登记招募海报失败：', error)
    lastError.value = '下载海报失败，请稍后重试'
    actionMessage.value = lastError.value
    return false
  }
}

/**
 * 保存海报图片
 * 用途：点击按钮后导出并下载招募海报
 * 入参：无
 * 返回值：无返回值
 */
async function handleSave(): Promise<void> {
  const exported = await exportPosterImage()

  if (!exported) {
    return
  }

  if (downloadPoster(exported.dataUrl, exported.fileName)) {
    actionMessage.value = '招募海报已开始下载'
  }
}

/**
 * 分享海报图片
 * 用途：优先走原生文件分享，不支持时自动回退为下载
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
      typeof navigator !== 'undefined'
      && navigator.share
      && navigator.canShare
      && navigator.canShare({ files: [shareFile] })
    ) {
      await navigator.share({
        title: props.template.shareTitle,
        text: props.template.shareText,
        files: [shareFile],
        url: shareUrl.value,
      })
      actionMessage.value = '招募海报分享成功'
      return
    }
  } catch (error) {
    // 这里兜底原生分享失败，比如用户取消分享或系统暂不支持文件分享。
    console.warn('分享云栖名册登记招募海报失败，准备回退下载：', error)
  }

  if (downloadPoster(exported.dataUrl, exported.fileName)) {
    actionMessage.value = '当前环境不支持原生分享，已回退为下载海报'
  }
}

/**
 * 重试二维码与导出
 * 用途：二维码生成异常时给用户一个明确重试入口
 * 入参：无
 * 返回值：无返回值
 */
async function handleRetry(): Promise<void> {
  await generatePosterQr()
}

watch(
  () => [props.template.exportWidth, props.template.exportHeight],
  async () => {
    await nextTick()
    updatePreviewScale()
  },
)

watch(
  () => isPosterExpanded.value,
  async (expanded) => {
    // 这里展开后再绑定预览监听，避免默认折叠时仍渲染大海报。
    await nextTick()

    if (expanded) {
      bindPreviewObserver()
      return
    }

    clearPreviewObserver()
  },
)

onMounted(async () => {
  await generatePosterQr()
})

onBeforeUnmount(() => {
  clearPreviewObserver()
})
</script>

<template>
  <section
    class="roster-registration-poster-studio"
    :class="{
      'roster-registration-poster-studio--reduced': reduceMotion,
      'roster-registration-poster-studio--collapsed': !isPosterExpanded,
      'roster-registration-poster-studio--expanded': isPosterExpanded,
    }"
  >
    <div v-if="isPosterExpanded" class="roster-registration-poster-studio__preview">
      <div
        ref="previewViewportElement"
        class="roster-registration-poster-studio__card-shell"
        :style="previewCardStyle"
      >
        <div class="roster-registration-poster-studio__preview-canvas" :style="previewCanvasStyle">
          <div
            ref="posterSourceElement"
            class="roster-registration-poster-studio__poster-source"
            :style="previewSourceStyle"
          >
            <RosterRegistrationPosterCard
              :template="template"
              :qr-code-url="qrCodeUrl"
              :qr-hint="qrHint"
              :reduce-motion="reduceMotion"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="roster-registration-poster-studio__panel">
      <div class="roster-registration-poster-studio__header">
        <p class="roster-registration-poster-studio__eyebrow">官方招募海报</p>
        <h2 class="roster-registration-poster-studio__title">
          {{ isPosterExpanded ? '把这张云栖名册招募海报发出去，让同道先观名录，再循帖入山' : '云栖名册招募海报已收起' }}
        </h2>
        <p class="roster-registration-poster-studio__desc">
          {{ isPosterExpanded ? actionMessage : '点击下方按钮后，再展开海报预览、保存和分享功能。' }}
        </p>
      </div>

      <div class="roster-registration-poster-studio__fold-card">
        <span>固定官方海报</span>
        <strong>{{ template.title }}</strong>
        <p>扫码落点：云栖名册公开名录页</p>
      </div>

      <div v-if="isPosterExpanded" class="roster-registration-poster-studio__meta">
        <p>落点页面：云栖名册公开名录页</p>
        <p>导出比例：4:5 竖版，固定 {{ template.exportWidth }} × {{ template.exportHeight }}</p>
        <p>官方流程：{{ processSummary }}</p>
        <p>二维码口径：{{ template.qrCaption }}</p>
      </div>

      <div class="roster-registration-poster-studio__actions">
        <button
          type="button"
          class="roster-registration-poster-studio__button roster-registration-poster-studio__button--primary"
          @click="togglePosterExpanded"
        >
          {{ isPosterExpanded ? '收起海报功能' : '展开海报功能' }}
        </button>
        <button
          v-if="isPosterExpanded"
          type="button"
          class="roster-registration-poster-studio__button"
          :disabled="isExporting"
          @click="handleSave"
        >
          {{ isExporting ? '生成中...' : '保存海报' }}
        </button>
        <button
          v-if="isPosterExpanded"
          type="button"
          class="roster-registration-poster-studio__button roster-registration-poster-studio__button--primary"
          :disabled="isExporting"
          @click="handleShare"
        >
          {{ isExporting ? '生成中...' : '分享海报' }}
        </button>
        <button
          v-if="isPosterExpanded && lastError"
          type="button"
          class="roster-registration-poster-studio__button roster-registration-poster-studio__button--ghost"
          :disabled="isExporting"
          @click="handleRetry"
        >
          重试二维码
        </button>
      </div>

      <div v-if="isPosterExpanded" class="roster-registration-poster-studio__note">
        <p class="roster-registration-poster-studio__note-title">使用说明</p>
        <p>
          这是一张固定版官方招募海报，不接用户填写。扫码后会先进入公开名录页，方便先看同门，再决定是否登记入册。
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.roster-registration-poster-studio {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 430px);
  gap: 24px;
  align-items: stretch;
}

.roster-registration-poster-studio--collapsed {
  grid-template-columns: 1fr;
}

.roster-registration-poster-studio__preview,
.roster-registration-poster-studio__panel {
  padding: 24px;
  border-radius: 30px;
  border: 1px solid rgba(216, 185, 114, 0.18);
  background:
    linear-gradient(180deg, rgba(8, 30, 42, 0.92), rgba(5, 18, 28, 0.96)),
    rgba(5, 18, 28, 0.94);
  box-shadow: 0 22px 54px rgba(0, 0, 0, 0.28);
}

.roster-registration-poster-studio__preview {
  display: grid;
  place-items: center;
  overflow: hidden;
}

.roster-registration-poster-studio__card-shell {
  position: relative;
  width: min(100%, 470px);
  overflow: hidden;
  border-radius: 34px;
  background: rgba(7, 22, 31, 0.82);
  box-shadow: 0 28px 64px rgba(0, 0, 0, 0.24);
}

.roster-registration-poster-studio__preview-canvas {
  position: relative;
  display: block;
  margin: 0 auto;
}

.roster-registration-poster-studio__poster-source {
  position: relative;
  transform-origin: top left;
}

.roster-registration-poster-studio__panel,
.roster-registration-poster-studio__header,
.roster-registration-poster-studio__meta,
.roster-registration-poster-studio__note {
  display: grid;
  gap: 10px;
}

.roster-registration-poster-studio__eyebrow,
.roster-registration-poster-studio__title,
.roster-registration-poster-studio__desc,
.roster-registration-poster-studio__note-title {
  margin: 0;
}

.roster-registration-poster-studio__eyebrow,
.roster-registration-poster-studio__note-title {
  color: #8bd0cb;
  font-size: 12px;
  letter-spacing: 0.18em;
}

.roster-registration-poster-studio__title {
  color: #f4efe2;
  font-size: 28px;
  line-height: 1.36;
}

.roster-registration-poster-studio__desc,
.roster-registration-poster-studio__meta,
.roster-registration-poster-studio__note p {
  color: rgba(244, 239, 226, 0.74);
}

.roster-registration-poster-studio__desc,
.roster-registration-poster-studio__note p {
  font-size: 14px;
  line-height: 1.78;
}

.roster-registration-poster-studio__fold-card {
  display: grid;
  gap: 8px;
  margin-top: 18px;
  padding: 18px;
  border-radius: 22px;
  border: 1px solid rgba(216, 185, 114, 0.16);
  background:
    radial-gradient(circle at top left, rgba(139, 208, 203, 0.12), transparent 34%),
    rgba(255, 255, 255, 0.045);
}

.roster-registration-poster-studio__fold-card span,
.roster-registration-poster-studio__fold-card strong,
.roster-registration-poster-studio__fold-card p {
  margin: 0;
}

.roster-registration-poster-studio__fold-card span {
  color: #8bd0cb;
  font-size: 12px;
  letter-spacing: 0.16em;
}

.roster-registration-poster-studio__fold-card strong {
  color: #f4efe2;
  font-size: clamp(1.45rem, 4vw, 2.35rem);
  line-height: 1.18;
}

.roster-registration-poster-studio__fold-card p {
  color: rgba(244, 239, 226, 0.72);
  line-height: 1.7;
}

.roster-registration-poster-studio__meta {
  margin-top: 4px;
  font-size: 0.94rem;
  line-height: 1.74;
}

.roster-registration-poster-studio__meta p,
.roster-registration-poster-studio__note p {
  margin: 0;
}

.roster-registration-poster-studio__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
}

.roster-registration-poster-studio__button {
  min-height: 46px;
  padding: 0 18px;
  border-radius: 999px;
  border: 1px solid rgba(216, 185, 114, 0.16);
  background: rgba(255, 255, 255, 0.04);
  color: #f4efe2;
  cursor: pointer;
  transition:
    transform var(--transition-base),
    border-color var(--transition-base),
    background-color var(--transition-base);
}

.roster-registration-poster-studio__button:hover {
  transform: translateY(-2px);
}

.roster-registration-poster-studio__button:disabled {
  cursor: not-allowed;
  opacity: 0.72;
  transform: none;
}

.roster-registration-poster-studio__button--primary {
  background: linear-gradient(135deg, rgba(216, 185, 114, 0.92), rgba(170, 128, 53, 0.94));
  color: #102734;
}

.roster-registration-poster-studio__button--ghost {
  background: rgba(139, 208, 203, 0.08);
}

.roster-registration-poster-studio__note {
  padding-top: 6px;
  border-top: 1px solid rgba(216, 185, 114, 0.12);
}

.roster-registration-poster-studio--reduced,
.roster-registration-poster-studio--reduced * {
  transition: none !important;
  animation: none !important;
}

@media (max-width: 1024px) {
  .roster-registration-poster-studio {
    grid-template-columns: 1fr;
  }

  .roster-registration-poster-studio__card-shell {
    width: min(100%, 500px);
  }
}

@media (max-width: 720px) {
  .roster-registration-poster-studio__preview,
  .roster-registration-poster-studio__panel {
    padding: 18px 16px;
    border-radius: 24px;
  }

  .roster-registration-poster-studio__title {
    font-size: 22px;
    line-height: 1.42;
  }

  .roster-registration-poster-studio__actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .roster-registration-poster-studio__button {
    width: 100%;
  }

  .roster-registration-poster-studio__button:last-child:nth-child(odd) {
    grid-column: 1 / -1;
  }

  .roster-registration-poster-studio__meta {
    font-size: 0.88rem;
  }

  .roster-registration-poster-studio__card-shell {
    width: 100%;
    border-radius: 24px;
  }
}
</style>
