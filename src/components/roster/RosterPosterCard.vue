<script setup lang="ts">
import { computed } from 'vue'
import type { PublicRosterEntry } from '@/types/roster'

/**
 * 组件入参类型
 * 用途：约束云栖入册名帖海报需要接收的公开记录和二维码内容
 */
interface RosterPosterCardProps {
  /** 用途：公开记录 */
  entry: PublicRosterEntry
  /** 用途：二维码图片地址 */
  qrCodeUrl?: string
  /** 用途：二维码说明地址 */
  qrHint?: string
  /** 用途：是否减少动态效果 */
  reduceMotion?: boolean
}

const props = withDefaults(defineProps<RosterPosterCardProps>(), {
  qrCodeUrl: '',
  qrHint: '',
  reduceMotion: false,
})

/** 用途：判断是否已经正式入册，方便决定编号和印记口径。 */
const isApproved = computed<boolean>(() => props.entry.status === 'approved')

/** 用途：海报编号标题，正式入册显示牒号，否则显示回执。 */
const numberLabel = computed<string>(() => (isApproved.value ? '云栖牒号' : '投帖回执'))

/** 用途：海报编号文本，缺失时给出稳定兜底。 */
const numberText = computed<string>(() => (isApproved.value ? props.entry.entryNo || '云栖第待定号' : props.entry.receiptCode || '回执待定'))

/** 用途：状态榜文，根据审核状态给出江湖风格说明。 */
const statusTagline = computed<string>(() => {
  // 这里按照状态给出不同结果，避免海报口径含糊。
  if (props.entry.status === 'approved') {
    return '执事朱批已落，准予入册。'
  }

  if (props.entry.status === 'deferred') {
    return '文牒暂缓入阁，静候执事复核。'
  }

  if (props.entry.status === 'rejected') {
    return '此帖未入名册，仍谢投帖本心。'
  }

  return '文牒已递山门，待执事阅卷。'
})

/** 用途：公开批语，没有批语时根据状态补上兜底文案。 */
const commentText = computed<string>(() => {
  // 这里优先展示真实批语，保持用户和执事写入内容不丢失。
  if (props.entry.reviewComment.trim()) {
    return props.entry.reviewComment.trim()
  }

  if (props.entry.status === 'approved') {
    return '名牒已入云栖档案，后续同门相见，以此帖为凭。'
  }

  if (props.entry.status === 'deferred') {
    return '请按提示补足信息，或稍候执事再次批阅。'
  }

  if (props.entry.status === 'rejected') {
    return '本次不予收录，仍可回看规则后再定去留。'
  }

  return '山门已收到文牒，待执事核验后再定名册去向。'
})

/** 用途：日期文本，优先展示正式生效日期。 */
const dateText = computed<string>(() => props.entry.effectiveDate || props.entry.reviewedAt || props.entry.createdAt || '日期待定')

/** 用途：二维码提示文本，空值时使用详情页说明。 */
const displayQrHint = computed<string>(() => props.qrHint?.trim() || '云栖公开名帖详情页')
</script>

