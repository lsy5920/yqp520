<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

/**
 * 组件入参类型
 * 用途：定义展示型播放器需要的全部展示数据
 */
interface MusicPlayerProps {
  /** 用途：当前曲目名称，没有时显示兜底文案 */
  trackName?: string
  /** 用途：封面区补充说明文案，可放作者名或短说明 */
  coverText?: string
  /** 用途：当前是否存在可用曲目 */
  hasTrack: boolean
  /** 用途：当前是否正在播放 */
  isPlaying: boolean
  /** 用途：用户是否期望继续播放，用来展示等待恢复状态 */
  desiredPlaying: boolean
  /** 用途：最近一次错误信息，没有时不展示错误态 */
  lastError?: string
  /** 用途：是否减少动态效果 */
  reduceMotion?: boolean
}

/**
 * 组件事件类型
 * 用途：把用户点击动作抛给主线页面处理
 */
interface MusicPlayerEmits {
  /** 用途：点击播放或暂停按钮时抛出 */
  (event: 'toggle-play'): void
}

const props = withDefaults(defineProps<MusicPlayerProps>(), {
  trackName: '',
  coverText: '',
  lastError: '',
  reduceMotion: false,
})

const emit = defineEmits<MusicPlayerEmits>()

/** 用途：播放器展开后空闲 2 秒自动缩成贴边图标。 */
const AUTO_COLLAPSE_DELAY = 2000
/** 用途：记录当前是否已经缩成贴边图标。 */
const isCollapsed = ref<boolean>(false)

/** 用途：保存自动收起定时器编号，方便反复重置。 */
let collapseTimerId: number | null = null

/**
 * 播放按钮文案
 * 用途：根据当前状态给用户最直接的操作提示
 */
const playButtonText = computed<string>(() => {
  if (!props.hasTrack) {
    return '待置入'
  }

  return props.isPlaying ? '暂停音乐' : '播放音乐'
})

/**
 * 主标题文案
 * 用途：显示曲目名，没有曲目时给出中文兜底
 */
const titleText = computed<string>(() => {
  if (!props.hasTrack) {
    return '暂无可用曲目'
  }

  return props.trackName?.trim() || '背景音乐已就绪'
})

/**
 * 状态文案
 * 用途：统一把播放、待置入、错误这些状态转成中文提示
 */
const statusText = computed<string>(() => {
  if (props.lastError?.trim()) {
    return props.lastError.trim()
  }

  if (!props.hasTrack) {
    return '当前还没有配置曲目，等待主线置入'
  }

  if (props.isPlaying) {
    return '背景音乐播放中'
  }

  if (props.desiredPlaying) {
    return '已记录你的播放意图，等待恢复播放'
  }

  return '点击下方按钮即可开启背景音乐'
})

/**
 * 缩起图标提示文案
 * 用途：给无障碍场景和鼠标悬停时提供明确提示
 */
const collapsedAriaLabel = computed<string>(() => `${titleText.value}，点击展开背景音乐播放器`)

/**
 * 判断当前是否可使用窗口对象
 * 用途：统一兼容服务端和浏览器环境，避免直接访问 window 报错
 * 入参：无
 * 返回值：浏览器环境返回 true，否则返回 false
 */
function hasWindowSupport(): boolean {
  return typeof window !== 'undefined'
}

/**
 * 清理自动收起定时器
 * 用途：避免多次计时叠加后出现状态跳动
 * 入参：无
 * 返回值：无返回值
 */
function clearCollapseTimer(): void {
  if (collapseTimerId === null || typeof window === 'undefined') {
    return
  }

  window.clearTimeout(collapseTimerId)
  collapseTimerId = null
}

/**
 * 启动自动收起计时
 * 用途：播放器展开后，空闲 2 秒自动缩回去
 * 入参：无
 * 返回值：无返回值
 */
function scheduleAutoCollapse(): void {
  clearCollapseTimer()

  if (!hasWindowSupport() || isCollapsed.value) {
    return
  }

  collapseTimerId = window.setTimeout(() => {
    isCollapsed.value = true
    collapseTimerId = null
  }, AUTO_COLLAPSE_DELAY)
}

/**
 * 同步收起模式
 * 用途：窗口尺寸变化时重新同步自动贴边逻辑
 * 入参：无
 * 返回值：无返回值
 */
function syncCollapseMode(): void {
  if (!isCollapsed.value) {
    scheduleAutoCollapse()
  }
}

/**
 * 记录一次播放器交互
 * 用途：用户刚操作完时重新开始 2 秒倒计时，避免立刻缩回去
 * 入参：无
 * 返回值：无返回值
 */
function registerInteraction(): void {
  isCollapsed.value = false
  scheduleAutoCollapse()
}

/**
 * 展开播放器
 * 用途：点击贴边图标后恢复完整卡片
 * 入参：无
 * 返回值：无返回值
 */
