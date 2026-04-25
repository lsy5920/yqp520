<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

/**
 * 组件入参类型
 * 用途：描述歌词云签和右侧云播放器需要的全部展示数据
 */
interface MusicLyricOverlayProps {
  /** 用途：控制歌词云签是否显示 */
  visible: boolean
  /** 用途：当前正在唱到的歌词 */
  currentLine?: string
  /** 用途：下一句歌词，播放器展开后作为温柔提示 */
  nextLine?: string
  /** 用途：当前曲目名称，没有时显示兜底文案 */
  trackName?: string
  /** 用途：曲目补充说明，可放歌曲介绍 */
  coverText?: string
  /** 用途：当前是否存在可用曲目 */
  hasTrack: boolean
  /** 用途：当前是否正在播放 */
  isPlaying: boolean
  /** 用途：用户是否期望继续播放，用来判断等待恢复状态 */
  desiredPlaying: boolean
  /** 用途：最近一次错误信息，没有时不展示错误态 */
  lastError?: string
  /** 用途：上层传入的状态文案，优先用于展示当前音乐状态 */
  statusText?: string
  /** 用途：当前音量，范围从 0 到 1 */
  volume: number
  /** 用途：当前播放到第几秒 */
  currentTimeSeconds: number
}

/**
 * 组件事件类型
 * 用途：把播放器操作交给全局音频逻辑处理
 */
interface MusicLyricOverlayEmits {
  /** 用途：点击播放或暂停按钮时抛出 */
  (event: 'toggle-play'): void
  /** 用途：拖动音量滑杆时抛出 */
  (event: 'volume-change', value: number): void
}

const props = withDefaults(defineProps<MusicLyricOverlayProps>(), {
  currentLine: '',
  nextLine: '',
  trackName: '',
  coverText: '',
  lastError: '',
  statusText: '',
})

const emit = defineEmits<MusicLyricOverlayEmits>()

/** 用途：记录右侧云播放器是否已经展开。 */
const isPanelOpen = ref<boolean>(false)
/** 用途：保存播放器面板节点，展开后把键盘焦点移进去。 */
const panelElement = ref<HTMLElement | null>(null)

/**
 * 当前是否真的需要渲染歌词云签
 * 用途：没有曲目时不展示任何音乐入口，避免空控件打扰页面
 */
const shouldRender = computed<boolean>(() => props.visible && props.hasTrack)

/**
 * 歌词云签显示文本
 * 用途：优先显示当前歌词，没有歌词时显示可点击的清音提示
 */
const lyricTriggerText = computed<string>(() => {
  const trimmedLine = props.currentLine.trim()

  if (trimmedLine) {
    return trimmedLine
  }

  if (props.isPlaying) {
    return '云间清音正流过'
  }

  if (props.desiredPlaying) {
    return '轻点续上云栖清音'
  }

  return '轻点云笺启清音'
})

/**
 * 当前歌词拆字结果
 * 用途：把一句歌词拆成单字数组，方便逐字做漂浮显现动效
 */
const currentCharacters = computed<string[]>(() => Array.from(lyricTriggerText.value))

/**
 * 当前歌词切换键
 * 用途：让歌词变化时能够重新触发逐字漂浮动画
 */
const currentLineKey = computed<string>(() => lyricTriggerText.value)

/**
 * 曲目标题
 * 用途：播放器面板里统一展示曲名
 */
const titleText = computed<string>(() => {
  const trimmedTrackName = props.trackName.trim()
  return trimmedTrackName || '云栖清音'
})

/**
 * 播放按钮文案
 * 用途：根据当前播放状态给出最直接的动作提示
 */
const playButtonText = computed<string>(() => (props.isPlaying ? '暂停清音' : '播放清音'))

/**
 * 播放状态文案
 * 用途：统一把错误、播放、暂停和等待恢复状态转成中文提示
 */
const panelStatusText = computed<string>(() => {
  const trimmedStatus = props.statusText.trim()
  const trimmedError = props.lastError.trim()

  if (trimmedError) {
    return trimmedError
  }

  if (trimmedStatus) {
    return trimmedStatus
  }

  if (props.isPlaying) {
    return '云栖清音正在流动'
  }

  if (props.desiredPlaying) {
    return '已记住你的播放意愿，等待浏览器放行'
  }

  return '轻点播放，让云里的清音入场'
})

/**
 * 当前音量百分比
 * 用途：给滑杆旁边显示更容易理解的数字
 */
