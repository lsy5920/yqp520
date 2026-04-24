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
  /** 用途：首页二维码图片地址 */
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
  headline: '云栖同道帖',
  subtitle: '把此刻的祝福留给同路人',
  signature: '云栖派官网',
  qrCodeUrl: '',
  qrLabel: '扫码入云栖',
  qrHint: '云栖首页网址',
  reduceMotion: false,
})

/** 用途：立派四句总旨，直接取自门派原文。 */
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
 * 用途：把首页链接放到更宽的独立区域里，避免长链接被截断
 */
const displayQrHint = computed<string>(() => props.qrHint?.trim() || '云栖首页网址')
</script>

<template>
  <article
    class="poster-card"
    :class="{ 'poster-card--reduced': reduceMotion }"
    aria-label="海报预览"
  >
    <div class="poster-card__halo poster-card__halo--top" aria-hidden="true" />
    <div class="poster-card__halo poster-card__halo--bottom" aria-hidden="true" />
    <div class="poster-card__cloud-band" aria-hidden="true" />
    <div class="poster-card__mountains" aria-hidden="true" />
    <div class="poster-card__border" aria-hidden="true" />
    <div class="poster-card__gold-trace poster-card__gold-trace--left" aria-hidden="true" />
    <div class="poster-card__gold-trace poster-card__gold-trace--right" aria-hidden="true" />

    <div class="poster-card__content">
      <header class="poster-card__masthead">
        <div class="poster-card__title-block">
          <p class="poster-card__eyebrow">{{ displayHeadline }}</p>
          <h3 class="poster-card__title">{{ displayTitle }}</h3>
          <p class="poster-card__subtitle">{{ displaySubtitle }}</p>
        </div>

        <div class="poster-card__seal-panel">
          <div class="poster-card__seal">云栖印</div>
          <p class="poster-card__seal-copy">青金山门帖</p>
        </div>
      </header>

      <section class="poster-card__hero">
        <section class="poster-card__scroll">
          <div class="poster-card__scroll-head">
            <span class="poster-card__section-label">同道寄语</span>
            <span class="poster-card__scroll-line" />
          </div>
          <p class="poster-card__message">“{{ displayMessage }}”</p>
          <div class="poster-card__scroll-footer">
            <p class="poster-card__motto">云深不问俗事，栖心只守本真。</p>
            <span class="poster-card__scroll-seal">半文半白立派全典</span>
          </div>
        </section>

        <aside class="poster-card__hero-side">
          <section class="poster-card__side-card">
            <p class="poster-card__section-label">门派总旨</p>
            <div class="poster-card__credo-list">
              <span
                v-for="line in credoLines"
                :key="line"
                class="poster-card__credo-item"
              >
                {{ line }}
              </span>
            </div>
          </section>

          <section class="poster-card__side-card poster-card__side-card--ornament">
            <div class="poster-card__ornament" aria-hidden="true">
              <span class="poster-card__ornament-ring" />
              <span class="poster-card__ornament-ring poster-card__ornament-ring--inner" />
              <span class="poster-card__ornament-core" />
            </div>
            <p class="poster-card__ornament-title">同道相守</p>
            <p class="poster-card__ornament-copy">无拘无束，以诚为先；相聚随心，来去随缘。</p>
          </section>
        </aside>
      </section>

      <section class="poster-card__story">
        <div class="poster-card__story-main">
          <p class="poster-card__section-label">山门题记</p>
          <p class="poster-card__story-title">云栖无山，以心为山；宗门无殿，以情为殿。</p>
          <p class="poster-card__story-copy">我辈聚于此，不为争霸江湖，不为扬名立万，只为在浮躁世间留一处可以放心相处、安心停靠的人情之地。</p>
        </div>

        <div class="poster-card__story-side">
          <span class="poster-card__story-tag">清净同道</span>
          <span class="poster-card__story-tag">不负相逢</span>
          <span class="poster-card__story-tag">以诚为先</span>
        </div>
      </section>

      <footer class="poster-card__footer">
        <div class="poster-card__footer-left">
          <div class="poster-card__signature-group">
            <p class="poster-card__section-label">落款</p>
            <div class="poster-card__signature-line" />
            <p class="poster-card__signature">{{ signature }}</p>
          </div>

          <div class="poster-card__url-strip">
            <div class="poster-card__url-head">
              <span class="poster-card__url-label">山门首页</span>
              <span class="poster-card__url-tip">海报扫码默认回到首页</span>
            </div>
            <p class="poster-card__url-text">{{ displayQrHint }}</p>
          </div>
        </div>

        <div class="poster-card__qr-panel">
          <div class="poster-card__qr-shell">
            <img
              v-if="qrCodeUrl"
              class="poster-card__qr-image"
              :src="qrCodeUrl"
              alt="云栖首页二维码"
            />
            <div v-else class="poster-card__qr-placeholder" aria-hidden="true">
              云
            </div>
          </div>

          <div class="poster-card__qr-copy">
            <p class="poster-card__section-label">山门引路</p>
            <strong>{{ qrLabel }}</strong>
            <span>扫码即可直达云栖首页，先入山门，再观全典。</span>
          </div>
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
    radial-gradient(circle at 18% 10%, rgba(139, 208, 203, 0.22), transparent 24%),
    radial-gradient(circle at 82% 12%, rgba(216, 185, 114, 0.22), transparent 22%),
    linear-gradient(180deg, #f7fcf8 0%, #e7f5ef 46%, #d7ece8 100%);
  box-shadow: 0 28px 72px rgba(42, 101, 101, 0.22);
  color: #173d42;
}

