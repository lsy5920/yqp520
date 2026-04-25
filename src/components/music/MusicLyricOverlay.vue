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
  top: 50%;
  right: calc(18px + env(safe-area-inset-right));
  z-index: 8;
  width: auto;
  max-width: 92px;
  max-height: min(68vh, 620px);
  pointer-events: none;
  transform: translateY(-50%);
}

.music-lyric-overlay__frame {
  position: relative;
  overflow: hidden;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  max-height: inherit;
  padding: 16px 12px 18px;
  border: 1px solid rgba(84, 154, 151, 0.24);
  border-radius: 999px;
  background:
    radial-gradient(circle at 50% 14%, rgba(255, 255, 255, 0.72), transparent 30%),
    linear-gradient(180deg, rgba(248, 252, 247, 0.86), rgba(216, 241, 235, 0.9)),
    rgba(246, 251, 244, 0.8);
  box-shadow:
    0 18px 42px rgba(37, 103, 101, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.76);
  backdrop-filter: blur(14px);
  animation: music-lyric-overlay-float 7.2s ease-in-out infinite;
}

.music-lyric-overlay__frame::before {
  position: absolute;
  inset: 5px;
  border: 1px solid rgba(84, 154, 151, 0.14);
  border-radius: 999px;
  box-shadow: inset 0 0 20px rgba(255, 255, 255, 0.32);
  content: '';
  pointer-events: none;
}

.music-lyric-overlay__frame::after {
  position: absolute;
  inset: 52px auto 18px 50%;
  width: 1px;
  background: linear-gradient(180deg, rgba(84, 154, 151, 0), rgba(84, 154, 151, 0.42), rgba(255, 255, 255, 0.7), rgba(84, 154, 151, 0));
  content: '';
  opacity: 0.58;
  transform: translateX(-50%);
}

.music-lyric-overlay__seal,
.music-lyric-overlay__current {
  position: relative;
  z-index: 1;
  margin: 0;
}

.music-lyric-overlay__seal {
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  place-items: center;
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(74, 171, 166, 0.94), rgba(31, 101, 103, 0.98)),
    rgba(74, 171, 166, 0.9);
  color: rgba(247, 252, 244, 0.98);
  font-size: 0.92rem;
  letter-spacing: 0.08em;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.2),
    0 8px 16px rgba(37, 103, 101, 0.18);
}

.music-lyric-overlay__current {
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.16em;
  max-height: calc(min(68vh, 620px) - 68px);
  overflow: hidden;
  color: #173d42;
  font-size: clamp(1rem, 1.35vw, 1.22rem);
  font-weight: 600;
  line-height: 1;
  text-align: center;
}

.music-lyric-overlay__character {
  display: block;
  width: 1.2em;
  min-height: 1.04em;
  white-space: pre;
  text-shadow:
    0 4px 14px rgba(255, 255, 255, 0.46),
    0 0 16px rgba(74, 171, 166, 0.2);
  opacity: 0;
  transform: translateX(10px) scale(0.94);
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
  transform: translate(16px, -50%) scale(0.985);
}

.music-lyric-line-enter-active,
.music-lyric-line-leave-active {
  transition:
    opacity 260ms ease,
    transform 260ms ease;
}

.music-lyric-line-enter-from {
  opacity: 0;
  transform: translateX(8px);
}

.music-lyric-line-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}

@keyframes music-lyric-overlay-float {
  0%,
  100% {
    transform: translateY(-50%) translateX(0);
  }

  50% {
    transform: translateY(-50%) translateX(-5px);
  }
}

@keyframes music-lyric-character-enter {
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

@keyframes music-lyric-character-drift {
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

@media (max-width: 720px) {
  .music-lyric-overlay {
    top: 46%;
    right: calc(8px + env(safe-area-inset-right));
    max-width: 70px;
    max-height: 48vh;
  }

  .music-lyric-overlay__frame {
    gap: 8px;
    padding: 12px 8px 14px;
    border-radius: 999px;
  }

  .music-lyric-overlay__current {
    max-height: calc(48vh - 56px);
    font-size: clamp(0.88rem, 3.8vw, 1rem);
    line-height: 1;
  }

  .music-lyric-overlay__seal {
    width: 24px;
    height: 24px;
    flex-basis: 24px;
    font-size: 0.8rem;
  }
}
</style>
