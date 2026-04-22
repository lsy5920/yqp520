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
 * 组件参数类型
 * 用途：描述名帖卡片需要接收的全部数据，方便预览和导出共用同一套结构。
 */
interface MemberCardCardProps {
  /** 用途：当前正在展示的名帖表单内容。 */
  form: MemberCardFormValue
  /** 用途：当前选中的卡片模板样式。 */
  template: MemberCardTemplateConfig
  /** 用途：当前同门的顺延编号。 */
  number: number
  /** 用途：卡片落款时显示的生成时间文字。 */
  createdAtText: string
  /** 用途：卡片顶部的小标题，默认沿用同门名帖总标题。 */
  cardTitle?: string
  /** 用途：卡片顶部的副标题，默认沿用生成副标题。 */
  cardSubtitle?: string
  /** 用途：卡片底部签名的前缀文字。 */
  signaturePrefix?: string
  /** 用途：卡片底部显示的纪年文字。 */
  yearText?: string
  /** 用途：是否关闭动效，方便需要静态展示的场景。 */
  reduceMotion?: boolean
}

const props = withDefaults(defineProps<MemberCardCardProps>(), {
  cardTitle: memberCardCopy.generated.title,
  cardSubtitle: memberCardCopy.generated.subtitle,
  signaturePrefix: memberCardCopy.generated.signaturePrefix,
  yearText: memberCardCopy.generated.yearText,
  reduceMotion: false,
})

// 这里把道号清洗成卡片主标题，方便一眼看到这张名帖是谁的。
const displayDaoName = computed<string>(() => (
  normalizeMemberCardShortText(props.form.daoName, memberCardCopy.generated.fallbackDaoName)
))

// 这里把俗世名号清洗出来，方便在身份区里补充真实姓名。
const displayWorldName = computed<string>(() => (
  normalizeMemberCardShortText(props.form.worldName, memberCardCopy.generated.fallbackWorldName)
))

// 这里把所居地域清洗出来，方便给名帖补一条地点信息。
const displayResidence = computed<string>(() => (
  normalizeMemberCardShortText(props.form.residence, memberCardCopy.generated.fallbackResidence)
))

// 这里把门中短签拆成多个标签，方便卡片看起来更像成品名片。
const shortTagList = computed<string[]>(() => (
  splitMemberCardTags(props.form.shortTags, memberCardCopy.generated.fallbackShortTags)
))

// 这里把入栖初心整理成长句，方便放到说明区里稳定展示。
const displayOrigin = computed<string>(() => (
  normalizeMemberCardLongText(props.form.origin, memberCardCopy.generated.fallbackOrigin)
))

// 这里把心之所语整理成长句，方便在底部用引用式收束。
const displayMotto = computed<string>(() => (
  normalizeMemberCardLongText(props.form.motto, memberCardCopy.generated.fallbackMotto)
))

// 这里取道号首字作为头像占位字，方便没有头像时也不显空。
const avatarInitial = computed<string>(() => (
  normalizeMemberCardShortText(displayDaoName.value, '栖').slice(0, 1) || '栖'
))

// 这里取道号首字做背景水印，方便卡片背后有一点门派记号。
const watermarkGlyph = computed<string>(() => (
  normalizeMemberCardShortText(displayDaoName.value, '栖').slice(0, 1) || '栖'
))

// 这里把编号整理成统一格式，方便页面和导出图保持一致。
const numberText = computed<string>(() => formatMemberCardNumber(props.number))

// 这里把生成时间清洗成更适合落款的文字。
const createdAtLabel = computed<string>(() => {
  const safeText = props.createdAtText.trim()
  return safeText || '刚刚制成'
})

// 这里整理顶部要展示的短标签，方便把模板、地域、编号压成一排。
const headerChipList = computed<string[]>(() => [
  props.template.name,
  displayResidence.value,
  memberCardCopy.generated.sideMark,
  numberText.value,
])