.poster-card__halo,
.poster-card__cloud-band,
.poster-card__mountains,
.poster-card__border,
.poster-card__gold-trace {
  position: absolute;
  pointer-events: none;
}

.poster-card__halo {
  width: 340px;
  height: 340px;
  border-radius: 999px;
  filter: blur(40px);
  animation: poster-halo-breathe 7s ease-in-out infinite;
}

.poster-card__halo--top {
  top: -80px;
  right: -60px;
  background: rgba(216, 185, 114, 0.18);
}

.poster-card__halo--bottom {
  bottom: 160px;
  left: -100px;
  background: rgba(139, 208, 203, 0.16);
  animation-delay: -2.4s;
}

.poster-card__cloud-band {
  inset: 140px 68px auto;
  height: 190px;
  border-radius: 999px;
  background:
    radial-gradient(circle at 12% 52%, rgba(255, 255, 255, 0.16), transparent 22%),
    radial-gradient(circle at 38% 44%, rgba(255, 255, 255, 0.12), transparent 18%),
    radial-gradient(circle at 62% 58%, rgba(255, 255, 255, 0.14), transparent 20%),
    radial-gradient(circle at 88% 46%, rgba(255, 255, 255, 0.1), transparent 18%);
  filter: blur(26px);
  opacity: 0.7;
  animation: poster-cloud-drift 10s ease-in-out infinite;
}

.poster-card__mountains {
  inset: auto 0 0 0;
  height: 20%;
  background:
    linear-gradient(155deg, transparent 0 18%, rgba(4, 17, 25, 0.95) 18% 100%),
    linear-gradient(24deg, transparent 0 22%, rgba(8, 27, 36, 0.98) 22% 100%),
    linear-gradient(180deg, transparent 0 22%, rgba(2, 11, 17, 0.94) 22% 100%);
  clip-path: polygon(0 100%, 0 72%, 12% 54%, 28% 76%, 47% 38%, 64% 82%, 82% 46%, 100% 74%, 100% 100%);
  opacity: 0.92;
}

.poster-card__border {
  inset: 22px;
  border: 1px solid rgba(216, 185, 114, 0.16);
  border-radius: 28px;
}

.poster-card__gold-trace {
  width: 1px;
  background: linear-gradient(180deg, rgba(216, 185, 114, 0), rgba(216, 185, 114, 0.68), rgba(216, 185, 114, 0));
  opacity: 0.5;
}

.poster-card__gold-trace--left {
  top: 120px;
  bottom: 220px;
  left: 54px;
}

.poster-card__gold-trace--right {
  top: 170px;
  bottom: 180px;
  right: 54px;
}

.poster-card__content {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto auto;
  gap: 24px;
  height: 100%;
  padding: 42px 42px 38px;
}

.poster-card__masthead {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}

.poster-card__title-block {
  display: grid;
  gap: 12px;
  max-width: 620px;
}

.poster-card__eyebrow,
.poster-card__title,
.poster-card__subtitle,
.poster-card__message,
.poster-card__motto,
.poster-card__section-label,
.poster-card__story-title,
.poster-card__story-copy,
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
  font-size: clamp(60px, 8.2vw, 96px);
  line-height: 1.02;
  letter-spacing: 0.04em;
}

.poster-card__subtitle {
  font-size: 18px;
  line-height: 1.8;
  color: rgba(35, 83, 86, 0.72);
}

.poster-card__seal-panel {
  display: grid;
  justify-items: center;
  gap: 10px;
}

