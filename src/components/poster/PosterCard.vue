<script setup lang="ts">
import { computed } from 'vue'

/**
 * 组件入参类型
 * 用途：约束普通分享海报需要接收的全部展示内容
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
  title: '云中同道',
  message: '愿你入人间烟火，仍守心上一寸清明；佩玉入云，自有同道相逢。',
  headline: '云栖玉佩帖',
  subtitle: '一纸入云栖 · 同道共此心',
  signature: '云栖派山门',
  qrCodeUrl: '',
  qrLabel: '扫码入山门',
  qrHint: '云栖首页引路',
  reduceMotion: false,
})

/** 用途：海报中固定展示的江湖信条，帮助画面形成门派气质。 */
const creedList = ['心随云闲', '身自安然', '以诚为先', '来去随缘']

/**
 * 清洗短文本
 * 用途：把用户输入整理成可安全展示的短句
 * 入参：value 为原始文本，fallback 为兜底文本
 * 返回值：返回去掉空格后的文本，空值时返回兜底文本
 */
function normalizeText(value: string | undefined, fallback: string): string {
  // 这里处理空输入，避免海报出现空白标题。
  return value?.trim() || fallback
}

/** 用途：展示用称呼，空值时使用默认江湖称呼。 */
const displayTitle = computed<string>(() => normalizeText(props.title, '云中同道'))

/** 用途：展示用寄语，空值时使用新版江湖风格文案。 */
const displayMessage = computed<string>(() => normalizeText(props.message, '愿你入人间烟火，仍守心上一寸清明；佩玉入云，自有同道相逢。'))

/** 用途：展示用主标题，空值时使用新版玉佩帖标题。 */
const displayHeadline = computed<string>(() => normalizeText(props.headline, '云栖玉佩帖'))

/** 用途：展示用副标题，空值时使用新版入山文案。 */
const displaySubtitle = computed<string>(() => normalizeText(props.subtitle, '一纸入云栖 · 同道共此心'))

/** 用途：展示用二维码提示，空值时说明扫码去向。 */
const displayQrHint = computed<string>(() => normalizeText(props.qrHint, '云栖首页引路'))

/** 用途：展示用落款，空值时使用山门落款。 */
const displaySignature = computed<string>(() => normalizeText(props.signature, '云栖派山门'))
</script>

<template>
  <article class="poster-card" :class="{ 'poster-card--reduced': reduceMotion }" aria-label="云栖玉佩帖海报预览">
    <div class="poster-card__paper-texture" aria-hidden="true" />
    <div class="poster-card__ink-mountain poster-card__ink-mountain--back" aria-hidden="true" />
    <div class="poster-card__ink-mountain poster-card__ink-mountain--front" aria-hidden="true" />
    <div class="poster-card__mist poster-card__mist--top" aria-hidden="true" />
    <div class="poster-card__mist poster-card__mist--bottom" aria-hidden="true" />
    <div class="poster-card__gold-border" aria-hidden="true" />

    <div class="poster-card__content">
      <header class="poster-card__header">
        <div class="poster-card__title-block">
          <p class="poster-card__eyebrow">{{ displayHeadline }}</p>
          <h3 class="poster-card__title">{{ displayTitle }}</h3>
          <p class="poster-card__subtitle">{{ displaySubtitle }}</p>
        </div>

        <div class="poster-card__seal">
          <img src="/images/yunqi-logo.png" alt="云栖派标识" />
          <span>云栖佩</span>
        </div>
      </header>

      <section class="poster-card__edict">
        <div class="poster-card__edict-side" aria-hidden="true">佩</div>
        <div class="poster-card__edict-main">
          <p class="poster-card__section-label">江湖题赠</p>
          <p class="poster-card__message">“{{ displayMessage }}”</p>
          <p class="poster-card__motto">佩玉入云，真诚同行。</p>
        </div>
      </section>

      <section class="poster-card__creed-row" aria-label="云栖信条">
        <span v-for="item in creedList" :key="item" class="poster-card__creed-item">{{ item }}</span>
      </section>

      <footer class="poster-card__footer">
        <div class="poster-card__signature">
          <span>{{ displaySignature }}</span>
          <small>水墨侠气新版海报</small>
        </div>

        <div class="poster-card__qr-panel">
          <div class="poster-card__qr-box">
            <img v-if="qrCodeUrl" :src="qrCodeUrl" alt="云栖派二维码" />
            <span v-else>栖</span>
          </div>
          <div class="poster-card__qr-copy">
            <strong>{{ qrLabel }}</strong>
            <span>{{ displayQrHint }}</span>
          </div>
        </div>
      </footer>
    </div>
  </article>
</template>

<style scoped>
.poster-card {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 34px;
  color: #17342f;
  background:
    radial-gradient(circle at 16% 10%, rgba(15, 111, 102, 0.16), transparent 23%),
    radial-gradient(circle at 86% 18%, rgba(112, 158, 147, 0.24), transparent 24%),
    linear-gradient(145deg, #edf7f3 0%, #d6e9e2 48%, #a9cdc2 100%);
  box-shadow: 0 30px 72px rgba(13, 10, 6, 0.34);
}

.poster-card__paper-texture,
.poster-card__ink-mountain,
.poster-card__mist,
.poster-card__gold-border {
  position: absolute;
  pointer-events: none;
}

.poster-card__paper-texture {
  inset: 0;
  background:
    linear-gradient(90deg, rgba(23, 52, 47, 0.05) 1px, transparent 1px),
    linear-gradient(0deg, rgba(23, 52, 47, 0.04) 1px, transparent 1px),
    radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.34), transparent 18%),
    radial-gradient(circle at 78% 74%, rgba(79, 50, 24, 0.10), transparent 22%);
  background-size: 36px 36px, 42px 42px, auto, auto;
  mix-blend-mode: multiply;
  opacity: 0.56;
}

