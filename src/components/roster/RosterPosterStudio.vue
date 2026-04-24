<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { toPng } from 'html-to-image'
import { toDataURL } from 'qrcode'
import RosterPosterCard from '@/components/roster/RosterPosterCard.vue'
import { rosterPosterTemplate } from '@/data/rosterContent'
import type { PublicRosterEntry } from '@/types/roster'
import { resolveRosterEntryUrl } from '@/utils/roster'

/**
 * 组件入参类型
 * 用途：让公开详情页把当前记录与动作权限传进来
 */
interface RosterPosterStudioProps {
  /** 用途：当前公开记录 */
  entry: PublicRosterEntry
  /** 用途：是否允许导出名帖 */
  allowPosterActions?: boolean
  /** 用途：导出宽度 */
  exportWidth?: number
  /** 用途：导出高度 */
  exportHeight?: number
}

const props = withDefaults(defineProps<RosterPosterStudioProps>(), {
  allowPosterActions: true,
  exportWidth: rosterPosterTemplate.exportWidth,
  exportHeight: rosterPosterTemplate.exportHeight,
})

// 这里保存预览中的真实卡面节点，预览和导出共用同一份内容。
const posterSourceElement = ref<HTMLElement | null>(null)

// 这里保存预览视口节点，方便随容器尺寸重算缩放比例。
const previewViewportElement = ref<HTMLElement | null>(null)

// 这里记录预览缩放比例，保证手机端和电脑端看到的是同一张名帖。
const previewScale = ref<number>(Math.min(1, 420 / props.exportWidth))

// 这里记录二维码是否已经准备好，导出前需要先检查。
const isQrReady = ref<boolean>(false)

// 这里保存二维码图片地址，预览、导出和分享都复用这一张。
const qrCodeUrl = ref<string>('')

// 这里保存公开详情实际链接，二维码与复制链接统一使用。
const shareUrl = ref<string>('')

// 这里记录导出状态，避免用户重复连点。
const isExporting = ref<boolean>(false)

// 这里记录海报功能是否展开，默认折叠可以减少详情页首屏压力。
const isPosterExpanded = ref<boolean>(false)

// 这里记录当前提示语，给用户清楚说明现在能做什么。
const actionMessage = ref<string>('名帖已经备好，可以保存成图、复制链接或直接分享。')

// 这里记录最近一次错误，方便显示重试文案。
const lastError = ref<string>('')

// 这里保存预览区尺寸监听器，组件卸载时需要释放。
let previewResizeObserver: ResizeObserver | null = null

/**
 * 卡面视口比例样式
 * 用途：让页面里的预览盒子始终保持 4:5 成图比例
 */
const previewCardStyle = computed<Record<string, string>>(() => ({
  aspectRatio: `${props.exportWidth} / ${props.exportHeight}`,
}))

/**
 * 预览画布尺寸样式
 * 用途：让缩放后的预览盒子尺寸和真实视觉一致，避免出现裁切
 */
const previewCanvasStyle = computed<Record<string, string>>(() => ({
  width: `${Math.round(props.exportWidth * previewScale.value)}px`,
  height: `${Math.round(props.exportHeight * previewScale.value)}px`,
}))

/**
 * 预览源节点样式
 * 用途：把真实原尺寸名帖按比例缩进页面
 */
const previewSourceStyle = computed<Record<string, string>>(() => ({
  width: `${props.exportWidth}px`,
  height: `${props.exportHeight}px`,
  transform: `scale(${previewScale.value})`,
}))

/**
 * 二维码说明文本
 * 用途：卡面下方显示更短的网址提示
 */
