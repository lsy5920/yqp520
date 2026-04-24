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
  /** 用途：上层传入的状态文案，优先用于展示当前音乐状态 */
  statusText?: string
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
  statusText: '',
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
  if (props.statusText?.trim()) {
    return props.statusText.trim()
  }

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
  bottom: calc(var(--site-player-bottom, 20px) + env(safe-area-inset-bottom));
  z-index: 11;
  display: grid;
  gap: 16px;
  width: min(360px, calc(100vw - 28px));
  padding: 18px;
  border-radius: 28px;
  background:
    radial-gradient(circle at 22% 18%, rgba(255, 255, 255, 0.72), transparent 30%),
    linear-gradient(180deg, rgba(247, 252, 244, 0.9), rgba(218, 242, 236, 0.94));
  border: 1px solid rgba(84, 154, 151, 0.28);
  box-shadow: 0 24px 56px rgba(37, 103, 101, 0.2);
  color: #173d42;
  backdrop-filter: blur(22px);
  overflow: hidden;
  transition:
    width 0.35s ease,
    padding 0.35s ease,
    right 0.35s ease,
    border-radius 0.35s ease,
    box-shadow 0.35s ease,
    transform 0.35s ease;
}

.music-player::before,
.music-player::after {
  position: absolute;
  pointer-events: none;
  content: '';
}

.music-player::before {
  inset: 0;
  background:
    radial-gradient(circle at 22% 18%, rgba(255, 255, 255, 0.62), transparent 24%),
    radial-gradient(circle at 86% 12%, rgba(84, 154, 151, 0.14), transparent 26%),
    linear-gradient(118deg, transparent 0 40%, rgba(255, 255, 255, 0.22) 42%, transparent 44%);
}

.music-player::after {
  right: -28px;
  bottom: -38px;
  width: 150px;
  height: 150px;
  border: 1px solid rgba(84, 154, 151, 0.18);
  border-radius: 999px;
  box-shadow:
    inset 0 0 0 18px rgba(255, 255, 255, 0.14),
    inset 0 0 0 34px rgba(84, 154, 151, 0.08);
}

.music-player--collapsed {
  right: 0;
  display: grid;
  width: 92px;
  padding: 12px 10px 12px 14px;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  place-items: center;
  box-shadow: 0 18px 40px rgba(37, 103, 101, 0.22);
}

.music-player--collapsed::before,
.music-player--collapsed::after {
  display: none;
}

.music-player--empty {
  border-style: dashed;
}

.music-player--error {
  border-color: rgba(167, 100, 73, 0.36);
}

.music-player__head {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.music-player__cover {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 24px;
  background:
    radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.86), transparent 34%),
    linear-gradient(135deg, rgba(91, 188, 181, 0.76), rgba(231, 247, 241, 0.96));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7), 0 12px 24px rgba(63, 170, 167, 0.16);
}

.music-player__cover::after {
  position: absolute;
  inset: -8px;
  border: 1px solid rgba(84, 154, 151, 0.18);
  border-radius: 30px;
  content: '';
  animation: music-player-pulse 3.6s ease-in-out infinite;
}

.music-player__disc {
  position: relative;
  width: 42px;
  height: 42px;
  border-radius: 999px;
  background:
    radial-gradient(circle at center, #f9fff8 0 14%, #3faaa7 14% 28%, #d7f1eb 28% 62%, #2f7778 62% 100%);
}

.music-player__disc::after {
  position: absolute;
  inset: 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  content: '';
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
    linear-gradient(135deg, rgba(246, 251, 244, 0.96), rgba(205, 236, 230, 0.98)),
    rgba(246, 251, 244, 0.92);
  cursor: pointer;
  box-shadow: 0 12px 28px rgba(37, 103, 101, 0.18);
}

.music-player__collapsed-button::before {
  content: '';
  position: absolute;
  inset: 8px 8px 8px 2px;
  border: 1px solid rgba(84, 154, 151, 0.22);
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
    radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.82), transparent 35%),
    linear-gradient(135deg, rgba(91, 188, 181, 0.78), rgba(236, 249, 244, 0.96));
  box-shadow: 0 12px 24px rgba(37, 103, 101, 0.18);
}

