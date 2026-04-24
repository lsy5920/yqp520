<script setup lang="ts">
import { computed } from 'vue'
import type { PublicRosterEntry } from '@/types/roster'

/**
 * 组件入参类型
 * 用途：约束云栖入册名帖卡面渲染所需的展示数据
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

/**
 * 是否为正式入册状态
 * 用途：卡面里决定牒号、日期和印记口径
 */
const isApproved = computed<boolean>(() => props.entry.status === 'approved')

/**
 * 是否为待审核状态
 * 用途：待审核时卡面要突出回执号和待审印记
 */
const isPending = computed<boolean>(() => props.entry.status === 'pending')

/**
 * 卡面编号标题
 * 用途：正式入册显示牒号，待审核显示回执号
 */
const numberLabel = computed<string>(() => (isApproved.value ? '云栖牒号' : '回执编号'))

/**
 * 卡面编号文本
 * 用途：根据状态切换正式牒号或回执号
 */
const numberText = computed<string>(() => (
  isApproved.value
    ? (props.entry.entryNo || '云栖-第待定号')
    : (props.entry.receiptCode || '回执待定')
))

/**
 * 日期标题
 * 用途：正式入册和待审核状态各自显示更贴切的日期名
 */
const dateLabel = computed<string>(() => (isApproved.value ? '入册日期' : '提交日期'))

/**
 * 日期文本
 * 用途：优先展示最适合当前状态的日期
 */
const dateText = computed<string>(() => (
  isApproved.value
    ? (props.entry.effectiveDate || props.entry.reviewedAt || props.entry.createdAt || '待批注')
    : (props.entry.createdAt || '刚刚递交')
))

/**
 * 状态附记
 * 用途：卡面中央补一句更有仪式感的状态说明
 */
const statusTagline = computed<string>(() => {
  if (props.entry.status === 'approved') {
    return '经执事批阅，已准予入册'
  }

  if (props.entry.status === 'deferred') {
    return '文牒暂缓收录，请先留意执事批语'
  }

  if (props.entry.status === 'rejected') {
    return '本次未予收录，仍谢此番投帖之心'
  }

  return '文牒已递入档案司，静候执事批阅'
})

/**
 * 批语标题
 * 用途：底部批语区根据状态切换更贴切的标题
 */
const commentLabel = computed<string>(() => (
  isApproved.value ? '执事批语' : '状态批注'
))

/**
 * 批语文本
 * 用途：公开详情允许为空，这里给卡面准备一份仪式感兜底
 */
