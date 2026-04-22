<script setup lang="ts">
import { computed } from 'vue'
import { memberCardCopy } from '@/data/memberCardContent'
import type {
  MemberCardFormValue,
  MemberCardTemplateConfig,
} from '@/types/memberCard'

/**
 * 组件入参类型
 * 用途：约束同门名片预览和导出所需的数据
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
  /** 用途：分隔线文本 */
  dividerText?: string
  /** 用途：纪年文本 */
  yearText?: string
  /** 用途：是否减少动态效果 */
  reduceMotion?: boolean
}

const props = withDefaults(defineProps<MemberCardCardProps>(), {
  cardTitle: memberCardCopy.generated.title,
  cardSubtitle: '云深栖心 · 同道同归',
  signaturePrefix: memberCardCopy.generated.signaturePrefix,
  dividerText: memberCardCopy.generated.divider,
  yearText: memberCardCopy.generated.yearText,
  reduceMotion: false,
})

/**
 * 规范化短文本
 * 用途：清理空格和容易影响排版的多余字符
 * 入参：rawValue 为原始文本，fallback 为兜底文本
 * 返回值：返回可直接展示的短文本
 */
function normalizeShortText(rawValue: string, fallback: string): string {
  const safeValue = rawValue
    .replace(/[<>{}\[\]`'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  return safeValue || fallback
}

/**
 * 规范化长文本
 * 用途：保留换行和句意，但清掉多余空白
 * 入参：rawValue 为原始文本，fallback 为兜底文本
 * 返回值：返回可直接展示的长文本
 */
function normalizeLongText(rawValue: string, fallback: string): string {
  const safeValue = rawValue
    .replace(/[<>{}\[\]`'"]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return safeValue || fallback
}

/**
 * 拆出兴趣标签
 * 用途：把平生所好拆成几枚短签，减少空白并增强门派味道
 * 入参：rawValue 为原始文本，fallback 为兜底文本
 * 返回值：返回适合以标签形式展示的短句数组
 */
function splitTextToTags(rawValue: string, fallback: string): string[] {
  return normalizeLongText(rawValue, fallback)
    .split(/[、，,。；;\n·•|/]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6)
}

/**
 * 获取头像首字
 * 用途：没有上传头像时，让占位块也有门派感
 * 返回值：返回适合展示的单字
 */
const avatarInitial = computed<string>(() => normalizeShortText(props.form.title, '栖').slice(0, 1))

/**
 * 获取水印字
 * 用途：把道号首字做成半透明底纹，增加古卷感
 * 返回值：返回适合展示的单字
 */
const watermarkGlyph = computed<string>(() => normalizeShortText(props.form.title, '栖').slice(0, 1) || '栖')

/**
 * 道号
 * 用途：展示在名片最显眼的位置
 */
const displayTitle = computed<string>(() => normalizeShortText(props.form.title, memberCardCopy.generated.fallbackTitle))

/**
 * 俗世名号
 * 用途：让同门知道是否愿意留下真实姓名
 */
const displaySecularName = computed<string>(() => normalizeShortText(props.form.secularName, memberCardCopy.generated.fallbackSecularName))

/**
 * 所处地域
 * 用途：展示同门所在的城市或地域
 */
const displayRegion = computed<string>(() => normalizeShortText(props.form.region, memberCardCopy.generated.fallbackRegion))

/**
 * 平生所好
 * 用途：展示兴趣、爱好和擅长之事
 */
const displayHobbies = computed<string>(() => normalizeLongText(props.form.hobbies, memberCardCopy.generated.fallbackHobbies))

/**
 * 兴趣标签
 * 用途：把平生所好拆成几枚短签，减少大段空白
 */
const hobbyTags = computed<string[]>(() => splitTextToTags(props.form.hobbies, memberCardCopy.generated.fallbackHobbies))

/**
 * 入栖初心
 * 用途：展示加入云栖派的缘起与心境
 */
const displayOrigin = computed<string>(() => normalizeLongText(props.form.origin, memberCardCopy.generated.fallbackOrigin))

/**
 * 个人寄语
 * 用途：展示同门想留下的一句话
 */
const displayMotto = computed<string>(() => normalizeLongText(props.form.motto, memberCardCopy.generated.fallbackMotto))

/**
 * 顺延编号文本
 * 用途：把数字变成更有门派感的同门编号
 */
const numberText = computed<string>(() => `第 ${String(props.number).padStart(2, '0')} 位同门`)

/**
 * 生成时间文本
 * 用途：让名片里也保留一份生成时刻
 */
const createdAtLabel = computed<string>(() => (props.createdAtText?.trim() || '刚刚生成'))

/**
 * 顶部信息行
 * 用途：把编号、地域、时间和模板名压成一条更像门派落款的带子
 */
const ribbonItems = computed<string[]>(() => [
  numberText.value,
  displayRegion.value,
  createdAtLabel.value,
  props.template.name,
])
</script>

<template>
  <article
    class="member-card-card"
    :class="[
      template.cardClass,
      { 'member-card-card--reduced': reduceMotion },
    ]"
    aria-label="云栖同门名片预览"
  >
    <div class="member-card-card__backdrop" aria-hidden="true"></div>
    <div class="member-card-card__paper" aria-hidden="true"></div>
    <div class="member-card-card__frame" aria-hidden="true"></div>
    <div class="member-card-card__watermark" aria-hidden="true">{{ watermarkGlyph }}</div>

    <div class="member-card-card__spine" aria-hidden="true">
      <span class="member-card-card__spine-line"></span>
      <span class="member-card-card__spine-text">云栖同门录</span>
      <span class="member-card-card__spine-number">{{ numberText }}</span>
    </div>

    <div class="member-card-card__content">
      <header class="member-card-card__masthead">
        <div class="member-card-card__masthead-copy">
          <p class="member-card-card__eyebrow">{{ cardTitle }}</p>
          <h3 class="member-card-card__title">{{ displayTitle }}</h3>
          <p class="member-card-card__subtitle">{{ cardSubtitle }}</p>
        </div>

        <div class="member-card-card__badge-block">
          <div class="member-card-card__seal" aria-hidden="true">
            <span class="member-card-card__seal-top">同门</span>
            <strong>在册</strong>
            <span class="member-card-card__seal-bottom">云栖派</span>
          </div>
          <p class="member-card-card__seal-note">流云抱月 · 山门留名</p>
        </div>
      </header>

      <div class="member-card-card__ribbon">
        <span
          v-for="item in ribbonItems"
          :key="item"
          class="member-card-card__ribbon-item"
          :class="{ 'member-card-card__ribbon-item--strong': item === numberText }"
        >
          {{ item }}
        </span>
      </div>

      <section class="member-card-card__body">
        <div class="member-card-card__avatar-column">
          <div class="member-card-card__avatar-shell">
            <img
              v-if="form.avatarDataUrl"
              class="member-card-card__avatar-image"
              :src="form.avatarDataUrl"
              :alt="`${displayTitle} 的头像`"
            />
            <div v-else class="member-card-card__avatar-fallback" aria-hidden="true">
              <span>{{ avatarInitial }}</span>
            </div>
          </div>

          <article class="member-card-card__avatar-card">
            <p class="member-card-card__info-label">门籍</p>
            <p class="member-card-card__avatar-card-title">{{ numberText }}</p>
            <p class="member-card-card__avatar-card-copy">{{ displayRegion }}</p>
          </article>

          <article class="member-card-card__avatar-card member-card-card__avatar-card--accent">
            <p class="member-card-card__info-label">时记</p>
            <p class="member-card-card__avatar-card-copy">{{ createdAtLabel }}</p>
          </article>
        </div>

        <div class="member-card-card__profile-column">
          <div class="member-card-card__identity-grid">
            <article class="member-card-card__info-card">
              <p class="member-card-card__info-label">道号</p>
              <p class="member-card-card__info-value member-card-card__info-value--title">{{ displayTitle }}</p>
            </article>

            <article class="member-card-card__info-card">
              <p class="member-card-card__info-label">俗世名号</p>
              <p class="member-card-card__info-value">{{ displaySecularName }}</p>
            </article>

            <article class="member-card-card__info-card">
              <p class="member-card-card__info-label">居所</p>
              <p class="member-card-card__info-value">{{ displayRegion }}</p>
            </article>

            <article class="member-card-card__info-card">
              <p class="member-card-card__info-label">生成时刻</p>
              <p class="member-card-card__info-value">{{ createdAtLabel }}</p>
            </article>
          </div>

          <article class="member-card-card__hobby-card">
            <div class="member-card-card__section-head">
              <p class="member-card-card__info-label">平生所好</p>
              <p class="member-card-card__section-hint">把兴趣、爱好、擅长之事拆成几枚短签，更像一张门派名帖。</p>
            </div>

            <div v-if="hobbyTags.length" class="member-card-card__tag-list">
              <span
                v-for="tag in hobbyTags"
                :key="tag"
                class="member-card-card__tag"
              >
                {{ tag }}
              </span>
            </div>
            <p class="member-card-card__hobby-text">{{ displayHobbies }}</p>
          </article>
        </div>
      </section>

      <section class="member-card-card__story-grid">
        <article class="member-card-card__story-card member-card-card__story-card--origin">
          <div class="member-card-card__section-head">
            <p class="member-card-card__info-label">入栖初心</p>
            <p class="member-card-card__section-hint">留一句真心话，让同门一眼知道你为何入山。</p>
          </div>
          <p class="member-card-card__story-copy">{{ displayOrigin }}</p>
        </article>

        <article class="member-card-card__story-card member-card-card__story-card--motto">
          <div class="member-card-card__section-head">
            <p class="member-card-card__info-label">心之所语</p>
            <p class="member-card-card__section-hint">可以是座右铭，也可以是一句想悄悄说给同门的话。</p>
          </div>
          <p class="member-card-card__story-copy member-card-card__story-copy--quote">“{{ displayMotto }}”</p>
        </article>
      </section>

      <footer class="member-card-card__footer">
        <div class="member-card-card__signature-group">
          <p class="member-card-card__info-label">落款</p>
          <div class="member-card-card__signature-line"></div>
          <p class="member-card-card__signature">
            {{ signaturePrefix }} · {{ numberText }}
          </p>
        </div>

        <div class="member-card-card__year-block">
          <span class="member-card-card__year-text">{{ yearText }}</span>
          <span class="member-card-card__divider">{{ dividerText }}</span>
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
  border-radius: 36px;
  background:
    radial-gradient(circle at 12% 10%, rgba(241, 217, 160, 0.18), transparent 18%),
    radial-gradient(circle at 84% 12%, rgba(139, 208, 203, 0.18), transparent 20%),
    radial-gradient(circle at 52% 34%, rgba(255, 255, 255, 0.08), transparent 28%),
    linear-gradient(180deg, #183e52 0%, #0d2533 44%, #06131b 100%);
  border: 1px solid rgba(216, 185, 114, 0.26);
  box-shadow: 0 30px 74px rgba(0, 0, 0, 0.38);
  color: #f5eddc;
}

.member-card-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(115deg, rgba(255, 255, 255, 0.08), transparent 22%),
    repeating-linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.018) 0,
      rgba(255, 255, 255, 0.018) 1px,
      transparent 1px,
      transparent 12px
    ),
    repeating-linear-gradient(
      90deg,
      rgba(216, 185, 114, 0.03) 0,
      rgba(216, 185, 114, 0.03) 1px,
      transparent 1px,
      transparent 18px
    );
  opacity: 0.82;
  pointer-events: none;
}

