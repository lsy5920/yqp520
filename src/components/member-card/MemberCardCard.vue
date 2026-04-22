<script setup lang="ts">
import { computed } from 'vue'
import { memberCardCopy } from '@/data/memberCardContent'
import type {
  MemberCardFormValue,
  MemberCardTemplateConfig,
} from '@/types/memberCard'
import {
  formatMemberCardNumber,
  normalizeMemberCardLongText,
  normalizeMemberCardShortText,
  splitMemberCardTags,
} from '@/utils/memberCard'

/**
 * 组件入参类型
 * 用途：约束同门名帖预览和导出所需的数据
 */
interface MemberCardCardProps {
  /** 用途：当前填写的同门信息 */
  form: MemberCardFormValue
  /** 用途：当前选中的模板配置 */
  template: MemberCardTemplateConfig
  /** 用途：当前同门编号 */
  number: number
  /** 用途：生成时间文本 */
  createdAtText: string
  /** 用途：卡片主标题，默认沿用门派题头 */
  cardTitle?: string
  /** 用途：卡片副标题，默认沿用门派抬头 */
  cardSubtitle?: string
  /** 用途：落款前缀 */
  signaturePrefix?: string
  /** 用途：纪年文本 */
  yearText?: string
  /** 用途：是否减少动态效果 */
  reduceMotion?: boolean
}

const props = withDefaults(defineProps<MemberCardCardProps>(), {
  cardTitle: memberCardCopy.generated.title,
  cardSubtitle: memberCardCopy.generated.subtitle,
  signaturePrefix: memberCardCopy.generated.signaturePrefix,
  yearText: memberCardCopy.generated.yearText,
  reduceMotion: false,
})

/**
 * 道号
 * 用途：展示在名帖最显眼的位置
 */
const displayDaoName = computed<string>(() => (
  normalizeMemberCardShortText(props.form.daoName, memberCardCopy.generated.fallbackDaoName)
))

/**
 * 俗世名号
 * 用途：展示同门愿不愿意留下俗世姓名
 */
const displayWorldName = computed<string>(() => (
  normalizeMemberCardShortText(props.form.worldName, memberCardCopy.generated.fallbackWorldName)
))

/**
 * 所居地域
 * 用途：展示同门所在的城市或地域
 */
const displayResidence = computed<string>(() => (
  normalizeMemberCardShortText(props.form.residence, memberCardCopy.generated.fallbackResidence)
))

/**
 * 门中短签
 * 用途：把所好拆成几枚短签，减少空白并增强门派味道
 */
const shortTagList = computed<string[]>(() => (
  splitMemberCardTags(props.form.shortTags, memberCardCopy.generated.fallbackShortTags)
))

/**
 * 入栖初心
 * 用途：展示加入云栖派的缘起与心境
 */
const displayOrigin = computed<string>(() => (
  normalizeMemberCardLongText(props.form.origin, memberCardCopy.generated.fallbackOrigin)
))

/**
 * 个人寄语
 * 用途：展示同门想留下的一句话
 */
const displayMotto = computed<string>(() => (
  normalizeMemberCardLongText(props.form.motto, memberCardCopy.generated.fallbackMotto)
))

/**
 * 头像首字
 * 用途：没有上传头像时，让占位块也有门派感
 */
const avatarInitial = computed<string>(() => (
  normalizeMemberCardShortText(displayDaoName.value, '栖').slice(0, 1) || '栖'
))

/**
 * 水印首字
 * 用途：把道号首字做成半透明底纹，增加古卷感
 */
const watermarkGlyph = computed<string>(() => (
  normalizeMemberCardShortText(displayDaoName.value, '栖').slice(0, 1) || '栖'
))

/**
 * 顺延编号文本
 * 用途：把数字变成更有门派感的同门编号
 */
const numberText = computed<string>(() => formatMemberCardNumber(props.number))

/**
 * 生成时间文本
 * 用途：让名帖里也保留一份生成时刻
 */
const createdAtLabel = computed<string>(() => {
  const safeText = props.createdAtText?.trim()
  return safeText || '刚刚制成'
})

