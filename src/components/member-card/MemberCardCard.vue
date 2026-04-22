<script setup lang="ts">
import { computed } from 'vue'
import { memberCardCopy } from '@/data/memberCardContent'
import type { MemberCardFormValue } from '@/types/memberCard'
import {
  formatMemberCardNumber,
  normalizeMemberCardLongText,
  normalizeMemberCardShortText,
  splitMemberCardTags,
} from '@/utils/memberCard'

/**
 * 组件入参类型
 * 用途：描述江湖名帖成品卡需要接收的全部数据
 */
interface MemberCardCardProps {
  /** 用途：当前要展示的江湖名帖表单内容。 */
  form: MemberCardFormValue
  /** 用途：当前江湖名帖的帖号。 */
  number: number
  /** 用途：当前江湖名帖的立帖时间文字。 */
  createdAtText: string
  /** 用途：卡片顶部总标题，默认沿用江湖名帖主标题。 */
  cardTitle?: string
  /** 用途：卡片副标题，默认沿用系统副标题。 */
  cardSubtitle?: string
  /** 用途：卡片底部落款前缀。 */
  signaturePrefix?: string
  /** 用途：卡片底部纪年文本。 */
  yearText?: string
  /** 用途：是否关闭卡片里的动效。 */
  reduceMotion?: boolean
}

const props = withDefaults(defineProps<MemberCardCardProps>(), {
  cardTitle: memberCardCopy.generated.title,
  cardSubtitle: memberCardCopy.generated.subtitle,
  signaturePrefix: memberCardCopy.generated.signaturePrefix,
  yearText: memberCardCopy.generated.yearText,
  reduceMotion: false,
})

// 这里把江湖名号清洗成主标题，方便成品帖最先看到的就是名号。
const displayJianghuName = computed<string>(() => (
  normalizeMemberCardShortText(props.form.jianghuName, memberCardCopy.generated.fallbackJianghuName)
))

// 这里把旧名或本名清洗出来，方便在门籍信息里补充来历。
const displayFormerName = computed<string>(() => (
  normalizeMemberCardShortText(props.form.formerName, memberCardCopy.generated.fallbackFormerName)
))

// 这里把来处清洗出来，方便成品帖里补一条人物来源。
const displayFromPlace = computed<string>(() => (
  normalizeMemberCardShortText(props.form.fromPlace, memberCardCopy.generated.fallbackFromPlace)
))

// 这里把身份一句清洗出来，方便成为中段最稳的身份主句。
const displayIdentityLine = computed<string>(() => (
  normalizeMemberCardShortText(props.form.identityLine, memberCardCopy.generated.fallbackIdentityLine)
))

// 这里把江湖短签拆成多个标签，方便画面更饱满但不显乱。
const skillTagList = computed<string[]>(() => (
  splitMemberCardTags(props.form.skillTags, memberCardCopy.generated.fallbackSkillTags)
))

// 这里把入门缘起整理成长段，方便放进下段正文区。
const displayEntryStory = computed<string>(() => (
  normalizeMemberCardLongText(props.form.entryStory, memberCardCopy.generated.fallbackEntryStory)
))

// 这里把留名一句整理成短句，方便做成底部的收束落款。
const displaySignatureLine = computed<string>(() => (
  normalizeMemberCardLongText(props.form.signatureLine, memberCardCopy.generated.fallbackSignatureLine)
))

// 这里取名号首字做人像占位，确保无头像时仍然稳定好看。
const portraitInitial = computed<string>(() => (
  normalizeMemberCardShortText(displayJianghuName.value, '栖').slice(0, 1) || '栖'
))

// 这里取名号首字做背景水印，让成品帖背后保留一点门籍余味。
const watermarkGlyph = computed<string>(() => (
  normalizeMemberCardShortText(displayJianghuName.value, '栖').slice(0, 1) || '栖'
))

// 这里统一整理帖号文本，方便页面和成图使用同一套编号格式。
const numberText = computed<string>(() => formatMemberCardNumber(props.number))

// 这里整理立帖时间文本，方便无时间时也能有清晰兜底。
const createdAtLabel = computed<string>(() => {
  const safeText = props.createdAtText.trim()
  return safeText || '待立帖'
})

// 这里整理顶部芯片信息，方便在标题下补一条正式门籍感信息带。
const headerChipList = computed<string[]>(() => [
  displayFromPlace.value,
  memberCardCopy.generated.sideMark,
  numberText.value,
])

