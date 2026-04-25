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
        <!-- 这里铺一层云海底色，让浮窗像从雾里浮出来。 -->
        <span class="music-playback-overlay__sky-glow music-playback-overlay__sky-glow--top"></span>
        <span class="music-playback-overlay__sky-glow music-playback-overlay__sky-glow--bottom"></span>

        <!-- 这里用多组云团做远近层次，滚动时也能保持仙气氛围。 -->
        <span class="music-playback-overlay__cloud music-playback-overlay__cloud--one"></span>
        <span class="music-playback-overlay__cloud music-playback-overlay__cloud--two"></span>
        <span class="music-playback-overlay__cloud music-playback-overlay__cloud--three"></span>
        <span class="music-playback-overlay__cloud music-playback-overlay__cloud--four"></span>

        <!-- 这里用剑气光痕强化江湖感，视觉上像清音破云而来。 -->
        <span class="music-playback-overlay__sword-light music-playback-overlay__sword-light--one"></span>
        <span class="music-playback-overlay__sword-light music-playback-overlay__sword-light--two"></span>

        <!-- 这里放几粒云珠，给静态画面增加细小呼吸感。 -->
        <span class="music-playback-overlay__spark music-playback-overlay__spark--one"></span>
        <span class="music-playback-overlay__spark music-playback-overlay__spark--two"></span>
        <span class="music-playback-overlay__spark music-playback-overlay__spark--three"></span>
      </div>

      <article class="music-playback-overlay__panel">
        <!-- 这里放面板内部的流云与墨纹，只做装饰不影响点击。 -->
        <span class="music-playback-overlay__panel-cloud music-playback-overlay__panel-cloud--left" aria-hidden="true"></span>
        <span class="music-playback-overlay__panel-cloud music-playback-overlay__panel-cloud--right" aria-hidden="true"></span>
        <span class="music-playback-overlay__ink-line music-playback-overlay__ink-line--top" aria-hidden="true"></span>
        <span class="music-playback-overlay__ink-line music-playback-overlay__ink-line--bottom" aria-hidden="true"></span>

        <div class="music-playback-overlay__seal-group" aria-hidden="true">
          <span class="music-playback-overlay__seal-aura"></span>
          <span class="music-playback-overlay__seal">
            <img src="/images/yunqi-logo.png" alt="" />
          </span>
          <span class="music-playback-overlay__seal-ring"></span>
          <span class="music-playback-overlay__seal-ring music-playback-overlay__seal-ring--outer"></span>
        </div>

        <p class="music-playback-overlay__eyebrow">云海开卷 · 清音候启</p>
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
          <span class="music-playback-overlay__action-cloud" aria-hidden="true"></span>
          <strong>{{ actionText }}</strong>
        </div>

        <p class="music-playback-overlay__foot">
          轻点任意一处云气，让这一阙江湖清音入场
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
  padding: clamp(18px, 5vw, 38px);
  overflow: hidden;
  cursor: pointer;
  isolation: isolate;
}

.music-playback-overlay__backdrop,
.music-playback-overlay__sky-glow,
.music-playback-overlay__cloud,
.music-playback-overlay__sword-light,
.music-playback-overlay__spark {
  position: absolute;
}

.music-playback-overlay__backdrop {
  inset: 0;
  background:
    radial-gradient(circle at 50% 12%, rgba(255, 255, 255, 0.88), transparent 20%),
    radial-gradient(circle at 16% 18%, rgba(144, 218, 213, 0.3), transparent 30%),
    radial-gradient(circle at 86% 78%, rgba(202, 230, 221, 0.56), transparent 34%),
    linear-gradient(180deg, rgba(242, 252, 248, 0.9), rgba(218, 242, 236, 0.94) 52%, rgba(247, 242, 228, 0.88));
  backdrop-filter: blur(20px) saturate(1.16);
}

.music-playback-overlay__backdrop::before,
.music-playback-overlay__backdrop::after {
  position: absolute;
  inset: 0;
  content: '';
  pointer-events: none;
}

