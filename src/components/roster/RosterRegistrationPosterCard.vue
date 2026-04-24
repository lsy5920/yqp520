<script setup lang="ts">
import { computed } from 'vue'
import type { RosterRegistrationPosterTemplate } from '@/types/roster'

/**
 * 组件入参类型
 * 用途：约束名册登记招募海报卡面渲染时所需的全部展示数据
 */
interface RosterRegistrationPosterCardProps {
  /** 用途：固定招募海报模板 */
  template: RosterRegistrationPosterTemplate
  /** 用途：二维码图片地址 */
  qrCodeUrl?: string
  /** 用途：二维码下方实际网址提示 */
  qrHint?: string
  /** 用途：是否减少动态效果 */
  reduceMotion?: boolean
}

const props = withDefaults(defineProps<RosterRegistrationPosterCardProps>(), {
  qrCodeUrl: '',
  qrHint: '',
  reduceMotion: false,
})

/**
 * 格式化后的二维码提示
 * 用途：二维码下方优先显示真实网址，没有时回退为固定口径
 */
const displayQrHint = computed<string>(() => props.qrHint?.trim() || '云栖名册公开名录页')

/**
 * 固定流程卡片列表
 * 用途：保证四步流程在海报中稳定展示
 */
const processList = computed<string[]>(() => (
  Array.isArray(props.template.processList) ? props.template.processList.slice(0, 4) : []
))
</script>

<template>
  <article
    class="roster-registration-poster-card"
    :class="{ 'roster-registration-poster-card--reduced': reduceMotion }"
    aria-label="云栖名册登记招募海报预览"
  >
    <div class="roster-registration-poster-card__mist roster-registration-poster-card__mist--top" aria-hidden="true" />
    <div class="roster-registration-poster-card__mist roster-registration-poster-card__mist--bottom" aria-hidden="true" />
    <div class="roster-registration-poster-card__border" aria-hidden="true" />
    <div class="roster-registration-poster-card__mountain" aria-hidden="true" />
    <div class="roster-registration-poster-card__trace roster-registration-poster-card__trace--left" aria-hidden="true" />
    <div class="roster-registration-poster-card__trace roster-registration-poster-card__trace--right" aria-hidden="true" />

    <div class="roster-registration-poster-card__content">
      <header class="roster-registration-poster-card__header">
        <div class="roster-registration-poster-card__title-group">
          <p class="roster-registration-poster-card__eyebrow">{{ template.eyebrow }}</p>
          <h3 class="roster-registration-poster-card__title">{{ template.title }}</h3>
          <p class="roster-registration-poster-card__subtitle">{{ template.subtitle }}</p>
        </div>

        <div class="roster-registration-poster-card__seal">
          <span class="roster-registration-poster-card__seal-ring" />
          <strong>{{ template.sealText }}</strong>
          <small>云栖派门籍引帖</small>
        </div>
      </header>

      <section class="roster-registration-poster-card__hero">
        <article class="roster-registration-poster-card__paper">
          <p class="roster-registration-poster-card__section-label">山门相邀</p>
          <p class="roster-registration-poster-card__lead">{{ template.lead }}</p>

          <div class="roster-registration-poster-card__paper-foot">
            <span>云深有栖处</span>
            <span>同道留名时</span>
          </div>
        </article>

        <aside class="roster-registration-poster-card__process-column">
          <p class="roster-registration-poster-card__section-label">{{ template.processTitle }}</p>

          <article
            v-for="(item, index) in processList"
            :key="`${item}-${index}`"
            class="roster-registration-poster-card__process-card"
          >
            <span class="roster-registration-poster-card__process-index">{{ String(index + 1).padStart(2, '0') }}</span>
            <strong>{{ item }}</strong>
          </article>
        </aside>
      </section>

      <footer class="roster-registration-poster-card__footer">
        <div class="roster-registration-poster-card__footer-main">
          <article class="roster-registration-poster-card__closing-card">
            <p class="roster-registration-poster-card__section-label">{{ template.closingTitle }}</p>
            <p class="roster-registration-poster-card__closing-copy">{{ template.closingCopy }}</p>
          </article>

          <div class="roster-registration-poster-card__signature">
            <span>{{ template.signature }}</span>
            <small>公开名录招募帖</small>
          </div>
        </div>

        <div class="roster-registration-poster-card__qr-panel">
          <div class="roster-registration-poster-card__qr-shell">
            <img
              v-if="qrCodeUrl"
              class="roster-registration-poster-card__qr-image"
              :src="qrCodeUrl"
              alt="云栖名册公开名录二维码"
            />
            <div v-else class="roster-registration-poster-card__qr-placeholder" aria-hidden="true">
              云
            </div>
          </div>

          <div class="roster-registration-poster-card__qr-copy">
            <p class="roster-registration-poster-card__section-label">山门引路</p>
            <strong>{{ template.qrLabel }}</strong>
            <span>{{ template.qrCaption }}</span>
            <small>{{ displayQrHint }}</small>
          </div>
        </div>
      </footer>
    </div>
  </article>