const volumePercent = computed<number>(() => Math.round(Math.min(1, Math.max(0, props.volume)) * 100))

/**
 * 音量滑杆背景样式
 * 用途：让已选择的音量像云光一样铺开
 */
const volumeRangeStyle = computed<Record<string, string>>(() => ({
  '--music-cloud-volume': `${volumePercent.value}%`,
}))

/**
 * 下一句歌词文案
 * 用途：展开播放器时给用户看到下一句歌词预告
 */
const nextLyricText = computed<string>(() => {
  const trimmedNextLine = props.nextLine.trim()
  return trimmedNextLine || '下一句清音正在云后等候'
})

/**
 * 当前播放时间文案
 * 用途：把秒数转换成 分:秒 形式，方便用户理解播放进度
 */
const currentTimeText = computed<string>(() => formatClock(props.currentTimeSeconds))

/**
 * 处理单个字符显示
 * 用途：把空格转换成不换行空格，避免逐字渲染时丢掉留白
 * 入参：character 为当前字符
 * 返回值：返回可直接渲染的字符
 */
function formatCharacter(character: string): string {
  return character === ' ' ? '\u00A0' : character
}

/**
 * 格式化播放时间
 * 用途：把秒数转换成两位分钟和两位秒数
 * 入参：seconds 为当前播放秒数
 * 返回值：返回格式化后的时间文本
 */