.music-player__collapsed-shell::before {
  position: absolute;
  inset: 8px;
  border: 2px solid rgba(23, 61, 66, 0.72);
  border-radius: 999px;
  content: '';
}

.music-player__collapsed-shell::after {
  content: '';
  position: absolute;
  inset: -6px;
  border: 1px solid rgba(84, 154, 151, 0.26);
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
  background: rgba(23, 61, 66, 0.24);
  box-shadow: 0 0 0 4px rgba(63, 170, 167, 0.12);
}

.music-player__collapsed-signal--playing {
  background: #3faaa7;
}

.music-player__collapsed-signal--error {
  background: #a76449;
}

.music-player__header {
  position: relative;
  z-index: 1;
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
  color: #3faaa7;
}

.music-player__title {
  font-size: 1.22rem;
  line-height: 1.3;
}

.music-player__cover-text {
  font-size: 14px;
  line-height: 1.7;
  color: rgba(35, 83, 86, 0.72);
}

.music-player__status {
  font-size: 13px;
  line-height: 1.7;
  color: rgba(50, 128, 126, 0.88);
}

.music-player__fold-button {
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid rgba(84, 154, 151, 0.22);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.56);
  color: rgba(35, 83, 86, 0.78);
  cursor: pointer;
}

.music-player__controls {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 12px;
}

.music-player__button {
  min-height: 44px;
  padding: 0 18px;
  border: 1px solid rgba(84, 154, 151, 0.26);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.58);
  color: #173d42;
  cursor: pointer;
}

.music-player__button--primary {
  flex: 1;
  background: linear-gradient(135deg, rgba(74, 171, 166, 0.88), rgba(207, 239, 231, 0.96));
  color: #12383d;
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
    bottom: calc(var(--site-player-bottom-mobile, 10px) + env(safe-area-inset-bottom));
    gap: 12px;
    padding: 14px;
    border-radius: 22px;
  }

  .music-player--collapsed {
    right: 0;
    left: auto;
    width: 86px;
    padding: 10px 8px 10px 12px;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    border-top-left-radius: 18px;
    border-bottom-left-radius: 18px;
  }

  .music-player__head {
    gap: 12px;
  }

  .music-player__cover {
    width: 56px;
    height: 56px;
    border-radius: 18px;
  }

  .music-player__disc {
    width: 32px;
    height: 32px;
  }

  .music-player__title {
    font-size: 1.06rem;
    line-height: 1.35;
  }

  .music-player__cover-text {
    display: none;
  }

  .music-player__status {
    font-size: 12px;
    line-height: 1.6;
  }

  .music-player__controls {
    gap: 10px;
  }

  .music-player__button {
    min-height: 42px;
    padding: 0 14px;
  }
}
</style>

/* 精简贴边态：取消背景卡片，只保留小型青玉音印和透明点击热区。 */
.music-player--collapsed {
  right: 0;
  width: 48px;
  min-height: 48px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
  overflow: visible;
}

.music-player--collapsed .music-player__collapsed-button {
  width: 48px;
  min-height: 48px;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.music-player--collapsed .music-player__collapsed-button::before,
.music-player--collapsed .music-player__collapsed-shell::after {
  display: none;
}

.music-player--collapsed .music-player__collapsed-shell {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: transparent;
  box-shadow: none;
}

.music-player--collapsed .music-player__collapsed-shell::before {
  inset: 3px;
  border: 2px solid rgba(23, 61, 66, 0.82);
  border-radius: 999px;
  box-shadow: 0 0 0 1px rgba(248, 255, 251, 0.64), 0 0 16px rgba(63, 170, 167, 0.22);
}

.music-player--collapsed .music-player__collapsed-signal {
  top: 8px;
  right: 7px;
  width: 7px;
  height: 7px;
  box-shadow: 0 0 0 3px rgba(63, 170, 167, 0.14);
}

@media (max-width: 720px) {
  .music-player--collapsed {
    right: 0;
    left: auto;
    width: 48px;
    min-height: 48px;
    padding: 0;
    border-radius: 0;
  }
}