</template>

<style scoped>
.roster-registration-poster-card {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
  border-radius: 34px;
  background:
    radial-gradient(circle at 18% 12%, rgba(139, 208, 203, 0.18), transparent 24%),
    radial-gradient(circle at 84% 12%, rgba(216, 185, 114, 0.18), transparent 22%),
    linear-gradient(180deg, #133241 0%, #0b2330 38%, #07161f 100%);
  box-shadow: 0 28px 72px rgba(0, 0, 0, 0.34);
  color: #f4efe2;
}

.roster-registration-poster-card__mist,
.roster-registration-poster-card__border,
.roster-registration-poster-card__mountain,
.roster-registration-poster-card__trace {
  position: absolute;
  pointer-events: none;
}

.roster-registration-poster-card__mist {
  width: 320px;
  height: 320px;
  border-radius: 999px;
  filter: blur(42px);
  animation: roster-registration-poster-mist-breathe 7s ease-in-out infinite;
}

.roster-registration-poster-card__mist--top {
  top: -70px;
  right: -70px;
  background: rgba(216, 185, 114, 0.16);
}

.roster-registration-poster-card__mist--bottom {
  bottom: 90px;
  left: -90px;
  background: rgba(139, 208, 203, 0.14);
  animation-delay: -2.2s;
}

.roster-registration-poster-card__border {
  inset: 22px;
  border: 1px solid rgba(216, 185, 114, 0.16);
  border-radius: 28px;
}

.roster-registration-poster-card__mountain {
  inset: auto 0 0 0;
  height: 22%;
  background:
    linear-gradient(150deg, transparent 0 16%, rgba(4, 17, 25, 0.96) 16% 100%),
    linear-gradient(22deg, transparent 0 24%, rgba(7, 25, 35, 0.98) 24% 100%),
    linear-gradient(180deg, transparent 0 20%, rgba(2, 10, 15, 0.94) 20% 100%);
  clip-path: polygon(0 100%, 0 72%, 12% 52%, 30% 78%, 48% 34%, 66% 82%, 84% 48%, 100% 74%, 100% 100%);
  opacity: 0.92;
}

.roster-registration-poster-card__trace {
  width: 1px;
  background: linear-gradient(180deg, rgba(216, 185, 114, 0), rgba(216, 185, 114, 0.62), rgba(216, 185, 114, 0));
  opacity: 0.46;
}

.roster-registration-poster-card__trace--left {
  top: 118px;
  bottom: 210px;
  left: 54px;
}

.roster-registration-poster-card__trace--right {
  top: 154px;
  bottom: 170px;
  right: 54px;
}

.roster-registration-poster-card__content {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 24px;
  height: 100%;
  padding: 42px 42px 38px;
}

.roster-registration-poster-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}

.roster-registration-poster-card__title-group {
  display: grid;
  gap: 12px;
  max-width: 620px;
}

.roster-registration-poster-card__eyebrow,
.roster-registration-poster-card__title,
.roster-registration-poster-card__subtitle,
.roster-registration-poster-card__lead,
.roster-registration-poster-card__section-label,
.roster-registration-poster-card__closing-copy {
  margin: 0;
}

.roster-registration-poster-card__eyebrow,
.roster-registration-poster-card__section-label {
  font-size: 13px;
  letter-spacing: 0.22em;
  color: rgba(139, 208, 203, 0.88);
}

.roster-registration-poster-card__title {
  font-size: clamp(62px, 8.4vw, 96px);
  line-height: 1.02;
  letter-spacing: 0.08em;
  color: #f0dfb0;
}

.roster-registration-poster-card__subtitle {
  font-size: 18px;
  line-height: 1.8;
  color: rgba(244, 239, 226, 0.76);
}