const qrHint = computed<string>(() => (
  shareUrl.value ? shareUrl.value.replace(/^https?:\/\//, '') : '云栖名册公开详情页'
))

/**
 * 是否只允许复制链接
 * 用途：暂缓和不予收录状态不再提供名帖导出
 */
const isLinkOnlyMode = computed<boolean>(() => !props.allowPosterActions)

/**
 * 切换海报功能展开状态
 * 用途：让用户点击按钮后再展开或收起海报预览与操作区
 * 入参：无
 * 返回值：无返回值
 */
function togglePosterExpanded(): void {
  isPosterExpanded.value = !isPosterExpanded.value
}

/**
 * 更新预览缩放比例
 * 用途：让预览始终在不同设备下完整显示，不变形也不被裁掉
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
    viewportWidth / props.exportWidth,
    viewportHeight / props.exportHeight,
    1,
  )

  if (Number.isFinite(nextScale) && nextScale > 0) {
    previewScale.value = nextScale
  }
}

/**
 * 绑定预览区尺寸监听
 * 用途：窗口变化时自动重算预览缩放，保证移动端与桌面端卡面一致
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
 * 用途：组件卸载时释放监听器，避免长期运行残留无效引用
 * 入参：无
 * 返回值：无返回值
 */
function clearPreviewObserver(): void {
  previewResizeObserver?.disconnect()
  previewResizeObserver = null
}

/**
 * 生成二维码图片
 * 用途：让分享名帖扫码后直接回到当前公开详情页
 * 入参：无
 * 返回值：无返回值
 */
async function generatePosterQr(): Promise<void> {
  shareUrl.value = resolveRosterEntryUrl(props.entry.publicSlug)
  isQrReady.value = false

  if (!shareUrl.value) {
    qrCodeUrl.value = ''
    return
  }

  try {
    qrCodeUrl.value = await toDataURL(shareUrl.value, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 220,
      color: {
        dark: '#102734',
        light: '#f4efe2',
      },
    })
    isQrReady.value = true
    lastError.value = ''
    actionMessage.value = isLinkOnlyMode.value
      ? '当前状态不提供名帖导出，但你仍可复制链接继续跟进。'
      : '名帖已经备好，可以保存成图、复制链接或直接分享。'
  } catch (error) {
    console.warn('生成云栖名帖二维码失败：', error)
    qrCodeUrl.value = ''
    isQrReady.value = false
    lastError.value = '二维码生成失败，请稍后重试'
    actionMessage.value = lastError.value
  }
}

/**
 * 获取导出源节点
 * 用途：统一拿到真实卡面节点参与导出
 * 入参：无
 * 返回值：返回卡面节点
 */
function getPosterElement(): HTMLElement | null {
  return posterSourceElement.value
}

/**
 * 等待字体加载完成
 * 用途：避免导出时字体还没准备好，导致成图与预览不一致
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
    console.warn('等待云栖名帖字体加载失败：', error)
  }
}

/**
 * 等待图片加载完成
 * 用途：确保二维码图片已经绘制到节点后再导出
 * 入参：target 为导出节点
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
 * 用途：把卡面克隆到屏幕外，避免页面缩放影响最终截图
 * 入参：无
 * 返回值：返回导出舞台节点
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
 * 克隆卡面节点
 * 用途：导出时去掉页面缩放，只保留原始尺寸卡面
 * 入参：source 为页面中的卡面节点
 * 返回值：返回可直接截图的克隆节点
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
  cloneElement.style.borderRadius = '34px'
  return cloneElement
}

/**
 * 等待卡面状态稳定
 * 用途：统一等待 DOM、字体和图片加载好后再导出
 * 入参：target 为准备导出的节点
 * 返回值：无返回值
 */
async function waitForPosterReady(target: HTMLElement): Promise<void> {
  await nextTick()
  await waitForFontsReady()
  await waitForImagesReady(target)
}

/**
 * 把 dataUrl 转成文件对象
 * 用途：系统原生分享文件时需要 File 类型
 * 入参：dataUrl 为图片地址，fileName 为文件名
 * 返回值：返回文件对象
 */
async function dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  return new File([blob], fileName, { type: blob.type || 'image/png' })
}

/**
 * 复制文本到剪贴板
 * 用途：复制链接按钮统一走这里，失败时回退为旧方案
 * 入参：text 为要复制的文本
 * 返回值：复制成功返回 true，否则返回 false
 */
async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (error) {
      console.warn('云栖名帖复制链接失败，准备回退备用方式：', error)
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
    console.warn('云栖名帖备用复制方式失败：', error)
    return false
  } finally {
    textarea.remove()
  }
}