.music-playback-overlay__backdrop::before {
  background:
    linear-gradient(115deg, transparent 0 26%, rgba(255, 255, 255, 0.38) 34%, transparent 42%),
    repeating-linear-gradient(112deg, rgba(55, 139, 137, 0.08) 0 1px, transparent 1px 96px);
  opacity: 0.48;
  animation: music-playback-overlay-cloud-sheen 9s ease-in-out infinite;
}

.music-playback-overlay__backdrop::after {
  background:
    radial-gradient(circle at 50% 50%, transparent 0 42%, rgba(37, 103, 101, 0.12) 82%),
    linear-gradient(90deg, rgba(23, 61, 66, 0.08), transparent 18% 82%, rgba(23, 61, 66, 0.08));
}

.music-playback-overlay__sky-glow {
  display: block;
  border-radius: 999px;
  pointer-events: none;
}

.music-playback-overlay__sky-glow--top {
  top: 8%;
  left: 50%;
  width: min(760px, 86vw);
  height: min(260px, 32vh);
  background: rgba(255, 255, 255, 0.54);
  filter: blur(30px);
  transform: translateX(-50%);
  animation: music-playback-overlay-sky-breathe 8s ease-in-out infinite;
}

.music-playback-overlay__sky-glow--bottom {
  right: 8%;
  bottom: 6%;
  width: min(520px, 62vw);
  height: min(260px, 30vh);
  background: rgba(86, 175, 169, 0.18);
  filter: blur(36px);
  animation: music-playback-overlay-sky-drift 10s ease-in-out infinite;
}

.music-playback-overlay__cloud {
  display: block;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.7);
  box-shadow:
    0 18px 42px rgba(84, 154, 151, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
  filter: blur(0.1px);
  pointer-events: none;
}

.music-playback-overlay__cloud::before,
.music-playback-overlay__cloud::after,
.music-playback-overlay__panel-cloud::before,
.music-playback-overlay__panel-cloud::after,
.music-playback-overlay__action-cloud::before,
.music-playback-overlay__action-cloud::after {
  position: absolute;
  border-radius: inherit;
  background: inherit;
  content: '';
}

.music-playback-overlay__cloud--one {
  top: 17%;
  left: -76px;
  width: 280px;
  height: 76px;
  opacity: 0.72;
  animation: music-playback-overlay-cloud-one 13s ease-in-out infinite;
}

.music-playback-overlay__cloud--one::before {
  left: 68px;
  bottom: 20px;
  width: 108px;
  height: 108px;
}

.music-playback-overlay__cloud--one::after {
  left: 154px;
  bottom: 14px;
  width: 78px;
  height: 78px;
}

.music-playback-overlay__cloud--two {
  right: -92px;
  bottom: 17%;
  width: 330px;
  height: 86px;
  opacity: 0.66;
  animation: music-playback-overlay-cloud-two 15s ease-in-out infinite -3s;
}

.music-playback-overlay__cloud--two::before {
  left: 72px;
  bottom: 24px;
  width: 124px;
  height: 124px;
}

.music-playback-overlay__cloud--two::after {
  left: 184px;
  bottom: 16px;
  width: 92px;
  height: 92px;
}

.music-playback-overlay__cloud--three {
  top: 9%;
  right: 14%;
  width: 150px;
  height: 40px;
  opacity: 0.42;
  animation: music-playback-overlay-cloud-three 11s ease-in-out infinite -5s;
}

.music-playback-overlay__cloud--three::before {
  left: 38px;
  bottom: 13px;
  width: 58px;
  height: 58px;
}

.music-playback-overlay__cloud--three::after {
  left: 90px;
  bottom: 9px;
  width: 44px;
  height: 44px;
}

.music-playback-overlay__cloud--four {
  left: 12%;
  bottom: 7%;
  width: 190px;
  height: 52px;
  opacity: 0.38;
  animation: music-playback-overlay-cloud-four 12s ease-in-out infinite -1.8s;
}

