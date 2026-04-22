<script setup lang="ts">
import { computed } from 'vue'

/**
 * 组件入参类型
 * 用途：描述歌词浮层展示当前歌词所需的数据
 */
interface MusicLyricOverlayProps {
  /** 用途：控制歌词浮层是否显示 */
  visible: boolean
  /** 用途：当前正在唱到的歌词 */
  currentLine?: string
}

const props = withDefaults(defineProps<MusicLyricOverlayProps>(), {
  currentLine: '',
})

/**
 * 当前是否真的需要渲染歌词
 * 用途：避免空歌词时仍然挂着一层装饰浮层
 */
const shouldRender = computed<boolean>(() => (
  props.visible && Boolean(props.currentLine.trim())
))

/**
 * 当前歌词拆字结果
 * 用途：把一句歌词拆成单字数组，方便逐字做漂浮显现动效
 */
const currentCharacters = computed<string[]>(() => Array.from(props.currentLine.trim()))

/**
 * 当前歌词切换键
 * 用途：让歌词切换时能够重新触发逐字漂浮动画
 */
const currentLineKey = computed<string>(() => props.currentLine.trim())

/**
 * 处理单个字符显示
 * 用途：把空格转换成不换行空格，避免逐字渲染时丢掉留白
 * 入参：character 为当前字符
 * 返回值：返回可直接渲染的字符
 */
function formatCharacter(character: string): string {
  return character === ' ' ? '\u00A0' : character
}
</script>

<template>
  <Transition name="music-lyric-shell">
    <section
      v-if="shouldRender"
      class="music-lyric-overlay"
      aria-live="polite"
      aria-atomic="true"
    >
      <div class="music-lyric-overlay__frame">
        <span class="music-lyric-overlay__seal" aria-hidden="true">云</span>
        <p :key="currentLineKey" class="music-lyric-overlay__current">
          <span
            v-for="(character, index) in currentCharacters"
            :key="`${currentLineKey}-${index}-${character}`"
            class="music-lyric-overlay__character"
            :style="{ '--music-lyric-index': index }"
          >
            {{ formatCharacter(character) }}
          </span>
        </p>
      </div>
    </section>
  </Transition>
</template>

<style scoped>
.music-lyric-overlay {
  position: fixed;
  left: 50%;
  bottom: calc(var(--site-lyric-bottom, 34px) + env(safe-area-inset-bottom));
  z-index: 8;
  width: fit-content;
  max-width: min(580px, calc(100vw - 32px));
  pointer-events: none;
  transform: translateX(-50%);
}

.music-lyric-overlay__frame {
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  max-width: 100%;
  padding: 10px 18px 12px;
  border: 1px solid rgba(216, 185, 114, 0.14);
  border-radius: 999px;
  background:
    radial-gradient(circle at 18% 50%, rgba(139, 208, 203, 0.16), transparent 26%),
    radial-gradient(circle at 82% 40%, rgba(216, 185, 114, 0.14), transparent 24%),
    linear-gradient(180deg, rgba(6, 23, 31, 0.62), rgba(7, 24, 36, 0.74)),
    rgba(5, 18, 28, 0.54);
  box-shadow:
    0 16px 36px rgba(0, 0, 0, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(12px);
  animation: music-lyric-overlay-float 7.2s ease-in-out infinite;
}

.music-lyric-overlay__frame::before {
  content: '';
  position: absolute;
  inset: 4px;
  border-radius: 999px;
  border: 1px solid rgba(216, 185, 114, 0.06);
  pointer-events: none;
}

.music-lyric-overlay__frame::after {
  content: '';
  position: absolute;
  inset: auto 18px 0;
  height: 1px;
  background: linear-gradient(90deg, rgba(216, 185, 114, 0), rgba(216, 185, 114, 0.42), rgba(216, 185, 114, 0));
  opacity: 0.42;
}

.music-lyric-overlay__seal,
.music-lyric-overlay__current {
  position: relative;
  z-index: 1;
  margin: 0;
}

.music-lyric-overlay__seal {
  display: grid;
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  place-items: center;
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(120, 17, 26, 0.94), rgba(61, 8, 13, 0.96)),
    rgba(61, 8, 13, 0.94);
  color: rgba(243, 224, 170, 0.94);
  font-size: 0.92rem;
  letter-spacing: 0.1em;
  box-shadow:
    inset 0 0 0 1px rgba(241, 217, 160, 0.12),
    0 8px 16px rgba(0, 0, 0, 0.16);
}

.music-lyric-overlay__current {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 100%;
  color: #f3e2b3;
  font-size: clamp(1rem, 2vw, 1.36rem);
  line-height: 1.5;
  text-align: center;
}

.music-lyric-overlay__character {
  display: inline-block;
  white-space: pre;
  text-shadow:
    0 4px 14px rgba(0, 0, 0, 0.18),
    0 0 16px rgba(216, 185, 114, 0.14);
  opacity: 0;
  transform: translateY(10px) scale(0.92);
  filter: blur(6px);
  animation:
    music-lyric-character-enter 820ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards,
    music-lyric-character-drift 3.4s ease-in-out infinite;
  animation-delay:
    calc(var(--music-lyric-index) * 0.12s),
    calc(var(--music-lyric-index) * 0.12s + 820ms);
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
    opacity 260ms ease,
    transform 260ms ease;
}

.music-lyric-line-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.music-lyric-line-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@keyframes music-lyric-overlay-float {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-6px);
  }
}

@keyframes music-lyric-character-enter {
  0%,
  30% {
    opacity: 0;
    transform: translateY(10px) scale(0.92);
    filter: blur(6px);
  }

  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}

@keyframes music-lyric-character-drift {
  0%,
  50% {
    transform: translateY(0);
  }

  25% {
    transform: translateY(-3px);
  }

  75% {
    transform: translateY(2px);
  }
}

@media (max-width: 720px) {
  .music-lyric-overlay {
    bottom: calc(var(--site-lyric-bottom-mobile, 142px) + env(safe-area-inset-bottom));
    max-width: calc(100vw - 24px);
  }

  .music-lyric-overlay__frame {
    gap: 10px;
    padding: 9px 14px 11px;
  }

  .music-lyric-overlay__current {
    font-size: clamp(0.92rem, 4.2vw, 1.08rem);
    line-height: 1.46;
  }

  .music-lyric-overlay__seal {
    width: 24px;
    height: 24px;
    flex-basis: 24px;
    font-size: 0.82rem;
  }
}
</style>
