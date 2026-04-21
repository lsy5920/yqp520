<script setup lang="ts">
import { computed } from 'vue'

/**
 * 组件入参类型
 * 用途：约束海报预览组件需要的展示数据
 */
interface PosterCardProps {
  /** 用途：同门称呼 */
  title?: string
  /** 用途：一句寄语 */
  message?: string
  /** 用途：海报主标题 */
  headline?: string
  /** 用途：海报副标题 */
  subtitle?: string
  /** 用途：底部落款 */
  signature?: string
  /** 用途：当前页面二维码图片地址 */
  qrCodeUrl?: string
  /** 用途：二维码标题 */
  qrLabel?: string
  /** 用途：二维码下方提示文案 */
  qrHint?: string
  /** 用途：是否减少动态效果 */
  reduceMotion?: boolean
}

const props = withDefaults(defineProps<PosterCardProps>(), {
  title: '亲爱的同门',
  message: '愿你在云栖派的每一步，都有热爱、有成长、有回响。',
  headline: '云栖派海报分享',
  subtitle: '把此刻的祝福留给同路人',
  signature: '云栖派官网',
  qrCodeUrl: '',
  qrLabel: '扫码入云栖',
  qrHint: '当前页面山门帖',
  reduceMotion: false,
})

/** 用途：立派四句总旨，填充门派气质，不额外编造新设定。 */
const credoLines = [
  '心随云闲，身自安然',
  '同道相守，不缚尘烦',
  '无拘无束，以诚为先',
  '相聚随心，来去随缘',
]

/**
 * 规范化称呼显示
 * 用途：空值时给出友好兜底
 */
const displayTitle = computed<string>(() => props.title?.trim() || '亲爱的同门')

/**
 * 规范化寄语显示
 * 用途：空值时给出友好兜底
 */
const displayMessage = computed<string>(() => props.message?.trim() || '愿你在云栖派的每一步，都有热爱、有成长、有回响。')

/**
 * 规范化主标题显示
 * 用途：让海报标题始终有清晰抬头
 */
const displayHeadline = computed<string>(() => props.headline?.trim() || '云栖同道帖')

/**
 * 规范化副标题显示
 * 用途：空值时给出门派风格兜底
 */
const displaySubtitle = computed<string>(() => props.subtitle?.trim() || '把此刻的祝福留给同路人')

/**
 * 规范化网址显示
 * 用途：把完整页面链接放到更宽的独立区域，避免挤在二维码旁边显示不全
 */
const displayQrHint = computed<string>(() => props.qrHint?.trim() || '当前页面山门帖')
</script>