/**
 * 顶部信息带
 * 用途：把俗名、居处、模板和编号压成一条更像门派落款的带子
 */
const ribbonItems = computed<string[]>(() => [
  displayWorldName.value,
  displayResidence.value,
  props.template.name,
  numberText.value,
])

/**
 * 身份信息块
 * 用途：把常用信息整理成短小的门帖式摘要
 */
const identityItems = computed<Array<{ label: string; value: string }>>(() => ([
  { label: '俗世名号', value: displayWorldName.value },
  { label: '所居地域', value: displayResidence.value },
  { label: '门帖编号', value: numberText.value },
  { label: '制成时记', value: createdAtLabel.value },
]))
</script>

<template>
  <article
    class="member-card-card"
    :class="[
      template.cardClass,
      { 'member-card-card--reduced': reduceMotion },
    ]"
    aria-label="云栖同门名帖预览"
  >
    <div class="member-card-card__grain" aria-hidden="true"></div>
    <div class="member-card-card__mist member-card-card__mist--top" aria-hidden="true"></div>
    <div class="member-card-card__mist member-card-card__mist--bottom" aria-hidden="true"></div>
    <div class="member-card-card__watermark" aria-hidden="true">{{ watermarkGlyph }}</div>
    <div class="member-card-card__rail" aria-hidden="true">
      <span class="member-card-card__rail-label">{{ memberCardCopy.generated.sideMark }}</span>
      <strong class="member-card-card__rail-number">{{ numberText }}</strong>
      <span class="member-card-card__rail-time">{{ createdAtLabel }}</span>
    </div>

    <div class="member-card-card__sheet">
      <header class="member-card-card__header">
        <div class="member-card-card__header-copy">
          <p class="member-card-card__eyebrow">{{ cardTitle }}</p>
          <h3 class="member-card-card__title">{{ displayDaoName }}</h3>
          <p class="member-card-card__subtitle">{{ cardSubtitle }}</p>
        </div>

        <div class="member-card-card__seal" aria-hidden="true">
          <span class="member-card-card__seal-top">{{ template.name }}</span>
          <strong class="member-card-card__seal-center">在册</strong>
          <span class="member-card-card__seal-bottom">{{ memberCardCopy.generated.sideMark }}</span>
        </div>
      </header>

      <div class="member-card-card__ribbon">
        <span
          v-for="item in ribbonItems"
          :key="item"
          class="member-card-card__ribbon-chip"
          :class="{ 'member-card-card__ribbon-chip--strong': item === numberText }"
        >
          {{ item }}
        </span>
      </div>

      <section class="member-card-card__identity">
        <div class="member-card-card__portrait">
          <img
            v-if="form.avatarDataUrl"
            class="member-card-card__portrait-image"
            :src="form.avatarDataUrl"
            :alt="`${displayDaoName} 的头像`"
          />
          <div v-else class="member-card-card__portrait-fallback" aria-hidden="true">
            <span>{{ avatarInitial }}</span>
          </div>
        </div>

        <div class="member-card-card__identity-stack">
          <article class="member-card-card__panel member-card-card__panel--tags">
            <p class="member-card-card__section-label">门中短签</p>

            <div class="member-card-card__tag-list">
              <span
                v-for="tag in shortTagList"
                :key="tag"
                class="member-card-card__tag"
              >
                {{ tag }}
              </span>
            </div>
          </article>

          <article class="member-card-card__panel member-card-card__panel--info">
            <div
              v-for="item in identityItems"
              :key="item.label"
              class="member-card-card__info-row"
            >
              <span class="member-card-card__info-label">{{ item.label }}</span>
              <strong class="member-card-card__info-value">{{ item.value }}</strong>
            </div>
          </article>
        </div>
      </section>

      <section class="member-card-card__story">
        <article class="member-card-card__story-card member-card-card__story-card--origin">
          <p class="member-card-card__section-label">入栖初心</p>
          <p class="member-card-card__story-text">{{ displayOrigin }}</p>
        </article>

        <article class="member-card-card__story-card member-card-card__story-card--motto">
          <p class="member-card-card__section-label">心之所语</p>
          <p class="member-card-card__story-text member-card-card__story-text--quote">“{{ displayMotto }}”</p>
        </article>
      </section>

      <footer class="member-card-card__footer">
        <div class="member-card-card__signature-block">
          <p class="member-card-card__signature">
            {{ signaturePrefix }} · {{ numberText }}
          </p>
          <div class="member-card-card__signature-line"></div>
          <p class="member-card-card__stamp">{{ yearText }}</p>
        </div>

        <div class="member-card-card__footer-mark">
          <span>{{ memberCardCopy.generated.sideMark }}</span>
          <strong>{{ createdAtLabel }}</strong>
        </div>
      </footer>
    </div>
  </article>