.music-playback-overlay__cloud--four::before {
  left: 44px;
  bottom: 15px;
  width: 72px;
  height: 72px;
}

.music-playback-overlay__cloud--four::after {
  left: 110px;
  bottom: 10px;
  width: 58px;
  height: 58px;
}

.music-playback-overlay__sword-light {
  width: min(520px, 66vw);
  height: 1px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.98), rgba(173, 220, 214, 0.34), transparent);
  box-shadow: 0 0 24px rgba(255, 255, 255, 0.72);
  opacity: 0;
  pointer-events: none;
  transform-origin: center;
}

.music-playback-overlay__sword-light--one {
  top: 25%;
  left: -18%;
  transform: rotate(-13deg);
  animation: music-playback-overlay-sword-one 6.8s ease-in-out infinite 0.8s;
}

.music-playback-overlay__sword-light--two {
  right: -20%;
  bottom: 30%;
  transform: rotate(-13deg);
  animation: music-playback-overlay-sword-two 7.4s ease-in-out infinite 2.1s;
}

.music-playback-overlay__spark {
  display: block;
  width: 11px;
  height: 11px;
  border-radius: 999px;
  background: rgba(67, 165, 160, 0.38);
  box-shadow:
    0 0 22px rgba(84, 154, 151, 0.24),
    0 0 46px rgba(255, 255, 255, 0.48);
  pointer-events: none;
}

.music-playback-overlay__spark--one {
  top: 17%;
  left: 16%;
  animation: music-playback-overlay-spark 4.8s ease-in-out infinite;
}

.music-playback-overlay__spark--two {
  right: 18%;
  bottom: 16%;
  animation: music-playback-overlay-spark 5.4s ease-in-out infinite 1.2s;
}

.music-playback-overlay__spark--three {
  top: 60%;
  right: 28%;
  width: 7px;
  height: 7px;
  animation: music-playback-overlay-spark 4.2s ease-in-out infinite 2.4s;
}

.music-playback-overlay__panel {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 15px;
  width: min(720px, 100%);
  padding: clamp(34px, 6vw, 52px) clamp(24px, 6vw, 54px) clamp(28px, 5vw, 42px);
  border: 1px solid rgba(78, 164, 160, 0.32);
  border-radius: 34px;
  background:
    radial-gradient(circle at 50% -8%, rgba(255, 255, 255, 0.94), transparent 34%),
    radial-gradient(circle at 18% 78%, rgba(142, 216, 210, 0.18), transparent 30%),
    linear-gradient(145deg, rgba(254, 255, 250, 0.94), rgba(224, 245, 241, 0.9) 58%, rgba(248, 244, 232, 0.92)),
    rgba(244, 252, 247, 0.92);
  box-shadow:
    0 36px 90px rgba(30, 86, 84, 0.24),
    0 0 0 10px rgba(255, 255, 255, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
  text-align: center;
  color: #173d42;
  overflow: hidden;
  transform-style: preserve-3d;
  animation: music-playback-overlay-panel-float 6.4s ease-in-out infinite;
}

.music-playback-overlay__panel::before,
.music-playback-overlay__panel::after {
  content: '';
  position: absolute;
  pointer-events: none;
}

.music-playback-overlay__panel::before {
  inset: 12px;
  border: 1px solid rgba(78, 164, 160, 0.18);
  border-radius: 25px;
  box-shadow:
    inset 0 0 32px rgba(255, 255, 255, 0.62),
    inset 0 0 0 1px rgba(255, 255, 255, 0.26);
}

.music-playback-overlay__panel::after {
  inset: -48% auto auto 50%;
  width: 220px;
  height: 220%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.34), transparent);
  opacity: 0.52;
  transform: translateX(-50%) rotate(18deg);
  animation: music-playback-overlay-panel-sheen 7.8s ease-in-out infinite;
}

.music-playback-overlay__panel-cloud,
.music-playback-overlay__action-cloud {
  position: absolute;
  display: block;
  border-radius: 999px;
  pointer-events: none;
}

