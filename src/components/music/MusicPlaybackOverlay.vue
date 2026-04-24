<script setup lang="ts">
/**
 * 组件入参类型
 * 用途：描述全屏播放引导浮窗展示所需的全部文案数据。
 */
interface MusicPlaybackOverlayProps {
  /** 用途：控制浮窗是否显示。 */
  visible: boolean
  /** 用途：浮窗主标题。 */
  title: string
  /** 用途：浮窗主体说明文案。 */
  description: string
  /** 用途：浮窗底部动作提示。 */
  actionText: string
  /** 用途：当前曲目名，强化“云栖之缘”的成品感。 */
  trackName?: string
  /** 用途：续播时显示恢复到哪个时间点。 */
  resumeText?: string
  /** 用途：播放失败时补充错误提示。 */
  errorText?: string
}

/**
 * 组件事件类型
 * 用途：用户点击任意位置时，把“请求播放”动作抛给上层。
 */
interface MusicPlaybackOverlayEmits {
  /** 用途：点击浮窗任意区域时触发播放。 */
  (event: 'confirm-play'): void
}

withDefaults(defineProps<MusicPlaybackOverlayProps>(), {
  trackName: '',
  resumeText: '',
  errorText: '',
})

const emit = defineEmits<MusicPlaybackOverlayEmits>()

/**
 * 处理播放确认
 * 用途：统一处理点击和键盘触发，保持交互入口一致。
 * 入参：无。
 * 返回值：无返回值。
 */
function handleConfirmPlay(): void {
  emit('confirm-play')
}
</script>

<template>
  <Transition name="music-playback-overlay-fade">
    <section
      v-if="visible"
      class="music-playback-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="music-playback-overlay-title"
      aria-describedby="music-playback-overlay-description"
      tabindex="0"
      @click="handleConfirmPlay"
      @keydown.enter.prevent="handleConfirmPlay"
      @keydown.space.prevent="handleConfirmPlay"
    >
      <div class="music-playback-overlay__backdrop" aria-hidden="true">
        <span class="music-playback-overlay__mist music-playback-overlay__mist--left"></span>
        <span class="music-playback-overlay__mist music-playback-overlay__mist--right"></span>
        <span class="music-playback-overlay__spark music-playback-overlay__spark--one"></span>
        <span class="music-playback-overlay__spark music-playback-overlay__spark--two"></span>
      </div>

      <article class="music-playback-overlay__panel">
        <div class="music-playback-overlay__seal-group" aria-hidden="true">
          <span class="music-playback-overlay__seal">云</span>
          <span class="music-playback-overlay__seal-ring"></span>
        </div>

        <p class="music-playback-overlay__eyebrow">云间清音 · 江湖候启</p>
        <h2 id="music-playback-overlay-title" class="music-playback-overlay__title">
          {{ title }}
        </h2>

        <p v-if="trackName" class="music-playback-overlay__track">
          当前曲目 · {{ trackName }}
        </p>

        <p id="music-playback-overlay-description" class="music-playback-overlay__description">
          {{ description }}
        </p>

        <p v-if="resumeText" class="music-playback-overlay__resume">
          {{ resumeText }}
        </p>

        <p v-if="errorText" class="music-playback-overlay__error">
          {{ errorText }}
        </p>

        <div class="music-playback-overlay__action">
          <span class="music-playback-overlay__action-ring" aria-hidden="true"></span>
          <strong>{{ actionText }}</strong>
        </div>

        <p class="music-playback-overlay__foot">
          轻点屏幕任意处，让山门清音随风入场
        </p>
      </article>
    </section>
  </Transition>
</template>

<style scoped>
.music-playback-overlay {
  position: fixed;
  inset: 0;
  z-index: 24;
  display: grid;
  place-items: center;
  padding: 28px;
  overflow: hidden;
  cursor: pointer;
}

.music-playback-overlay__backdrop,
.music-playback-overlay__mist,
.music-playback-overlay__spark {
  position: absolute;
  inset: 0;
}

.music-playback-overlay__backdrop {
  background:
    radial-gradient(circle at 50% 24%, rgba(139, 208, 203, 0.24), transparent 30%),
    radial-gradient(circle at 18% 76%, rgba(255, 255, 255, 0.36), transparent 28%),
    linear-gradient(180deg, rgba(244, 252, 249, 0.82), rgba(221, 242, 237, 0.9)),
    rgba(237, 248, 244, 0.92);
  backdrop-filter: blur(18px) saturate(1.12);
}

.music-playback-overlay__mist {
  display: block;
  border-radius: 999px;
  filter: blur(28px);
  opacity: 0.64;
}