.member-card-card::after {
  content: '';
  position: absolute;
  inset: 16px;
  border-radius: 30px;
  border: 1px solid rgba(216, 185, 114, 0.16);
  pointer-events: none;
}

.member-card-card__backdrop,
.member-card-card__paper,
.member-card-card__frame,
.member-card-card__watermark,
.member-card-card__spine {
  position: absolute;
  pointer-events: none;
}

.member-card-card__backdrop {
  inset: 0;
  background:
    radial-gradient(circle at 50% 16%, rgba(255, 255, 255, 0.09), transparent 26%),
    radial-gradient(circle at 50% 86%, rgba(6, 24, 34, 0.6), transparent 42%);
}

.member-card-card__paper {
  inset: 18px;
  border-radius: 28px;
  background:
    linear-gradient(180deg, rgba(18, 44, 60, 0.84), rgba(7, 22, 31, 0.92)),
    rgba(7, 27, 37, 0.54);
  border: 1px solid rgba(147, 203, 198, 0.14);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.02),
    inset 0 24px 52px rgba(255, 255, 255, 0.03);
}

.member-card-card__frame {
  inset: 26px;
  border-radius: 22px;
  border: 1px solid rgba(216, 185, 114, 0.12);
  box-shadow:
    inset 0 0 0 1px rgba(216, 185, 114, 0.04),
    0 0 0 1px rgba(7, 27, 37, 0.18);
}