const commentText = computed<string>(() => {
  if (props.entry.reviewComment.trim()) {
    return props.entry.reviewComment.trim()
  }

  if (props.entry.status === 'approved') {
    return '门籍已定，后续雅集与同门名录中将以此帖为准。'
  }

  if (props.entry.status === 'deferred') {
    return '请先按公开说明补足缘由或再候执事复核，暂不进入公开名录。'
  }

  if (props.entry.status === 'rejected') {
    return '此次不予收录，详情以公开说明为准。'
  }

  return '提交成功后会先生成待审回执，审核通过后再换成正式入册名帖。'
})
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
    aria-label="云栖入册名帖预览"
  >
    <div class="roster-poster-card__mist roster-poster-card__mist--left" aria-hidden="true" />
    <div class="roster-poster-card__mist roster-poster-card__mist--right" aria-hidden="true" />
    <div class="roster-poster-card__border" aria-hidden="true" />
    <div class="roster-poster-card__mountains" aria-hidden="true" />
    <div class="roster-poster-card__paper-glow" aria-hidden="true" />

    <div class="roster-poster-card__content">
      <header class="roster-poster-card__header">
        <div class="roster-poster-card__title-group">
          <p class="roster-poster-card__eyebrow">云栖派入册名帖</p>
          <h3 class="roster-poster-card__name">{{ entry.daohao }}</h3>
          <div class="roster-poster-card__title-meta">
            <span>道号正帖</span>
            <span>{{ entry.genderLabel }}</span>
            <span>{{ entry.positionLabel }}</span>
            <span>{{ entry.hallLabel }}</span>
            <span>{{ entry.statusLabel }}</span>
          </div>
        </div>

        <div class="roster-poster-card__seal">
          <span class="roster-poster-card__seal-ring" />
          <img src="/images/yunqi-logo.png" alt="云栖派 logo" />
        </div>
      </header>

      <section class="roster-poster-card__hero">
        <article class="roster-poster-card__paper">
          <p class="roster-poster-card__section-label">入派本心</p>
          <p class="roster-poster-card__intent">{{ entry.entryIntent }}</p>
          <div class="roster-poster-card__tagline">
            <span>{{ statusTagline }}</span>
          </div>
        </article>

        <aside class="roster-poster-card__meta-column">
          <section class="roster-poster-card__meta-card">
            <p class="roster-poster-card__section-label">公开道号</p>
            <strong>{{ entry.daohao }}</strong>
          </section>

          <section class="roster-poster-card__meta-card">
            <p class="roster-poster-card__section-label">{{ numberLabel }}</p>
            <strong>{{ numberText }}</strong>
          </section>

          <section class="roster-poster-card__meta-card">
            <p class="roster-poster-card__section-label">{{ dateLabel }}</p>
            <strong>{{ dateText }}</strong>
          </section>

          <section class="roster-poster-card__meta-card">
            <p class="roster-poster-card__section-label">公开性别</p>
            <strong>{{ entry.genderLabel }}</strong>
          </section>

          <section class="roster-poster-card__meta-card">
            <p class="roster-poster-card__section-label">门中分工</p>
            <strong>{{ entry.positionLabel }}</strong>
          </section>

          <section class="roster-poster-card__meta-card">
            <p class="roster-poster-card__section-label">门籍归属</p>
            <strong>{{ entry.hallLabel }}</strong>
          </section>
        </aside>
      </section>

      <section class="roster-poster-card__body">
        <article class="roster-poster-card__info-card">
          <p class="roster-poster-card__section-label">身怀所长</p>
          <p>{{ entry.strengths || '待补所长' }}</p>
        </article>

        <article class="roster-poster-card__info-card">
          <p class="roster-poster-card__section-label">所好雅事</p>
          <p>{{ entry.hobbies || '待补雅事' }}</p>
        </article>
      </section>

      <footer class="roster-poster-card__footer">
        <div class="roster-poster-card__footer-left">
          <div class="roster-poster-card__comment-card">
            <p class="roster-poster-card__section-label">{{ commentLabel }}</p>
            <p class="roster-poster-card__comment">{{ commentText }}</p>
          </div>

          <div class="roster-poster-card__footer-meta">
            <span>云栖派档案司 制</span>
            <span v-if="isPending">分享此页，可继续跟进审核进度</span>
            <span v-else-if="isApproved">公开名录与分享名帖均以本帖信息为准</span>
            <span v-else>本条公开详情仅保留克制公开信息</span>
          </div>
        </div>

        <div class="roster-poster-card__qr-card">
          <div class="roster-poster-card__qr-shell">
            <img
              v-if="qrCodeUrl"
              class="roster-poster-card__qr-image"
              :src="qrCodeUrl"
              alt="云栖名册公开详情二维码"
            />
            <div v-else class="roster-poster-card__qr-placeholder" aria-hidden="true">
              云
            </div>
          </div>

          <div class="roster-poster-card__qr-copy">
            <p class="roster-poster-card__section-label">扫码回帖</p>
            <strong>{{ isPending ? '跟进待审文牒' : '查看公开详情' }}</strong>
            <span>{{ qrHint || '云栖名册公开详情页' }}</span>
          </div>
        </div>
      </footer>
    </div>
  </article>
</template>

