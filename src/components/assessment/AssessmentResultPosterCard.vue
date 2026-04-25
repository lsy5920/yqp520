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
  title: '云栖问心榜',
  subtitle: '一卷问心 · 照见本真',
  participantTitle: '云中同门',
  score: 0,
  totalScore: 100,
  passed: false,
  statusHeadline: '再温原典',
  officialCopy: '胜负不急，先把规矩读透，再执卷重来。',
  completedAtText: '刚刚完成',
  durationText: '0分00秒',
  correctCount: 0,
  questionCount: 30,
  passScore: 80,
  qrCodeUrl: '',
  qrLabel: '扫码再问心',
  qrHint: '云栖问心卷入口',
  signature: '云栖派 · 问心司',
  reduceMotion: false,
})

/**
 * 清洗短文本
 * 用途：避免空文本破坏海报排版
 * 入参：value 为原始文本，fallback 为默认文本
 * 返回值：返回可直接显示的文本
 */
function normalizeText(value: string | undefined, fallback: string): string {
  // 这里为空输入提供兜底，避免导出海报时出现空白。
  return value?.trim() || fallback
}

/** 用途：分数比例文本，方便成绩区直接显示。 */
const scoreText = computed<string>(() => `${props.score} / ${props.totalScore}`)

/** 用途：合格线文本，提醒用户本卷过关标准。 */
const passLineText = computed<string>(() => `${props.passScore} 分过关`)

/** 用途：结果状态文案，合格与未合格走不同江湖口吻。 */
const resultBadge = computed<string>(() => (props.passed ? '准入山门' : '暂缓入山'))

/** 用途：底部落款文本，空值时使用问心司。 */
const displaySignature = computed<string>(() => normalizeText(props.signature, '云栖派 · 问心司'))

/** 用途：二维码提示文本，空值时使用默认入口说明。 */
const displayQrHint = computed<string>(() => normalizeText(props.qrHint, '云栖问心卷入口'))
</script>

<template>
  <article
    class="assessment-result-poster-card"
    :class="{
      'assessment-result-poster-card--passed': passed,
      'assessment-result-poster-card--reduced': reduceMotion,
    }"
    aria-label="云栖问心榜海报预览"
  >
    <div class="assessment-result-poster-card__texture" aria-hidden="true" />
    <div class="assessment-result-poster-card__mountain assessment-result-poster-card__mountain--back" aria-hidden="true" />
    <div class="assessment-result-poster-card__mountain assessment-result-poster-card__mountain--front" aria-hidden="true" />
    <div class="assessment-result-poster-card__mist assessment-result-poster-card__mist--left" aria-hidden="true" />
    <div class="assessment-result-poster-card__mist assessment-result-poster-card__mist--right" aria-hidden="true" />
    <div class="assessment-result-poster-card__border" aria-hidden="true" />

    <div class="assessment-result-poster-card__content">
      <header class="assessment-result-poster-card__header">
        <div class="assessment-result-poster-card__title-group">
          <p class="assessment-result-poster-card__eyebrow">{{ title }}</p>
          <h3 class="assessment-result-poster-card__title">{{ participantTitle }}</h3>
          <p class="assessment-result-poster-card__subtitle">{{ subtitle }}</p>
        </div>

        <div class="assessment-result-poster-card__seal">
          <img src="/images/yunqi-logo.png" alt="云栖派标识" />
          <span>{{ resultBadge }}</span>
        </div>
      </header>

      <section class="assessment-result-poster-card__hero">
        <div class="assessment-result-poster-card__score-panel">
          <p class="assessment-result-poster-card__section-label">问心分数</p>
          <strong>{{ score }}</strong>
          <span>{{ scoreText }}</span>
          <em>{{ statusHeadline }}</em>
        </div>

        <article class="assessment-result-poster-card__edict">
          <p class="assessment-result-poster-card__section-label">榜文批注</p>
          <p class="assessment-result-poster-card__official-copy">{{ officialCopy }}</p>
          <div class="assessment-result-poster-card__meta-grid">
            <span>答对 {{ correctCount }} / {{ questionCount }} 题</span>
            <span>{{ passLineText }}</span>
            <span>用时 {{ durationText }}</span>
            <span>{{ completedAtText }}</span>
          </div>
        </article>
      </section>

      <section class="assessment-result-poster-card__doctrine">
        <span>问心不问名</span>
        <span>守规先守诚</span>
        <span>云深见本真</span>
      </section>

      <footer class="assessment-result-poster-card__footer">
        <div class="assessment-result-poster-card__signature">
          <strong>{{ displaySignature }}</strong>
          <small>此榜为新版水墨侠气问心海报</small>
        </div>

        <div class="assessment-result-poster-card__qr-panel">
          <div class="assessment-result-poster-card__qr-box">
            <img v-if="qrCodeUrl" :src="qrCodeUrl" alt="云栖问心二维码" />
            <span v-else>问</span>
          </div>
          <div class="assessment-result-poster-card__qr-copy">
            <strong>{{ qrLabel }}</strong>
            <span>{{ displayQrHint }}</span>
          </div>
        </div>
      </footer>
    </div>
  </article>
