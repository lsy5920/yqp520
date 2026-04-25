<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { toPng } from 'html-to-image'
import { toDataURL } from 'qrcode'
import RosterPosterCard from '@/components/roster/RosterPosterCard.vue'
import type { PublicRosterCard } from '@/types/roster'
import { resolveRosterEntryUrl } from '@/utils/roster'

// 这里定义海报工作台入参，默认允许导出和分享。
const props = withDefaults(defineProps<{
  /** 用途：公开名帖数据；入参含义：无；返回值含义：无 */
  entry: PublicRosterCard
  /** 用途：是否允许海报操作；入参含义：无；返回值含义：无 */
  allowPosterActions?: boolean
}>(), {
  allowPosterActions: true,
})

// 这里保存海报源节点，用于导出图片。
const posterSourceElement = ref<HTMLElement | null>(null)

// 这里保存二维码图片地址。
const qrCodeUrl = ref<string>('')

// 这里保存分享链接。
const shareUrl = ref<string>('')

// 这里保存导出状态。
const isExporting = ref<boolean>(false)

// 这里保存错误提示。
const lastError = ref<string>('')

// 这里计算二维码提示文案。
const qrHint = computed<string>(() => `${props.entry.jianghuName} 的云栖名帖链接`)

// 这里在组件挂载时生成二维码。
onMounted(() => {
  void refreshQrCode()
})

// 这里当名帖切换时重新生成二维码。
watch(() => props.entry.publicSlug, () => {
  void refreshQrCode()
})

/**
 * 生成二维码
 * 用途：把详情页链接转换成海报二维码
 * 入参：无
 * 返回值：无返回值
 */
async function refreshQrCode(): Promise<void> {
  lastError.value = ''
  shareUrl.value = resolveRosterEntryUrl(props.entry.publicSlug)

  try {
    qrCodeUrl.value = await toDataURL(shareUrl.value, {
      errorCorrectionLevel: 'M',
      margin: 1,
      scale: 6,
      color: { dark: '#111827', light: '#fff8e7' },
    })
  } catch (error) {
    lastError.value = error instanceof Error ? error.message : '二维码生成失败，请稍后重试。'
  }
}

/**
 * 导出海报
 * 用途：把名帖海报节点转成 PNG 图片
 * 入参：无
 * 返回值：返回图片数据和文件名
 */
async function exportPoster(): Promise<{ dataUrl: string; fileName: string }> {
  const element = posterSourceElement.value
  if (!element) {
    throw new Error('海报画布还没有准备好，请稍后再试。')
  }

  const dataUrl = await toPng(element, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: 'transparent',
  })

  return {
    dataUrl,
    fileName: `云栖名帖-${props.entry.jianghuName || '同门'}-${Date.now()}.png`,
  }
}

/**
 * 下载海报
 * 用途：导出 PNG 并触发浏览器下载
 * 入参：无
 * 返回值：无返回值
 */
async function handleDownload(): Promise<void> {
  isExporting.value = true
  lastError.value = ''

  try {
    const exported = await exportPoster()
    const link = document.createElement('a')
    link.href = exported.dataUrl
    link.download = exported.fileName
    link.click()
  } catch (error) {
    lastError.value = error instanceof Error ? error.message : '导出海报失败，请稍后重试。'
  } finally {
    isExporting.value = false
  }
}

/**
 * 复制链接
 * 用途：把名帖详情链接复制到剪贴板
 * 入参：无
 * 返回值：无返回值
 */
async function handleCopyLink(): Promise<void> {
  lastError.value = ''

  try {
    await navigator.clipboard.writeText(shareUrl.value)
  } catch (_error) {
    lastError.value = '复制失败，请手动复制浏览器地址。'
  }
}
</script>

<template>
  <section class="roster-poster-studio">
    <div class="roster-poster-studio__panel">
      <p>名帖海报</p>
      <h2>一键生成江湖金墨海报</h2>
      <span>为「{{ entry.jianghuName }}」生成可分享的手机名帖海报，二维码直达详情页。</span>
      <div v-if="allowPosterActions" class="roster-poster-studio__actions">
        <button type="button" :disabled="isExporting" @click="handleDownload">{{ isExporting ? '导出中……' : '下载海报' }}</button>
        <button type="button" @click="handleCopyLink">复制链接</button>
        <button v-if="lastError" type="button" @click="refreshQrCode">重试二维码</button>
      </div>
      <small v-if="lastError">{{ lastError }}</small>
    </div>

    <div class="roster-poster-studio__preview">
      <div ref="posterSourceElement" class="roster-poster-studio__source">
        <RosterPosterCard :entry="entry" :qr-code-url="qrCodeUrl" :qr-hint="qrHint" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.roster-poster-studio {
  display: grid;
  gap: 16px;
}

.roster-poster-studio__panel,
.roster-poster-studio__preview {
  border: 1px solid rgba(231, 190, 107, 0.24);
  border-radius: 28px;
  background: rgba(10, 15, 26, 0.9);
  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.34);
  backdrop-filter: blur(18px);
}

.roster-poster-studio__panel {
  display: grid;
  gap: 10px;
  padding: 20px;
}

.roster-poster-studio__panel p,
.roster-poster-studio__panel h2,
.roster-poster-studio__panel span {
  margin: 0;
}

.roster-poster-studio__panel p {
  color: #e8bd68;
  letter-spacing: 0.18em;
}

.roster-poster-studio__panel span,
.roster-poster-studio__panel small {
  color: rgba(248, 239, 216, 0.72);
  line-height: 1.75;
}

.roster-poster-studio__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.roster-poster-studio__actions button {
  min-height: 44px;
  border: 1px solid rgba(231, 190, 107, 0.24);
  border-radius: 999px;
  background: rgba(231, 190, 107, 0.16);
  color: #f8efd8;
}

.roster-poster-studio__actions button:first-child {
  background: linear-gradient(135deg, #dfad55, #fff0b8);
  color: #160f07;
  font-weight: 800;
}

.roster-poster-studio__preview {
  overflow: auto;
  padding: 16px;
}

.roster-poster-studio__source {
  width: 420px;
  transform: scale(min(1, calc((100vw - 64px) / 420)));
  transform-origin: top left;
}
</style>
