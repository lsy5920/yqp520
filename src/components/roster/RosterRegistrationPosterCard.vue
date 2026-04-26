<script setup lang="ts">
import { computed } from 'vue'
import type { RosterRegistrationPosterTemplate } from '@/types/roster'

/**
 * 组件入参类型
 * 用途：约束名册登记招募海报需要接收的模板和二维码内容
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

/** 用途：流程文案列表，最多展示四步，保证海报布局稳定。 */
const processList = computed<string[]>(() => (Array.isArray(props.template.processList) ? props.template.processList.slice(0, 4) : []))

/** 用途：二维码提示文本，优先使用真实网址，缺失时回退模板文案。 */
const displayQrHint = computed<string>(() => props.qrHint?.trim() || props.template.qrCaption)
</script>

<template>
  <article class="roster-registration-poster-card" :class="{ 'roster-registration-poster-card--reduced': reduceMotion }" aria-label="云栖名册招募海报预览">
    <div class="roster-registration-poster-card__texture" aria-hidden="true" />
    <div class="roster-registration-poster-card__mountain roster-registration-poster-card__mountain--back" aria-hidden="true" />
    <div class="roster-registration-poster-card__mountain roster-registration-poster-card__mountain--front" aria-hidden="true" />
    <div class="roster-registration-poster-card__mist roster-registration-poster-card__mist--top" aria-hidden="true" />
    <div class="roster-registration-poster-card__mist roster-registration-poster-card__mist--bottom" aria-hidden="true" />
    <div class="roster-registration-poster-card__border" aria-hidden="true" />

    <div class="roster-registration-poster-card__content">
      <header class="roster-registration-poster-card__header">
        <div class="roster-registration-poster-card__title-block">
          <p class="roster-registration-poster-card__eyebrow">{{ template.eyebrow }}</p>
          <h3 class="roster-registration-poster-card__title">{{ template.title }}</h3>
          <p class="roster-registration-poster-card__subtitle">{{ template.subtitle }}</p>
        </div>

        <div class="roster-registration-poster-card__seal">
          <img src="/images/yunqi-logo.png" alt="云栖派标识" />
          <span>{{ template.sealText }}</span>
        </div>
      </header>

      <section class="roster-registration-poster-card__hero">
        <article class="roster-registration-poster-card__edict">
          <p class="roster-registration-poster-card__section-label">山门招募帖</p>
          <p>{{ template.lead }}</p>
          <strong>云深有路，同道可来。</strong>
        </article>

        <aside class="roster-registration-poster-card__process">
          <p class="roster-registration-poster-card__section-label">{{ template.processTitle }}</p>
          <span v-for="(item, index) in processList" :key="`${item}-${index}`">
            {{ String(index + 1).padStart(2, '0') }} · {{ item }}
          </span>
        </aside>
      </section>

      <section class="roster-registration-poster-card__closing">
        <p class="roster-registration-poster-card__section-label">{{ template.closingTitle }}</p>
        <strong>{{ template.closingCopy }}</strong>
      </section>

      <footer class="roster-registration-poster-card__footer">
        <div class="roster-registration-poster-card__signature">
          <strong>{{ template.signature }}</strong>
          <small>新版水墨侠气公开招募海报</small>
        </div>

        <div class="roster-registration-poster-card__qr-panel">
          <div class="roster-registration-poster-card__qr-box">
            <img v-if="qrCodeUrl" :src="qrCodeUrl" alt="云栖名册二维码" />
            <span v-else>录</span>
          </div>
          <div class="roster-registration-poster-card__qr-copy">
            <strong>{{ template.qrLabel }}</strong>
            <span>{{ displayQrHint }}</span>
          </div>
        </div>
      </footer>
    </div>
  </article>
</template>

