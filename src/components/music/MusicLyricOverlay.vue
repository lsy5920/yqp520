<script setup lang="ts">
import { computed } from 'vue'

/**
 * 组件入参类型
 * 用途：描述歌词浮层展示当前歌词、下一句和曲名所需的数据
 */
interface MusicLyricOverlayProps {
  /** 用途：控制歌词浮层是否显示 */
  visible: boolean
  /** 用途：当前正在唱到的歌词 */
  currentLine?: string
  /** 用途：下一句歌词，用于做轻提示 */
  nextLine?: string
  /** 用途：当前曲目名称 */
  trackName?: string
}

const props = withDefaults(defineProps<MusicLyricOverlayProps>(), {
  currentLine: '',
  nextLine: '',
  trackName: '',
})

/**
 * 当前是否真的需要渲染歌词
 * 用途：避免空歌词时仍然挂着一层装饰浮层
 */
const shouldRender = computed<boolean>(() => (
  props.visible && Boolean(props.currentLine.trim())
))

/**
 * 当前曲目显示文案
 * 用途：给歌词浮层顶部补一条简短的曲目说明
 */
const displayTrackName = computed<string>(() => (
  props.trackName.trim() || '云栖清音'
))

/**
 * 下一句歌词显示文案
 * 用途：统一清理下一句歌词，避免出现空白提示
 */
const displayNextLine = computed<string>(() => props.nextLine.trim())

/**
 * 当前歌词切换键
 * 用途：让歌词切换时能够触发漂浮式过渡动画
 */
const currentLineKey = computed<string>(() => `${displayTrackName.value}-${props.currentLine.trim()}`)
</script>

<template>
  <Transition name="music-lyric-shell">
    <section
      v-if="shouldRender"
      class="music-lyric-overlay"
      aria-live="polite"
      aria-atomic="true"
    >
      <div class="music-lyric-overlay__mist music-lyric-overlay__mist--left" aria-hidden="true"></div>
      <div class="music-lyric-overlay__mist music-lyric-overlay__mist--right" aria-hidden="true"></div>
      <div class="music-lyric-overlay__spark music-lyric-overlay__spark--one" aria-hidden="true"></div>
      <div class="music-lyric-overlay__spark music-lyric-overlay__spark--two" aria-hidden="true"></div>

      <div class="music-lyric-overlay__frame">
        <div class="music-lyric-overlay__head">
          <span class="music-lyric-overlay__eyebrow">云间词影</span>
          <strong class="music-lyric-overlay__track">{{ displayTrackName }}</strong>
        </div>

        <Transition name="music-lyric-line" mode="out-in">
          <p :key="currentLineKey" class="music-lyric-overlay__current">
            {{ currentLine }}
          </p>
        </Transition>

        <p v-if="displayNextLine" class="music-lyric-overlay__next">
          下句 · {{ displayNextLine }}
        </p>
      </div>
    </section>
  </Transition>
</template>

<style scoped>
.music-lyric-overlay {
  position: fixed;
  left: 50%;
  bottom: calc(var(--site-lyric-bottom, 40px) + env(safe-area-inset-bottom));
  z-index: 8;
  width: min(680px, calc(100vw - 420px));
  max-width: calc(100vw - 32px);
  min-width: 280px;
  pointer-events: none;
  transform: translateX(-50%);
  animation: music-lyric-overlay-float 7.2s ease-in-out infinite;
}

.music-lyric-overlay__mist,
.music-lyric-overlay__spark {
  position: absolute;
  pointer-events: none;
}

.music-lyric-overlay__mist {
  width: 180px;
  height: 72px;
  border-radius: 999px;
  filter: blur(22px);
  opacity: 0.5;
}

.music-lyric-overlay__mist--left {
  left: 16px;
  bottom: 18px;
  background: rgba(139, 208, 203, 0.18);
  animation: music-lyric-overlay-mist-left 8.5s ease-in-out infinite;
}

.music-lyric-overlay__mist--right {
  right: 20px;
  top: 12px;
  background: rgba(216, 185, 114, 0.18);
  animation: music-lyric-overlay-mist-right 8.8s ease-in-out infinite;
}

.music-lyric-overlay__spark {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: rgba(244, 239, 226, 0.74);
  box-shadow: 0 0 18px rgba(244, 239, 226, 0.34);
}

.music-lyric-overlay__spark--one {
  left: 42px;
  top: 20px;
  animation: music-lyric-overlay-spark 4.8s ease-in-out infinite;
}

.music-lyric-overlay__spark--two {
  right: 46px;
  bottom: 26px;
  animation: music-lyric-overlay-spark 5.2s ease-in-out infinite -1.4s;
}