// 这里整理门籍信息条目，方便右侧信息区统一排版。
const identityItemList = computed<Array<{ label: string; value: string }>>(() => [
  { label: '旧名或本名', value: displayFormerName.value },
  { label: '来处', value: displayFromPlace.value },
  { label: '门籍编号', value: numberText.value },
  { label: '立帖时记', value: createdAtLabel.value },
])
</script>

<template>
  <article
    class="member-card-card"
    :class="{ 'member-card-card--reduced': reduceMotion }"
    aria-label="云栖派江湖名帖预览"
  >
    <div class="member-card-card__backdrop" aria-hidden="true"></div>
    <div class="member-card-card__grain" aria-hidden="true"></div>
    <div class="member-card-card__watermark" aria-hidden="true">{{ watermarkGlyph }}</div>

    <div class="member-card-card__rail" aria-hidden="true">
      <span class="member-card-card__rail-label">{{ memberCardCopy.generated.sideMark }}</span>
      <strong class="member-card-card__rail-number">{{ numberText }}</strong>
      <span class="member-card-card__rail-time">{{ createdAtLabel }}</span>
    </div>

    <div class="member-card-card__sheet">
      <header class="member-card-card__header">
        <div class="member-card-card__header-main">
          <p class="member-card-card__eyebrow">{{ cardTitle }}</p>
          <h3 class="member-card-card__title">{{ displayJianghuName }}</h3>
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
          <span class="member-card-card__seal-top">{{ memberCardCopy.generated.sealText }}</span>
          <strong class="member-card-card__seal-center">立帖</strong>
          <span class="member-card-card__seal-bottom">{{ memberCardCopy.generated.sideMark }}</span>
        </div>
      </header>

      <section class="member-card-card__hero">
        <article class="member-card-card__portrait">
          <div class="member-card-card__portrait-frame">
            <img
              v-if="form.portraitDataUrl"
              class="member-card-card__portrait-image"
              :src="form.portraitDataUrl"
              :alt="`${displayJianghuName} 的人像`"
            />
            <div v-else class="member-card-card__portrait-fallback" aria-hidden="true">
              <span>{{ portraitInitial }}</span>
            </div>
          </div>

          <div class="member-card-card__portrait-caption">
            <p class="member-card-card__portrait-kicker">{{ memberCardCopy.generated.sideMark }}</p>
            <strong class="member-card-card__portrait-name">{{ displayJianghuName }}</strong>
            <p class="member-card-card__portrait-detail">{{ displayFormerName }} · {{ displayFromPlace }}</p>
          </div>
        </article>

        <div class="member-card-card__hero-stack">
          <article class="member-card-card__panel member-card-card__panel--identity">
            <div class="member-card-card__panel-head">
              <p class="member-card-card__section-label">身份一句</p>
              <span class="member-card-card__panel-note">{{ cardSubtitle }}</span>
            </div>

            <strong class="member-card-card__identity-line">{{ displayIdentityLine }}</strong>

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

          <article class="member-card-card__panel member-card-card__panel--tags">
            <div class="member-card-card__panel-head">
              <p class="member-card-card__section-label">江湖短签</p>
              <span class="member-card-card__panel-note">共 {{ skillTagList.length }} 枚</span>
            </div>

            <div class="member-card-card__tag-list">
              <span
                v-for="tag in skillTagList"
                :key="tag"
                class="member-card-card__tag"
              >
                {{ tag }}
              </span>
            </div>
          </article>
        </div>
      </section>

      <section class="member-card-card__closing">
        <article class="member-card-card__story-card member-card-card__story-card--entry">
          <div class="member-card-card__story-head">
            <p class="member-card-card__section-label">入门缘起</p>
            <span class="member-card-card__story-mark">江湖留档</span>
          </div>
          <p class="member-card-card__story-text">{{ displayEntryStory }}</p>
          <div class="member-card-card__story-note member-card-card__story-note--entry">
            <span>{{ displayIdentityLine }}</span>
            <strong>{{ displayFromPlace }} · {{ displayFormerName }}</strong>
          </div>
        </article>

        <article class="member-card-card__story-card member-card-card__story-card--signature">
          <div class="member-card-card__story-head">
            <p class="member-card-card__section-label">留名一句</p>
            <span class="member-card-card__story-mark">落款收束</span>
          </div>
          <p class="member-card-card__story-text member-card-card__story-text--quote">“{{ displaySignatureLine }}”</p>
          <div class="member-card-card__story-note">
            <span>{{ memberCardCopy.generated.sideMark }}</span>
            <strong>{{ numberText }}</strong>
          </div>
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
/* 这里定义江湖名帖最外层的整体底色与边框，让成品先立住门籍气质。 */
.member-card-card {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
  container-type: inline-size;
  border-radius: 38px;
  border: 1px solid rgba(216, 185, 114, 0.24);
  color: #f4efe2;
  background:
    radial-gradient(circle at 14% 10%, rgba(241, 217, 160, 0.18), transparent 20%),
    radial-gradient(circle at 86% 16%, rgba(139, 208, 203, 0.12), transparent 22%),
    radial-gradient(circle at 76% 80%, rgba(23, 56, 73, 0.42), transparent 28%),
    linear-gradient(180deg, #16384a 0%, #0c2230 42%, #08141d 100%);
  box-shadow: 0 32px 88px rgba(0, 0, 0, 0.34);
}

.member-card-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(125deg, rgba(255, 255, 255, 0.08), transparent 20%),
    repeating-linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.014) 0,
      rgba(255, 255, 255, 0.014) 1px,
      transparent 1px,
      transparent 14px
    );
  opacity: 0.6;
  pointer-events: none;
}