.roster-registration-poster-card__seal {
  position: relative;
  display: grid;
  width: 136px;
  height: 136px;
  place-items: center;
  align-content: center;
  gap: 6px;
  border-radius: 999px;
  background:
    radial-gradient(circle at 34% 30%, rgba(216, 185, 114, 0.3), transparent 32%),
    linear-gradient(160deg, rgba(12, 44, 58, 0.94), rgba(6, 20, 28, 0.98));
  box-shadow:
    inset 0 0 0 10px rgba(216, 185, 114, 0.06),
    0 18px 36px rgba(0, 0, 0, 0.24);
  animation: roster-registration-poster-seal-float 6s ease-in-out infinite;
}

.roster-registration-poster-card__seal-ring {
  position: absolute;
  inset: 10px;
  border-radius: 999px;
  border: 1px solid rgba(216, 185, 114, 0.34);
}

.roster-registration-poster-card__seal strong {
  color: #f0dfb0;
  font-size: 28px;
  letter-spacing: 0.16em;
}

.roster-registration-poster-card__seal small {
  color: rgba(244, 239, 226, 0.68);
  font-size: 12px;
  letter-spacing: 0.14em;
}

.roster-registration-poster-card__hero {
  display: grid;
  grid-template-columns: minmax(0, 1.18fr) minmax(260px, 0.82fr);
  gap: 22px;
  min-height: 0;
}

.roster-registration-poster-card__paper {
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 22px;
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

.roster-registration-poster-card__lead {
  align-self: center;
  font-size: clamp(26px, 4vw, 42px);
  line-height: 1.86;
  color: #173241;
}

.roster-registration-poster-card__paper-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  color: rgba(151, 98, 31, 0.94);
  font-size: 16px;
  letter-spacing: 0.12em;
}

.roster-registration-poster-card__process-column {
  display: grid;
  gap: 14px;
  align-content: start;
}

.roster-registration-poster-card__process-card {
  display: grid;
  grid-template-columns: 62px minmax(0, 1fr);
  gap: 16px;
  align-items: center;
  min-height: 88px;
  padding: 18px 20px;
  border-radius: 26px;
  border: 1px solid rgba(216, 185, 114, 0.18);
  background:
    linear-gradient(180deg, rgba(8, 28, 39, 0.84), rgba(6, 21, 30, 0.94)),
    rgba(7, 27, 37, 0.7);
}

.roster-registration-poster-card__process-index {
  display: grid;
  width: 62px;
  height: 62px;
  place-items: center;
  border-radius: 999px;
  border: 1px solid rgba(216, 185, 114, 0.24);
  background: rgba(10, 36, 48, 0.66);
  color: #f0dfb0;
  font-size: 20px;
  letter-spacing: 0.12em;
}

.roster-registration-poster-card__process-card strong {
  color: #f4efe2;
  font-size: 22px;
  line-height: 1.5;
  letter-spacing: 0.08em;
}

.roster-registration-poster-card__footer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 296px;
  gap: 20px;
  align-items: stretch;
}

.roster-registration-poster-card__footer-main {
  display: grid;
  gap: 18px;
}

.roster-registration-poster-card__closing-card {
  display: grid;
  gap: 12px;
  padding: 24px 26px;
  border-radius: 26px;
  border: 1px solid rgba(139, 208, 203, 0.14);
  background: rgba(7, 27, 37, 0.54);
}

.roster-registration-poster-card__closing-copy {
  color: rgba(244, 239, 226, 0.74);
  font-size: 17px;
  line-height: 1.9;
}

.roster-registration-poster-card__signature {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border-radius: 24px;
  border: 1px solid rgba(216, 185, 114, 0.16);
  background:
    linear-gradient(180deg, rgba(10, 34, 46, 0.86), rgba(6, 22, 31, 0.92)),
    rgba(8, 28, 39, 0.76);
}

.roster-registration-poster-card__signature span {
  color: rgba(244, 239, 226, 0.8);
  font-size: 17px;
}

.roster-registration-poster-card__signature small {
  color: rgba(139, 208, 203, 0.72);
  font-size: 13px;
}

.roster-registration-poster-card__qr-panel {
  display: grid;
  gap: 16px;
  align-content: center;
  padding: 18px;
  border: 1px solid rgba(216, 185, 114, 0.22);
  border-radius: 28px;
  background: rgba(8, 28, 39, 0.78);
  backdrop-filter: blur(12px);
}