/**
 * 校验当前是否允许导出
 * 用途：暂缓和不予收录时阻止继续导出名帖
 * 入参：无
 * 返回值：允许导出返回 true，否则返回 false
 */
function validatePosterExport(): boolean {
  if (isLinkOnlyMode.value) {
    actionMessage.value = '当前状态不提供名帖导出，你仍可复制链接查看公开详情。'
    return false
  }

  if (!isQrReady.value) {
    actionMessage.value = '二维码还在准备中，请稍候再试'
    return false
  }

  return true
}

/**
 * 导出名帖图片
 * 用途：统一处理保存和分享前的截图逻辑
 * 入参：无
 * 返回值：成功时返回 dataUrl 与文件名，失败时返回 null
 */
async function exportPosterImage(): Promise<{ dataUrl: string; fileName: string } | null> {
  if (!validatePosterExport()) {
    return null
  }

  const sourceElement = getPosterElement()

  if (!sourceElement || typeof document === 'undefined') {
    lastError.value = '名帖预览区域还没有准备好，请稍后重试'
    actionMessage.value = lastError.value
    return null
  }

  isExporting.value = true
  actionMessage.value = '正在生成云栖名帖，请稍候...'
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

    const fileName = `云栖名帖-${props.entry.daohao || '同门'}-${Date.now()}.png`
    actionMessage.value = '名帖生成成功'
    return { dataUrl, fileName }
  } catch (error) {
    console.warn('导出云栖名帖失败：', error)
    lastError.value = '名帖导出失败，请点击重试'
    actionMessage.value = lastError.value
    return null
  } finally {
    isExporting.value = false
    exportStage.remove()
  }
}

/**
 * 触发浏览器下载
 * 用途：保存成图和分享失败回退都要用到下载逻辑
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
    console.warn('下载云栖名帖失败：', error)
    lastError.value = '下载名帖失败，请稍后重试'
    actionMessage.value = lastError.value
    return false
  }
}

/**
 * 保存名帖图片
 * 用途：用户点击保存成图时导出并下载
 * 入参：无
 * 返回值：无返回值
 */
async function handleSave(): Promise<void> {
  const exported = await exportPosterImage()

  if (!exported) {
    return
  }

  if (downloadPoster(exported.dataUrl, exported.fileName)) {
    actionMessage.value = '名帖已经开始下载'
  }
}

/**
 * 分享名帖
 * 用途：优先走原生分享，不支持时自动回退为下载
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
        title: `${props.entry.daohao} 的云栖名帖`,
        text: `${props.entry.daohao} 的云栖名册公开详情`,
        files: [shareFile],
        url: shareUrl.value,
      })
      actionMessage.value = '名帖分享成功'
      return
    }
  } catch (error) {
    console.warn('分享云栖名帖失败，准备回退下载：', error)
  }

  if (downloadPoster(exported.dataUrl, exported.fileName)) {
    actionMessage.value = '当前环境不支持原生分享，已回退为下载名帖'
  }
}

/**
 * 复制当前公开链接
 * 用途：让用户能把待审核或正式详情页直接分享出去
 * 入参：无
 * 返回值：无返回值
 */
async function handleCopyLink(): Promise<void> {
  if (!shareUrl.value) {
    actionMessage.value = '当前公开链接还没有准备好，请稍后再试'
    return
  }

  const copied = await copyTextToClipboard(shareUrl.value)
  actionMessage.value = copied ? '公开链接已复制' : '复制链接失败，请稍后重试'
}

/**
 * 重试二维码生成
 * 用途：二维码生成失败时给用户明确重试入口
 * 入参：无
 * 返回值：无返回值
 */
async function handleRetry(): Promise<void> {
  await generatePosterQr()
}

watch(
  () => [props.entry.publicSlug, props.allowPosterActions],
  async () => {
    await nextTick()
    await generatePosterQr()
    updatePreviewScale()
  },
)

watch(
  () => [props.exportWidth, props.exportHeight],
  async () => {
    await nextTick()
    updatePreviewScale()
  },
)