function expandPlayer(): void {
  isCollapsed.value = false
  scheduleAutoCollapse()
}

/**
 * 手动收起播放器
 * 用途：给所有端的用户一个立即缩回图标的明确入口
 * 入参：无
 * 返回值：无返回值
 */
function collapsePlayer(): void {
  clearCollapseTimer()
  isCollapsed.value = true
}

/**
 * 鼠标进入播放器
 * 用途：用户正在看内容时先暂停自动收起，避免阅读被打断
 * 入参：无
 * 返回值：无返回值
 */
function handleMouseEnter(): void {
  clearCollapseTimer()
}

/**
 * 鼠标离开播放器
 * 用途：离开后重新开始 5 秒收起倒计时
 * 入参：无
 * 返回值：无返回值
 */
function handleMouseLeave(): void {
  scheduleAutoCollapse()
}

/**
 * 处理窗口尺寸变化
 * 用途：窗口从桌面端切到移动端时，马上恢复完整播放器
 * 入参：无
 * 返回值：无返回值
 */
function handleWindowResize(): void {
  syncCollapseMode()
}

/**
 * 处理播放按钮点击
 * 用途：有曲目时切换播放，没有曲目时只保留状态提示
 * 入参：无
 * 返回值：无返回值
 */
function handleTogglePlay(): void {
  if (!props.hasTrack) {
    registerInteraction()
    return
  }

  emit('toggle-play')
  registerInteraction()
}

/**
 * 处理贴边图标点击
 * 用途：缩起后点击图标重新展开
 * 入参：无
 * 返回值：无返回值
 */
function handleExpandClick(): void {
  expandPlayer()
}

// 这里监听报错变化，一旦出现新错误就自动展开，避免错误提示被藏起来。
watch(
  () => props.lastError,
  (nextError, previousError) => {
    if (!nextError || nextError === previousError) {
      return
    }

    expandPlayer()
  },
)

// 这里监听播放状态变化，保证从其他入口触发播放后，倒计时仍会继续生效。
watch(
  () => props.isPlaying,
  () => {
    if (!isCollapsed.value) {
      scheduleAutoCollapse()
    }
  },
)

onMounted(() => {
  syncCollapseMode()

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', handleWindowResize)
  }
})

onBeforeUnmount(() => {
  clearCollapseTimer()

  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', handleWindowResize)
  }
})
</script>

<template>
  <section
    class="music-player"
    :class="{
      'music-player--collapsed': isCollapsed,
      'music-player--reduced': reduceMotion,
      'music-player--empty': !hasTrack,
      'music-player--error': Boolean(lastError),
    }"
    aria-label="背景音乐播放器"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <button
      v-if="isCollapsed"
      type="button"
      class="music-player__collapsed-button"
      :aria-label="collapsedAriaLabel"
      :title="collapsedAriaLabel"
      @click="handleExpandClick"
    >
      <span class="music-player__collapsed-shell" aria-hidden="true">
        <span class="music-player__disc music-player__disc--compact" />
      </span>
      <span
        class="music-player__collapsed-signal"
        :class="{ 'music-player__collapsed-signal--playing': isPlaying && !lastError, 'music-player__collapsed-signal--error': Boolean(lastError) }"
        aria-hidden="true"
      />
    </button>

    <template v-else>
      <div class="music-player__head">
        <div class="music-player__cover" aria-hidden="true">
          <span class="music-player__disc" />
        </div>

        <button
          type="button"
          class="music-player__fold-button"
          @click="collapsePlayer"
        >
          收起
        </button>
      </div>

      <div class="music-player__header">
        <p class="music-player__eyebrow">背景音乐</p>
        <h3 class="music-player__title">{{ titleText }}</h3>
        <p class="music-player__cover-text">
          {{ coverText || '为页面准备一点氛围感，也为分享时刻加点情绪。' }}
        </p>
        <p class="music-player__status">{{ statusText }}</p>
      </div>

      <div class="music-player__controls">
        <button
          type="button"
          class="music-player__button music-player__button--primary"
          :disabled="!hasTrack"
          @click="handleTogglePlay"
        >
          {{ playButtonText }}
        </button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.music-player {
  position: fixed;
  right: 24px;
  bottom: calc(20px + env(safe-area-inset-bottom));
  z-index: 11;
  display: grid;
  gap: 16px;
  width: min(360px, calc(100vw - 28px));
  padding: 18px;
  border-radius: 28px;
  background:
    linear-gradient(180deg, rgba(8, 30, 42, 0.96), rgba(5, 18, 28, 0.98)),
    rgba(5, 18, 28, 0.94);
  border: 1px solid rgba(216, 185, 114, 0.22);
  box-shadow: 0 24px 56px rgba(0, 0, 0, 0.34);
  color: #f4efe2;
  backdrop-filter: blur(22px);
  transition:
    width 0.35s ease,
    padding 0.35s ease,
    right 0.35s ease,
    border-radius 0.35s ease,
    box-shadow 0.35s ease,
    transform 0.35s ease;
}