.poster-card__seal {
  display: grid;
  width: 118px;
  height: 118px;
  place-items: center;
  border: 1px solid rgba(216, 185, 114, 0.42);
  border-radius: 999px;
  background:
    radial-gradient(circle at 34% 30%, rgba(216, 185, 114, 0.32), transparent 30%),
    linear-gradient(160deg, rgba(12, 44, 58, 0.94), rgba(6, 20, 28, 0.98));
  color: #1c5558;
  font-size: 28px;
  letter-spacing: 0.14em;
  box-shadow:
    inset 0 0 0 10px rgba(216, 185, 114, 0.08),
    0 18px 36px rgba(0, 0, 0, 0.24);
  animation: poster-seal-float 6s ease-in-out infinite;
}

.poster-card__hero {
  display: grid;
  grid-template-columns: minmax(0, 1.24fr) minmax(260px, 0.76fr);
  gap: 22px;
  min-height: 0;
}

.poster-card__scroll {
  position: relative;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 24px;
  min-height: 0;
  padding: 34px 34px 30px;
  border-radius: 30px;
  background:
    linear-gradient(180deg, rgba(247, 239, 219, 0.96), rgba(229, 212, 176, 0.94)),
    rgba(247, 239, 219, 0.94);
  color: #173241;
  box-shadow:
    inset 0 0 0 1px rgba(165, 123, 52, 0.18),
    0 24px 44px rgba(0, 0, 0, 0.18);
}

.poster-card__scroll::before,
.poster-card__scroll::after {
  content: '';
  position: absolute;
  top: 26px;
  bottom: 26px;
  width: 10px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(184, 145, 74, 0.62), rgba(109, 76, 24, 0.2));
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

.poster-card__scroll-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, rgba(151, 98, 31, 0.56), rgba(151, 98, 31, 0));
}

.poster-card__message {
  align-self: center;
  font-size: clamp(30px, 4.4vw, 52px);
  line-height: 1.78;
  color: #173241;
  white-space: pre-wrap;
}

.poster-card__scroll-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.poster-card__motto {
  color: rgba(151, 98, 31, 0.96);
  font-size: 17px;
  letter-spacing: 0.08em;
}

.poster-card__scroll-seal {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid rgba(151, 98, 31, 0.16);
  color: rgba(151, 98, 31, 0.92);
  font-size: 14px;
  letter-spacing: 0.08em;
}

.poster-card__hero-side {
  display: grid;
  grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
  gap: 18px;
}

.poster-card__side-card {
  display: grid;
  gap: 18px;
  padding: 24px 22px;
  border-radius: 28px;
  border: 1px solid rgba(216, 185, 114, 0.18);
  background:
    linear-gradient(180deg, rgba(247, 252, 248, 0.9), rgba(222, 242, 236, 0.94)),
    rgba(236, 248, 244, 0.72);
  backdrop-filter: blur(10px);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.62), 0 16px 36px rgba(42, 101, 101, 0.12);
}

.poster-card__credo-list {
  display: grid;
  gap: 12px;
}

.poster-card__credo-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 62px;
  padding: 0 16px;
  border: 1px solid rgba(216, 185, 114, 0.18);
  border-radius: 999px;
  background: rgba(229, 246, 240, 0.78);
  color: #1c5558;
  font-size: 17px;
  letter-spacing: 0.06em;
  text-align: center;
}

.poster-card__side-card--ornament {
  justify-items: center;
  align-content: center;
  text-align: center;
}

.poster-card__ornament {
  position: relative;
  display: grid;
  width: 188px;
  height: 188px;
  place-items: center;
}

.poster-card__ornament-ring,
.poster-card__ornament-core {
  position: absolute;
  border-radius: 999px;
}

.poster-card__ornament-ring {
  inset: 0;
  border: 1px solid rgba(216, 185, 114, 0.28);
  box-shadow: inset 0 0 0 12px rgba(216, 185, 114, 0.04);
  animation: poster-ring-spin 15s linear infinite;
}

.poster-card__ornament-ring--inner {
  inset: 22px;
  border-color: rgba(139, 208, 203, 0.18);
  animation-direction: reverse;
  animation-duration: 10s;
}

.poster-card__ornament-core {
  inset: 48px;
  background:
    radial-gradient(circle at 38% 32%, rgba(216, 185, 114, 0.38), transparent 34%),
    linear-gradient(180deg, rgba(238, 249, 245, 0.96), rgba(199, 231, 226, 0.98));
  border: 1px solid rgba(139, 208, 203, 0.18);
}