</template>

<style scoped>
.member-card-card {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
  border-radius: 38px;
  border: 1px solid rgba(216, 185, 114, 0.26);
  color: var(--member-card-ink, #f4efe2);
  background:
    radial-gradient(circle at 10% 8%, rgba(241, 217, 160, 0.18), transparent 18%),
    radial-gradient(circle at 86% 12%, rgba(139, 208, 203, 0.16), transparent 20%),
    linear-gradient(180deg, var(--member-card-bg-start, #17384b) 0%, var(--member-card-bg-mid, #0d2533) 46%, var(--member-card-bg-end, #051018) 100%);
  box-shadow: 0 32px 80px rgba(0, 0, 0, 0.36);
}

.member-card-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(120deg, rgba(255, 255, 255, 0.08), transparent 18%),
    repeating-linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.018) 0,
      rgba(255, 255, 255, 0.018) 1px,
      transparent 1px,
      transparent 14px
    );
  opacity: 0.8;
  pointer-events: none;
}

.member-card-card::after {
  content: '';
  position: absolute;
  inset: 18px;
  border-radius: 28px;
  border: 1px solid rgba(216, 185, 114, 0.14);
  pointer-events: none;
}

.member-card-card__grain,
.member-card-card__mist,
.member-card-card__watermark {
  position: absolute;
  pointer-events: none;
}

.member-card-card__grain {
  inset: 0;
  background:
    radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.03), transparent 34%),
    radial-gradient(circle at 20% 20%, rgba(241, 217, 160, 0.08), transparent 16%),
    radial-gradient(circle at 80% 76%, rgba(139, 208, 203, 0.08), transparent 18%);
  mix-blend-mode: screen;
  opacity: 0.9;
}

.member-card-card__mist {
  inset: 0;
  background-repeat: no-repeat;
  opacity: 0.55;
}

.member-card-card__mist--top {
  background:
    radial-gradient(circle at 14% 12%, rgba(139, 208, 203, 0.12), transparent 22%),
    radial-gradient(circle at 86% 10%, rgba(216, 185, 114, 0.14), transparent 18%);
}

.member-card-card__mist--bottom {
  background:
    radial-gradient(circle at 18% 86%, rgba(216, 185, 114, 0.1), transparent 18%),
    radial-gradient(circle at 82% 74%, rgba(139, 208, 203, 0.1), transparent 20%);
  filter: blur(12px);
}

.member-card-card__watermark {
  right: 54px;
  top: 50%;
  z-index: 0;
  transform: translateY(-50%) rotate(-8deg);
  color: rgba(240, 223, 176, 0.08);
  font-size: clamp(150px, 18vw, 300px);
  line-height: 1;
  letter-spacing: 0.08em;
  text-shadow: 0 0 30px rgba(240, 223, 176, 0.08);
  user-select: none;
}

.member-card-card__rail {
  position: absolute;
  left: 24px;
  top: 24px;
  bottom: 24px;
  z-index: 1;
  display: grid;
  align-items: center;
  justify-items: center;
  grid-template-rows: auto 1fr auto;
  width: 42px;
  padding: 6px 0;
  border-right: 1px solid rgba(216, 185, 114, 0.18);
}