.poster-card__ink-mountain {
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0.82;
}

.poster-card__ink-mountain--back {
  height: 34%;
  background: linear-gradient(180deg, rgba(23, 52, 47, 0), rgba(23, 52, 47, 0.34));
  clip-path: polygon(0 100%, 0 62%, 13% 42%, 30% 68%, 46% 28%, 64% 66%, 80% 36%, 100% 64%, 100% 100%);
}

.poster-card__ink-mountain--front {
  height: 24%;
  background: linear-gradient(180deg, rgba(16, 37, 31, 0), rgba(16, 37, 31, 0.74));
  clip-path: polygon(0 100%, 0 70%, 18% 46%, 36% 74%, 54% 38%, 74% 78%, 90% 52%, 100% 72%, 100% 100%);
}

.poster-card__mist {
  width: 420px;
  height: 120px;
  border-radius: 999px;
  background: rgba(244, 251, 247, 0.42);
  filter: blur(22px);
  animation: poster-card-mist 8s ease-in-out infinite;
}

.poster-card__mist--top {
  top: 170px;
  left: -70px;
}

.poster-card__mist--bottom {
  right: -80px;
  bottom: 240px;
  animation-delay: -3s;
}

.poster-card__gold-border {
  inset: 26px;
  border: 2px solid rgba(62, 111, 101, 0.45);
  border-radius: 28px;
  box-shadow: inset 0 0 0 1px rgba(244, 251, 247, 0.45);
}

.poster-card__content {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: auto 1fr auto auto;
  gap: 26px;
  height: 100%;
  padding: 58px 58px 46px;
}

.poster-card__header,
.poster-card__footer {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}

.poster-card__title-block,
.poster-card__edict-main,
.poster-card__signature,
.poster-card__qr-copy {
  display: grid;
  gap: 10px;
}

.poster-card__eyebrow,
.poster-card__subtitle,
.poster-card__section-label,
.poster-card__motto,
.poster-card__signature small,
.poster-card__qr-copy span {
  margin: 0;
  color: rgba(23, 52, 47, 0.72);
  letter-spacing: 0.12em;
}

.poster-card__eyebrow,
.poster-card__section-label {
  font-size: 28px;
  font-weight: 800;
  color: #0f6f66;
}

.poster-card__title {
  margin: 0;
  font-size: 92px;
  line-height: 1.04;
  letter-spacing: 0.08em;
  color: #10251f;
  text-shadow: 0 4px 0 rgba(244, 251, 247, 0.48);
}

.poster-card__subtitle {
  font-size: 28px;
}

.poster-card__seal {
  display: grid;
  place-items: center;
  gap: 8px;
  width: 150px;
  height: 170px;
  border: 2px solid rgba(15, 111, 102, 0.55);
  border-radius: 26px;
  color: #0f6f66;
  background: rgba(255, 246, 229, 0.44);
  transform: rotate(4deg);
}

.poster-card__seal img {
  width: 82px;
  height: 82px;
  object-fit: contain;
}

.poster-card__seal span {
  font-size: 22px;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.poster-card__edict {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr);
  gap: 28px;
  align-items: stretch;
  min-height: 0;
  padding: 34px;
  border: 1px solid rgba(62, 111, 101, 0.34);
  border-radius: 34px;
  background: rgba(244, 251, 247, 0.62);
  box-shadow: inset 0 0 40px rgba(23, 52, 47, 0.08);
}

.poster-card__edict-side {
  display: grid;
  place-items: center;
  border-radius: 999px;
  color: #edf7f3;
  background: linear-gradient(180deg, #0f6f66, #0b4f49);
  font-size: 72px;
  font-weight: 900;
  writing-mode: vertical-rl;
}

.poster-card__message {
  margin: 0;
  font-size: 54px;
  line-height: 1.42;
  font-weight: 900;
  color: #17342f;
}

.poster-card__motto {
  align-self: end;
  font-size: 24px;
}

.poster-card__creed-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.poster-card__creed-item {
  display: grid;
  place-items: center;
  min-height: 76px;
  border: 1px solid rgba(62, 111, 101, 0.34);
  border-radius: 999px;
  color: #21443d;
  background: rgba(244, 251, 247, 0.54);
  font-size: 24px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.poster-card__signature span {
  color: #17342f;
  font-size: 28px;
  font-weight: 900;
}

.poster-card__signature small,
.poster-card__qr-copy span {
  font-size: 18px;
}

.poster-card__qr-panel {
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 18px;
  align-items: center;
  max-width: 390px;
  padding: 18px;
  border-radius: 26px;
  background: rgba(244, 251, 247, 0.66);
  border: 1px solid rgba(62, 111, 101, 0.34);
}

.poster-card__qr-box {
  display: grid;
  place-items: center;
  width: 150px;
  height: 150px;
  border-radius: 22px;
  background: #f4fbf7;
  color: #0f6f66;
  font-size: 62px;
  font-weight: 900;
}

.poster-card__qr-box img {
  width: 128px;
  height: 128px;
  object-fit: contain;
}

.poster-card__qr-copy strong {
  color: #10251f;
  font-size: 26px;
}

@keyframes poster-card-mist {
  0%, 100% { transform: translateX(0); opacity: 0.42; }
  50% { transform: translateX(46px); opacity: 0.7; }
}

.poster-card--reduced,
.poster-card--reduced * {
  animation: none !important;
  transition: none !important;
}
</style>