.music-lyric-overlay__frame {
  position: relative;
  overflow: hidden;
  display: grid;
  gap: 12px;
  padding: 18px 28px 20px;
  border: 1px solid rgba(216, 185, 114, 0.2);
  border-radius: 28px;
  background:
    linear-gradient(180deg, rgba(6, 23, 31, 0.86), rgba(7, 24, 36, 0.9)),
    rgba(5, 18, 28, 0.84);
  box-shadow:
    0 22px 46px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(18px);
}

.music-lyric-overlay__frame::before {
  content: '';
  position: absolute;
  inset: 10px;
  border-radius: 20px;
  border: 1px solid rgba(216, 185, 114, 0.08);
  pointer-events: none;
}

.music-lyric-overlay__frame::after {
  content: '';
  position: absolute;
  inset: auto 32px 0;
  height: 1px;
  background: linear-gradient(90deg, rgba(216, 185, 114, 0), rgba(216, 185, 114, 0.56), rgba(216, 185, 114, 0));
  opacity: 0.56;
}

.music-lyric-overlay__head,
.music-lyric-overlay__current,
.music-lyric-overlay__next {
  position: relative;
  z-index: 1;
  margin: 0;
}

.music-lyric-overlay__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.music-lyric-overlay__eyebrow {
  color: rgba(139, 208, 203, 0.88);
  font-size: 12px;
  letter-spacing: 0.24em;
}

.music-lyric-overlay__track {
  color: rgba(244, 239, 226, 0.62);
  font-size: 0.82rem;
  letter-spacing: 0.14em;
}

.music-lyric-overlay__current {
  color: #f3e2b3;
  font-size: clamp(1.26rem, 2.3vw, 1.92rem);
  line-height: 1.7;
  letter-spacing: 0.08em;
  text-align: center;
  text-shadow:
    0 4px 18px rgba(0, 0, 0, 0.24),
    0 0 20px rgba(216, 185, 114, 0.18);
}

.music-lyric-overlay__next {
  color: rgba(244, 239, 226, 0.5);
  font-size: 0.92rem;
  line-height: 1.7;
  letter-spacing: 0.1em;
  text-align: center;
}

.music-lyric-shell-enter-active,
.music-lyric-shell-leave-active {
  transition:
    opacity 320ms ease,
    transform 320ms ease;
}

.music-lyric-shell-enter-from,
.music-lyric-shell-leave-to {
  opacity: 0;
  transform: translate(-50%, 14px) scale(0.985);
}

.music-lyric-line-enter-active,
.music-lyric-line-leave-active {
  transition:
    opacity 420ms ease,
    transform 420ms ease,
    filter 420ms ease;
}

.music-lyric-line-enter-from {
  opacity: 0;
  transform: translateY(14px) scale(0.985);
  filter: blur(8px);
}

.music-lyric-line-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(1.01);
  filter: blur(8px);
}

@keyframes music-lyric-overlay-float {
  0%,
  100% {
    transform: translateX(-50%) translateY(0);
  }

  50% {
    transform: translateX(-50%) translateY(-8px);
  }
}

@keyframes music-lyric-overlay-mist-left {
  0%,
  100% {
    transform: translateX(0) scale(1);
    opacity: 0.34;
  }

  50% {
    transform: translateX(18px) scale(1.08);
    opacity: 0.58;
  }
}

@keyframes music-lyric-overlay-mist-right {
  0%,
  100% {
    transform: translateX(0) scale(1);
    opacity: 0.28;
  }

  50% {
    transform: translateX(-18px) scale(1.06);
    opacity: 0.54;
  }
}

@keyframes music-lyric-overlay-spark {
  0%,
  100% {
    transform: translateY(0) scale(0.9);
    opacity: 0.28;
  }

  50% {
    transform: translateY(-10px) scale(1.18);
    opacity: 0.9;
  }
}

@media (max-width: 720px) {
  .music-lyric-overlay {
    bottom: calc(var(--site-lyric-bottom-mobile, 148px) + env(safe-area-inset-bottom));
    width: calc(100vw - 24px);
    min-width: 0;
  }

  .music-lyric-overlay__frame {
    gap: 10px;
    padding: 14px 16px 16px;
    border-radius: 22px;
  }

  .music-lyric-overlay__head {
    flex-direction: column;
    gap: 8px;
  }

  .music-lyric-overlay__current {
    font-size: clamp(1.02rem, 5vw, 1.3rem);
    line-height: 1.64;
  }

  .music-lyric-overlay__next {
    font-size: 0.82rem;
    line-height: 1.62;
  }
}
</style>