<template>
  <article
    class="roster-poster-card"
    :class="{
      'roster-poster-card--approved': entry.status === 'approved',
      'roster-poster-card--deferred': entry.status === 'deferred',
      'roster-poster-card--rejected': entry.status === 'rejected',
      'roster-poster-card--reduced': reduceMotion,
    }"
    aria-label="云栖入册名帖海报预览"
  >
    <div class="roster-poster-card__texture" aria-hidden="true" />
    <div class="roster-poster-card__mountain roster-poster-card__mountain--back" aria-hidden="true" />
    <div class="roster-poster-card__mountain roster-poster-card__mountain--front" aria-hidden="true" />
    <div class="roster-poster-card__mist roster-poster-card__mist--top" aria-hidden="true" />
    <div class="roster-poster-card__mist roster-poster-card__mist--bottom" aria-hidden="true" />
    <div class="roster-poster-card__border" aria-hidden="true" />

    <div class="roster-poster-card__content">
      <header class="roster-poster-card__header">
        <div class="roster-poster-card__title-block">
          <p class="roster-poster-card__eyebrow">云栖入册名牒</p>
          <h3 class="roster-poster-card__name">{{ entry.daohao }}</h3>
          <p class="roster-poster-card__subtitle">{{ entry.statusLabel }} · {{ entry.hallLabel }} · {{ entry.positionLabel }}</p>
        </div>

        <div class="roster-poster-card__seal">
          <img src="/images/yunqi-logo.png" alt="云栖派标识" />
          <span>{{ entry.statusLabel }}</span>
        </div>
      </header>

      <section class="roster-poster-card__hero">
        <article class="roster-poster-card__edict">
          <p class="roster-poster-card__section-label">入册榜文</p>
          <p class="roster-poster-card__intent">{{ entry.entryIntent || '此同门暂未留下入派本心。' }}</p>
          <strong>{{ statusTagline }}</strong>
        </article>

        <aside class="roster-poster-card__identity-list">
          <span>{{ numberLabel }}：{{ numberText }}</span>
          <span>道号：{{ entry.daohao }}</span>
          <span>性别：{{ entry.genderLabel }}</span>
          <span>堂口：{{ entry.hallLabel }}</span>
          <span>日期：{{ dateText }}</span>
        </aside>
      </section>

      <section class="roster-poster-card__details">
        <article>
          <p class="roster-poster-card__section-label">身怀所长</p>
          <span>{{ entry.strengths || '待补所长' }}</span>
        </article>
        <article>
          <p class="roster-poster-card__section-label">所好雅事</p>
          <span>{{ entry.hobbies || '待补雅事' }}</span>
        </article>
        <article>
          <p class="roster-poster-card__section-label">执事批语</p>
          <span>{{ commentText }}</span>
        </article>
      </section>

      <footer class="roster-poster-card__footer">
        <div class="roster-poster-card__signature">
          <strong>云栖派档案司 · 名册留存</strong>
          <small>公开名帖只展示最小公开信息</small>
        </div>

        <div class="roster-poster-card__qr-panel">
          <div class="roster-poster-card__qr-box">
            <img v-if="qrCodeUrl" :src="qrCodeUrl" alt="云栖入册名帖二维码" />
            <span v-else>牒</span>
          </div>
          <div class="roster-poster-card__qr-copy">
            <strong>扫码阅名牒</strong>
            <span>{{ displayQrHint }}</span>
          </div>
        </div>
      </footer>
    </div>
  </article>
</template>

