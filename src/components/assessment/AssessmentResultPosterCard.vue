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
  title: '云栖派入派考核',
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
  qrHint: '云栖入派考核页',
  signature: '云栖派 · 问心录',
  reduceMotion: false,
})

/**
 * 状态标签
 * 用途：在海报里用更短的词直接提示是否合格
 */
const statusText = computed<string>(() => (props.passed ? '已合格' : '待补考'))

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
    aria-label="考核结果海报预览"
  >
    <div class="assessment-result-poster-card__halo assessment-result-poster-card__halo--top" aria-hidden="true" />
    <div class="assessment-result-poster-card__halo assessment-result-poster-card__halo--bottom" aria-hidden="true" />
    <div class="assessment-result-poster-card__mountains" aria-hidden="true" />
    <div class="assessment-result-poster-card__border" aria-hidden="true" />

    <div class="assessment-result-poster-card__content">
      <header class="assessment-result-poster-card__header">
        <div class="assessment-result-poster-card__title-group">
          <p class="assessment-result-poster-card__eyebrow">{{ title }}</p>
          <h3 class="assessment-result-poster-card__title">{{ participantTitle }}</h3>
          <p class="assessment-result-poster-card__subtitle">{{ subtitle }}</p>
        </div>

        <div class="assessment-result-poster-card__seal">
          <span class="assessment-result-poster-card__seal-ring" />
          <strong>{{ statusText }}</strong>
        </div>
      </header>

      <section class="assessment-result-poster-card__hero">
        <div class="assessment-result-poster-card__score-panel">
          <p class="assessment-result-poster-card__section-label">本次成绩</p>
          <p class="assessment-result-poster-card__score">{{ score }}</p>
          <p class="assessment-result-poster-card__score-text">{{ scoreText }}</p>
          <div class="assessment-result-poster-card__status-chip">
            <span>{{ statusHeadline }}</span>
          </div>
        </div>

        <div class="assessment-result-poster-card__copy-panel">
          <p class="assessment-result-poster-card__section-label">结果题记</p>
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
          <p class="assessment-result-poster-card__section-label">云栖门风</p>
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
            <p class="assessment-result-poster-card__section-label">落款</p>
            <div class="assessment-result-poster-card__signature-line" />
            <p class="assessment-result-poster-card__signature">{{ signature }}</p>
          </div>

          <div class="assessment-result-poster-card__url-strip">
            <div class="assessment-result-poster-card__url-head">
              <span class="assessment-result-poster-card__url-label">赴考山门</span>
              <span class="assessment-result-poster-card__url-tip">扫码后默认直达入派考核页</span>
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
              alt="入派考核二维码"
            />
            <div v-else class="assessment-result-poster-card__qr-placeholder" aria-hidden="true">
              考
            </div>
          </div>

          <div class="assessment-result-poster-card__qr-copy">
            <p class="assessment-result-poster-card__section-label">山门引路</p>
            <strong>{{ qrLabel }}</strong>
            <span>把这张成绩帖分享出去，也可让同道直接扫码赴考。</span>
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
    linear-gradient(180deg, #112d3d 0%, #0a1f2b 42%, #07131b 100%);
  box-shadow: 0 28px 72px rgba(0, 0, 0, 0.34);
  color: #f4efe2;
}

.assessment-result-poster-card--passed {
  background:
    radial-gradient(circle at 18% 10%, rgba(139, 208, 203, 0.22), transparent 22%),
    radial-gradient(circle at 84% 12%, rgba(216, 185, 114, 0.26), transparent 22%),
    linear-gradient(180deg, #14384b 0%, #0c2634 42%, #071721 100%);
}

.assessment-result-poster-card__halo,
.assessment-result-poster-card__mountains,
.assessment-result-poster-card__border {
  position: absolute;
  pointer-events: none;
}

.assessment-result-poster-card__halo {
  width: 320px;
  height: 320px;
  border-radius: 999px;
  filter: blur(40px);
  animation: assessment-result-poster-breathe 7s ease-in-out infinite;
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

.assessment-result-poster-card__eyebrow,
.assessment-result-poster-card__title,
.assessment-result-poster-card__subtitle,
.assessment-result-poster-card__score,
.assessment-result-poster-card__score-text,
.assessment-result-poster-card__section-label,
.assessment-result-poster-card__official-copy,
.assessment-result-poster-card__insight-title,
.assessment-result-poster-card__insight-copy,
.assessment-result-poster-card__signature {
  margin: 0;
}

.assessment-result-poster-card__eyebrow,
.assessment-result-poster-card__section-label {
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
  color: rgba(244, 239, 226, 0.78);
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
  position: absolute;
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

.assessment-result-poster-card__score-panel .assessment-result-poster-card__section-label {
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
    linear-gradient(180deg, rgba(8, 30, 42, 0.9), rgba(6, 21, 30, 0.96)),
    rgba(7, 27, 37, 0.74);
}

.assessment-result-poster-card__official-copy {
  font-size: 28px;
  line-height: 1.7;
  color: rgba(244, 239, 226, 0.92);
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
  background: rgba(10, 36, 48, 0.66);
  color: #f0dfb0;
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
  color: rgba(244, 239, 226, 0.7);
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
  color: rgba(244, 239, 226, 0.76);
  font-size: 17px;
}

.assessment-result-poster-card__url-strip {
  display: grid;
  gap: 10px;
  padding: 18px 20px;
  border: 1px solid rgba(216, 185, 114, 0.16);
  background:
    linear-gradient(180deg, rgba(10, 34, 46, 0.86), rgba(6, 22, 31, 0.92)),
    rgba(8, 28, 39, 0.76);
}

.assessment-result-poster-card__url-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.assessment-result-poster-card__url-label {
  color: rgba(216, 185, 114, 0.96);
  font-size: 16px;
  letter-spacing: 0.14em;
}

.assessment-result-poster-card__url-tip {
  color: rgba(139, 208, 203, 0.7);
  font-size: 13px;
}

.assessment-result-poster-card__url-text {
  margin: 0;
  color: rgba(244, 239, 226, 0.82);
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
  background: rgba(8, 28, 39, 0.78);
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
    linear-gradient(135deg, rgba(17, 50, 68, 0.92), rgba(8, 28, 39, 0.98)),
    #113244;
  color: #f4efe2;
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
  color: rgba(244, 239, 226, 0.72);
  font-size: 16px;
  line-height: 1.8;
}

.assessment-result-poster-card--reduced,
.assessment-result-poster-card--reduced * {
  transition: none !important;
  animation: none !important;
}

@keyframes assessment-result-poster-breathe {
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