.music-playback-overlay__mist--left {
  inset: auto auto 12% 6%;
  width: min(420px, 42vw);
  height: min(220px, 24vw);
  background: rgba(106, 190, 184, 0.24);
  animation: music-playback-overlay-mist-left 9.2s ease-in-out infinite;
}

.music-playback-overlay__mist--right {
  inset: 8% 8% auto auto;
  width: min(420px, 38vw);
  height: min(240px, 22vw);
  background: rgba(255, 255, 255, 0.5);
  animation: music-playback-overlay-mist-right 10.6s ease-in-out infinite;
}

.music-playback-overlay__spark {
  display: block;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: rgba(84, 154, 151, 0.42);
  box-shadow: 0 0 22px rgba(84, 154, 151, 0.22);
}

.music-playback-overlay__spark--one {
  inset: 18% auto auto 16%;
  animation: music-playback-overlay-spark 4.8s ease-in-out infinite;
}

.music-playback-overlay__spark--two {
  inset: auto 18% 16% auto;
  animation: music-playback-overlay-spark 5.4s ease-in-out infinite 1.2s;
}

.music-playback-overlay__panel {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 16px;
  width: min(680px, 100%);
  padding: 42px 40px 36px;
  border: 1px solid rgba(84, 154, 151, 0.28);
  border-radius: 32px;
  background:
    radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.7), transparent 36%),
    linear-gradient(180deg, rgba(249, 253, 250, 0.9), rgba(225, 244, 239, 0.94)),
    rgba(240, 249, 246, 0.9);
  box-shadow:
    0 28px 70px rgba(42, 101, 101, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.72);
  text-align: center;
  color: #173d42;
  overflow: hidden;
}

.music-playback-overlay__panel::before,
.music-playback-overlay__panel::after {
  content: '';
  position: absolute;
  inset: 12px;
  border-radius: 24px;
  pointer-events: none;
}

.music-playback-overlay__panel::before {
  border: 1px solid rgba(84, 154, 151, 0.16);
}

.music-playback-overlay__panel::after {
  inset: auto 48px 0;
  height: 1px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(84, 154, 151, 0), rgba(84, 154, 151, 0.46), rgba(84, 154, 151, 0));
  opacity: 0.58;
}

.music-playback-overlay__seal-group,
.music-playback-overlay__eyebrow,
.music-playback-overlay__title,
.music-playback-overlay__track,
.music-playback-overlay__description,
.music-playback-overlay__resume,
.music-playback-overlay__error,
.music-playback-overlay__action,
.music-playback-overlay__foot {
  position: relative;
  z-index: 1;
  margin: 0;
}

.music-playback-overlay__seal-group {
  display: grid;
  place-items: center;
  margin-bottom: 4px;
}

.music-playback-overlay__seal {
  display: grid;
  width: 74px;
  height: 74px;
  place-items: center;
  border-radius: 999px;
  background:
    radial-gradient(circle at 32% 24%, rgba(255, 255, 255, 0.7), transparent 34%),
    linear-gradient(160deg, rgba(139, 208, 203, 0.96), rgba(54, 142, 141, 0.98)),
    rgba(84, 154, 151, 0.96);
  color: #173d42;
  font-size: 1.7rem;
  letter-spacing: 0.1em;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.42),
    0 18px 38px rgba(42, 101, 101, 0.2);
}

.music-playback-overlay__seal-ring {
  position: absolute;
  width: 104px;
  height: 104px;
  border: 1px solid rgba(84, 154, 151, 0.24);
  border-radius: 999px;
  animation: music-playback-overlay-ring 3.8s ease-in-out infinite;
}

.music-playback-overlay__eyebrow {
  color: #347d7d;
  font-size: 0.88rem;
  letter-spacing: 0.28em;
}

.music-playback-overlay__title {
  color: #173d42;
  font-size: clamp(2rem, 5vw, 3.2rem);
  line-height: 1.16;
  text-shadow: 0 8px 24px rgba(84, 154, 151, 0.16);
}

.music-playback-overlay__track {
  color: #8c7130;
  font-size: 0.98rem;
  letter-spacing: 0.12em;
}

.music-playback-overlay__description {
  max-width: 34rem;
  margin-inline: auto;
  color: rgba(35, 83, 86, 0.82);
  font-size: 1rem;
  line-height: 1.9;
}

.music-playback-overlay__resume,
.music-playback-overlay__error {
  justify-self: center;
  padding: 8px 18px;
  border-radius: 999px;
  font-size: 0.92rem;
  line-height: 1.5;
}

.music-playback-overlay__resume {
  border: 1px solid rgba(84, 154, 151, 0.22);
  background: rgba(230, 247, 242, 0.72);
  color: rgba(35, 83, 86, 0.86);
}