.music-player--collapsed {
  right: 0;
  display: grid;
  width: 92px;
  padding: 12px 10px 12px 14px;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  place-items: center;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.3);
}

.music-player--empty {
  border-style: dashed;
}

.music-player--error {
  border-color: rgba(212, 154, 114, 0.36);
}

.music-player__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.music-player__cover {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 24px;
  background:
    radial-gradient(circle at 30% 30%, rgba(139, 208, 203, 0.25), transparent 35%),
    linear-gradient(135deg, rgba(216, 185, 114, 0.82), rgba(18, 49, 63, 0.95));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14);
}

.music-player__disc {
  width: 42px;
  height: 42px;
  border-radius: 999px;
  background:
    radial-gradient(circle at center, #f6f2e6 0 14%, #0f2835 14% 28%, #d8b972 28% 62%, #0f2835 62% 100%);
}

.music-player__disc--compact {
  width: 34px;
  height: 34px;
}

.music-player__collapsed-button {
  position: relative;
  display: grid;
  width: 100%;
  min-height: 56px;
  place-items: center;
  border: none;
  border-radius: 20px 0 0 20px;
  background:
    linear-gradient(135deg, rgba(17, 50, 68, 0.96), rgba(8, 28, 39, 0.98)),
    rgba(8, 28, 39, 0.92);
  cursor: pointer;
}

.music-player__collapsed-button::before {
  content: '';
  position: absolute;
  inset: 8px 8px 8px 2px;
  border: 1px solid rgba(216, 185, 114, 0.18);
  border-radius: 16px 0 0 16px;
}

.music-player__collapsed-shell {
  position: relative;
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 16px;
  background:
    radial-gradient(circle at 30% 30%, rgba(139, 208, 203, 0.22), transparent 35%),
    linear-gradient(135deg, rgba(216, 185, 114, 0.84), rgba(18, 49, 63, 0.94));
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2);
}

.music-player__collapsed-shell::after {
  content: '';
  position: absolute;
  inset: -6px;
  border: 1px solid rgba(139, 208, 203, 0.18);
  border-radius: 20px;
  animation: music-player-pulse 2.8s ease-in-out infinite;
}

.music-player__collapsed-signal {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: rgba(244, 239, 226, 0.24);
  box-shadow: 0 0 0 4px rgba(244, 239, 226, 0.08);
}

.music-player__collapsed-signal--playing {
  background: #8bd0cb;
}

.music-player__collapsed-signal--error {
  background: #d49a72;
}

.music-player__header {
  display: grid;
  gap: 8px;
  text-align: left;
}

.music-player__eyebrow,
.music-player__title,
.music-player__cover-text,
.music-player__status {
  margin: 0;
}

.music-player__eyebrow {
  font-size: 12px;
  letter-spacing: 0.14em;
  color: #8bd0cb;
}

.music-player__title {
  font-size: 1.22rem;
  line-height: 1.3;
}

.music-player__cover-text {
  font-size: 14px;
  line-height: 1.7;
  color: rgba(244, 239, 226, 0.72);
}

.music-player__status {
  font-size: 13px;
  line-height: 1.7;
  color: rgba(216, 185, 114, 0.88);
}

.music-player__fold-button {
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid rgba(216, 185, 114, 0.18);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(244, 239, 226, 0.78);
  cursor: pointer;
}

.music-player__controls {
  display: flex;
  gap: 12px;
}

.music-player__button {
  min-height: 44px;
  padding: 0 18px;
  border: 1px solid rgba(216, 185, 114, 0.2);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  color: #f4efe2;
  cursor: pointer;
}

.music-player__button--primary {
  flex: 1;
  background: linear-gradient(135deg, rgba(216, 185, 114, 0.92), rgba(170, 128, 53, 0.94));
  color: #102734;
}

.music-player__button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.music-player--reduced,
.music-player--reduced * {
  transition: none !important;
  animation: none !important;
}

@keyframes music-player-pulse {
  0%,
  100% {
    opacity: 0.28;
    transform: scale(0.96);
  }

  50% {
    opacity: 0.78;
    transform: scale(1.04);
  }
}

@media (max-width: 720px) {
  .music-player {
    right: 10px;
    left: 10px;
    width: auto;
    bottom: calc(10px + env(safe-area-inset-bottom));
  }

  .music-player--collapsed {
    right: 0;
    left: auto;
    width: 92px;
    padding: 12px 10px 12px 14px;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    border-top-left-radius: 20px;
    border-bottom-left-radius: 20px;
  }
}
</style>