</template>

<style scoped>
.assessment-result-poster-card {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 34px;
  color: #17342f;
  background:
    radial-gradient(circle at 18% 12%, rgba(15, 111, 102, 0.16), transparent 24%),
    radial-gradient(circle at 84% 16%, rgba(112, 158, 147, 0.24), transparent 22%),
    linear-gradient(145deg, #edf7f3 0%, #d6e9e2 52%, #9fc8bd 100%);
  box-shadow: 0 30px 72px rgba(12, 8, 4, 0.34);
}

.assessment-result-poster-card--passed {
  background:
    radial-gradient(circle at 18% 12%, rgba(41, 108, 78, 0.18), transparent 24%),
    radial-gradient(circle at 84% 16%, rgba(112, 158, 147, 0.24), transparent 22%),
    linear-gradient(145deg, #edf7f3 0%, #d6e9e2 52%, #9fc8bd 100%);
}

.assessment-result-poster-card__texture,
.assessment-result-poster-card__mountain,
.assessment-result-poster-card__mist,
.assessment-result-poster-card__border {
  position: absolute;
  pointer-events: none;
}

.assessment-result-poster-card__texture {
  inset: 0;
  background:
    linear-gradient(90deg, rgba(23, 52, 47, 0.05) 1px, transparent 1px),
    linear-gradient(0deg, rgba(23, 52, 47, 0.04) 1px, transparent 1px),
    radial-gradient(circle at 26% 42%, rgba(255, 255, 255, 0.36), transparent 20%);
  background-size: 38px 38px, 44px 44px, auto;
  opacity: 0.58;
}

.assessment-result-poster-card__mountain {
  left: 0;
  right: 0;
  bottom: 0;
}

.assessment-result-poster-card__mountain--back {
  height: 35%;
  background: linear-gradient(180deg, transparent, rgba(23, 52, 47, 0.38));
  clip-path: polygon(0 100%, 0 58%, 14% 38%, 32% 70%, 49% 30%, 66% 72%, 83% 42%, 100% 68%, 100% 100%);
}

.assessment-result-poster-card__mountain--front {
  height: 24%;
  background: linear-gradient(180deg, transparent, rgba(16, 37, 31, 0.72));
  clip-path: polygon(0 100%, 0 72%, 18% 48%, 38% 78%, 56% 42%, 73% 78%, 91% 54%, 100% 72%, 100% 100%);
}

.assessment-result-poster-card__mist {
  width: 440px;
  height: 130px;
  border-radius: 999px;
  background: rgba(255, 248, 229, 0.42);
  filter: blur(24px);
  animation: assessment-result-poster-mist 8s ease-in-out infinite;
}

.assessment-result-poster-card__mist--left {
  top: 300px;
  left: -90px;
}

.assessment-result-poster-card__mist--right {
  right: -90px;
  bottom: 260px;
  animation-delay: -3s;
}

.assessment-result-poster-card__border {
  inset: 26px;
  border: 2px solid rgba(62, 111, 101, 0.44);
  border-radius: 28px;
  box-shadow: inset 0 0 0 1px rgba(244, 251, 247, 0.42);
}

.assessment-result-poster-card__content {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: auto 1fr auto auto;
  gap: 26px;
  height: 100%;
  padding: 58px 58px 46px;
}

.assessment-result-poster-card__header,
.assessment-result-poster-card__footer {
  display: flex;
  justify-content: space-between;
  gap: 24px;
}

.assessment-result-poster-card__title-group,
.assessment-result-poster-card__edict,
.assessment-result-poster-card__signature,
.assessment-result-poster-card__qr-copy {
  display: grid;
  gap: 10px;
}

.assessment-result-poster-card__eyebrow,
.assessment-result-poster-card__section-label {
  margin: 0;
  color: #0f6f66;
  font-size: 28px;
  font-weight: 900;
  letter-spacing: 0.14em;
}

.assessment-result-poster-card__title {
  margin: 0;
  color: #10251f;
  font-size: 88px;
  line-height: 1.04;
  letter-spacing: 0.08em;
}

.assessment-result-poster-card__subtitle,
.assessment-result-poster-card__signature small,
.assessment-result-poster-card__qr-copy span {
  margin: 0;
  color: rgba(23, 52, 47, 0.72);
  font-size: 22px;
  letter-spacing: 0.12em;
}

.assessment-result-poster-card__seal {
  display: grid;
  place-items: center;
  gap: 8px;
  width: 154px;
  height: 174px;
  border: 2px solid rgba(15, 111, 102, 0.55);
  border-radius: 26px;
  background: rgba(244, 251, 247, 0.50);
  color: #0f6f66;
  transform: rotate(4deg);
}

.assessment-result-poster-card__seal img {
  width: 78px;
  height: 78px;
  object-fit: contain;
}

.assessment-result-poster-card__seal span {
  font-size: 22px;
  font-weight: 900;
}

.assessment-result-poster-card__hero {
  display: grid;
  grid-template-columns: 310px minmax(0, 1fr);
  gap: 24px;
  min-height: 0;
}

.assessment-result-poster-card__score-panel,
.assessment-result-poster-card__edict,
.assessment-result-poster-card__qr-panel {
  border: 1px solid rgba(62, 111, 101, 0.34);
  border-radius: 32px;
  background: rgba(244, 251, 247, 0.62);
  box-shadow: inset 0 0 40px rgba(23, 52, 47, 0.08);
}

.assessment-result-poster-card__score-panel {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 14px;
  padding: 28px;
}

.assessment-result-poster-card__score-panel strong {
  color: #0f6f66;
  font-size: 136px;
  line-height: 0.9;
}

.assessment-result-poster-card__score-panel span {
  color: #21443d;
  font-size: 30px;
  font-weight: 900;
}

.assessment-result-poster-card__score-panel em {
  padding: 12px 22px;
  border-radius: 999px;
  background: #0f6f66;
  color: #edf7f3;
  font-size: 24px;
  font-style: normal;
}

.assessment-result-poster-card__edict {
  align-content: center;
  padding: 32px;
}

.assessment-result-poster-card__official-copy {
  margin: 0;
  color: #17342f;
  font-size: 42px;
  line-height: 1.45;
  font-weight: 900;
}

.assessment-result-poster-card__meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.assessment-result-poster-card__meta-grid span,
.assessment-result-poster-card__doctrine span {
  display: grid;
  place-items: center;
  min-height: 58px;
  border-radius: 999px;
  background: rgba(62, 111, 101, 0.12);
  color: #21443d;
  font-size: 20px;
  font-weight: 800;
}

.assessment-result-poster-card__doctrine {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.assessment-result-poster-card__signature strong {
  color: #10251f;
  font-size: 28px;
}

.assessment-result-poster-card__qr-panel {
  display: grid;
  grid-template-columns: 146px 1fr;
  gap: 18px;
  align-items: center;
  max-width: 390px;
  padding: 18px;
}

.assessment-result-poster-card__qr-box {
  display: grid;
  place-items: center;
  width: 146px;
  height: 146px;
  border-radius: 22px;
  background: #f4fbf7;
  color: #0f6f66;
  font-size: 62px;
  font-weight: 900;
}

.assessment-result-poster-card__qr-box img {
  width: 124px;
  height: 124px;
  object-fit: contain;
}

.assessment-result-poster-card__qr-copy strong {
  color: #10251f;
  font-size: 26px;
}

@keyframes assessment-result-poster-mist {
  0%, 100% { transform: translateX(0); opacity: 0.42; }
  50% { transform: translateX(48px); opacity: 0.72; }
}

.assessment-result-poster-card--reduced,
.assessment-result-poster-card--reduced * {
  animation: none !important;
  transition: none !important;
}
</style>