.member-card-card::after {
  content: '';
  position: absolute;
  inset: 16px;
  border-radius: 28px;
  border: 1px solid rgba(216, 185, 114, 0.12);
  pointer-events: none;
}

/* 这里放背景装饰层，负责给正帖补一点纹样和水印，但不抢主体内容。 */
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
    radial-gradient(circle at 40% 0%, rgba(255, 255, 255, 0.06), transparent 32%),
    radial-gradient(circle at 80% 68%, rgba(19, 56, 75, 0.22), transparent 26%);
}

.member-card-card__grain {
  inset: 0;
  background:
    radial-gradient(circle at 18% 22%, rgba(241, 217, 160, 0.08), transparent 18%),
    radial-gradient(circle at 74% 72%, rgba(139, 208, 203, 0.08), transparent 16%),
    repeating-linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.01) 0,
      rgba(255, 255, 255, 0.01) 2px,
      transparent 2px,
      transparent 10px
    );
  mix-blend-mode: soft-light;
  opacity: 0.72;
}

.member-card-card__watermark {
  right: 44px;
  top: 54%;
  z-index: 0;
  transform: translateY(-50%) rotate(-8deg);
  color: rgba(240, 223, 176, 0.06);
  font-size: clamp(180px, 20vw, 320px);
  line-height: 1;
  letter-spacing: 0.08em;
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
  width: 46px;
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
  color: rgba(244, 239, 226, 0.74);
  font-size: 11px;
}

.member-card-card__rail-time {
  color: rgba(244, 239, 226, 0.48);
  font-size: 10px;
}

/* 这里放卡片主体结构，负责把顶段、中段、下段和落款统一排好。 */
.member-card-card__sheet {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  align-content: stretch;
  gap: 12px;
  height: 100%;
  padding: 22px 22px 18px 82px;
}

.member-card-card__header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: start;
}