.member-card-card__rail-label,
.member-card-card__rail-number,
.member-card-card__rail-time {
  writing-mode: vertical-rl;
  text-orientation: upright;
  letter-spacing: 0.22em;
}

.member-card-card__rail-label {
  color: rgba(241, 217, 160, 0.92);
  font-size: 12px;
}

.member-card-card__rail-number {
  color: rgba(244, 239, 226, 0.72);
  font-size: 11px;
}

.member-card-card__rail-time {
  color: rgba(244, 239, 226, 0.5);
  font-size: 10px;
}

.member-card-card__sheet {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 14px;
  height: 100%;
  padding: 28px 28px 22px 84px;
}

.member-card-card__header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px;
  align-items: start;
}

.member-card-card__header-copy {
  min-width: 0;
  display: grid;
  gap: 10px;
}

.member-card-card__eyebrow,
.member-card-card__subtitle,
.member-card-card__section-label,
.member-card-card__info-label,
.member-card-card__signature,
.member-card-card__stamp,
.member-card-card__footer-mark strong {
  margin: 0;
}

.member-card-card__eyebrow {
  color: rgba(139, 208, 203, 0.9);
  font-size: 13px;
  letter-spacing: 0.18em;
}

.member-card-card__title {
  margin: 0;
  font-size: clamp(58px, 6.8vw, 102px);
  line-height: 0.98;
  letter-spacing: 0.08em;
  overflow-wrap: anywhere;
  word-break: break-word;
  text-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
}

.member-card-card__subtitle {
  color: rgba(244, 239, 226, 0.72);
  line-height: 1.72;
  letter-spacing: 0.1em;
  font-size: 13px;
}