<template>
  <article
    class="poster-card"
    :class="{ 'poster-card--reduced': reduceMotion }"
    aria-label="海报预览"
  >
    <div class="poster-card__halo poster-card__halo--top" aria-hidden="true" />
    <div class="poster-card__halo poster-card__halo--bottom" aria-hidden="true" />
    <div class="poster-card__cloud poster-card__cloud--left" aria-hidden="true" />
    <div class="poster-card__cloud poster-card__cloud--right" aria-hidden="true" />
    <div class="poster-card__mountains" aria-hidden="true" />
    <div class="poster-card__border" aria-hidden="true" />

    <div class="poster-card__content">
      <header class="poster-card__header">
        <div class="poster-card__heading">
          <p class="poster-card__eyebrow">{{ displayHeadline }}</p>
          <h3 class="poster-card__title">{{ displayTitle }}</h3>
          <p class="poster-card__subtitle">{{ displaySubtitle }}</p>
        </div>

        <div class="poster-card__seal-group">
          <div class="poster-card__seal">云栖印</div>
          <span class="poster-card__seal-copy">青金门帖</span>
        </div>
      </header>

      <section class="poster-card__scroll">
        <div class="poster-card__scroll-head">
          <span class="poster-card__scroll-label">同道寄语</span>
          <span class="poster-card__scroll-line" />
        </div>
        <p class="poster-card__message">“{{ displayMessage }}”</p>
        <p class="poster-card__motto">云深不问俗事，栖心只守本真。</p>
      </section>

      <section class="poster-card__credo">
        <p class="poster-card__section-label">门派总旨</p>
        <div class="poster-card__credo-grid">
          <span
            v-for="line in credoLines"
            :key="line"
            class="poster-card__credo-chip"
          >
            {{ line }}
          </span>
        </div>
      </section>

      <section class="poster-card__middle">
        <div class="poster-card__insight">
          <p class="poster-card__section-label">山门题记</p>
          <p class="poster-card__insight-copy">云栖无山，以心为山；宗门无殿，以情为殿。</p>
          <p class="poster-card__insight-note">不立山门，不争江湖，只为在浮躁世间留一处可安心停靠的人情之地。</p>
        </div>

        <div class="poster-card__ornament">
          <span class="poster-card__ornament-ring" />
          <span class="poster-card__ornament-center" />
          <span class="poster-card__ornament-copy">同道相守</span>
        </div>
      </section>

      <footer class="poster-card__footer">
        <div class="poster-card__footer-main">
          <div class="poster-card__signature-group">
            <p class="poster-card__section-label">落款</p>
            <div class="poster-card__signature-line" />
            <p class="poster-card__signature">{{ signature }}</p>
          </div>

          <div class="poster-card__qr-panel">
            <div class="poster-card__qr-shell">
              <img
                v-if="qrCodeUrl"
                class="poster-card__qr-image"
                :src="qrCodeUrl"
                alt="当前页面二维码"
              />
              <div v-else class="poster-card__qr-placeholder" aria-hidden="true">
                云
              </div>
            </div>
            <div class="poster-card__qr-copy">
              <strong>{{ qrLabel }}</strong>
              <span>扫码直达当前页面</span>
            </div>
          </div>
        </div>

        <div class="poster-card__url-strip">
          <div class="poster-card__url-head">
            <span class="poster-card__url-label">山门网址</span>
            <span class="poster-card__url-tip">链接过长时会自动换行完整展示</span>
          </div>
          <p class="poster-card__url-text">{{ displayQrHint }}</p>
        </div>
      </footer>
    </div>
  </article>
</template>