<style scoped>
.roster-poster-card {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
  border-radius: 34px;
  background:
    radial-gradient(circle at 16% 12%, rgba(139, 208, 203, 0.18), transparent 22%),
    radial-gradient(circle at 86% 14%, rgba(216, 185, 114, 0.2), transparent 24%),
    linear-gradient(180deg, #16313f 0%, #0d202b 44%, #081218 100%);
  box-shadow: 0 28px 72px rgba(0, 0, 0, 0.34);
  color: #173d42;
}

.roster-poster-card--approved {
  background:
    radial-gradient(circle at 16% 12%, rgba(139, 208, 203, 0.2), transparent 22%),
    radial-gradient(circle at 86% 14%, rgba(216, 185, 114, 0.24), transparent 24%),
    linear-gradient(180deg, #183945 0%, #102733 44%, #09141b 100%);
}

.roster-poster-card--deferred {
  background:
    radial-gradient(circle at 16% 12%, rgba(139, 208, 203, 0.1), transparent 22%),
    radial-gradient(circle at 86% 14%, rgba(216, 185, 114, 0.14), transparent 24%),
    linear-gradient(180deg, #20333d 0%, #14212a 44%, #0b151b 100%);
}

.roster-poster-card--rejected {
  background:
    radial-gradient(circle at 16% 12%, rgba(212, 154, 114, 0.18), transparent 22%),
    radial-gradient(circle at 86% 14%, rgba(216, 185, 114, 0.12), transparent 24%),
    linear-gradient(180deg, #362222 0%, #201617 44%, #110b0c 100%);
}

.roster-poster-card__mist,
.roster-poster-card__border,
.roster-poster-card__mountains,
.roster-poster-card__paper-glow {
  position: absolute;
  pointer-events: none;
}

.roster-poster-card__mist {
  width: 280px;
  height: 280px;
  border-radius: 999px;
  filter: blur(40px);
  opacity: 0.56;
  animation: roster-poster-breathe 8s ease-in-out infinite;
}

.roster-poster-card__mist--left {
  left: -80px;
  top: 200px;
  background: rgba(139, 208, 203, 0.18);
}

.roster-poster-card__mist--right {
  right: -60px;
  top: -90px;
  background: rgba(216, 185, 114, 0.2);
  animation-delay: -3.2s;
}

.roster-poster-card__border {
  inset: 22px;
  border-radius: 28px;
  border: 1px solid rgba(216, 185, 114, 0.15);
}

.roster-poster-card__mountains {
  left: 0;
  right: 0;
  bottom: 0;
  height: 15%;
  background:
    linear-gradient(160deg, transparent 0 24%, rgba(4, 16, 22, 0.9) 24% 100%),
    linear-gradient(24deg, transparent 0 22%, rgba(8, 25, 33, 0.96) 22% 100%);
  clip-path: polygon(0 100%, 0 62%, 18% 50%, 35% 78%, 52% 36%, 68% 72%, 84% 48%, 100% 74%, 100% 100%);
  opacity: 0.92;
}

.roster-poster-card__paper-glow {
  inset: auto 88px 126px 88px;
  height: 210px;
  border-radius: 999px;
  background:
    radial-gradient(circle at 22% 42%, rgba(255, 255, 255, 0.12), transparent 18%),
    radial-gradient(circle at 52% 48%, rgba(255, 255, 255, 0.08), transparent 16%),
    radial-gradient(circle at 78% 40%, rgba(255, 255, 255, 0.1), transparent 18%);
  filter: blur(28px);
  opacity: 0.48;
}

.roster-poster-card__content {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: auto auto auto auto;
  gap: 20px;
  height: 100%;
  padding: 36px 38px 30px;
}

.roster-poster-card__header,
.roster-poster-card__hero,
.roster-poster-card__body,
.roster-poster-card__footer {
  display: grid;
  gap: 18px;
}

.roster-poster-card__header {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
}

.roster-poster-card__title-group {
  display: grid;
  gap: 12px;
}

.roster-poster-card__eyebrow,
.roster-poster-card__name,
.roster-poster-card__section-label,
.roster-poster-card__intent,
.roster-poster-card__comment {
  margin: 0;
}

.roster-poster-card__eyebrow,
.roster-poster-card__section-label {
  color: rgba(139, 208, 203, 0.9);
  font-size: 13px;
  letter-spacing: 0.22em;
}

.roster-poster-card__name {
  font-size: clamp(48px, 7vw, 82px);
  line-height: 1.06;
  letter-spacing: 0.06em;
}

.roster-poster-card__title-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.roster-poster-card__title-meta span,
.roster-poster-card__footer-meta span,
.roster-poster-card__tagline span {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(216, 185, 114, 0.16);
  background: rgba(8, 31, 42, 0.58);
  color: rgba(243, 226, 180, 0.96);
  font-size: 14px;
}

.roster-poster-card__seal {
  position: relative;
  display: grid;
  place-items: center;
  gap: 6px;
  width: 152px;
  height: 152px;
  padding: 18px;
  border-radius: 999px;
  text-align: center;
  background:
    radial-gradient(circle at 32% 28%, rgba(216, 185, 114, 0.3), transparent 30%),
    linear-gradient(160deg, rgba(10, 40, 53, 0.94), rgba(7, 20, 28, 0.98));
  box-shadow:
    inset 0 0 0 10px rgba(216, 185, 114, 0.08),
    0 18px 34px rgba(0, 0, 0, 0.24);
}

.roster-poster-card__seal-ring {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  border: 1px solid rgba(216, 185, 114, 0.3);
  animation: roster-poster-spin 14s linear infinite;
}

.roster-poster-card__seal strong {
  color: rgba(241, 217, 160, 0.98);
  font-size: 22px;
  line-height: 1.3;
  letter-spacing: 0.18em;
}

.roster-poster-card__seal small {
  color: rgba(35, 83, 86, 0.68);
  font-size: 12px;
  letter-spacing: 0.12em;
}

.roster-poster-card__hero {
  grid-template-columns: minmax(0, 1.18fr) minmax(220px, 0.82fr);
  align-items: stretch;
}

.roster-poster-card__paper,
.roster-poster-card__info-card,
.roster-poster-card__comment-card,
.roster-poster-card__qr-card,
.roster-poster-card__meta-card {
  border-radius: 28px;
}

.roster-poster-card__paper {
  position: relative;
  display: grid;
  gap: 18px;
  align-content: start;
  min-height: 0;
  padding: 26px 28px;
  background:
    linear-gradient(180deg, rgba(247, 239, 219, 0.96), rgba(229, 212, 176, 0.94)),
    rgba(247, 239, 219, 0.94);
  color: #173241;
  box-shadow:
    inset 0 0 0 1px rgba(165, 123, 52, 0.18),
    0 20px 42px rgba(0, 0, 0, 0.2);
}

.roster-poster-card__paper::before,
.roster-poster-card__paper::after {
  content: '';
  position: absolute;
  top: 22px;
  bottom: 22px;
  width: 10px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(184, 145, 74, 0.6), rgba(109, 76, 24, 0.18));
}

.roster-poster-card__paper::before {
  left: 12px;
}

.roster-poster-card__paper::after {
  right: 12px;
}

.roster-poster-card__paper .roster-poster-card__section-label {
  color: rgba(151, 98, 31, 0.92);
}

.roster-poster-card__intent {
  font-size: 26px;
  line-height: 1.78;
  color: #173241;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 6;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.roster-poster-card__tagline {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.roster-poster-card__tagline span {
  border-color: rgba(151, 98, 31, 0.16);
  background: rgba(151, 98, 31, 0.08);
  color: rgba(151, 98, 31, 0.96);
}

.roster-poster-card__meta-column {
  display: grid;
  gap: 14px;
}

.roster-poster-card__meta-card {
  display: grid;
  gap: 12px;
  align-content: center;
  padding: 20px 22px;
  border: 1px solid rgba(216, 185, 114, 0.18);
  background:
    linear-gradient(180deg, rgba(248, 253, 249, 0.9), rgba(224, 243, 237, 0.96)),
    rgba(236, 248, 244, 0.72);
}

.roster-poster-card__meta-card strong {
  font-size: 24px;
  line-height: 1.45;
  color: rgba(35, 83, 86, 0.96);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.roster-poster-card__body {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.roster-poster-card__info-card {
  display: grid;
  gap: 12px;
  padding: 20px 22px;
  border: 1px solid rgba(139, 208, 203, 0.14);
  background: rgba(239, 249, 246, 0.72);
}

.roster-poster-card__info-card p:last-child {
  margin: 0;
  color: rgba(35, 83, 86, 0.82);
  font-size: 16px;
  line-height: 1.86;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.roster-poster-card__footer {
  grid-template-columns: minmax(0, 1.1fr) 290px;
  align-items: stretch;
}

.roster-poster-card__footer-left {
  display: grid;
  gap: 14px;
}

.roster-poster-card__comment-card {
  display: grid;
  gap: 12px;
  padding: 20px 22px;
  border: 1px solid rgba(216, 185, 114, 0.16);
  background:
    linear-gradient(180deg, rgba(248, 253, 249, 0.92), rgba(224, 243, 237, 0.96)),
    rgba(236, 248, 244, 0.74);
}

.roster-poster-card__comment {
  color: rgba(35, 83, 86, 0.82);
  font-size: 16px;
  line-height: 1.86;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.roster-poster-card__footer-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.roster-poster-card__footer-meta span {
  min-height: 34px;
  padding: 0 12px;
  font-size: 13px;
}

.roster-poster-card__qr-card {
  display: grid;
  gap: 16px;
  align-content: center;
  padding: 18px;
  border: 1px solid rgba(216, 185, 114, 0.22);
  background: rgba(239, 249, 246, 0.84);
  backdrop-filter: blur(12px);
}

.roster-poster-card__qr-shell {
  display: grid;
  width: 160px;
  height: 160px;
  place-items: center;
  padding: 10px;
  border-radius: 24px;
  background: rgba(244, 239, 226, 0.96);
  box-shadow: inset 0 0 0 1px rgba(216, 185, 114, 0.18);
}

.roster-poster-card__qr-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 14px;
}

.roster-poster-card__qr-placeholder {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  border-radius: 14px;
  background:
    linear-gradient(135deg, rgba(232, 247, 241, 0.95), rgba(202, 231, 226, 0.98)),
    #d8eee8;
  color: #173d42;
  font-size: 34px;
  letter-spacing: 0.24em;
}

.roster-poster-card__qr-copy {
  display: grid;
  gap: 8px;
}

.roster-poster-card__qr-copy strong {
  color: rgba(216, 185, 114, 0.96);
  font-size: 28px;
  line-height: 1.22;
}

.roster-poster-card__qr-copy span {
  color: rgba(35, 83, 86, 0.72);
  font-size: 14px;
  line-height: 1.78;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.roster-poster-card--reduced,
.roster-poster-card--reduced * {
  transition: none !important;
  animation: none !important;
}

@keyframes roster-poster-breathe {
  0%,
  100% {
    transform: scale(0.96);
    opacity: 0.42;
  }

  50% {
    transform: scale(1.04);
    opacity: 0.74;
  }
}

@keyframes roster-poster-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>

/* 新版入册名帖：统一 1080×1350 的玉册竹影构图。 */
.roster-poster-card {
  border-radius: 44px;
  background:
    radial-gradient(circle at 18% 10%, rgba(255, 255, 255, 0.88), transparent 24%),
    radial-gradient(circle at 80% 74%, rgba(139, 208, 203, 0.22), transparent 28%),
    linear-gradient(145deg, #fbfff9 0%, #eaf8f1 48%, #d5eee8 100%);
  color: #173d42;
  box-shadow: 0 34px 90px rgba(42, 101, 101, 0.22);
}

.roster-poster-card::before {
  position: absolute;
  inset: 34px;
  border: 1px solid rgba(84, 154, 151, 0.28);
  border-radius: 34px;
  background:
    linear-gradient(90deg, rgba(84, 154, 151, 0.08), transparent 18%, transparent 82%, rgba(84, 154, 151, 0.08)),
    radial-gradient(circle at 52% 45%, rgba(216, 185, 114, 0.14), transparent 26%);
  content: '';
  pointer-events: none;
}

.roster-poster-card__mountains,
.roster-poster-card__paper-glow {
  display: none;
}

.roster-poster-card__content {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  gap: 24px;
  height: 100%;
  padding: 72px 68px 64px;
}

.roster-poster-card__header,
.roster-poster-card__hero,
.roster-poster-card__footer {
  display: grid;
  gap: 24px;
}

.roster-poster-card__header {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
}

.roster-poster-card__title {
  color: #173d42;
  font-size: 68px;
  line-height: 1.05;
}

.roster-poster-card__subtitle,
.roster-poster-card__meta-card span,
.roster-poster-card__info-card p:last-child,
.roster-poster-card__comment,
.roster-poster-card__qr-copy span {
  color: rgba(35, 83, 86, 0.74);
}

.roster-poster-card__hero {
  grid-template-columns: minmax(0, 1fr) 315px;
  align-items: stretch;
}

.roster-poster-card__paper,
.roster-poster-card__meta-card,
.roster-poster-card__info-card,
.roster-poster-card__comment-card,
.roster-poster-card__qr-card {
  border: 1px solid rgba(84, 154, 151, 0.22);
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.62);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.roster-poster-card__paper {
  min-height: 360px;
  padding: 42px;
}

.roster-poster-card__daohao {
  color: #173d42;
  font-size: 58px;
  line-height: 1.12;
}

.roster-poster-card__meta-column {
  gap: 12px;
}

.roster-poster-card__meta-card {
  padding: 16px 18px;
}

.roster-poster-card__meta-card strong {
  color: #173d42;
  font-size: 22px;
}

.roster-poster-card__body {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.roster-poster-card__footer {
  grid-template-columns: minmax(0, 1fr) 360px;
  align-items: stretch;
}

.roster-poster-card__qr-shell {
  background: #f8fffb;
  box-shadow: inset 0 0 0 1px rgba(23, 61, 66, 0.18), 0 12px 28px rgba(42, 101, 101, 0.12);
}