<style scoped>
.roster-registration-poster-card {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 34px;
  color: #17342f;
  background:
    radial-gradient(circle at 16% 12%, rgba(15, 111, 102, 0.16), transparent 24%),
    radial-gradient(circle at 84% 18%, rgba(112, 158, 147, 0.24), transparent 23%),
    linear-gradient(145deg, #edf7f3 0%, #d6e9e2 52%, #9fc8bd 100%);
  box-shadow: 0 30px 72px rgba(12, 8, 4, 0.34);
}

.roster-registration-poster-card__texture,
.roster-registration-poster-card__mountain,
.roster-registration-poster-card__mist,
.roster-registration-poster-card__border {
  position: absolute;
  pointer-events: none;
}

.roster-registration-poster-card__texture {
  inset: 0;
  background:
    linear-gradient(90deg, rgba(23, 52, 47, 0.05) 1px, transparent 1px),
    linear-gradient(0deg, rgba(23, 52, 47, 0.04) 1px, transparent 1px),
    radial-gradient(circle at 26% 42%, rgba(255, 255, 255, 0.36), transparent 20%);
  background-size: 38px 38px, 44px 44px, auto;
  opacity: 0.58;
}

.roster-registration-poster-card__mountain {
  left: 0;
  right: 0;
  bottom: 0;
}

.roster-registration-poster-card__mountain--back {
  height: 35%;
  background: linear-gradient(180deg, transparent, rgba(23, 52, 47, 0.38));
  clip-path: polygon(0 100%, 0 58%, 14% 38%, 32% 70%, 49% 30%, 66% 72%, 83% 42%, 100% 68%, 100% 100%);
}

.roster-registration-poster-card__mountain--front {
  height: 24%;
  background: linear-gradient(180deg, transparent, rgba(16, 37, 31, 0.72));
  clip-path: polygon(0 100%, 0 72%, 18% 48%, 38% 78%, 56% 42%, 73% 78%, 91% 54%, 100% 72%, 100% 100%);
}

.roster-registration-poster-card__mist {
  width: 440px;
  height: 130px;
  border-radius: 999px;
  background: rgba(255, 248, 229, 0.42);
  filter: blur(24px);
  animation: roster-registration-mist 8s ease-in-out infinite;
}

.roster-registration-poster-card__mist--top {
  top: 260px;
  left: -90px;
}

.roster-registration-poster-card__mist--bottom {
  right: -90px;
  bottom: 260px;
  animation-delay: -3s;
}

.roster-registration-poster-card__border {
  inset: 26px;
  border: 2px solid rgba(62, 111, 101, 0.44);
  border-radius: 28px;
  box-shadow: inset 0 0 0 1px rgba(244, 251, 247, 0.42);
}

.roster-registration-poster-card__content {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  gap: 24px;
  height: 100%;
  padding: 58px 58px 46px;
}

.roster-registration-poster-card__header,
.roster-registration-poster-card__hero,
.roster-registration-poster-card__footer {
  display: flex;
  justify-content: space-between;
  gap: 24px;
}

.roster-registration-poster-card__title-block,
.roster-registration-poster-card__edict,
.roster-registration-poster-card__process,
.roster-registration-poster-card__closing,
.roster-registration-poster-card__signature,
.roster-registration-poster-card__qr-copy {
  display: grid;
  gap: 10px;
}

.roster-registration-poster-card__eyebrow,
.roster-registration-poster-card__section-label {
  margin: 0;
  color: #0f6f66;
  font-size: 28px;
  font-weight: 900;
  letter-spacing: 0.14em;
}

.roster-registration-poster-card__title {
  margin: 0;
  color: #10251f;
  font-size: 92px;
  line-height: 1.04;
  letter-spacing: 0.08em;
}

.roster-registration-poster-card__subtitle,
.roster-registration-poster-card__signature small,
.roster-registration-poster-card__qr-copy span {
  margin: 0;
  color: rgba(23, 52, 47, 0.72);
  font-size: 22px;
  letter-spacing: 0.12em;
}

.roster-registration-poster-card__seal {
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

.roster-registration-poster-card__seal img {
  width: 78px;
  height: 78px;
  object-fit: contain;
}

.roster-registration-poster-card__seal span {
  font-size: 22px;
  font-weight: 900;
}

.roster-registration-poster-card__edict,
.roster-registration-poster-card__process,
.roster-registration-poster-card__closing,
.roster-registration-poster-card__qr-panel {
  border: 1px solid rgba(62, 111, 101, 0.34);
  border-radius: 32px;
  background: rgba(244, 251, 247, 0.62);
  box-shadow: inset 0 0 40px rgba(23, 52, 47, 0.08);
}

.roster-registration-poster-card__edict {
  flex: 1;
  align-content: center;
  padding: 34px;
}

.roster-registration-poster-card__edict p:not(.roster-registration-poster-card__section-label) {
  margin: 0;
  color: #10251f;
  font-size: 38px;
  line-height: 1.44;
  font-weight: 900;
}

.roster-registration-poster-card__edict strong {
  color: #0f6f66;
  font-size: 28px;
}

.roster-registration-poster-card__process {
  align-content: center;
  width: 330px;
  padding: 28px;
}

.roster-registration-poster-card__process span {
  display: grid;
  align-items: center;
  min-height: 58px;
  padding: 0 18px;
  border-radius: 999px;
  background: rgba(62, 111, 101, 0.12);
  color: #21443d;
  font-size: 22px;
  font-weight: 900;
}

.roster-registration-poster-card__closing {
  align-content: center;
  padding: 30px 34px;
}

.roster-registration-poster-card__closing strong {
  color: #17342f;
  font-size: 32px;
  line-height: 1.48;
}

.roster-registration-poster-card__signature strong {
  color: #10251f;
  font-size: 28px;
}

.roster-registration-poster-card__qr-panel {
  display: grid;
  grid-template-columns: 146px 1fr;
  gap: 18px;
  align-items: center;
  max-width: 390px;
  padding: 18px;
}

.roster-registration-poster-card__qr-box {
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

.roster-registration-poster-card__qr-box img {
  width: 124px;
  height: 124px;
  object-fit: contain;
}

.roster-registration-poster-card__qr-copy strong {
  color: #10251f;
  font-size: 26px;
}

@keyframes roster-registration-mist {
  0%, 100% { transform: translateX(0); opacity: 0.42; }
  50% { transform: translateX(48px); opacity: 0.72; }
}

.roster-registration-poster-card--reduced,
.roster-registration-poster-card--reduced * {
  animation: none !important;
  transition: none !important;
}
</style>