watch(
  () => isPosterExpanded.value,
  async () => {
    // 这里等待展开后的预览节点渲染完成，再重新计算缩放比例。
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
  <section class="roster-poster-studio" :class="{ 'roster-poster-studio--expanded': isPosterExpanded }">
    <div class="roster-poster-studio__panel">
      <div class="roster-poster-studio__header">
        <p class="roster-poster-studio__eyebrow">云栖名帖</p>
        <h2 class="roster-poster-studio__title">
          {{ isPosterExpanded ? (isLinkOnlyMode ? '当前状态不再提供名帖导出' : '把这张云栖名帖保存下来，也可直接分享出去') : '云栖名帖海报功能已收起' }}
        </h2>
        <p class="roster-poster-studio__desc">
          {{ isPosterExpanded ? actionMessage : '点击下方按钮后，再展开预览、保存、分享和复制链接功能。' }}
        </p>
      </div>

      <div class="roster-poster-studio__fold-card">
        <span>当前道号</span>
        <strong>{{ entry.daohao || '云栖同门' }}</strong>
        <p>{{ entry.hallLabel }} · {{ entry.positionLabel }} · {{ entry.statusLabel }}</p>
      </div>

      <div v-if="isPosterExpanded" class="roster-poster-studio__meta">
        <p>公开道号：{{ entry.daohao }}</p>
        <p>公开性别：{{ entry.genderLabel }}</p>
        <p>门中分工：{{ entry.positionLabel }}</p>
        <p>当前状态：{{ entry.statusLabel }}</p>
        <p>归属堂口：{{ entry.hallLabel }}</p>
        <p>{{ entry.status === 'approved' ? `正式牒号：${entry.entryNo || '待定'}` : `回执编号：${entry.receiptCode || '待定'}` }}</p>
      </div>

      <div class="roster-poster-studio__actions">
        <button
          type="button"
          class="roster-poster-studio__button roster-poster-studio__button--primary"
          @click="togglePosterExpanded"
        >
          {{ isPosterExpanded ? '收起海报功能' : '展开海报功能' }}
        </button>
        <button
          v-if="isPosterExpanded && !isLinkOnlyMode"
          type="button"
          class="roster-poster-studio__button"
          :disabled="isExporting"
          @click="handleSave"
        >
          {{ isExporting ? '生成中...' : '保存成图' }}
        </button>
        <button
          v-if="isPosterExpanded && !isLinkOnlyMode"
          type="button"
          class="roster-poster-studio__button roster-poster-studio__button--primary"
          :disabled="isExporting"
          @click="handleShare"
        >
          {{ isExporting ? '生成中...' : '分享名帖' }}
        </button>
        <button
          v-if="isPosterExpanded"
          type="button"
          class="roster-poster-studio__button roster-poster-studio__button--ghost"
          @click="handleCopyLink"
        >
          复制链接
        </button>
        <button
          v-if="isPosterExpanded && lastError"
          type="button"
          class="roster-poster-studio__button roster-poster-studio__button--ghost"
          :disabled="isExporting"
          @click="handleRetry"
        >
          重试二维码
        </button>
      </div>
    </div>

    <div v-if="isPosterExpanded" class="roster-poster-studio__preview">
      <div ref="previewViewportElement" class="roster-poster-studio__card-shell" :style="previewCardStyle">
        <div class="roster-poster-studio__preview-canvas" :style="previewCanvasStyle">
          <div ref="posterSourceElement" class="roster-poster-studio__poster-source" :style="previewSourceStyle">
            <RosterPosterCard
              :entry="entry"
              :qr-code-url="qrCodeUrl"
              :qr-hint="qrHint"
              :reduce-motion="false"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.roster-poster-studio {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(300px, 430px);
  gap: 24px;
  align-items: start;
}

.roster-poster-studio:not(.roster-poster-studio--expanded) {
  grid-template-columns: 1fr;
}

.roster-poster-studio__panel,
.roster-poster-studio__preview {
  padding: 24px;
  border-radius: 28px;
  border: 1px solid rgba(216, 185, 114, 0.18);
  background:
    linear-gradient(180deg, rgba(8, 30, 42, 0.92), rgba(5, 18, 28, 0.96)),
    rgba(5, 18, 28, 0.94);
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.28);
}

.roster-poster-studio__header,
.roster-poster-studio__meta {
  display: grid;
  gap: 8px;
}

.roster-poster-studio__eyebrow,
.roster-poster-studio__title,
.roster-poster-studio__desc {
  margin: 0;
}

.roster-poster-studio__eyebrow {
  color: #c2410c;
  font-size: 12px;
  letter-spacing: 0.16em;
}

.roster-poster-studio__title {
  color: #f4efe2;
  font-size: 28px;
  line-height: 1.3;
}

.roster-poster-studio__desc,
.roster-poster-studio__meta {
  color: rgba(244, 239, 226, 0.72);
}

.roster-poster-studio__desc {
  font-size: 14px;
  line-height: 1.74;
}

.roster-poster-studio__fold-card {
  display: grid;
  gap: 8px;
  margin-top: 18px;
  padding: 18px;
  border-radius: 22px;
  border: 1px solid rgba(216, 185, 114, 0.16);
  background:
    radial-gradient(circle at top left, rgba(139, 208, 203, 0.12), transparent 32%),
    rgba(255, 255, 255, 0.045);
}

.roster-poster-studio__fold-card span,
.roster-poster-studio__fold-card strong,
.roster-poster-studio__fold-card p {
  margin: 0;
}

.roster-poster-studio__fold-card span {
  color: #8bd0cb;
  font-size: 12px;
  letter-spacing: 0.16em;
}

.roster-poster-studio__fold-card strong {
  color: #f4efe2;
  font-size: clamp(1.6rem, 4vw, 2.5rem);
  line-height: 1.18;
}

.roster-poster-studio__fold-card p {
  color: rgba(244, 239, 226, 0.72);
  line-height: 1.7;
}

.roster-poster-studio__meta {
  margin-top: 18px;
  font-size: 0.94rem;
  line-height: 1.78;
}

.roster-poster-studio__meta p {
  margin: 0;
}

.roster-poster-studio__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
}