<style scoped>
.poster-card {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
  border-radius: 32px;
  background:
    radial-gradient(circle at 16% 14%, rgba(139, 208, 203, 0.2), transparent 24%),
    radial-gradient(circle at 86% 12%, rgba(216, 185, 114, 0.28), transparent 18%),
    linear-gradient(180deg, #14384b 0%, #0a1f2b 46%, #06131b 100%);
  box-shadow: 0 28px 72px rgba(0, 0, 0, 0.34);
  color: #f4efe2;
}

.poster-card__halo,
.poster-card__cloud,
.poster-card__mountains,
.poster-card__border {
  position: absolute;
  pointer-events: none;
}

.poster-card__halo {
  width: 300px;
  height: 300px;
  border-radius: 999px;
  filter: blur(34px);
}

.poster-card__halo--top {
  top: -60px;
  right: -60px;
  background: rgba(216, 185, 114, 0.16);
}

.poster-card__halo--bottom {
  bottom: 120px;
  left: -80px;
  background: rgba(139, 208, 203, 0.14);
}

.poster-card__cloud {
  width: 280px;
  height: 96px;
  border-radius: 999px;
  opacity: 0.7;
  background:
    radial-gradient(circle at 16% 52%, rgba(255, 255, 255, 0.16), transparent 24%),
    radial-gradient(circle at 44% 44%, rgba(255, 255, 255, 0.14), transparent 22%),
    radial-gradient(circle at 70% 58%, rgba(255, 255, 255, 0.12), transparent 20%);
  filter: blur(18px);
}

.poster-card__cloud--left {
  top: 180px;
  left: -56px;
}

.poster-card__cloud--right {
  top: 430px;
  right: -72px;
}

.poster-card__mountains {
  inset: auto 0 0 0;
  height: 30%;
  background:
    linear-gradient(155deg, transparent 0 18%, rgba(4, 17, 25, 0.95) 18% 100%),
    linear-gradient(24deg, transparent 0 22%, rgba(8, 27, 36, 0.98) 22% 100%),
    linear-gradient(180deg, transparent 0 22%, rgba(2, 11, 17, 0.94) 22% 100%);
  clip-path: polygon(0 100%, 0 66%, 14% 54%, 28% 70%, 46% 48%, 64% 72%, 84% 42%, 100% 62%, 100% 100%);
}

.poster-card__border {
  inset: 22px;
  border: 1px solid rgba(216, 185, 114, 0.16);
  border-radius: 28px;
}

.poster-card__content {
  position: relative;
  z-index: 1;
  /* 这里改成纵向弹性布局，避免导出大图时自动行高把底部额外撑空。 */
  display: flex;
  flex-direction: column;
  gap: 28px;
  height: 100%;
  padding: 44px 42px 38px;
}

.poster-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.poster-card__heading {
  display: grid;
  gap: 10px;
}

.poster-card__eyebrow,
.poster-card__title,
.poster-card__subtitle,
.poster-card__message,
.poster-card__motto,
.poster-card__section-label,
.poster-card__insight-copy,
.poster-card__insight-note,
.poster-card__signature {
  margin: 0;
}

.poster-card__eyebrow,
.poster-card__section-label,
.poster-card__seal-copy {
  font-size: 13px;
  letter-spacing: 0.22em;
  color: rgba(139, 208, 203, 0.88);
}

.poster-card__title {
  font-size: clamp(44px, 8vw, 68px);
  line-height: 1.05;
  letter-spacing: 0.02em;
}

.poster-card__subtitle {
  max-width: 440px;
  font-size: 1rem;
  line-height: 1.8;
  color: rgba(244, 239, 226, 0.76);
}

.poster-card__seal-group {
  display: grid;
  justify-items: center;
  gap: 10px;
}

.poster-card__seal {
  display: grid;
  width: 108px;
  height: 108px;
  place-items: center;
  border: 1px solid rgba(216, 185, 114, 0.42);
  border-radius: 999px;
  background:
    radial-gradient(circle at 34% 30%, rgba(216, 185, 114, 0.32), transparent 30%),
    linear-gradient(160deg, rgba(12, 44, 58, 0.94), rgba(6, 20, 28, 0.98));
  color: #f0dfb0;
  font-size: 1.24rem;
  letter-spacing: 0.18em;
  box-shadow:
    inset 0 0 0 8px rgba(216, 185, 114, 0.08),
    0 18px 32px rgba(0, 0, 0, 0.22);
}

.poster-card__scroll {
  position: relative;
  display: grid;
  gap: 18px;
  padding: 28px 28px 30px;
  border-radius: 30px;
  background:
    linear-gradient(180deg, rgba(247, 239, 219, 0.95), rgba(228, 211, 173, 0.92)),
    rgba(247, 239, 219, 0.94);
  color: #173241;
  box-shadow:
    inset 0 0 0 1px rgba(165, 123, 52, 0.18),
    0 20px 40px rgba(0, 0, 0, 0.16);
}

.poster-card__scroll::before,
.poster-card__scroll::after {
  content: '';
  position: absolute;
  top: 24px;
  bottom: 24px;
  width: 10px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(184, 145, 74, 0.52), rgba(109, 76, 24, 0.26));
}

.poster-card__scroll::before {
  left: 12px;
}

.poster-card__scroll::after {
  right: 12px;
}

.poster-card__scroll-head {
  display: flex;
  align-items: center;
  gap: 14px;
}

.poster-card__scroll-label {
  color: rgba(151, 98, 31, 0.92);
  font-size: 0.94rem;
  letter-spacing: 0.12em;
}

.poster-card__scroll-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, rgba(151, 98, 31, 0.56), rgba(151, 98, 31, 0));
}

.poster-card__message {
  font-size: clamp(24px, 4.2vw, 34px);
  line-height: 1.8;
  color: #173241;
  white-space: pre-wrap;
}

.poster-card__motto {
  color: rgba(151, 98, 31, 0.96);
  font-size: 1rem;
  letter-spacing: 0.12em;
}

.poster-card__credo {
  display: grid;
  gap: 14px;
}

.poster-card__credo-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.poster-card__credo-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 54px;
  padding: 0 16px;
  border: 1px solid rgba(216, 185, 114, 0.22);
  border-radius: 999px;
  background: rgba(7, 27, 37, 0.46);
  color: #f0dfb0;
  font-size: 0.96rem;
  letter-spacing: 0.06em;
  text-align: center;
  backdrop-filter: blur(8px);
}

.poster-card__middle {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 24px;
  align-items: center;
}