// 这里整理身份信息区的条目，方便用统一网格展示基础信息。
const identityItemList = computed<Array<{ label: string; value: string }>>(() => [
  { label: '俗世名号', value: displayWorldName.value },
  { label: '所居地域', value: displayResidence.value },
  { label: '门帖编号', value: numberText.value },
  { label: '制成时记', value: createdAtLabel.value },
])

// 这里统计短签数量，方便在标签区里给出简短提示。
const shortTagSummary = computed<string>(() => `已拆成 ${shortTagList.value.length} 枚短签`)
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
    <div class="member-card-card__backdrop" aria-hidden="true"></div>
    <div class="member-card-card__grain" aria-hidden="true"></div>
    <div class="member-card-card__watermark" aria-hidden="true">
      {{ watermarkGlyph }}
    </div>

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

          <div class="member-card-card__meta-list">
            <span
              v-for="chip in headerChipList"
              :key="chip"
              class="member-card-card__meta-chip"
              :class="{ 'member-card-card__meta-chip--strong': chip === numberText }"
            >
              {{ chip }}
            </span>
          </div>
        </div>

        <div class="member-card-card__seal" aria-hidden="true">
          <span class="member-card-card__seal-top">{{ template.name }}</span>
          <strong class="member-card-card__seal-center">在册</strong>
          <span class="member-card-card__seal-bottom">{{ memberCardCopy.generated.sideMark }}</span>
        </div>
      </header>

      <section class="member-card-card__hero">
        <article class="member-card-card__portrait">
          <div class="member-card-card__portrait-frame">
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

          <div class="member-card-card__portrait-caption">
            <p class="member-card-card__portrait-kicker">{{ memberCardCopy.generated.sideMark }}</p>
            <strong class="member-card-card__portrait-name">{{ displayDaoName }}</strong>
            <p class="member-card-card__portrait-detail">{{ numberText }} · {{ template.name }}</p>
          </div>
        </article>

        <div class="member-card-card__summary">
          <article class="member-card-card__panel member-card-card__panel--tags">
            <div class="member-card-card__panel-head">
              <div>
                <p class="member-card-card__section-label">门中短签</p>
                <strong class="member-card-card__panel-title">{{ shortTagSummary }}</strong>
              </div>
              <span class="member-card-card__panel-note">{{ cardSubtitle }}</span>
            </div>

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

          <article class="member-card-card__panel member-card-card__panel--identity">
            <div class="member-card-card__panel-head">
              <div>
                <p class="member-card-card__section-label">门籍信息</p>
                <strong class="member-card-card__panel-title">四项基础身份</strong>
              </div>
              <span class="member-card-card__panel-note">清洗后直接展示</span>
            </div>

            <div class="member-card-card__identity-grid">
              <div
                v-for="item in identityItemList"
                :key="item.label"
                class="member-card-card__identity-item"
              >
                <span class="member-card-card__identity-label">{{ item.label }}</span>
                <strong class="member-card-card__identity-value">{{ item.value }}</strong>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section class="member-card-card__story">
        <article class="member-card-card__story-card member-card-card__story-card--origin">
          <div class="member-card-card__story-head">
            <p class="member-card-card__section-label">入栖初心</p>
            <span class="member-card-card__story-mark">门帖收纳</span>
          </div>
          <p class="member-card-card__story-text">{{ displayOrigin }}</p>
        </article>

        <article class="member-card-card__story-card member-card-card__story-card--motto">
          <div class="member-card-card__story-head">
            <p class="member-card-card__section-label">心之所语</p>
            <span class="member-card-card__story-mark">一句落款</span>
          </div>
          <p class="member-card-card__story-text member-card-card__story-text--quote">“{{ displayMotto }}”</p>
        </article>
      </section>

      <footer class="member-card-card__footer">
        <div class="member-card-card__signature-block">
          <p class="member-card-card__signature">{{ signaturePrefix }} · {{ numberText }}</p>
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
/* 这里定义卡片最外层的整体气质，负责背景、边框和整体层次。 */
.member-card-card {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
  border-radius: 38px;
  border: 1px solid rgba(216, 185, 114, 0.22);
  color: var(--member-card-ink, #f4efe2);
  background:
    radial-gradient(circle at 12% 10%, rgba(241, 217, 160, 0.18), transparent 20%),
    radial-gradient(circle at 84% 18%, rgba(139, 208, 203, 0.16), transparent 22%),
    radial-gradient(circle at 76% 78%, rgba(27, 71, 94, 0.36), transparent 28%),
    linear-gradient(180deg, var(--member-card-bg-start, #17384b) 0%, var(--member-card-bg-mid, #0d2533) 48%, var(--member-card-bg-end, #07111a) 100%);
  box-shadow: 0 30px 84px rgba(0, 0, 0, 0.34);
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
  opacity: 0.56;
  pointer-events: none;
}

.member-card-card::after {
  content: '';
  position: absolute;
  inset: 18px;
  border-radius: 30px;
  border: 1px solid rgba(216, 185, 114, 0.12);
  pointer-events: none;
}

/* 这里放背景装饰层，负责让卡片更像一张有纸感的成品。 */
.member-card-card__backdrop,
.member-card-card__grain,
.member-card-card__watermark,
.member-card-card__rail {
  position: absolute;
  pointer-events: none;
}

.member-card-card__backdrop {
  inset: 0;
  background:
    radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.08), transparent 32%),
    radial-gradient(circle at 84% 80%, rgba(31, 68, 90, 0.24), transparent 30%);
  opacity: 0.95;
}

.member-card-card__grain {
  inset: 0;
  background:
    radial-gradient(circle at 16% 20%, rgba(241, 217, 160, 0.08), transparent 18%),
    radial-gradient(circle at 78% 74%, rgba(139, 208, 203, 0.08), transparent 16%),
    repeating-linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.012) 0,
      rgba(255, 255, 255, 0.012) 2px,
      transparent 2px,
      transparent 8px
    );
  mix-blend-mode: soft-light;
  opacity: 0.72;
}