function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '00:00'
  }

  const roundedSeconds = Math.floor(seconds)
  const minutes = Math.floor(roundedSeconds / 60)
  const remainSeconds = roundedSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainSeconds).padStart(2, '0')}`
}

/**
 * 展开右侧云播放器
 * 用途：点击歌词云签后把播放器从右侧滑出，并把焦点移到面板
 * 入参：无
 * 返回值：无返回值
 */
function openPanel(): void {
  isPanelOpen.value = true

  void nextTick(() => {
    panelElement.value?.focus()
  })
}

/**
 * 关闭右侧云播放器
 * 用途：点击收起按钮或按下 Escape 时收起面板
 * 入参：无
 * 返回值：无返回值
 */
function closePanel(): void {
  isPanelOpen.value = false
}

/**
 * 切换右侧云播放器
 * 用途：给歌词云签按钮提供重复点击开合能力
 * 入参：无
 * 返回值：无返回值
 */
function togglePanel(): void {
  if (isPanelOpen.value) {
    closePanel()
    return
  }

  openPanel()
}

/**
 * 处理播放按钮点击
 * 用途：把播放或暂停动作交给全局音频组合函数
 * 入参：无
 * 返回值：无返回值
 */
function handleTogglePlay(): void {
  emit('toggle-play')
}

/**
 * 处理音量滑杆变化
 * 用途：把输入框字符串转换成 0 到 1 的音量值
 * 入参：event 为输入框事件
 * 返回值：无返回值
 */
function handleVolumeInput(event: Event): void {
  const target = event.target as HTMLInputElement | null

  if (!target) {
    return
  }

  const nextPercent = Number(target.value)

  if (!Number.isFinite(nextPercent)) {
    return
  }

  emit('volume-change', Math.min(1, Math.max(0, nextPercent / 100)))
}

/**
 * 处理全局键盘关闭
 * 用途：展开播放器后允许用户按 Escape 快速收起
 * 入参：event 为键盘事件
 * 返回值：无返回值
 */
function handleWindowKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || !isPanelOpen.value) {
    return
  }

  closePanel()
}

// 这里监听错误变化，一旦音乐出错就展开面板，让用户能直接看到原因。
watch(
  () => props.lastError,
  (nextError, previousError) => {
    if (!nextError || nextError === previousError) {
      return
    }

    openPanel()
  },
)

// 这里监听曲目可用性；如果曲目被移除，就同步收起播放器。
watch(
  () => shouldRender.value,
  (nextShouldRender) => {
    if (nextShouldRender) {
      return
    }

    closePanel()
  },
)

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleWindowKeydown)
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleWindowKeydown)
  }
})
</script>

<template>
  <Transition name="music-cloud-shell">
    <section
      v-if="shouldRender"
      class="music-cloud-player"
      :class="{
        'music-cloud-player--open': isPanelOpen,
        'music-cloud-player--playing': isPlaying,
        'music-cloud-player--error': Boolean(lastError),
      }"
      aria-label="云栖歌词与音乐播放器"
    >
      <button
        type="button"
        class="music-cloud-player__trigger"
        :aria-expanded="isPanelOpen"
        aria-controls="music-cloud-panel"
        :aria-label="isPanelOpen ? '收起云中播放器' : '展开云中播放器'"
        @click="togglePanel"
      >
        <span class="music-cloud-player__seal" aria-hidden="true">云</span>
        <span :key="currentLineKey" class="music-cloud-player__line">
          <span
            v-for="(character, index) in currentCharacters"
            :key="`${currentLineKey}-${index}-${character}`"
            class="music-cloud-player__character"
            :style="{ '--music-cloud-index': index }"
          >
            {{ formatCharacter(character) }}
          </span>
        </span>
        <span class="music-cloud-player__hint">{{ isPanelOpen ? '收起' : '点开' }}</span>
      </button>

      <Transition name="music-cloud-panel">
        <aside
          v-if="isPanelOpen"
          id="music-cloud-panel"
          ref="panelElement"
          class="music-cloud-player__panel"
          tabindex="-1"
          aria-label="云中音乐播放器"
        >
          <div class="music-cloud-player__panel-sky" aria-hidden="true">
            <span class="music-cloud-player__cloud music-cloud-player__cloud--one"></span>
            <span class="music-cloud-player__cloud music-cloud-player__cloud--two"></span>
            <span class="music-cloud-player__cloud music-cloud-player__cloud--three"></span>
          </div>

          <header class="music-cloud-player__header">
            <div>
              <p>云中播放器</p>
              <h2>{{ titleText }}</h2>
            </div>
            <button type="button" class="music-cloud-player__close" @click="closePanel">收起</button>
          </header>

          <div class="music-cloud-player__hero">
            <div class="music-cloud-player__logo-wrap" aria-hidden="true">
              <img class="music-cloud-player__logo" src="/images/yunqi-logo.png" alt="" />
              <span class="music-cloud-player__halo"></span>
            </div>
            <div class="music-cloud-player__hero-copy">
              <p>{{ coverText || '云雾轻托这一阙清音，适合慢慢读页面时一起听。' }}</p>
              <strong>{{ panelStatusText }}</strong>
            </div>
          </div>

          <section class="music-cloud-player__lyric-card" aria-label="当前歌词">
            <span>此刻歌词</span>
            <p>{{ lyricTriggerText }}</p>
            <small>{{ nextLyricText }}</small>
          </section>

          <div class="music-cloud-player__controls">
            <button
              type="button"
              class="music-cloud-player__play"
              :disabled="!hasTrack"
              @click="handleTogglePlay"
            >
              {{ playButtonText }}
            </button>
            <span class="music-cloud-player__time">{{ currentTimeText }}</span>
          </div>

          <label class="music-cloud-player__volume">
            <span>云声</span>
            <input
              :style="volumeRangeStyle"
              :value="volumePercent"
              type="range"
              min="0"
              max="100"
              step="1"
              aria-label="调整背景音乐音量"
              @input="handleVolumeInput"
            />
            <b>{{ volumePercent }}%</b>
          </label>
        </aside>
      </Transition>
    </section>
  </Transition>
</template>

<style scoped>
.music-cloud-player {
  position: fixed;
  inset: 0;
  z-index: 12;
  pointer-events: none;
}

.music-cloud-player__trigger {
  position: fixed;
  top: 50%;
  right: calc(18px + env(safe-area-inset-right));
  z-index: 14;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 72px;
  max-height: min(70vh, 640px);
  min-height: 160px;
  padding: 14px 10px;
  border: 1px solid rgba(84, 154, 151, 0.28);
  border-radius: 999px;
  background:
    radial-gradient(circle at 50% 10%, rgba(255, 255, 255, 0.88), transparent 30%),
    linear-gradient(180deg, rgba(250, 255, 252, 0.92), rgba(218, 243, 238, 0.94)),
    rgba(246, 251, 244, 0.84);
  box-shadow:
    0 18px 44px rgba(37, 103, 101, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.88);
  color: #173d42;
  cursor: pointer;
  pointer-events: auto;
  transform: translateY(-50%);
  backdrop-filter: blur(16px);
  transition:
    right 360ms ease,
    transform 360ms ease,
    box-shadow 360ms ease,
    border-color 360ms ease;
}

.music-cloud-player__trigger::before,
.music-cloud-player__trigger::after {
  position: absolute;
  content: '';
  pointer-events: none;
}

.music-cloud-player__trigger::before {
  inset: 6px;
  border: 1px solid rgba(84, 154, 151, 0.14);
  border-radius: 999px;
  box-shadow: inset 0 0 24px rgba(255, 255, 255, 0.46);
}

.music-cloud-player__trigger::after {
  right: -8px;
  bottom: 24px;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background:
    radial-gradient(circle at 30% 35%, rgba(255, 255, 255, 0.92), transparent 42%),
    rgba(203, 235, 231, 0.82);
  filter: blur(0.2px);
  opacity: 0.78;
}

.music-cloud-player--open .music-cloud-player__trigger {
  right: min(420px, calc(100vw - 88px));
  box-shadow:
    0 18px 48px rgba(37, 103, 101, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.92);
}

.music-cloud-player--playing .music-cloud-player__trigger {
  border-color: rgba(63, 170, 167, 0.42);
}

.music-cloud-player--error .music-cloud-player__trigger {
  border-color: rgba(167, 100, 73, 0.48);
}

.music-cloud-player__seal,
.music-cloud-player__line,
.music-cloud-player__hint {
  position: relative;
  z-index: 1;
}

.music-cloud-player__seal {
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  place-items: center;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(74, 171, 166, 0.94), rgba(31, 101, 103, 0.98));
  color: rgba(247, 252, 244, 0.98);
  font-size: 0.92rem;
  font-weight: 700;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.22),
    0 8px 16px rgba(37, 103, 101, 0.18);
}

.music-cloud-player__line {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: center;
  gap: 0.14em;
  max-height: calc(min(70vh, 640px) - 86px);
  overflow: hidden;
  color: #173d42;
  font-size: clamp(0.98rem, 1.28vw, 1.18rem);
  font-weight: 700;
  line-height: 1;
  text-align: center;
}

.music-cloud-player__character {
  display: block;
  width: 1.18em;
  min-height: 1.04em;
  white-space: pre;
  opacity: 0;
  text-shadow:
    0 4px 14px rgba(255, 255, 255, 0.56),
    0 0 16px rgba(74, 171, 166, 0.2);
  transform: translateX(10px) scale(0.94);
  filter: blur(6px);
  animation:
    music-cloud-character-enter 820ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards,
    music-cloud-character-drift 3.4s ease-in-out infinite;
  animation-delay:
    calc(var(--music-cloud-index) * 0.12s),
    calc(var(--music-cloud-index) * 0.12s + 820ms);
}

.music-cloud-player__hint {
  padding: 5px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.68);
  color: rgba(35, 83, 86, 0.78);
  font-size: 12px;
  line-height: 1;
}

.music-cloud-player__panel {
  position: fixed;
  top: 50%;
  right: calc(18px + env(safe-area-inset-right));
  z-index: 13;
  display: grid;
  gap: 16px;
  width: min(390px, calc(100vw - 28px));
  max-height: min(82vh, 720px);
  overflow: hidden auto;
  padding: 20px;
  border: 1px solid rgba(84, 154, 151, 0.28);
  border-radius: 30px 0 0 30px;
  background:
    radial-gradient(circle at 18% 12%, rgba(255, 255, 255, 0.9), transparent 28%),
    radial-gradient(circle at 82% 8%, rgba(170, 225, 222, 0.5), transparent 24%),
    linear-gradient(180deg, rgba(250, 255, 252, 0.96), rgba(218, 243, 238, 0.96));
  box-shadow:
    -26px 28px 80px rgba(37, 103, 101, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  color: #173d42;
  pointer-events: auto;
  transform: translateY(-50%);
  backdrop-filter: blur(22px);
  outline: none;
}

.music-cloud-player__panel::-webkit-scrollbar {
  width: 8px;
}

.music-cloud-player__panel::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(84, 154, 151, 0.28);
}

.music-cloud-player__panel-sky {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.music-cloud-player__panel-sky::before {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(120deg, transparent 0 35%, rgba(255, 255, 255, 0.34) 42%, transparent 50%),
    radial-gradient(circle at 70% 78%, rgba(84, 154, 151, 0.12), transparent 24%);
  content: '';
}

.music-cloud-player__cloud {
  position: absolute;
  display: block;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.66);
  filter: blur(0.2px);
  animation: music-cloud-panel-float 8s ease-in-out infinite;
}

.music-cloud-player__cloud::before,
.music-cloud-player__cloud::after {
  position: absolute;
  border-radius: inherit;
  background: inherit;
  content: '';
}

.music-cloud-player__cloud--one {
  top: 88px;
  left: -28px;
  width: 116px;
  height: 34px;
}

.music-cloud-player__cloud--one::before {
  left: 28px;
  bottom: 12px;
  width: 48px;
  height: 48px;
}

.music-cloud-player__cloud--one::after {
  left: 66px;
  bottom: 7px;
  width: 38px;
  height: 38px;
}

.music-cloud-player__cloud--two {
  right: -38px;
  bottom: 132px;
  width: 132px;
  height: 38px;
  opacity: 0.72;
  animation-delay: -2.4s;
}

.music-cloud-player__cloud--two::before {
  left: 32px;
  bottom: 12px;
  width: 54px;
  height: 54px;
}

.music-cloud-player__cloud--two::after {
  left: 82px;
  bottom: 8px;
  width: 42px;
  height: 42px;
}

.music-cloud-player__cloud--three {
  right: 54px;
  top: 22px;
  width: 72px;
  height: 22px;
  opacity: 0.46;
  animation-delay: -4.8s;
}

.music-cloud-player__cloud--three::before {
  left: 18px;
  bottom: 8px;
  width: 32px;
  height: 32px;
}

.music-cloud-player__cloud--three::after {
  left: 44px;
  bottom: 5px;
  width: 26px;
  height: 26px;
}

.music-cloud-player__header,
.music-cloud-player__hero,
.music-cloud-player__lyric-card,
.music-cloud-player__controls,
.music-cloud-player__volume {
  position: relative;
  z-index: 1;
}

.music-cloud-player__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.music-cloud-player__header p,
.music-cloud-player__header h2,
.music-cloud-player__hero-copy p,
.music-cloud-player__lyric-card p,
.music-cloud-player__lyric-card small {
  margin: 0;
}

.music-cloud-player__header p {
  color: #3faaa7;
  font-size: 13px;
  font-weight: 700;
}

.music-cloud-player__header h2 {
  margin-top: 6px;
  font-size: clamp(1.35rem, 3vw, 1.78rem);
  line-height: 1.18;
}

.music-cloud-player__close {
  min-width: 60px;
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid rgba(84, 154, 151, 0.24);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.66);
  color: rgba(35, 83, 86, 0.84);
  cursor: pointer;
}

.music-cloud-player__hero {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  gap: 16px;
  align-items: center;
  padding: 14px;
  border: 1px solid rgba(84, 154, 151, 0.16);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.54);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.music-cloud-player__logo-wrap {
  position: relative;
  display: grid;
  width: 88px;
  height: 88px;
  place-items: center;
  border-radius: 30px;
  background:
    radial-gradient(circle at 30% 28%, rgba(255, 255, 255, 0.9), transparent 36%),
    linear-gradient(135deg, rgba(91, 188, 181, 0.72), rgba(236, 249, 244, 0.96));
  box-shadow:
    0 18px 32px rgba(37, 103, 101, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
}

.music-cloud-player__logo {
  position: relative;
  z-index: 1;
  width: 66px;
  height: 66px;
  object-fit: contain;
  filter: drop-shadow(0 10px 16px rgba(23, 61, 66, 0.16));
}

.music-cloud-player__halo {
  position: absolute;
  inset: -8px;
  border: 1px solid rgba(84, 154, 151, 0.2);
  border-radius: 34px;
  animation: music-cloud-halo 3.8s ease-in-out infinite;
}

.music-cloud-player__hero-copy {
  display: grid;
  gap: 8px;
}

.music-cloud-player__hero-copy p {
  color: rgba(35, 83, 86, 0.74);
  font-size: 14px;
  line-height: 1.7;
}

.music-cloud-player__hero-copy strong {
  color: #256765;
  font-size: 13px;
  line-height: 1.6;
}

.music-cloud-player__lyric-card {
  display: grid;
  gap: 10px;
  padding: 16px;
  border: 1px solid rgba(84, 154, 151, 0.18);
  border-radius: 24px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.7), rgba(227, 247, 243, 0.72)),
    rgba(255, 255, 255, 0.55);
}

.music-cloud-player__lyric-card span {
  color: #3faaa7;
  font-size: 12px;
  font-weight: 700;
}

.music-cloud-player__lyric-card p {
  color: #173d42;
  font-size: 1.16rem;
  font-weight: 800;
  line-height: 1.55;
}

.music-cloud-player__lyric-card small {
  color: rgba(35, 83, 86, 0.62);
  font-size: 13px;
  line-height: 1.6;
}

.music-cloud-player__controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
}

.music-cloud-player__play {
  min-height: 48px;
  border: 1px solid rgba(84, 154, 151, 0.26);
  border-radius: 999px;
  background:
    radial-gradient(circle at 22% 18%, rgba(255, 255, 255, 0.72), transparent 30%),
    linear-gradient(135deg, rgba(74, 171, 166, 0.94), rgba(207, 239, 231, 0.96));
  color: #12383d;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 800;
  box-shadow: 0 16px 34px rgba(37, 103, 101, 0.16);
}

.music-cloud-player__play:disabled {
  cursor: not-allowed;
  opacity: 0.52;
}

.music-cloud-player__time {
  display: grid;
  min-width: 74px;
  min-height: 44px;
  place-items: center;
  border: 1px solid rgba(84, 154, 151, 0.18);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.62);
  color: rgba(35, 83, 86, 0.82);
  font-weight: 800;
}

.music-cloud-player__volume {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  min-height: 52px;
  padding: 12px 14px;
  border: 1px solid rgba(84, 154, 151, 0.16);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.56);
}

.music-cloud-player__volume span,
.music-cloud-player__volume b {
  color: rgba(35, 83, 86, 0.82);
  font-size: 13px;
}

.music-cloud-player__volume input {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background:
    linear-gradient(90deg, rgba(74, 171, 166, 0.88) 0 var(--music-cloud-volume), rgba(196, 226, 222, 0.72) var(--music-cloud-volume) 100%);
  accent-color: #3faaa7;
  cursor: pointer;
}

.music-cloud-shell-enter-active,
.music-cloud-shell-leave-active {
  transition:
    opacity 280ms ease,
    transform 280ms ease;
}

.music-cloud-shell-enter-from,
.music-cloud-shell-leave-to {
  opacity: 0;
  transform: translateX(12px);
}

.music-cloud-panel-enter-active,
.music-cloud-panel-leave-active {
  transition:
    opacity 360ms ease,
    transform 360ms ease;
}

.music-cloud-panel-enter-from,
.music-cloud-panel-leave-to {
  opacity: 0;
  transform: translate(36px, -50%);
}

@keyframes music-cloud-character-enter {
  0%,
  30% {
    opacity: 0;
    transform: translateX(10px) scale(0.94);
    filter: blur(6px);
  }

  100% {
    opacity: 1;
    transform: translateX(0) scale(1);
    filter: blur(0);
  }
}

@keyframes music-cloud-character-drift {
  0%,
  50% {
    transform: translateX(0);
  }

  25% {
    transform: translateX(-2px);
  }

  75% {
    transform: translateX(2px);
  }
}

@keyframes music-cloud-panel-float {
  0%,
  100% {
    transform: translateX(0);
  }

  50% {
    transform: translateX(-8px);
  }
}

@keyframes music-cloud-halo {
  0%,
  100% {
    opacity: 0.28;
    transform: scale(0.96);
  }

  50% {
    opacity: 0.76;
    transform: scale(1.04);
  }
}

@media (max-width: 720px) {
  .music-cloud-player__trigger {
    right: calc(8px + env(safe-area-inset-right));
    width: 62px;
    max-height: 54vh;
    min-height: 132px;
    padding: 12px 8px;
  }

  .music-cloud-player--open .music-cloud-player__trigger {
    right: min(334px, calc(100vw - 76px));
  }

  .music-cloud-player__line {
    max-height: calc(54vh - 74px);
    font-size: clamp(0.86rem, 3.7vw, 1rem);
  }

  .music-cloud-player__seal {
    width: 26px;
    height: 26px;
    flex-basis: 26px;
    font-size: 0.82rem;
  }

  .music-cloud-player__hint {
    padding: 4px 7px;
    font-size: 11px;
  }

  .music-cloud-player__panel {
    top: 50%;
    right: 8px;
    width: min(328px, calc(100vw - 18px));
    max-height: 84vh;
    padding: 16px;
    border-radius: 26px 0 0 26px;
  }

  .music-cloud-player__hero {
    grid-template-columns: 70px minmax(0, 1fr);
    gap: 12px;
    padding: 12px;
  }

  .music-cloud-player__logo-wrap {
    width: 70px;
    height: 70px;
    border-radius: 24px;
  }

  .music-cloud-player__logo {
    width: 52px;
    height: 52px;
  }

  .music-cloud-player__hero-copy p {
    display: none;
  }

  .music-cloud-player__controls {
    grid-template-columns: 1fr 78px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .music-cloud-player *,
  .music-cloud-player *::before,
  .music-cloud-player *::after {
    transition: none !important;
    animation: none !important;
  }
}
</style>