.member-card-card__header-main {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.member-card-card__eyebrow,
.member-card-card__subtitle,
.member-card-card__section-label,
.member-card-card__panel-note,
.member-card-card__story-mark,
.member-card-card__signature,
.member-card-card__stamp,
.member-card-card__footer-mark strong {
  margin: 0;
}

.member-card-card__eyebrow {
  color: rgba(139, 208, 203, 0.92);
  font-size: 13px;
  letter-spacing: 0.18em;
}

.member-card-card__title {
  margin: 0;
  font-size: clamp(54px, 6.2vw, 94px);
  line-height: 0.98;
  letter-spacing: 0.08em;
  overflow-wrap: anywhere;
  word-break: break-word;
  text-shadow: 0 4px 18px rgba(0, 0, 0, 0.18);
}

.member-card-card__subtitle {
  color: rgba(244, 239, 226, 0.74);
  font-size: 12px;
  line-height: 1.64;
  letter-spacing: 0.12em;
}

.member-card-card__meta-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.member-card-card__meta-chip {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(216, 185, 114, 0.14);
  background: rgba(7, 27, 37, 0.32);
  color: rgba(244, 239, 226, 0.9);
  font-size: 0.8rem;
  letter-spacing: 0.06em;
}

.member-card-card__meta-chip--strong {
  color: #f0dfb0;
  border-color: rgba(216, 185, 114, 0.28);
}

.member-card-card__seal {
  position: relative;
  display: grid;
  place-items: center;
  width: 110px;
  min-height: 110px;
  padding: 12px 8px;
  border-radius: 24px;
  border: 1px solid rgba(241, 217, 160, 0.34);
  background:
    linear-gradient(180deg, #7b151d, #360a0f),
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
  font-size: 11px;
  letter-spacing: 0.16em;
}

.member-card-card__seal-center {
  position: relative;
  z-index: 1;
  margin: 4px 0;
  color: #f3e0aa;
  font-size: 24px;
  letter-spacing: 0.18em;
}

/* 这里放中段内容，左边做人像，右边做身份与短签，形成正式门籍骨架。 */
.member-card-card__hero {
  display: grid;
  grid-template-columns: minmax(236px, 0.8fr) minmax(0, 1.2fr);
  gap: 10px;
  min-height: 0;
}

.member-card-card__portrait {
  position: relative;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 8px;
  padding: 10px;
  border-radius: 26px;
  border: 1px solid rgba(216, 185, 114, 0.16);
  background:
    radial-gradient(circle at 28% 26%, rgba(139, 208, 203, 0.18), transparent 30%),
    linear-gradient(180deg, rgba(10, 31, 42, 0.98), rgba(6, 18, 27, 0.98));
}

.member-card-card__portrait::before {
  content: '';
  position: absolute;
  inset: 10px;
  border-radius: 20px;
  border: 1px solid rgba(241, 217, 160, 0.12);
  pointer-events: none;
}

.member-card-card__portrait-frame {
  position: relative;
  overflow: hidden;
  min-height: 256px;
  border-radius: 18px;
  border: 1px solid rgba(241, 217, 160, 0.12);
  background:
    radial-gradient(circle at 32% 30%, rgba(216, 185, 114, 0.24), transparent 30%),
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
  font-size: clamp(3rem, 4.6vw, 4.8rem);
  letter-spacing: 0.2em;
}

.member-card-card__portrait-caption {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 16px;
  border: 1px solid rgba(241, 217, 160, 0.14);
  background: linear-gradient(180deg, rgba(6, 19, 27, 0.52), rgba(6, 19, 27, 0.9));
}

.member-card-card__portrait-kicker,
.member-card-card__portrait-detail {
  margin: 0;
  color: rgba(244, 239, 226, 0.68);
  font-size: 11px;
  letter-spacing: 0.16em;
}

.member-card-card__portrait-name {
  color: #f0dfb0;
  font-size: 15px;
  line-height: 1.2;
  letter-spacing: 0.12em;
}

.member-card-card__hero-stack {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.member-card-card__panel {
  display: grid;
  gap: 9px;
  padding: 11px 13px;
  border-radius: 18px;
  border: 1px solid rgba(147, 203, 198, 0.14);
  background: rgba(7, 27, 37, 0.52);
}

.member-card-card__panel--identity {
  background:
    linear-gradient(180deg, rgba(16, 42, 57, 0.52), rgba(7, 27, 37, 0.94)),
    rgba(7, 27, 37, 0.52);
}

.member-card-card__panel--tags {
  background:
    linear-gradient(180deg, rgba(32, 23, 12, 0.22), rgba(7, 27, 37, 0.94)),
    rgba(7, 27, 37, 0.52);
}

.member-card-card__panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.member-card-card__section-label {
  color: rgba(139, 208, 203, 0.9);
  font-size: 12px;
  letter-spacing: 0.2em;
}

.member-card-card__panel-note {
  color: rgba(241, 217, 160, 0.7);
  font-size: 11px;
  letter-spacing: 0.14em;
  white-space: nowrap;
}

.member-card-card__identity-line {
  color: #f0dfb0;
  font-size: 1.08rem;
  line-height: 1.52;
  letter-spacing: 0.12em;
}

.member-card-card__identity-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.member-card-card__identity-item {
  display: grid;
  gap: 5px;
  padding: 9px 10px;
  border-radius: 14px;
  border: 1px solid rgba(216, 185, 114, 0.12);
  background: rgba(8, 31, 43, 0.34);
}

.member-card-card__identity-label {
  color: rgba(139, 208, 203, 0.82);
  font-size: 11px;
  letter-spacing: 0.16em;
}

.member-card-card__identity-value {
  color: rgba(244, 239, 226, 0.94);
  font-size: 0.88rem;
  line-height: 1.54;
  overflow-wrap: anywhere;
  word-break: break-word;
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

/* 这里放下段正文，负责把缘起和留名一句一起收束住。 */
.member-card-card__closing {
  display: grid;
  grid-template-columns: minmax(0, 1.14fr) minmax(290px, 0.86fr);
  gap: 10px;
  min-height: 0;
  align-items: stretch;
}

.member-card-card__story-card {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  align-content: stretch;
  gap: 8px;
  height: 100%;
  padding: 12px 14px;
  border-radius: 18px;
  border: 1px solid rgba(147, 203, 198, 0.14);
  background: rgba(7, 27, 37, 0.54);
}

.member-card-card__story-card--signature {
  background:
    linear-gradient(180deg, rgba(28, 21, 13, 0.22), rgba(7, 27, 37, 0.94)),
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
  align-self: stretch;
  color: rgba(244, 239, 226, 0.92);
  font-size: 0.92rem;
  line-height: 1.76;
  word-break: break-word;
  white-space: pre-wrap;
}

.member-card-card__story-text--quote {
  font-size: 1rem;
}

.member-card-card__story-note {
  display: grid;
  gap: 4px;
  margin-top: 0;
  padding-top: 10px;
  border-top: 1px solid rgba(216, 185, 114, 0.12);
}

.member-card-card__story-note--entry {
  border-top-color: rgba(139, 208, 203, 0.12);
}

.member-card-card__story-note span {
  color: rgba(241, 217, 160, 0.86);
  font-size: 11px;
  letter-spacing: 0.16em;
  line-height: 1.56;
}

.member-card-card__story-note strong {
  color: rgba(244, 239, 226, 0.88);
  font-size: 0.88rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

/* 这里放最末尾落款，确保纪年与时记有一个稳定出口。 */
.member-card-card__footer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: end;
  margin-top: 0;
  padding-top: 8px;
  border-top: 1px solid rgba(216, 185, 114, 0.1);
}

.member-card-card__signature-block {
  display: grid;
  gap: 8px;
}

.member-card-card__signature {
  color: #f0dfb0;
  font-size: 0.9rem;
  letter-spacing: 0.16em;
}

.member-card-card__signature-line {
  width: min(260px, 100%);
  height: 1px;
  background: linear-gradient(90deg, rgba(216, 185, 114, 0.66), rgba(216, 185, 114, 0));
}

.member-card-card__stamp {
  color: rgba(244, 239, 226, 0.56);
  font-size: 0.8rem;
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

.member-card-card--reduced,
.member-card-card--reduced * {
  transition: none !important;
  animation: none !important;
}

@container (max-width: 960px) {
  .member-card-card__sheet {
    padding: 20px 18px 16px 66px;
    gap: 10px;
    grid-template-rows: auto auto auto auto;
  }

  .member-card-card__header,
  .member-card-card__hero,
  .member-card-card__closing {
    grid-template-columns: 1fr;
  }

  .member-card-card__portrait {
    width: min(100%, 238px);
  }

  .member-card-card__portrait-frame {
    min-height: 196px;
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

@container (max-width: 720px) {
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
    grid-template-rows: auto auto auto auto;
  }

  .member-card-card__title {
    font-size: clamp(2rem, 7vw, 2.8rem);
    line-height: 1.02;
  }

  .member-card-card__eyebrow,
  .member-card-card__subtitle {
    font-size: 11px;
    line-height: 1.58;
    letter-spacing: 0.08em;
  }

  .member-card-card__seal {
    width: 94px;
    min-height: 94px;
    padding: 10px 8px;
    border-radius: 20px;
  }

  .member-card-card__seal-center {
    font-size: 20px;
  }

  .member-card-card__portrait {
    width: min(100%, 178px);
    padding: 10px;
  }

  .member-card-card__portrait-frame {
    min-height: 150px;
  }

  .member-card-card__panel,
  .member-card-card__story-card {
    padding: 12px;
    border-radius: 16px;
  }

  .member-card-card__panel-head,
  .member-card-card__story-head {
    align-items: start;
    flex-direction: column;
  }

  .member-card-card__panel-note,
  .member-card-card__story-mark {
    white-space: normal;
  }

  .member-card-card__identity-grid {
    gap: 8px;
  }

  .member-card-card__meta-chip,
  .member-card-card__tag {
    font-size: 0.76rem;
  }

  .member-card-card__story-text,
  .member-card-card__signature,
  .member-card-card__identity-value {
    font-size: 0.86rem;
    line-height: 1.66;
  }
}
</style>