.roster-poster-studio__button {
  min-height: 46px;
  padding: 0 18px;
  border-radius: 999px;
  border: 1px solid rgba(216, 185, 114, 0.16);
  background: rgba(255, 255, 255, 0.04);
  color: #f4efe2;
  cursor: pointer;
}

.roster-poster-studio__button--primary {
  background: linear-gradient(135deg, rgba(216, 185, 114, 0.92), rgba(170, 128, 53, 0.94));
  color: #102734;
}

.roster-poster-studio__button--ghost {
  background: rgba(139, 208, 203, 0.08);
}

.roster-poster-studio__preview {
  display: grid;
  place-items: center;
  overflow: hidden;
}

.roster-poster-studio__card-shell {
  position: relative;
  width: min(100%, 430px);
  overflow: hidden;
  border-radius: 34px;
  background: rgba(7, 22, 31, 0.82);
  box-shadow: 0 24px 56px rgba(0, 0, 0, 0.24);
}

.roster-poster-studio__preview-canvas {
  position: relative;
  display: block;
  margin: 0 auto;
}

.roster-poster-studio__poster-source {
  position: relative;
  transform-origin: top left;
}

@media (max-width: 960px) {
  .roster-poster-studio {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .roster-poster-studio__panel,
  .roster-poster-studio__preview {
    padding: 18px 16px;
    border-radius: 24px;
  }

  .roster-poster-studio__title {
    font-size: 22px;
    line-height: 1.38;
  }

  .roster-poster-studio__desc {
    font-size: 0.94rem;
  }

  .roster-poster-studio__actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .roster-poster-studio__button {
    width: 100%;
  }

  .roster-poster-studio__button:last-child:nth-child(odd) {
    grid-column: 1 / -1;
  }

  .roster-poster-studio__meta {
    margin-top: 16px;
    font-size: 0.88rem;
  }

  .roster-poster-studio__card-shell {
    width: 100%;
    border-radius: 24px;
  }
}
</style>