.member-card-card__watermark {
  right: 50px;
  top: 52%;
  z-index: 0;
  transform: translateY(-50%) rotate(-8deg);
  color: rgba(240, 223, 176, 0.07);
  font-size: clamp(160px, 19vw, 320px);
  line-height: 1;
  letter-spacing: 0.08em;
  text-shadow: 0 0 30px rgba(240, 223, 176, 0.08);
  user-select: none;
}

.member-card-card__rail {
  left: 24px;
  top: 24px;
  bottom: 24px;
  z-index: 1;
  display: grid;
  align-items: center;
  justify-items: center;
  grid-template-rows: auto 1fr auto;
  width: 44px;
  padding: 6px 0;
  border-right: 1px solid rgba(216, 185, 114, 0.16);
}

.member-card-card__rail-label,
.member-card-card__rail-number,
.member-card-card__rail-time {
  writing-mode: vertical-rl;
  text-orientation: upright;
  letter-spacing: 0.22em;
}

.member-card-card__rail-label {
  color: rgba(241, 217, 160, 0.9);
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

/* 这里放真正的卡片内容，确保所有信息都按层级整齐排好。 */
.member-card-card__sheet {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: auto auto auto auto;
  gap: 16px;
  height: 100%;
  padding: 28px 28px 24px 84px;
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
.member-card-card__story-mark,
.member-card-card__panel-note,
.member-card-card__rail-label,
.member-card-card__rail-number,
.member-card-card__rail-time,
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
  font-size: clamp(58px, 6.6vw, 102px);
  line-height: 0.98;
  letter-spacing: 0.08em;
  overflow-wrap: anywhere;
  word-break: break-word;
  text-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
}

.member-card-card__subtitle {
  color: rgba(244, 239, 226, 0.74);
  line-height: 1.74;
  letter-spacing: 0.1em;
  font-size: 13px;
}

.member-card-card__meta-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.member-card-card__meta-chip {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(216, 185, 114, 0.14);
  background: rgba(7, 27, 37, 0.34);
  color: rgba(244, 239, 226, 0.9);
  font-size: 0.82rem;
  letter-spacing: 0.06em;
}

.member-card-card__meta-chip--strong {
  color: #f0dfb0;
  border-color: rgba(216, 185, 114, 0.3);
}

.member-card-card__seal {
  position: relative;
  display: grid;
  place-items: center;
  width: 124px;
  min-height: 124px;
  padding: 16px 10px;
  border-radius: 26px;
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

/* 这里放头像和信息摘要，负责把最重要的身份信息先摆出来。 */
.member-card-card__hero {
  display: grid;
  grid-template-columns: minmax(240px, 0.86fr) minmax(0, 1.14fr);
  gap: 14px;
  align-items: stretch;
  min-height: 0;
}

.member-card-card__portrait {
  position: relative;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 10px;
  min-width: 0;
  min-height: 0;
  padding: 12px;
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

.member-card-card__portrait-frame {
  position: relative;
  overflow: hidden;
  min-height: 224px;
  border-radius: 22px;
  border: 1px solid rgba(241, 217, 160, 0.12);
  background:
    radial-gradient(circle at 34% 32%, rgba(216, 185, 114, 0.24), transparent 30%),
    linear-gradient(145deg, rgba(16, 49, 66, 0.96), rgba(6, 19, 27, 0.98));
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
}

.member-card-card__portrait-fallback span {
  color: #f0dfb0;
  font-size: clamp(2.6rem, 4vw, 4rem);
  letter-spacing: 0.2em;
}

.member-card-card__portrait-caption {
  display: grid;
  gap: 5px;
  padding: 12px 14px;
  border-radius: 18px;
  border: 1px solid rgba(241, 217, 160, 0.16);
  background: linear-gradient(180deg, rgba(6, 19, 27, 0.52), rgba(6, 19, 27, 0.9));
}

.member-card-card__portrait-kicker {
  margin: 0;
  color: rgba(244, 239, 226, 0.68);
  font-size: 11px;
  letter-spacing: 0.18em;
}

.member-card-card__portrait-name {
  color: #f0dfb0;
  font-size: 15px;
  line-height: 1.2;
  letter-spacing: 0.14em;
}

.member-card-card__portrait-detail {
  margin: 0;
  color: rgba(244, 239, 226, 0.7);
  font-size: 11px;
  letter-spacing: 0.14em;
}

.member-card-card__summary {
  display: grid;
  gap: 12px;
  min-width: 0;
  min-height: 0;
}

.member-card-card__panel {
  display: grid;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 22px;
  border: 1px solid rgba(147, 203, 198, 0.14);
  background: rgba(7, 27, 37, 0.54);
}

.member-card-card__panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.member-card-card__panel-title {
  display: block;
  margin-top: 6px;
  color: #f0dfb0;
  font-size: 1rem;
  line-height: 1.5;
  letter-spacing: 0.12em;
}

.member-card-card__panel-note {
  color: rgba(241, 217, 160, 0.72);
  font-size: 11px;
  letter-spacing: 0.14em;
  white-space: nowrap;
}

.member-card-card__panel--tags {
  background:
    linear-gradient(180deg, rgba(20, 52, 68, 0.24), rgba(7, 27, 37, 0.92)),
    rgba(7, 27, 37, 0.52);
}

.member-card-card__panel--identity {
  background:
    linear-gradient(180deg, rgba(9, 33, 45, 0.48), rgba(7, 27, 37, 0.92)),
    rgba(7, 27, 37, 0.52);
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

.member-card-card__identity-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 14px;
}

.member-card-card__identity-item {
  display: grid;
  gap: 6px;
  min-width: 0;
  padding: 12px 13px;
  border-radius: 16px;
  border: 1px solid rgba(216, 185, 114, 0.12);
  background: rgba(8, 31, 43, 0.36);
}

.member-card-card__identity-label {
  color: rgba(139, 208, 203, 0.82);
  font-size: 11px;
  letter-spacing: 0.16em;
}

.member-card-card__identity-value {
  color: rgba(244, 239, 226, 0.94);
  font-size: 0.95rem;
  line-height: 1.58;
  overflow-wrap: anywhere;
  word-break: break-word;
}

/* 这里放初心和寄语区，负责把名帖最有温度的内容收尾。 */
.member-card-card__story {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  min-height: 0;
}

.member-card-card__story-card {
  display: grid;
  align-content: start;
  gap: 10px;
  min-height: 100%;
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

.member-card-card__story-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.member-card-card__story-mark {
  color: rgba(241, 217, 160, 0.72);
  font-size: 11px;
  letter-spacing: 0.14em;
  white-space: nowrap;
}

.member-card-card__story-text {
  margin: 0;
  color: rgba(244, 239, 226, 0.94);
  font-size: 0.98rem;
  line-height: 1.82;
  word-break: break-word;
  white-space: pre-wrap;
}

.member-card-card__story-text--quote {
  font-size: 1.02rem;
}

/* 这里放最末尾的落款，方便把签名和纪年统一收住。 */
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
  color: rgba(244, 239, 226, 0.52);
  font-size: 11px;
  letter-spacing: 0.14em;
}

/* 这里保留两套模板的颜色差异，方便同一套版式在不同气质里切换。 */
.member-card-card--qingya {
  --member-card-bg-start: #17384b;
  --member-card-bg-mid: #0d2533;
  --member-card-bg-end: #07111a;
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

  .member-card-card__header,
  .member-card-card__hero {
    grid-template-columns: 1fr;
  }

  .member-card-card__seal {
    width: 104px;
    min-height: 104px;
    padding: 12px 8px;
    border-radius: 20px;
  }

  .member-card-card__seal-center {
    margin: 4px 0;
    font-size: 22px;
  }

  .member-card-card__hero {
    gap: 12px;
  }

  .member-card-card__portrait {
    width: min(100%, 260px);
  }

  .member-card-card__portrait-frame {
    min-height: 200px;
  }

  .member-card-card__story {
    grid-template-columns: 1fr;
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

  .member-card-card__meta-list {
    gap: 6px;
  }

  .member-card-card__meta-chip {
    min-height: 28px;
    padding: 0 10px;
    font-size: 0.76rem;
  }

  .member-card-card__panel,
  .member-card-card__story-card {
    padding: 12px;
    border-radius: 16px;
  }

  .member-card-card__panel-head {
    align-items: start;
    flex-direction: column;
  }

  .member-card-card__panel-note {
    white-space: normal;
  }

  .member-card-card__portrait {
    width: min(100%, 190px);
    padding: 10px;
  }

  .member-card-card__portrait-frame {
    min-height: 160px;
  }

  .member-card-card__portrait-caption {
    padding: 10px 12px;
  }

  .member-card-card__portrait-name {
    font-size: 14px;
  }

  .member-card-card__identity-grid {
    gap: 10px;
  }

  .member-card-card__identity-item {
    padding: 10px 11px;
  }

  .member-card-card__identity-value,
  .member-card-card__story-text,
  .member-card-card__signature {
    font-size: 0.88rem;
    line-height: 1.68;
  }

  .member-card-card__story-text--quote {
    font-size: 0.92rem;
  }

  .member-card-card__story {
    gap: 10px;
  }

  .member-card-card__story-head {
    align-items: start;
    flex-direction: column;
  }
}
</style>
