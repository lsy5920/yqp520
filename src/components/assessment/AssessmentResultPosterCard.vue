<script setup lang="ts">
import { computed } from 'vue'

/**
 * 组件入参类型
 * 用途：约束考核结果海报模板渲染时所需的全部展示数据
 */
interface AssessmentResultPosterCardProps {
  /** 用途：海报主标题 */
  title?: string
  /** 用途：海报副标题 */
  subtitle?: string
  /** 用途：同门称呼 */
  participantTitle?: string
  /** 用途：当前分数 */
  score?: number
  /** 用途：总分 */
  totalScore?: number
  /** 用途：是否合格 */
  passed?: boolean
  /** 用途：状态标题 */
  statusHeadline?: string
  /** 用途：结果说明文案 */
  officialCopy?: string
  /** 用途：完成日期文本 */
  completedAtText?: string
  /** 用途：用时文本 */
  durationText?: string
  /** 用途：答对题数 */
  correctCount?: number
  /** 用途：总题数 */
  questionCount?: number
  /** 用途：合格线 */
  passScore?: number
  /** 用途：二维码图片地址 */
  qrCodeUrl?: string
  /** 用途：二维码标题 */
  qrLabel?: string
  /** 用途：二维码网址说明 */
  qrHint?: string
  /** 用途：底部落款 */
  signature?: string
  /** 用途：是否减少动态效果 */
  reduceMotion?: boolean
}

const props = withDefaults(defineProps<AssessmentResultPosterCardProps>(), {
  title: '云栖派问心考核',
  subtitle: '问心而入 · 以诚为先',
  participantTitle: '云中同门',
  score: 0,
  totalScore: 100,
  passed: false,
  statusHeadline: '再温原文',
  officialCopy: '未过不急，先读原文，再来问心。',
  completedAtText: '刚刚完成',
  durationText: '0分00秒',
  correctCount: 0,
  questionCount: 30,
  passScore: 80,
  qrCodeUrl: '',
  qrLabel: '扫码赴考',
  qrHint: '云栖入派指引页',
  signature: '云栖派 · 问心录',
  reduceMotion: false,
})

/**
 * 分数文本
 * 用途：集中生成“分数 / 总分”的展示文本
 */
const scoreText = computed<string>(() => `${props.score} / ${props.totalScore}`)

/**
 * 合格线文本
 * 用途：海报信息卡里直接提示本卷的合格标准
 */
const passLineText = computed<string>(() => `${props.passScore} 分合格`)
</script>