<style scoped>
.roster-poster-card {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 34px;
  color: #281c14;
  background:
    radial-gradient(circle at 16% 12%, rgba(143, 36, 29, 0.16), transparent 24%),
    radial-gradient(circle at 84% 18%, rgba(188, 145, 65, 0.24), transparent 23%),
    linear-gradient(145deg, #fbefd6 0%, #e8d2a6 52%, #c5a15d 100%);
  box-shadow: 0 30px 72px rgba(12, 8, 4, 0.34);
}

.roster-poster-card--approved {
  background:
    radial-gradient(circle at 16% 12%, rgba(46, 114, 81, 0.18), transparent 24%),
    radial-gradient(circle at 84% 18%, rgba(188, 145, 65, 0.24), transparent 23%),
    linear-gradient(145deg, #fbefd6 0%, #e4cea0 52%, #bc9858 100%);
}

.roster-poster-card--deferred,
.roster-poster-card--rejected {
  background:
    radial-gradient(circle at 16% 12%, rgba(143, 36, 29, 0.20), transparent 24%),
    radial-gradient(circle at 84% 18%, rgba(102, 73, 42, 0.20), transparent 23%),
    linear-gradient(145deg, #f4e6ca 0%, #dbc397 52%, #ad884d 100%);
}

.roster-poster-card__texture,
.roster-poster-card__mountain,
.roster-poster-card__mist,
.roster-poster-card__border {
  position: absolute;
  pointer-events: none;
}

.roster-poster-card__texture {
  inset: 0;
  background:
    linear-gradient(90deg, rgba(70, 45, 22, 0.05) 1px, transparent 1px),
    linear-gradient(0deg, rgba(70, 45, 22, 0.04) 1px, transparent 1px),
    radial-gradient(circle at 26% 42%, rgba(255, 255, 255, 0.36), transparent 20%);
  background-size: 38px 38px, 44px 44px, auto;
  opacity: 0.58;
}

.roster-poster-card__mountain {
  left: 0;
  right: 0;
  bottom: 0;
}

.roster-poster-card__mountain--back {
  height: 35%;
  background: linear-gradient(180deg, transparent, rgba(47, 33, 22, 0.38));
  clip-path: polygon(0 100%, 0 58%, 14% 38%, 32% 70%, 49% 30%, 66% 72%, 83% 42%, 100% 68%, 100% 100%);
}

.roster-poster-card__mountain--front {
  height: 24%;
  background: linear-gradient(180deg, transparent, rgba(31, 23, 17, 0.72));
  clip-path: polygon(0 100%, 0 72%, 18% 48%, 38% 78%, 56% 42%, 73% 78%, 91% 54%, 100% 72%, 100% 100%);
}

.roster-poster-card__mist {
  width: 440px;
  height: 130px;
  border-radius: 999px;
  background: rgba(255, 248, 229, 0.42);
  filter: blur(24px);
  animation: roster-poster-mist 8s ease-in-out infinite;
}

.roster-poster-card__mist--top {
  top: 260px;
  left: -90px;
}

.roster-poster-card__mist--bottom {
  right: -90px;
  bottom: 260px;
  animation-delay: -3s;
}

.roster-poster-card__border {
  inset: 26px;
  border: 2px solid rgba(133, 88, 32, 0.44);
  border-radius: 28px;
  box-shadow: inset 0 0 0 1px rgba(255, 247, 219, 0.42);
}

.roster-poster-card__content {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  gap: 24px;
  height: 100%;
  padding: 58px 58px 46px;
}

.roster-poster-card__header,
.roster-poster-card__hero,
.roster-poster-card__footer {
  display: flex;
  justify-content: space-between;
  gap: 24px;
}

.roster-poster-card__title-block,
.roster-poster-card__edict,
.roster-poster-card__details article,
.roster-poster-card__signature,
.roster-poster-card__qr-copy {
  display: grid;
  gap: 10px;
}

.roster-poster-card__eyebrow,
.roster-poster-card__section-label {
  margin: 0;
  color: #8f241d;
  font-size: 28px;
  font-weight: 900;
  letter-spacing: 0.14em;
}

.roster-poster-card__name {
  margin: 0;
  color: #211711;
  font-size: 92px;
  line-height: 1.04;
  letter-spacing: 0.08em;
}

.roster-poster-card__subtitle,
.roster-poster-card__signature small,
.roster-poster-card__qr-copy span {
  margin: 0;
  color: rgba(73, 47, 25, 0.72);
  font-size: 22px;
  letter-spacing: 0.12em;
}

.roster-poster-card__seal {
  display: grid;
  place-items: center;
  gap: 8px;
  width: 154px;
  height: 174px;
  border: 2px solid rgba(143, 36, 29, 0.55);
  border-radius: 26px;
  background: rgba(255, 248, 230, 0.50);
  color: #8f241d;
  transform: rotate(4deg);
}

.roster-poster-card__seal img {
  width: 78px;
  height: 78px;
  object-fit: contain;
}

.roster-poster-card__seal span {
  font-size: 22px;
  font-weight: 900;
}

.roster-poster-card__edict,
.roster-poster-card__identity-list,
.roster-poster-card__details article,
.roster-poster-card__qr-panel {
  border: 1px solid rgba(133, 88, 32, 0.34);
  border-radius: 32px;
  background: rgba(255, 248, 230, 0.62);
  box-shadow: inset 0 0 40px rgba(104, 67, 28, 0.08);
}

.roster-poster-card__edict {
  flex: 1;
  align-content: center;
  padding: 34px;
}

.roster-poster-card__intent {
  margin: 0;
  color: #211711;
  font-size: 40px;
  line-height: 1.42;
  font-weight: 900;
}

.roster-poster-card__edict strong {
  color: #8f241d;
  font-size: 26px;
}

.roster-poster-card__identity-list {
  display: grid;
  align-content: center;
  gap: 12px;
  width: 330px;
  padding: 28px;
}

.roster-poster-card__identity-list span {
  color: #3a2719;
  font-size: 22px;
  font-weight: 800;
}

.roster-poster-card__details {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.roster-poster-card__details article {
  align-content: start;
  padding: 22px;
}

.roster-poster-card__details span {
  color: #2c2017;
  font-size: 23px;
  line-height: 1.45;
  font-weight: 800;
}

.roster-poster-card__signature strong {
  color: #211711;
  font-size: 28px;
}

.roster-poster-card__qr-panel {
  display: grid;
  grid-template-columns: 146px 1fr;
  gap: 18px;
  align-items: center;
  max-width: 390px;
  padding: 18px;
}

.roster-poster-card__qr-box {
  display: grid;
  place-items: center;
  width: 146px;
  height: 146px;
  border-radius: 22px;
  background: #fff8e8;
  color: #8f241d;
  font-size: 62px;
  font-weight: 900;
}

.roster-poster-card__qr-box img {
  width: 124px;
  height: 124px;
  object-fit: contain;
}

.roster-poster-card__qr-copy strong {
  color: #211711;
  font-size: 26px;
}

@keyframes roster-poster-mist {
  0%, 100% { transform: translateX(0); opacity: 0.42; }
  50% { transform: translateX(48px); opacity: 0.72; }
}

.roster-poster-card--reduced,
.roster-poster-card--reduced * {
  animation: none !important;
  transition: none !important;
}
</style>