.member-card-card__watermark {
  right: 56px;
  top: 176px;
  font-size: clamp(170px, 20vw, 320px);
  line-height: 1;
  color: rgba(240, 223, 176, 0.08);
  font-weight: 700;
  letter-spacing: 0.05em;
  text-shadow: 0 0 30px rgba(240, 223, 176, 0.08);
  transform: rotate(-8deg);
  user-select: none;
}

.member-card-card__spine {
  left: 24px;
  top: 26px;
  bottom: 26px;
  display: grid;
  grid-template-rows: 1fr auto auto 1fr;
  justify-items: center;
  align-items: center;
  width: 46px;
}

.member-card-card__spine-line {
  grid-row: 1 / -1;
  width: 1px;
  height: 100%;
  background: linear-gradient(180deg, rgba(216, 185, 114, 0), rgba(216, 185, 114, 0.6), rgba(216, 185, 114, 0));
}

.member-card-card__spine-text,
.member-card-card__spine-number {
  position: relative;
  z-index: 1;
  writing-mode: vertical-rl;
  text-orientation: upright;
  color: rgba(241, 217, 160, 0.9);
  letter-spacing: 0.24em;
  font-size: 12px;
}

.member-card-card__spine-number {
  color: rgba(244, 239, 226, 0.6);
}