.music-playback-overlay__panel-cloud {
  z-index: 0;
  background: rgba(255, 255, 255, 0.62);
  filter: blur(0.1px);
}

.music-playback-overlay__panel-cloud--left {
  left: -62px;
  top: 54%;
  width: 168px;
  height: 46px;
  opacity: 0.42;
  animation: music-playback-overlay-panel-cloud-left 8.2s ease-in-out infinite;
}

.music-playback-overlay__panel-cloud--left::before {
  left: 38px;
  bottom: 14px;
  width: 62px;
  height: 62px;
}

.music-playback-overlay__panel-cloud--left::after {
  left: 96px;
  bottom: 9px;
  width: 48px;
  height: 48px;
}

.music-playback-overlay__panel-cloud--right {
  right: -72px;
  top: 14%;
  width: 178px;
  height: 48px;
  opacity: 0.36;
  animation: music-playback-overlay-panel-cloud-right 8.8s ease-in-out infinite -2s;
}

.music-playback-overlay__panel-cloud--right::before {
  left: 44px;
  bottom: 13px;
  width: 66px;
  height: 66px;
}

.music-playback-overlay__panel-cloud--right::after {
  left: 108px;
  bottom: 8px;
  width: 50px;
  height: 50px;
}

.music-playback-overlay__ink-line {
  position: absolute;
  left: 50%;
  z-index: 0;
  width: min(460px, 72%);
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(55, 139, 137, 0.52), rgba(156, 122, 61, 0.36), transparent);
  opacity: 0.42;
  pointer-events: none;
}

.music-playback-overlay__ink-line--top {
  top: 104px;
  transform: translateX(-50%);
}

.music-playback-overlay__ink-line--bottom {
  bottom: 94px;
  transform: translateX(-50%);
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
  min-height: 104px;
  margin-bottom: 2px;
}

.music-playback-overlay__seal-aura {
  position: absolute;
  width: 116px;
  height: 116px;
  border-radius: 999px;
  background:
    conic-gradient(from 0deg, rgba(74, 171, 166, 0), rgba(74, 171, 166, 0.28), rgba(155, 122, 61, 0.22), rgba(74, 171, 166, 0)),
    radial-gradient(circle, rgba(255, 255, 255, 0.72), transparent 66%);
  filter: blur(0.2px);
  animation: music-playback-overlay-aura-spin 9s linear infinite;
}

.music-playback-overlay__seal {
  display: grid;
  width: 78px;
  height: 78px;
  place-items: center;
  border-radius: 999px;
  background:
    radial-gradient(circle at 32% 24%, rgba(255, 255, 255, 0.82), transparent 34%),
    linear-gradient(160deg, rgba(148, 220, 214, 0.96), rgba(42, 129, 128, 0.98)),
    rgba(84, 154, 151, 0.96);
  color: #173d42;
  font-size: 1.7rem;
  letter-spacing: 0;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.56),
    inset 0 -10px 20px rgba(23, 61, 66, 0.16),
    0 18px 38px rgba(42, 101, 101, 0.22);
  animation: music-playback-overlay-seal-breathe 4.6s ease-in-out infinite;
}

.music-playback-overlay__seal img {
  display: block;
  width: 100%;
  height: 100%;
  padding: 5px;
  object-fit: contain;
  filter: drop-shadow(0 8px 14px rgba(23, 61, 66, 0.22));
}

.music-playback-overlay__seal-ring {
  position: absolute;
  width: 106px;
  height: 106px;
  border: 1px solid rgba(84, 154, 151, 0.26);
  border-radius: 999px;
  animation: music-playback-overlay-ring 3.8s ease-in-out infinite;
}

.music-playback-overlay__seal-ring--outer {
  width: 132px;
  height: 132px;
  border-color: rgba(155, 122, 61, 0.2);
  animation-duration: 5.2s;
  animation-delay: -1.4s;
}