.poster-card__insight {
  display: grid;
  gap: 12px;
  padding: 22px 24px;
  border-radius: 26px;
  background: rgba(7, 27, 37, 0.5);
  border: 1px solid rgba(139, 208, 203, 0.14);
}

.poster-card__insight-copy {
  color: #f4efe2;
  font-size: 1.22rem;
  line-height: 1.7;
}

.poster-card__insight-note {
  color: rgba(244, 239, 226, 0.68);
  font-size: 0.96rem;
  line-height: 1.8;
}

.poster-card__ornament {
  position: relative;
  display: grid;
  width: 170px;
  height: 170px;
  place-items: center;
}

.poster-card__ornament-ring,
.poster-card__ornament-center {
  position: absolute;
  border-radius: 999px;
}

.poster-card__ornament-ring {
  inset: 0;
  border: 1px solid rgba(216, 185, 114, 0.3);
  box-shadow: inset 0 0 0 12px rgba(216, 185, 114, 0.06);
}

.poster-card__ornament-center {
  inset: 28px;
  background:
    radial-gradient(circle at 38% 32%, rgba(216, 185, 114, 0.38), transparent 34%),
    linear-gradient(180deg, rgba(11, 39, 53, 0.94), rgba(6, 19, 27, 0.98));
  border: 1px solid rgba(139, 208, 203, 0.18);
}

.poster-card__ornament-copy {
  position: relative;
  z-index: 1;
  color: #f0dfb0;
  font-size: 1rem;
  letter-spacing: 0.18em;
}

.poster-card__footer {
  display: grid;
  gap: 18px;
  margin-top: auto;
}

.poster-card__footer-main {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 22px;
}

.poster-card__signature-group {
  display: grid;
  flex: 1;
  gap: 12px;
}

.poster-card__signature-line {
  width: 100%;
  height: 1px;
  background: linear-gradient(90deg, rgba(216, 185, 114, 0.5), rgba(216, 185, 114, 0.02));
}

.poster-card__signature {
  color: rgba(244, 239, 226, 0.74);
  font-size: 0.98rem;
}

.poster-card__qr-panel {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px;
  border: 1px solid rgba(216, 185, 114, 0.24);
  border-radius: 26px;
  background: rgba(8, 28, 39, 0.74);
  backdrop-filter: blur(10px);
}

.poster-card__qr-shell {
  display: grid;
  width: 124px;
  height: 124px;
  place-items: center;
  padding: 8px;
  border-radius: 18px;
  background: rgba(244, 239, 226, 0.96);
  box-shadow: inset 0 0 0 1px rgba(216, 185, 114, 0.18);
}

.poster-card__qr-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 10px;
}

.poster-card__qr-placeholder {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  border-radius: 10px;
  background:
    linear-gradient(135deg, rgba(17, 50, 68, 0.92), rgba(8, 28, 39, 0.98)),
    #113244;
  color: #f4efe2;
  font-size: 2rem;
  letter-spacing: 0.26em;
}

.poster-card__qr-copy {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.poster-card__qr-copy strong {
  color: rgba(216, 185, 114, 0.96);
  font-size: 1rem;
}

.poster-card__qr-copy span {
  color: rgba(244, 239, 226, 0.72);
  font-size: 0.9rem;
  line-height: 1.7;
}

.poster-card__url-strip {
  display: grid;
  gap: 10px;
  padding: 16px 18px;
  border-radius: 22px;
  border: 1px solid rgba(216, 185, 114, 0.16);
  background:
    linear-gradient(180deg, rgba(10, 34, 46, 0.86), rgba(6, 22, 31, 0.92)),
    rgba(8, 28, 39, 0.76);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

.poster-card__url-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.poster-card__url-label {
  color: rgba(216, 185, 114, 0.96);
  font-size: 0.92rem;
  letter-spacing: 0.14em;
}

.poster-card__url-tip {
  color: rgba(139, 208, 203, 0.7);
  font-size: 0.78rem;
}

.poster-card__url-text {
  margin: 0;
  color: rgba(244, 239, 226, 0.82);
  font-size: 0.92rem;
  line-height: 1.8;
  word-break: break-all;
}

.poster-card--reduced,
.poster-card--reduced * {
  transition: none !important;
  animation: none !important;
}
</style>