.member-card-card__content {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 14px;
  height: 100%;
  padding: 30px 28px 24px 88px;
}

.member-card-card__masthead {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px;
  align-items: start;
}

.member-card-card__masthead-copy {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.member-card-card__eyebrow,
.member-card-card__subtitle,
.member-card-card__info-label,
.member-card-card__section-hint,
.member-card-card__seal-note,
.member-card-card__year-text,
.member-card-card__divider {
  margin: 0;
  color: rgba(139, 208, 203, 0.9);
  font-size: 13px;
  letter-spacing: 0.18em;
}

.member-card-card__eyebrow {
  overflow-wrap: anywhere;
}

.member-card-card__title {
  margin: 0;
  font-size: clamp(54px, 6.8vw, 94px);
  line-height: 0.98;
  letter-spacing: 0.06em;
  overflow-wrap: anywhere;
  word-break: break-word;
  text-shadow: 0 4px 18px rgba(0, 0, 0, 0.18);
}

.member-card-card__subtitle {
  color: rgba(244, 239, 226, 0.72);
  line-height: 1.74;
  letter-spacing: 0.1em;
}

.member-card-card__badge-block {
  display: grid;
  justify-items: center;
  gap: 8px;
}

.member-card-card__seal {
  position: relative;
  display: grid;
  place-items: center;
  width: 130px;
  min-height: 130px;
  padding: 16px 10px 14px;
  border-radius: 24px;
  border: 1px solid rgba(241, 217, 160, 0.36);
  background:
    linear-gradient(180deg, rgba(108, 25, 25, 0.96), rgba(56, 11, 15, 0.98)),
    rgba(7, 27, 37, 0.94);
  box-shadow:
    inset 0 0 0 8px rgba(241, 217, 160, 0.06),
    0 16px 30px rgba(0, 0, 0, 0.24);
}

.member-card-card__seal::before,
.member-card-card__seal::after {
  content: '';
  position: absolute;
  inset: 10px;
  border-radius: 18px;
  border: 1px solid rgba(241, 217, 160, 0.12);
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

.member-card-card__seal strong {
  position: relative;
  z-index: 1;
  margin: 6px 0;
  font-size: 28px;
  letter-spacing: 0.2em;
  color: #f3e0aa;
}

.member-card-card__seal-note {
  color: rgba(244, 239, 226, 0.64);
  font-size: 12px;
  letter-spacing: 0.14em;
}

.member-card-card__ribbon {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding: 12px 14px;
  border-radius: 18px;
  border: 1px solid rgba(216, 185, 114, 0.16);
  background:
    linear-gradient(180deg, rgba(7, 31, 43, 0.56), rgba(6, 22, 31, 0.88)),
    rgba(7, 27, 37, 0.38);
}

.member-card-card__ribbon-item {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(216, 185, 114, 0.14);
  background: rgba(7, 27, 37, 0.32);
  color: rgba(244, 239, 226, 0.9);
  font-size: 0.8rem;
  letter-spacing: 0.08em;
}

.member-card-card__ribbon-item--strong {
  color: #f0dfb0;
  border-color: rgba(216, 185, 114, 0.24);
}

.member-card-card__body {
  display: grid;
  grid-template-columns: minmax(230px, 0.84fr) minmax(0, 1.16fr);
  gap: 16px;
  align-items: start;
}

.member-card-card__avatar-column {
  display: grid;
  gap: 12px;
  justify-items: center;
  align-content: start;
}

.member-card-card__avatar-shell {
  display: grid;
  width: min(100%, 250px);
  aspect-ratio: 1 / 1;
  place-items: center;
  overflow: hidden;
  border-radius: 30px;
  border: 1px solid rgba(216, 185, 114, 0.18);
  background:
    radial-gradient(circle at 32% 28%, rgba(139, 208, 203, 0.18), transparent 30%),
    linear-gradient(180deg, rgba(11, 34, 46, 0.96), rgba(6, 19, 27, 0.98));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 18px 28px rgba(0, 0, 0, 0.16);
}

.member-card-card__avatar-shell::before {
  content: '';
  position: absolute;
  width: 82%;
  height: 82%;
  border-radius: 26px;
  border: 1px solid rgba(241, 217, 160, 0.14);
  pointer-events: none;
}

.member-card-card__avatar-shell,
.member-card-card__avatar-image,
.member-card-card__avatar-fallback {
  position: relative;
}

.member-card-card__avatar-image,
.member-card-card__avatar-fallback {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.member-card-card__avatar-fallback {
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 34% 32%, rgba(216, 185, 114, 0.24), transparent 30%),
    linear-gradient(145deg, rgba(16, 49, 66, 0.96), rgba(6, 19, 27, 0.98));
}

.member-card-card__avatar-fallback span {
  font-size: clamp(2.4rem, 4vw, 3.8rem);
  letter-spacing: 0.18em;
  color: #f0dfb0;
}

.member-card-card__avatar-card {
  width: min(100%, 250px);
  padding: 14px 16px;
  border-radius: 20px;
  border: 1px solid rgba(147, 203, 198, 0.14);
  background:
    linear-gradient(180deg, rgba(14, 38, 52, 0.78), rgba(7, 27, 37, 0.92)),
    rgba(7, 27, 37, 0.52);
  display: grid;
  gap: 8px;
  text-align: center;
}

.member-card-card__avatar-card--accent {
  background:
    linear-gradient(180deg, rgba(38, 26, 14, 0.2), rgba(7, 27, 37, 0.92)),
    rgba(7, 27, 37, 0.52);
}

.member-card-card__avatar-card-title,
.member-card-card__avatar-card-copy,
.member-card-card__info-value,
.member-card-card__hobby-text,
.member-card-card__story-copy,
.member-card-card__signature {
  margin: 0;
  color: rgba(244, 239, 226, 0.94);
  line-height: 1.74;
  word-break: break-word;
}

.member-card-card__avatar-card-title {
  font-size: 1.02rem;
  color: #f0dfb0;
}

.member-card-card__avatar-card-copy {
  font-size: 0.9rem;
}

.member-card-card__profile-column {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.member-card-card__identity-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.member-card-card__info-card,
.member-card-card__hobby-card,
.member-card-card__story-card {
  padding: 14px 16px;
  border-radius: 20px;
  border: 1px solid rgba(147, 203, 198, 0.14);
  background: rgba(7, 27, 37, 0.52);
}

.member-card-card__info-card {
  min-width: 0;
}

.member-card-card__info-value {
  margin-top: 6px;
  font-size: 1rem;
}

.member-card-card__info-value--title {
  color: #f0dfb0;
}

.member-card-card__hobby-card {
  display: grid;
  gap: 10px;
  min-height: 160px;
  background:
    linear-gradient(180deg, rgba(20, 52, 68, 0.24), rgba(7, 27, 37, 0.92)),
    rgba(7, 27, 37, 0.52);
}

.member-card-card__section-head {
  display: grid;
  gap: 6px;
}

.member-card-card__section-hint {
  color: rgba(244, 239, 226, 0.56);
  font-size: 12px;
  line-height: 1.58;
  letter-spacing: 0.08em;
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
  background: rgba(8, 31, 43, 0.42);
  color: #f0dfb0;
  font-size: 0.82rem;
  letter-spacing: 0.06em;
}

.member-card-card__hobby-text {
  color: rgba(244, 239, 226, 0.92);
  font-size: 0.95rem;
}

.member-card-card__story-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: 12px;
}

.member-card-card__story-card {
  display: grid;
  gap: 10px;
  min-height: 174px;
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

.member-card-card__story-copy {
  font-size: 0.98rem;
}

.member-card-card__story-copy--quote {
  font-size: 1.02rem;
  line-height: 1.82;
}

.member-card-card__footer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px;
  align-items: end;
  margin-top: auto;
}

.member-card-card__signature-group {
  display: grid;
  gap: 10px;
}

.member-card-card__signature-line {
  width: min(240px, 100%);
  height: 1px;
  background: linear-gradient(90deg, rgba(216, 185, 114, 0.62), rgba(216, 185, 114, 0));
}

.member-card-card__signature {
  color: #f0dfb0;
  font-size: 0.96rem;
  letter-spacing: 0.16em;
}

.member-card-card__year-block {
  display: grid;
  gap: 8px;
  justify-items: end;
  text-align: right;
}

.member-card-card__year-text {
  color: rgba(241, 217, 160, 0.92);
}

.member-card-card__divider {
  color: rgba(244, 239, 226, 0.48);
  letter-spacing: 0.22em;
}

.member-card-card--simple {
  background:
    radial-gradient(circle at 10% 8%, rgba(241, 217, 160, 0.12), transparent 16%),
    radial-gradient(circle at 90% 8%, rgba(139, 208, 203, 0.14), transparent 18%),
    linear-gradient(180deg, #17384b 0%, #0d2533 44%, #06131b 100%);
}

.member-card-card--ornate {
  background:
    radial-gradient(circle at 10% 8%, rgba(241, 217, 160, 0.22), transparent 16%),
    radial-gradient(circle at 84% 10%, rgba(139, 208, 203, 0.14), transparent 18%),
    radial-gradient(circle at 50% 28%, rgba(255, 255, 255, 0.08), transparent 28%),
    linear-gradient(180deg, #1b4457 0%, #0c2230 44%, #051018 100%);
}

.member-card-card--ornate .member-card-card__seal {
  box-shadow:
    inset 0 0 0 8px rgba(241, 217, 160, 0.08),
    0 18px 32px rgba(0, 0, 0, 0.28);
}

.member-card-card--ornate .member-card-card__watermark {
  opacity: 0.1;
}

.member-card-card--reduced,
.member-card-card--reduced * {
  transition: none !important;
  animation: none !important;
}

@media (max-width: 960px) {
  .member-card-card__content {
    padding: 22px 18px 18px 70px;
    gap: 12px;
  }

  .member-card-card__masthead,
  .member-card-card__body,
  .member-card-card__story-grid,
  .member-card-card__footer {
    gap: 12px;
  }

  .member-card-card__body {
    grid-template-columns: 1fr;
  }

  .member-card-card__avatar-shell {
    width: min(100%, 220px);
  }
}

@media (max-width: 720px) {
  .member-card-card {
    border-radius: 28px;
  }

  .member-card-card::after {
    inset: 12px;
    border-radius: 22px;
  }

  .member-card-card__paper {
    inset: 12px;
    border-radius: 22px;
  }

  .member-card-card__frame {
    inset: 18px;
    border-radius: 18px;
  }

  .member-card-card__watermark {
    right: 24px;
    top: 200px;
    font-size: clamp(120px, 30vw, 220px);
  }

  .member-card-card__spine {
    left: 16px;
    width: 30px;
  }

  .member-card-card__spine-text,
  .member-card-card__spine-number {
    font-size: 10px;
    letter-spacing: 0.16em;
  }

  .member-card-card__content {
    padding: 16px 12px 14px 56px;
    gap: 10px;
  }

  .member-card-card__masthead {
    grid-template-columns: 1fr;
  }

  .member-card-card__seal {
    width: 96px;
    min-height: 96px;
    padding: 10px 8px;
    border-radius: 18px;
  }

  .member-card-card__seal strong {
    font-size: 20px;
  }

  .member-card-card__title {
    font-size: clamp(2rem, 8vw, 2.9rem);
    line-height: 1.04;
  }

  .member-card-card__subtitle,
  .member-card-card__eyebrow {
    font-size: 11px;
    letter-spacing: 0.08em;
    line-height: 1.6;
  }

  .member-card-card__ribbon {
    padding: 10px 12px;
    gap: 8px;
  }

  .member-card-card__ribbon-item {
    min-height: 28px;
    padding: 0 10px;
    font-size: 0.74rem;
  }

  .member-card-card__identity-grid,
  .member-card-card__story-grid {
    grid-template-columns: 1fr;
  }

  .member-card-card__info-card,
  .member-card-card__hobby-card,
  .member-card-card__story-card,
  .member-card-card__avatar-card {
    padding: 12px 12px;
    border-radius: 16px;
  }

  .member-card-card__hobby-card,
  .member-card-card__story-card {
    min-height: 0;
  }

  .member-card-card__avatar-shell {
    width: min(100%, 180px);
  }

  .member-card-card__avatar-card,
  .member-card-card__info-value,
  .member-card-card__hobby-text,
  .member-card-card__story-copy,
  .member-card-card__signature {
    font-size: 0.88rem;
    line-height: 1.68;
  }

  .member-card-card__story-copy--quote {
    font-size: 0.92rem;
  }

  .member-card-card__footer {
    grid-template-columns: 1fr;
    justify-items: start;
  }

  .member-card-card__year-block {
    justify-items: start;
    text-align: left;
  }
}
</style>