.music-playback-overlay__eyebrow {
  color: #2f7a78;
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0;
  text-shadow: 0 8px 20px rgba(255, 255, 255, 0.68);
}

.music-playback-overlay__title {
  color: #173d42;
  font-size: 3.45rem;
  line-height: 1.16;
  text-shadow:
    0 2px 0 rgba(255, 255, 255, 0.64),
    0 12px 26px rgba(84, 154, 151, 0.2);
}

.music-playback-overlay__track {
  justify-self: center;
  padding: 7px 18px;
  border: 1px solid rgba(155, 122, 61, 0.2);
  border-radius: 999px;
  background: rgba(255, 250, 232, 0.58);
  color: #84662d;
  font-size: 0.98rem;
  letter-spacing: 0;
}

.music-playback-overlay__description {
  max-width: 34rem;
  margin-inline: auto;
  color: rgba(35, 83, 86, 0.82);
  font-size: 1.04rem;
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
  border: 1px solid rgba(84, 154, 151, 0.24);
  background: rgba(236, 249, 245, 0.76);
  color: rgba(35, 83, 86, 0.86);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.62);
}

.music-playback-overlay__error {
  border: 1px solid rgba(183, 99, 70, 0.28);
  background: rgba(255, 239, 230, 0.76);
  color: #7a3525;
}

.music-playback-overlay__action {
  position: relative;
  justify-self: center;
  min-width: min(410px, 100%);
  padding: 17px 28px;
  border-radius: 999px;
  color: #112f35;
  background:
    radial-gradient(circle at 24% 18%, rgba(255, 255, 255, 0.54), transparent 30%),
    linear-gradient(135deg, rgba(235, 204, 126, 0.98), rgba(193, 150, 67, 0.98));
  box-shadow:
    0 18px 38px rgba(135, 107, 49, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
  overflow: hidden;
  transition:
    transform 220ms ease,
    box-shadow 220ms ease;
}

.music-playback-overlay__action:hover {
  transform: translateY(-2px);
  box-shadow:
    0 24px 48px rgba(135, 107, 49, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.58);
}

.music-playback-overlay__action strong {
  position: relative;
  z-index: 2;
  display: block;
  font-size: 1.04rem;
  line-height: 1.5;
  letter-spacing: 0;
}

.music-playback-overlay__action-ring {
  position: absolute;
  inset: -6px;
  border: 1px solid rgba(183, 145, 67, 0.3);
  border-radius: 999px;
  animation: music-playback-overlay-action-ring 2.8s ease-in-out infinite;
}

.music-playback-overlay__action-cloud {
  left: -52px;
  top: 50%;
  z-index: 1;
  width: 112px;
  height: 30px;
  background: rgba(255, 255, 255, 0.36);
  transform: translateY(-50%);
  animation: music-playback-overlay-action-cloud 4.8s ease-in-out infinite;
}

.music-playback-overlay__action-cloud::before {
  left: 28px;
  bottom: 8px;
  width: 42px;
  height: 42px;
}

.music-playback-overlay__action-cloud::after {
  left: 66px;
  bottom: 5px;
  width: 34px;
  height: 34px;
}

.music-playback-overlay__foot {
  color: rgba(35, 83, 86, 0.6);
  font-size: 0.9rem;
  letter-spacing: 0;
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

@keyframes music-playback-overlay-cloud-sheen {
  0%,
  100% {
    opacity: 0.28;
    transform: translateX(-4%);
  }

  50% {
    opacity: 0.58;
    transform: translateX(4%);
  }
}

@keyframes music-playback-overlay-sky-breathe {
  0%,
  100% {
    opacity: 0.48;
    transform: translateX(-50%) scale(0.98);
  }

  50% {
    opacity: 0.78;
    transform: translateX(-50%) scale(1.04);
  }
}

@keyframes music-playback-overlay-sky-drift {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(1);
  }

  50% {
    transform: translate3d(-28px, -14px, 0) scale(1.08);
  }
}

@keyframes music-playback-overlay-cloud-one {
  0%,
  100% {
    transform: translate3d(0, 0, 0);
  }

  50% {
    transform: translate3d(38px, -10px, 0);
  }
}

@keyframes music-playback-overlay-cloud-two {
  0%,
  100% {
    transform: translate3d(0, 0, 0);
  }

  50% {
    transform: translate3d(-42px, 10px, 0);
  }
}

@keyframes music-playback-overlay-cloud-three {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(1);
  }

  50% {
    transform: translate3d(-18px, 6px, 0) scale(1.04);
  }
}