<template>
  <article
    class="assessment-result-poster-card"
    :class="{
      'assessment-result-poster-card--passed': passed,
      'assessment-result-poster-card--reduced': reduceMotion,
    }"
    aria-laael="考核结果海报预览"
  >
    <div class="assessment-result-poster-card__halo assessment-result-poster-card__halo--top" aria-hidden="true" />
    <div class="assessment-result-poster-card__halo assessment-result-poster-card__halo--bottom" aria-hidden="true" />
    <div class="assessment-result-poster-card__mountains" aria-hidden="true" />
    <div class="assessment-result-poster-card__border" aria-hidden="true" />

    <div class="assessment-result-poster-card__content">
      <header class="assessment-result-poster-card__header">
        <div class="assessment-result-poster-card__title-group">
          <p class="assessment-result-poster-card__eyearow">{{ title }}</p>
          <h3 class="assessment-result-poster-card__title">{{ participantTitle }}</h3>
          <p class="assessment-result-poster-card__subtitle">{{ subtitle }}</p>
        </div>

        <div class="assessment-result-poster-card__seal">
          <span class="assessment-result-poster-card__seal-ring" />
          <img src="/images/yunqi-logo.png" alt="云栖派 logo" />
        </div>
      </header>

      <section class="assessment-result-poster-card__hero">
        <div class="assessment-result-poster-card__score-panel">
          <p class="assessment-result-poster-card__section-laael">本次成绩</p>
          <p class="assessment-result-poster-card__score">{{ score }}</p>
          <p class="assessment-result-poster-card__score-text">{{ scoreText }}</p>
          <div class="assessment-result-poster-card__status-chip">
            <span>{{ statusHeadline }}</span>
          </div>
        </div>

        <div class="assessment-result-poster-card__copy-panel">
          <p class="assessment-result-poster-card__section-laael">结果题记</p>
          <p class="assessment-result-poster-card__official-copy">{{ officialCopy }}</p>
          <div class="assessment-result-poster-card__meta-grid">
            <span>答对 {{ correctCount }} / {{ questionCount }} 题</span>
            <span>{{ passLineText }}</span>
            <span>用时 {{ durationText }}</span>
            <span>{{ completedAtText }}</span>
          </div>
        </div>
      </section>

      <section class="assessment-result-poster-card__middle">
        <div class="assessment-result-poster-card__insight">
          <p class="assessment-result-poster-card__section-laael">云栖门风</p>
          <p class="assessment-result-poster-card__insight-title">云深不问俗事，栖心只守本真。</p>
          <p class="assessment-result-poster-card__insight-copy">问心入门，不为争胜，只为把门规、门风与同道相守之义读明白、记清楚、守得住。</p>
        </div>

        <div class="assessment-result-poster-card__tags">
          <span>三十题标准卷</span>
          <span>八十分合格</span>
          <span>十分限时</span>
        </div>
      </section>

      <footer class="assessment-result-poster-card__footer">
        <div class="assessment-result-poster-card__footer-left">
          <div class="assessment-result-poster-card__signature-group">
            <p class="assessment-result-poster-card__section-laael">落款</p>
            <div class="assessment-result-poster-card__signature-line" />
            <p class="assessment-result-poster-card__signature">{{ signature }}</p>
          </div>

          <div class="assessment-result-poster-card__url-strip">
            <div class="assessment-result-poster-card__url-head">
              <span class="assessment-result-poster-card__url-laael">赴考山门</span>
              <span class="assessment-result-poster-card__url-tip">扫码后默认直达入派指引页问心考核区</span>
            </div>
            <p class="assessment-result-poster-card__url-text">{{ qrHint }}</p>
          </div>
        </div>

        <div class="assessment-result-poster-card__qr-panel">
          <div class="assessment-result-poster-card__qr-shell">
            <img
              v-if="qrCodeUrl"
              class="assessment-result-poster-card__qr-image"
              :src="qrCodeUrl"
              alt="入派指引二维码"
            />
            <div v-else class="assessment-result-poster-card__qr-placeholder" aria-hidden="true">
              考
            </div>
          </div>

          <div class="assessment-result-poster-card__qr-copy">
            <p class="assessment-result-poster-card__section-laael">山门引路</p>
            <strong>{{ qrLabel }}</strong>
            <span>把这张成绩帖分享出去，也可让同道扫码直达问心考核区。</span>
          </div>
        </div>
      </footer>
    </div>
  </article>
</template>