.roster-registration-poster-card__qr-shell {
  display: grid;
  width: 150px;
  height: 150px;
  place-items: center;
  padding: 8px;
  border-radius: 22px;
  background: rgba(244, 239, 226, 0.96);
  box-shadow: inset 0 0 0 1px rgba(216, 185, 114, 0.18);
}

.roster-registration-poster-card__qr-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 12px;
}

.roster-registration-poster-card__qr-placeholder {
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
  letter-spacing: 0.26em;
}

.roster-registration-poster-card__qr-copy {
  display: grid;
  gap: 8px;
}

.roster-registration-poster-card__qr-copy strong {
  color: rgba(216, 185, 114, 0.96);
  font-size: 28px;
  line-height: 1.2;
}

.roster-registration-poster-card__qr-copy span {
  color: rgba(244, 239, 226, 0.72);
  font-size: 16px;
  line-height: 1.8;
}

.roster-registration-poster-card__qr-copy small {
  color: rgba(139, 208, 203, 0.72);
  font-size: 13px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.roster-registration-poster-card--reduced,
.roster-registration-poster-card--reduced * {
  transition: none !important;
  animation: none !important;
}

@keyframes roster-registration-poster-mist-breathe {
  0%,
  100% {
    opacity: 0.34;
    transform: scale(0.96);
  }

  50% {
    opacity: 0.68;
    transform: scale(1.04);
  }
}

@keyframes roster-registration-poster-seal-float {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-8px);
  }
}
</style>

/* 新版名册宣传海报：统一 1080×1350 的山门招帖。 */
.roster-registration-poster-card {
  border-radius: 44px;
  background:
    radial-gradient(circle at 50% 8%, rgba(255, 255, 255, 0.9), transparent 24%),
    radial-gradient(circle at 20% 78%, rgba(139, 208, 203, 0.24), transparent 28%),
    linear-gradient(145deg, #fcfff9 0%, #eaf8f1 48%, #d5eee8 100%);
  color: #173d42;
  box-shadow: 0 34px 90px rgba(42, 101, 101, 0.22);
}

.roster-registration-poster-card::before {
  position: absolute;
  inset: 34px;
  border: 1px solid rgba(84, 154, 151, 0.28);
  border-radius: 34px;
  background:
    linear-gradient(90deg, transparent 0 49%, rgba(84, 154, 151, 0.12) 49% 51%, transparent 51%),
    radial-gradient(circle at 74% 36%, rgba(216, 185, 114, 0.16), transparent 22%);
  content: '';
  pointer-events: none;
}

.roster-registration-poster-card__mountain,
.roster-registration-poster-card__trace {
  display: none;
}

.roster-registration-poster-card__content {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 28px;
  height: 100%;
  padding: 76px 70px 64px;
}

.roster-registration-poster-card__header,
.roster-registration-poster-card__hero,
.roster-registration-poster-card__footer {
  display: grid;
  gap: 24px;
}

.roster-registration-poster-card__header,
.roster-registration-poster-card__footer {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
}

.roster-registration-poster-card__title {
  color: #173d42;
  font-size: 70px;
  line-height: 1.06;
}

.roster-registration-poster-card__lead,
.roster-registration-poster-card__paper p,
.roster-registration-poster-card__closing-card p,
.roster-registration-poster-card__qr-copy span {
  color: rgba(35, 83, 86, 0.74);
}

.roster-registration-poster-card__hero {
  grid-template-columns: minmax(0, 1fr) 300px;
  align-items: stretch;
}

.roster-registration-poster-card__paper,
.roster-registration-poster-card__process-column,
.roster-registration-poster-card__closing-card,
.roster-registration-poster-card__qr-panel {
  border: 1px solid rgba(84, 154, 151, 0.22);
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.62);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.roster-registration-poster-card__paper {
  min-height: 480px;
  padding: 44px;
}

.roster-registration-poster-card__paper h3,
.roster-registration-poster-card__closing-card h3 {
  color: #173d42;
  font-size: 34px;
}

.roster-registration-poster-card__process-column {
  padding: 24px;
}

.roster-registration-poster-card__qr-shell {
  background: #f8fffb;
  box-shadow: inset 0 0 0 1px rgba(23, 61, 66, 0.18), 0 12px 28px rgba(42, 101, 101, 0.12);
}