@keyframes music-playback-overlay-cloud-four {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(1);
  }

  50% {
    transform: translate3d(24px, -8px, 0) scale(1.05);
  }
}

@keyframes music-playback-overlay-sword-one {
  0% {
    opacity: 0;
    transform: translateX(-12%) rotate(-13deg);
  }

  18%,
  34% {
    opacity: 0.78;
  }

  52%,
  100% {
    opacity: 0;
    transform: translateX(154%) rotate(-13deg);
  }
}

@keyframes music-playback-overlay-sword-two {
  0% {
    opacity: 0;
    transform: translateX(16%) rotate(-13deg);
  }

  18%,
  34% {
    opacity: 0.56;
  }

  54%,
  100% {
    opacity: 0;
    transform: translateX(-158%) rotate(-13deg);
  }
}

@keyframes music-playback-overlay-panel-float {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-7px);
  }
}

@keyframes music-playback-overlay-panel-sheen {
  0%,
  100% {
    transform: translateX(-96%) rotate(18deg);
  }

  48%,
  62% {
    transform: translateX(96%) rotate(18deg);
  }
}

@keyframes music-playback-overlay-panel-cloud-left {
  0%,
  100% {
    transform: translateX(0);
  }

  50% {
    transform: translateX(18px);
  }
}

@keyframes music-playback-overlay-panel-cloud-right {
  0%,
  100% {
    transform: translateX(0);
  }

  50% {
    transform: translateX(-18px);
  }
}

@keyframes music-playback-overlay-aura-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes music-playback-overlay-seal-breathe {
  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.04);
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

@keyframes music-playback-overlay-action-cloud {
  0%,
  100% {
    transform: translate(-4px, -50%);
  }

  50% {
    transform: translate(14px, -50%);
  }
}

@media (max-width: 720px) {
  .music-playback-overlay {
    padding: 16px;
  }

  .music-playback-overlay__panel {
    gap: 13px;
    padding: 28px 20px 24px;
    border-radius: 28px;
  }

  .music-playback-overlay__panel::before {
    inset: 8px;
    border-radius: 22px;
  }

  .music-playback-overlay__seal {
    width: 66px;
    height: 66px;
    font-size: 1.4rem;
  }

  .music-playback-overlay__seal-ring {
    width: 94px;
    height: 94px;
  }

  .music-playback-overlay__seal-ring--outer {
    width: 116px;
    height: 116px;
  }

  .music-playback-overlay__seal-aura {
    width: 104px;
    height: 104px;
  }

  .music-playback-overlay__eyebrow {
    font-size: 0.78rem;
    letter-spacing: 0;
  }

  .music-playback-overlay__title {
    font-size: 2.28rem;
  }

  .music-playback-overlay__track {
    font-size: 0.88rem;
    letter-spacing: 0;
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
    letter-spacing: 0;
  }

  .music-playback-overlay__foot {
    font-size: 0.82rem;
  }

  .music-playback-overlay__cloud--one {
    left: -150px;
    transform: scale(0.72);
  }

  .music-playback-overlay__cloud--two {
    right: -170px;
    transform: scale(0.72);
  }

  .music-playback-overlay__cloud--three,
  .music-playback-overlay__cloud--four {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .music-playback-overlay *,
  .music-playback-overlay *::before,
  .music-playback-overlay *::after {
    animation: none !important;
    transition: none !important;
  }

  .music-playback-overlay__panel {
    transform: none !important;
  }
}
</style>