.music-playback-overlay__error {
  border: 1px solid rgba(183, 99, 70, 0.28);
  background: rgba(255, 239, 230, 0.76);
  color: #7a3525;
}

.music-playback-overlay__action {
  position: relative;
  justify-self: center;
  min-width: min(360px, 100%);
  padding: 16px 24px;
  border-radius: 999px;
  color: #102734;
  background: linear-gradient(135deg, rgba(230, 197, 116, 0.96), rgba(187, 145, 67, 0.98));
  box-shadow: 0 18px 36px rgba(135, 107, 49, 0.2);
}

.music-playback-overlay__action strong {
  position: relative;
  z-index: 1;
  display: block;
  font-size: 1rem;
  line-height: 1.5;
  letter-spacing: 0.08em;
}

.music-playback-overlay__action-ring {
  position: absolute;
  inset: -6px;
  border: 1px solid rgba(183, 145, 67, 0.3);
  border-radius: 999px;
  animation: music-playback-overlay-action-ring 2.8s ease-in-out infinite;
}

.music-playback-overlay__foot {
  color: rgba(35, 83, 86, 0.58);
  font-size: 0.9rem;
  letter-spacing: 0.08em;
}

.music-playback-overlay-fade-enter-active,
.music-playback-overlay-fade-leave-active {
  transition: opacity 0.34s ease;
}

.music-playback-overlay-fade-enter-active .music-playback-overlay__panel,
.music-playback-overlay-fade-leave-active .music-playback-overlay__panel {
  transition:
    opacity 0.34s ease,
    transform 0.34s ease,
    filter 0.34s ease;
}

.music-playback-overlay-fade-enter-from,
.music-playback-overlay-fade-leave-to {
  opacity: 0;
}

.music-playback-overlay-fade-enter-from .music-playback-overlay__panel,
.music-playback-overlay-fade-leave-to .music-playback-overlay__panel {
  opacity: 0;
  transform: translateY(18px) scale(0.98);
  filter: blur(10px);
}

@keyframes music-playback-overlay-mist-left {
  0%,
  100% {
    transform: translateX(0) scale(1);
  }

  50% {
    transform: translateX(24px) scale(1.08);
  }
}

@keyframes music-playback-overlay-mist-right {
  0%,
  100% {
    transform: translateX(0) scale(1);
  }

  50% {
    transform: translateX(-24px) scale(1.08);
  }
}

@keyframes music-playback-overlay-spark {
  0%,
  100% {
    opacity: 0.24;
    transform: translateY(0) scale(0.92);
  }

  50% {
    opacity: 0.92;
    transform: translateY(-12px) scale(1.08);
  }
}

@keyframes music-playback-overlay-ring {
  0%,
  100% {
    opacity: 0.22;
    transform: scale(0.96);
  }

  50% {
    opacity: 0.76;
    transform: scale(1.03);
  }
}

@keyframes music-playback-overlay-action-ring {
  0%,
  100% {
    opacity: 0.22;
    transform: scale(0.98);
  }

  50% {
    opacity: 0.72;
    transform: scale(1.02);
  }
}

@media (max-width: 720px) {
  .music-playback-overlay {
    padding: 16px;
  }

  .music-playback-overlay__panel {
    gap: 14px;
    padding: 30px 22px 26px;
    border-radius: 26px;
  }

  .music-playback-overlay__panel::before {
    inset: 8px;
    border-radius: 20px;
  }

  .music-playback-overlay__panel::after {
    inset: auto 28px 0;
  }

  .music-playback-overlay__seal {
    width: 62px;
    height: 62px;
    font-size: 1.4rem;
  }

  .music-playback-overlay__seal-ring {
    width: 90px;
    height: 90px;
  }

  .music-playback-overlay__eyebrow {
    font-size: 0.78rem;
    letter-spacing: 0.2em;
  }

  .music-playback-overlay__track {
    font-size: 0.88rem;
    letter-spacing: 0.08em;
  }

  .music-playback-overlay__description {
    font-size: 0.94rem;
    line-height: 1.8;
  }

  .music-playback-overlay__action {
    min-width: 100%;
    padding: 14px 18px;
  }

  .music-playback-overlay__action strong {
    font-size: 0.94rem;
    letter-spacing: 0.04em;
  }

  .music-playback-overlay__foot {
    font-size: 0.82rem;
  }

  .music-playback-overlay__mist--left {
    width: 260px;
    height: 140px;
  }

  .music-playback-overlay__mist--right {
    width: 240px;
    height: 140px;
  }
}
</style>