.poster-card__ornament-title {
  margin: 0;
  color: #1c5558;
  font-size: 24px;
  letter-spacing: 0.16em;
}

.poster-card__ornament-copy {
  margin: 0;
  color: rgba(35, 83, 86, 0.74);
  font-size: 15px;
  line-height: 1.9;
}

.poster-card__story {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 220px;
  gap: 20px;
}

.poster-card__story-main {
  display: grid;
  gap: 12px;
  padding: 24px 26px;
  border-radius: 26px;
  border: 1px solid rgba(139, 208, 203, 0.14);
  background: rgba(239, 249, 246, 0.72);
}

.poster-card__story-title {
  color: #173d42;
  font-size: 29px;
  line-height: 1.65;
}

.poster-card__story-copy {
  color: rgba(35, 83, 86, 0.72);
  font-size: 16px;
  line-height: 1.9;
}

.poster-card__story-side {
  display: grid;
  gap: 14px;
  align-content: center;
}

.poster-card__story-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 54px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(216, 185, 114, 0.2);
  background: rgba(229, 246, 240, 0.78);
  color: rgba(216, 185, 114, 0.96);
  font-size: 15px;
  letter-spacing: 0.1em;
}

.poster-card__footer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 292px;
  gap: 20px;
  align-items: stretch;
}

.poster-card__footer-left {
  display: grid;
  gap: 16px;
}

.poster-card__signature-group {
  display: grid;
  gap: 12px;
}

.poster-card__signature-line {
  width: 100%;
  height: 1px;
  background: linear-gradient(90deg, rgba(216, 185, 114, 0.5), rgba(216, 185, 114, 0.02));
}

.poster-card__signature {
  color: rgba(35, 83, 86, 0.72);
  font-size: 17px;
}

.poster-card__url-strip {
  display: grid;
  gap: 10px;
  padding: 18px 20px;
  border-radius: 24px;
  border: 1px solid rgba(216, 185, 114, 0.16);
  background:
    linear-gradient(180deg, rgba(248, 253, 249, 0.92), rgba(224, 243, 237, 0.96)),
    rgba(236, 248, 244, 0.76);
}

.poster-card__url-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.poster-card__url-label {
  color: rgba(216, 185, 114, 0.96);
  font-size: 16px;
  letter-spacing: 0.14em;
}

.poster-card__url-tip {
  color: rgba(54, 116, 116, 0.7);
  font-size: 13px;
}

.poster-card__url-text {
  margin: 0;
  color: rgba(35, 83, 86, 0.82);
  font-size: 15px;
  line-height: 1.8;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.poster-card__qr-panel {
  display: grid;
  gap: 16px;
  align-content: center;
  padding: 18px;
  border: 1px solid rgba(216, 185, 114, 0.22);
  border-radius: 28px;
  background: rgba(239, 249, 246, 0.84);
  backdrop-filter: blur(12px);
}

.poster-card__qr-shell {
  display: grid;
  width: 138px;
  height: 138px;
  place-items: center;
  padding: 8px;
  border-radius: 22px;
  background: rgba(244, 239, 226, 0.96);
  box-shadow: inset 0 0 0 1px rgba(216, 185, 114, 0.18);
}

.poster-card__qr-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 12px;
}

.poster-card__qr-placeholder {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  border-radius: 12px;
  background:
    linear-gradient(135deg, rgba(232, 247, 241, 0.95), rgba(202, 231, 226, 0.98)),
    #d8eee8;
  color: #173d42;
  font-size: 34px;
  letter-spacing: 0.26em;
}

.poster-card__qr-copy {
  display: grid;
  gap: 8px;
}

.poster-card__qr-copy strong {
  color: rgba(216, 185, 114, 0.96);
  font-size: 28px;
  line-height: 1.2;
}

.poster-card__qr-copy span {
  color: rgba(35, 83, 86, 0.72);
  font-size: 16px;
  line-height: 1.8;
}

.poster-card--reduced,
.poster-card--reduced * {
  transition: none !important;
  animation: none !important;
}

@keyframes poster-halo-breathe {
  0%,
  100% {
    opacity: 0.38;
    transform: scale(0.96);
  }

  50% {
    opacity: 0.72;
    transform: scale(1.04);
  }
}

@keyframes poster-cloud-drift {
  0%,
  100% {
    transform: translate3d(0, 0, 0);
  }

  50% {
    transform: translate3d(18px, -10px, 0);
  }
}

@keyframes poster-seal-float {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-8px);
  }
}

@keyframes poster-ring-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>