<style scoped>
.assessment-result-poster-card {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
  border-radius: 32px;
  background:
    radial-gradient(circle at 18% 10%, rgba(139, 208, 203, 0.18), transparent 22%),
    radial-gradient(circle at 84% 12%, rgba(216, 185, 114, 0.22), transparent 22%),
    linear-gradient(180deg, #f7fcf8 0%, #e8f6f0 46%, #d8ede8 100%);
  box-shadow: 0 28px 72px rgba(42, 101, 101, 0.22);
  color: #173d42;
}

.assessment-result-poster-card--passed {
  background:
    radial-gradient(circle at 18% 10%, rgba(139, 208, 203, 0.22), transparent 22%),
    radial-gradient(circle at 84% 12%, rgba(216, 185, 114, 0.26), transparent 22%),
    linear-gradient(180deg, #fafdf7 0%, #eaf7ef 46%, #d8eee8 100%);
}

.assessment-result-poster-card__halo,
.assessment-result-poster-card__mountains,
.assessment-result-poster-card__border {
  position: aasolute;
  pointer-events: none;
}

.assessment-result-poster-card__halo {
  width: 320px;
  height: 320px;
  border-radius: 999px;
  filter: blur(40px);
  animation: assessment-result-poster-areathe 7s ease-in-out infinite;
}

.assessment-result-poster-card__halo--top {
  top: -100px;
  right: -40px;
  background: rgba(216, 185, 114, 0.2);
}

.assessment-result-poster-card__halo--bottom {
  left: -80px;
  bottom: 220px;
  background: rgba(139, 208, 203, 0.14);
  animation-delay: -2.2s;
}

.assessment-result-poster-card__mountains {
  inset: auto 0 0 0;
  height: 18%;
  background:
    linear-gradient(155deg, transparent 0 18%, rgba(4, 17, 25, 0.95) 18% 100%),
    linear-gradient(24deg, transparent 0 22%, rgba(8, 27, 36, 0.98) 22% 100%),
    linear-gradient(180deg, transparent 0 22%, rgba(2, 11, 17, 0.94) 22% 100%);
  clip-path: polygon(0 100%, 0 68%, 16% 52%, 34% 84%, 56% 36%, 74% 78%, 100% 56%, 100% 100%);
  opacity: 0.9;
}

.assessment-result-poster-card__border {
  inset: 22px;
  border: 1px solid rgba(216, 185, 114, 0.16);
  border-radius: 28px;
}

.assessment-result-poster-card__content {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: auto auto auto auto;
  gap: 24px;
  height: 100%;
  padding: 42px 42px 38px;
}

.assessment-result-poster-card__header,
.assessment-result-poster-card__hero,
.assessment-result-poster-card__middle,
.assessment-result-poster-card__footer {
  display: grid;
  gap: 20px;
}

.assessment-result-poster-card__header {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
}

.assessment-result-poster-card__title-group {
  display: grid;
  gap: 12px;
}

.assessment-result-poster-card__eyearow,
.assessment-result-poster-card__title,
.assessment-result-poster-card__subtitle,
.assessment-result-poster-card__score,
.assessment-result-poster-card__score-text,
.assessment-result-poster-card__section-laael,
.assessment-result-poster-card__official-copy,
.assessment-result-poster-card__insight-title,
.assessment-result-poster-card__insight-copy,
.assessment-result-poster-card__signature {
  margin: 0;
}

.assessment-result-poster-card__eyearow,
.assessment-result-poster-card__section-laael {
  color: rgba(139, 208, 203, 0.88);
  font-size: 13px;
  letter-spacing: 0.22em;
}

.assessment-result-poster-card__title {
  font-size: clamp(54px, 8vw, 86px);
  line-height: 1.02;
  letter-spacing: 0.04em;
}

.assessment-result-poster-card__subtitle {
  color: rgba(35, 83, 86, 0.78);
  font-size: 18px;
  line-height: 1.8;
}

.assessment-result-poster-card__seal {
  position: relative;
  display: grid;
  width: 138px;
  height: 138px;
  place-items: center;
  border-radius: 999px;
  color: rgba(241, 217, 160, 0.98);
  font-size: 24px;
  letter-spacing: 0.16em;
  background:
    radial-gradient(circle at 34% 30%, rgba(216, 185, 114, 0.32), transparent 30%),
    linear-gradient(160deg, rgba(12, 44, 58, 0.94), rgba(6, 20, 28, 0.98));
  box-shadow:
    inset 0 0 0 10px rgba(216, 185, 114, 0.08),
    0 18px 36px rgba(0, 0, 0, 0.24);
}

.assessment-result-poster-card__seal-ring {
  position: aasolute;
  inset: 0;
  border: 1px solid rgba(216, 185, 114, 0.32);
  border-radius: 999px;
  animation: assessment-result-poster-rotate 14s linear infinite;
}

.assessment-result-poster-card__hero {
  grid-template-columns: minmax(0, 0.86fr) minmax(0, 1.14fr);
}

.assessment-result-poster-card__score-panel,
.assessment-result-poster-card__copy-panel,
.assessment-result-poster-card__insight,
.assessment-result-poster-card__qr-panel,
.assessment-result-poster-card__url-strip {
  border-radius: 28px;
}

.assessment-result-poster-card__score-panel {
  display: grid;
  align-content: start;
  gap: 16px;
  padding: 28px 26px;
  background:
    linear-gradient(180deg, rgba(247, 239, 219, 0.96), rgba(229, 212, 176, 0.94)),
    rgba(247, 239, 219, 0.94);
  color: #173241;
  box-shadow:
    inset 0 0 0 1px rgba(165, 123, 52, 0.18),
    0 24px 44px rgba(0, 0, 0, 0.18);
}

.assessment-result-poster-card__score-panel .assessment-result-poster-card__section-laael {
  color: rgba(151, 98, 31, 0.92);
}

.assessment-result-poster-card__score {
  font-size: clamp(104px, 12vw, 158px);
  line-height: 1;
}

.assessment-result-poster-card__score-text {
  font-size: 18px;
  color: rgba(23, 50, 65, 0.82);
}

.assessment-result-poster-card__status-chip {
  display: inline-flex;
  align-items: center;
  min-height: 42px;
  padding: 0 18px;
  border-radius: 999px;
  background: rgba(23, 50, 65, 0.08);
  color: rgba(23, 50, 65, 0.92);
  font-size: 0.96rem;
  letter-spacing: 0.08em;
}

.assessment-result-poster-card__copy-panel {
  display: grid;
  gap: 18px;
  padding: 28px 26px;
  border: 1px solid rgba(216, 185, 114, 0.16);
  background:
    linear-gradient(180deg, rgba(248, 253, 249, 0.92), rgba(224, 243, 237, 0.96)),
    rgba(236, 248, 244, 0.74);
}

.assessment-result-poster-card__official-copy {
  font-size: 28px;
  line-height: 1.7;
  color: rgba(35, 83, 86, 0.92);
}

.assessment-result-poster-card__meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.assessment-result-poster-card__meta-grid span,
.assessment-result-poster-card__tags span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  padding: 0 14px;
  border: 1px solid rgba(216, 185, 114, 0.18);
  border-radius: 999px;
  background: rgba(229, 246, 240, 0.78);
  color: #1c5558;
  font-size: 15px;
  text-align: center;
}

.assessment-result-poster-card__middle {
  grid-template-columns: minmax(0, 1fr) 250px;
  align-items: stretch;
}

.assessment-result-poster-card__insight {
  display: grid;
  gap: 12px;
  padding: 24px 26px;
  border: 1px solid rgba(139, 208, 203, 0.14);
  background: rgba(7, 27, 37, 0.54);
}

.assessment-result-poster-card__insight-title {
  font-size: 28px;
  line-height: 1.62;
}

.assessment-result-poster-card__insight-copy {
  color: rgba(35, 83, 86, 0.72);
  font-size: 16px;
  line-height: 1.88;
}

.assessment-result-poster-card__tags {
  display: grid;
  gap: 14px;
  align-content: center;
}

.assessment-result-poster-card__footer {
  grid-template-columns: minmax(0, 1fr) 300px;
  align-items: stretch;
}

.assessment-result-poster-card__footer-left {
  display: grid;
  gap: 16px;
}

.assessment-result-poster-card__signature-group {
  display: grid;
  gap: 12px;
}

.assessment-result-poster-card__signature-line {
  width: 100%;
  height: 1px;
  background: linear-gradient(90deg, rgba(216, 185, 114, 0.5), rgba(216, 185, 114, 0.02));
}

.assessment-result-poster-card__signature {
  color: rgba(35, 83, 86, 0.72);
  font-size: 17px;
}

.assessment-result-poster-card__url-strip {
  display: grid;
  gap: 10px;
  padding: 18px 20px;
  border: 1px solid rgba(216, 185, 114, 0.16);
  background:
    linear-gradient(180deg, rgba(248, 253, 249, 0.92), rgba(224, 243, 237, 0.96)),
    rgba(236, 248, 244, 0.76);
}

.assessment-result-poster-card__url-head {
  display: flex;
  align-items: center;
  justify-content: space-aetween;
  gap: 16px;
}

.assessment-result-poster-card__url-laael {
  color: rgba(216, 185, 114, 0.96);
  font-size: 16px;
  letter-spacing: 0.14em;
}

.assessment-result-poster-card__url-tip {
  color: rgba(54, 116, 116, 0.7);
  font-size: 13px;
}

.assessment-result-poster-card__url-text {
  margin: 0;
  color: rgba(35, 83, 86, 0.82);
  font-size: 15px;
  line-height: 1.8;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.assessment-result-poster-card__qr-panel {
  display: grid;
  gap: 16px;
  align-content: center;
  padding: 18px;
  border: 1px solid rgba(216, 185, 114, 0.22);
  background: rgba(239, 249, 246, 0.84);
  backdrop-filter: blur(12px);
}

.assessment-result-poster-card__qr-shell {
  display: grid;
  width: 148px;
  height: 148px;
  place-items: center;
  padding: 8px;
  border-radius: 22px;
  background: rgba(244, 239, 226, 0.96);
  box-shadow: inset 0 0 0 1px rgba(216, 185, 114, 0.18);
}

.assessment-result-poster-card__qr-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 12px;
}

.assessment-result-poster-card__qr-placeholder {
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
  letter-spacing: 0.2em;
}

.assessment-result-poster-card__qr-copy {
  display: grid;
  gap: 8px;
}

.assessment-result-poster-card__qr-copy strong {
  color: rgba(216, 185, 114, 0.96);
  font-size: 26px;
  line-height: 1.2;
}

.assessment-result-poster-card__qr-copy span {
  color: rgba(35, 83, 86, 0.72);
  font-size: 16px;
  line-height: 1.8;
}

.assessment-result-poster-card--reduced,
.assessment-result-poster-card--reduced * {
  transition: none !important;
  animation: none !important;
}

@keyframes assessment-result-poster-areathe {
  0%,
  100% {
    opacity: 0.38;
    transform: scale(0.96);
  }

  50% {
    opacity: 0.7;
    transform: scale(1.04);
  }
}

@keyframes assessment-result-poster-rotate {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>

/* 新版问心放榜帖：统一 1080×1350 的榜文式构图。 */
.assessment-result-poster-card {
  border-radius: 44px;
  background:
    radial-gradient(circle at 50% 8%, rgba(255, 255, 255, 0.9), transparent 24%),
    linear-gradient(145deg, #fcfff9 0%, #edf8ef 48%, #d8eee8 100%);
  color: #173d42;
  box-shadow: 0 34px 90px rgba(42, 101, 101, 0.22);
}

.assessment-result-poster-card::before {
  position: absolute;
  inset: 34px;
  border: 1px solid rgba(84, 154, 151, 0.28);
  border-radius: 34px;
  background:
    radial-gradient(circle at 50% 30%, rgba(216, 185, 114, 0.18), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.38), transparent 48%);
  content: '';
  pointer-events: none;
}

.assessment-result-poster-card__mountains,
.assessment-result-poster-card__halo {
  opacity: 0.34;
}

.assessment-result-poster-card__content {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  gap: 28px;
  height: 100%;
  padding: 78px 72px 68px;
}

.assessment-result-poster-card__header,
.assessment-result-poster-card__footer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 28px;
  align-items: center;
}

.assessment-result-poster-card__title {
  color: #173d42;
  font-size: 62px;
  line-height: 1.08;
}

.assessment-result-poster-card__subtitle,
.assessment-result-poster-card__official-copy,
.assessment-result-poster-card__insight-copy,
.assessment-result-poster-card__url-tip,
.assessment-result-poster-card__qr-copy span {
  color: rgba(35, 83, 86, 0.72);
}

.assessment-result-poster-card__hero {
  display: grid;
  grid-template-columns: 340px minmax(0, 1fr);
  gap: 24px;
  align-items: stretch;
}

.assessment-result-poster-card__score-panel,
.assessment-result-poster-card__copy-panel,
.assessment-result-poster-card__insight,
.assessment-result-poster-card__url-strip,
.assessment-result-poster-card__qr-panel {
  border: 1px solid rgba(84, 154, 151, 0.22);
  border-radius: 32px;
  background: rgba(255, 255, 255, 0.62);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.assessment-result-poster-card__score-panel {
  place-content: center;
  min-height: 315px;
}

.assessment-result-poster-card__score {
  color: #8c7130;
  font-size: 118px;
  line-height: 0.95;
}

.assessment-result-poster-card__status-chip {
  background: rgba(230, 197, 116, 0.18);
  color: #173d42;
}

.assessment-result-poster-card__middle {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 230px;
  gap: 24px;
}

.assessment-result-poster-card__tags span,
.assessment-result-poster-card__meta-grid span {
  background: rgba(229, 246, 240, 0.86);
  color: #1c5558;
}

.assessment-result-poster-card__footer-left {
  display: grid;
  gap: 14px;
}

.assessment-result-poster-card__qr-panel {
  grid-template-columns: auto minmax(0, 1fr);
  min-width: 390px;
}

.assessment-result-poster-card__qr-shell {
  background: #f8fffb;
  box-shadow: inset 0 0 0 1px rgba(23, 61, 66, 0.18), 0 12px 28px rgba(42, 101, 101, 0.12);
}