.member-card-card__seal {
  position: relative;
  display: grid;
  place-items: center;
  width: 132px;
  min-height: 132px;
  padding: 16px 10px;
  border-radius: 24px;
  border: 1px solid rgba(241, 217, 160, 0.34);
  background:
    linear-gradient(180deg, var(--member-card-seal-start, #6b1218), var(--member-card-seal-end, #33080b)),
    rgba(7, 27, 37, 0.94);
  box-shadow:
    inset 0 0 0 8px rgba(241, 217, 160, 0.06),
    0 16px 32px rgba(0, 0, 0, 0.24);
}

.member-card-card__seal::before,
.member-card-card__seal::after {
  content: '';
  position: absolute;
  inset: 10px;
  border-radius: 18px;
  border: 1px solid rgba(241, 217, 160, 0.14);
}

.member-card-card__seal::after {
  inset: 18px;
}

.member-card-card__seal-top,
.member-card-card__seal-bottom {
  position: relative;
  z-index: 1;
  color: rgba(244, 239, 226, 0.9);
  font-size: 12px;
  letter-spacing: 0.18em;
}

.member-card-card__seal-center {
  position: relative;
  z-index: 1;
  margin: 6px 0;
  color: #f3e0aa;
  font-size: 28px;
  letter-spacing: 0.18em;
}

.member-card-card__ribbon {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 18px;
  border: 1px solid rgba(216, 185, 114, 0.16);
  background:
    linear-gradient(180deg, rgba(7, 31, 43, 0.56), rgba(6, 22, 31, 0.88)),
    rgba(7, 27, 37, 0.42);
}

.member-card-card__ribbon-chip {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(216, 185, 114, 0.16);
  background: rgba(7, 27, 37, 0.34);
  color: rgba(244, 239, 226, 0.9);
  font-size: 0.82rem;
  letter-spacing: 0.06em;
}

.member-card-card__ribbon-chip--strong {
  color: #f0dfb0;
  border-color: rgba(216, 185, 114, 0.28);
}

.member-card-card__identity {
  display: grid;
  grid-template-columns: minmax(230px, 0.88fr) minmax(0, 1.12fr);
  gap: 16px;
  align-items: start;
}

.member-card-card__portrait {
  position: relative;
  overflow: hidden;
  aspect-ratio: 1 / 1.08;
  border-radius: 30px;
  border: 1px solid rgba(216, 185, 114, 0.18);
  background:
    radial-gradient(circle at 32% 28%, rgba(139, 208, 203, 0.18), transparent 30%),
    linear-gradient(180deg, rgba(11, 34, 46, 0.96), rgba(6, 19, 27, 0.98));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 18px 30px rgba(0, 0, 0, 0.16);
}

.member-card-card__portrait::before {
  content: '';
  position: absolute;
  inset: 12px;
  border-radius: 24px;
  border: 1px solid rgba(241, 217, 160, 0.16);
  pointer-events: none;
}

.member-card-card__portrait-image,
.member-card-card__portrait-fallback {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.member-card-card__portrait-fallback {
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 34% 32%, rgba(216, 185, 114, 0.24), transparent 30%),
    linear-gradient(145deg, rgba(16, 49, 66, 0.96), rgba(6, 19, 27, 0.98));
}

.member-card-card__portrait-fallback span {
  color: #f0dfb0;
  font-size: clamp(2.6rem, 4vw, 4rem);
  letter-spacing: 0.2em;
}

.member-card-card__identity-stack {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.member-card-card__panel {
  display: grid;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 22px;
  border: 1px solid rgba(147, 203, 198, 0.14);
  background: rgba(7, 27, 37, 0.54);
}

.member-card-card__panel--tags {
  min-height: 160px;
  background:
    linear-gradient(180deg, rgba(20, 52, 68, 0.24), rgba(7, 27, 37, 0.92)),
    rgba(7, 27, 37, 0.52);
}

.member-card-card__panel--info {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.member-card-card__section-label {
  color: rgba(139, 208, 203, 0.88);
  font-size: 12px;
  letter-spacing: 0.2em;
}

.member-card-card__tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.member-card-card__tag {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(216, 185, 114, 0.18);
  background: rgba(8, 31, 43, 0.44);
  color: #f0dfb0;
  font-size: 0.82rem;
  letter-spacing: 0.06em;
}

.member-card-card__info-row {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.member-card-card__info-label {
  color: rgba(139, 208, 203, 0.82);
  font-size: 12px;
  letter-spacing: 0.16em;
}

.member-card-card__info-value {
  color: rgba(244, 239, 226, 0.94);
  font-size: 0.95rem;
  line-height: 1.6;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.member-card-card__story {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr);
  gap: 12px;
}

.member-card-card__story-card {
  display: grid;
  gap: 10px;
  min-height: 152px;
  padding: 14px 16px;
  border-radius: 20px;
  border: 1px solid rgba(147, 203, 198, 0.14);
  background: rgba(7, 27, 37, 0.54);
}

.member-card-card__story-card--origin {
  background:
    linear-gradient(180deg, rgba(41, 29, 15, 0.2), rgba(7, 27, 37, 0.92)),
    rgba(7, 27, 37, 0.52);
}

.member-card-card__story-card--motto {
  background:
    linear-gradient(180deg, rgba(9, 34, 44, 0.58), rgba(7, 27, 37, 0.94)),
    rgba(7, 27, 37, 0.52);
}

.member-card-card__story-text {
  margin: 0;
  color: rgba(244, 239, 226, 0.94);
  font-size: 0.98rem;
  line-height: 1.82;
  word-break: break-word;
}

.member-card-card__story-text--quote {
  font-size: 1.02rem;
}

.member-card-card__footer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px;
  align-items: end;
  margin-top: auto;
}

.member-card-card__signature-block {
  display: grid;
  gap: 10px;
}

.member-card-card__signature {
  color: #f0dfb0;
  font-size: 0.96rem;
  letter-spacing: 0.16em;
}

.member-card-card__signature-line {
  width: min(260px, 100%);
  height: 1px;
  background: linear-gradient(90deg, rgba(216, 185, 114, 0.66), rgba(216, 185, 114, 0));
}

.member-card-card__stamp {
  color: rgba(244, 239, 226, 0.56);
  font-size: 0.84rem;
  letter-spacing: 0.16em;
}

.member-card-card__footer-mark {
  display: grid;
  gap: 6px;
  justify-items: end;
  text-align: right;
}

.member-card-card__footer-mark span {
  color: rgba(241, 217, 160, 0.92);
  font-size: 12px;
  letter-spacing: 0.18em;
}

.member-card-card__footer-mark strong {
  color: rgba(244, 239, 226, 0.5);
  font-size: 11px;
  letter-spacing: 0.14em;
}

.member-card-card--qingya {
  --member-card-bg-start: #17384b;
  --member-card-bg-mid: #0d2533;
  --member-card-bg-end: #051018;
  --member-card-seal-start: #67141b;
  --member-card-seal-end: #32100b;
}

.member-card-card--zhuyin {
  --member-card-bg-start: #1a4356;
  --member-card-bg-mid: #0b2231;
  --member-card-bg-end: #041018;
  --member-card-seal-start: #8a1820;
  --member-card-seal-end: #3f0b10;
}

.member-card-card--zhuyin .member-card-card__seal {
  box-shadow:
    inset 0 0 0 8px rgba(241, 217, 160, 0.08),
    0 18px 34px rgba(0, 0, 0, 0.28);
}

.member-card-card--zhuyin .member-card-card__grain {
  opacity: 1;
}

.member-card-card--reduced,
.member-card-card--reduced * {
  transition: none !important;
  animation: none !important;
}

@media (max-width: 960px) {
  .member-card-card__sheet {
    padding: 24px 20px 18px 68px;
    gap: 12px;
  }

  .member-card-card__identity,
  .member-card-card__story,
  .member-card-card__footer {
    gap: 12px;
  }

  .member-card-card__identity {
    grid-template-columns: 1fr;
  }

  .member-card-card__portrait {
    width: min(100%, 240px);
  }

  .member-card-card__identity-stack {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .member-card-card {
    border-radius: 30px;
  }

  .member-card-card::after {
    inset: 12px;
    border-radius: 22px;
  }

  .member-card-card__rail {
    left: 14px;
    top: 14px;
    bottom: 14px;
    width: 30px;
  }

  .member-card-card__rail-label,
  .member-card-card__rail-number,
  .member-card-card__rail-time {
    letter-spacing: 0.16em;
  }

  .member-card-card__sheet {
    padding: 16px 12px 14px 52px;
    gap: 10px;
  }

  .member-card-card__header {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .member-card-card__seal {
    width: 96px;
    min-height: 96px;
    padding: 10px 8px;
    border-radius: 18px;
  }

  .member-card-card__seal-center {
    margin: 4px 0;
    font-size: 20px;
  }

  .member-card-card__title {
    font-size: clamp(2.1rem, 8vw, 3rem);
    line-height: 1.02;
  }

  .member-card-card__eyebrow,
  .member-card-card__subtitle {
    font-size: 11px;
    line-height: 1.6;
    letter-spacing: 0.08em;
  }

  .member-card-card__ribbon {
    padding: 10px 12px;
    gap: 8px;
  }

  .member-card-card__ribbon-chip {
    min-height: 28px;
    padding: 0 10px;
    font-size: 0.76rem;
  }

  .member-card-card__panel,
  .member-card-card__story-card {
    padding: 12px;
    border-radius: 16px;
  }

  .member-card-card__panel--tags {
    min-height: 0;
  }

  .member-card-card__panel--info {
    grid-template-columns: 1fr 1fr;
  }

  .member-card-card__story {
    grid-template-columns: 1fr;
  }

  .member-card-card__story-card {
    min-height: 0;
  }

  .member-card-card__portrait {
    width: min(100%, 180px);
    aspect-ratio: 1 / 1.08;
  }

  .member-card-card__info-value,
  .member-card-card__story-text,
  .member-card-card__signature {
    font-size: 0.88rem;
    line-height: 1.68;
  }

  .member-card-card__story-text--quote {
    font-size: 0.92rem;
  }

  .member-card-card__footer {
    grid-template-columns: 1fr;
    justify-items: start;
  }

  .member-card-card__footer-mark {
    justify-items: start;
    text-align: left;
  }
}
</style>
