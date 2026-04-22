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
 * 拆出标签文本
 * 用途：把兴趣爱好拆成几枚短标签，减少空白并增强名片层次
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
const avatarInitial = computed<string>(() => normalizeShortText(props.form.title, '云').slice(0, 1))

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
 * 用途：把平生所好拆成几枚短标签，减少大段空白
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
    <div class="member-card-card__veil" aria-hidden="true"></div>
    <div class="member-card-card__ornament member-card-card__ornament--left" aria-hidden="true"></div>
    <div class="member-card-card__ornament member-card-card__ornament--right" aria-hidden="true"></div>
    <div class="member-card-card__content">
      <header class="member-card-card__masthead">
        <div class="member-card-card__masthead-copy">
          <p class="member-card-card__eyebrow">{{ cardTitle }}</p>
          <h3 class="member-card-card__title">{{ displayTitle }}</h3>
          <p class="member-card-card__subtitle">{{ cardSubtitle }}</p>
        </div>

        <div class="member-card-card__seal" aria-hidden="true">
          <span class="member-card-card__seal-ring"></span>
          <div class="member-card-card__seal-copy">
            <strong>流云抱月</strong>
            <span>云栖派徽记</span>
          </div>
        </div>
      </header>

      <div class="member-card-card__ribbon">
        <span class="member-card-card__ribbon-item member-card-card__ribbon-item--strong">{{ numberText }}</span>
        <span class="member-card-card__ribbon-item">{{ displayRegion }}</span>
        <span class="member-card-card__ribbon-item">{{ createdAtLabel }}</span>
        <span class="member-card-card__ribbon-item">{{ template.name }}</span>
      </div>

      <section class="member-card-card__identity">
        <div class="member-card-card__avatar-panel">
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
          <p class="member-card-card__avatar-note">自定义头像可选上传</p>
        </div>

        <div class="member-card-card__identity-body">
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
            <p v-else class="member-card-card__hobby-text">{{ displayHobbies }}</p>
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
  border-radius: 34px;
  background:
    radial-gradient(circle at 14% 10%, rgba(241, 217, 160, 0.18), transparent 18%),
    radial-gradient(circle at 84% 12%, rgba(139, 208, 203, 0.16), transparent 20%),
    radial-gradient(circle at 50% 30%, rgba(255, 255, 255, 0.08), transparent 28%),
    linear-gradient(180deg, #173b4f 0%, #0d2533 42%, #07131b 100%);
  border: 1px solid rgba(216, 185, 114, 0.24);
  box-shadow: 0 28px 72px rgba(0, 0, 0, 0.36);
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
      rgba(255, 255, 255, 0.02) 0,
      rgba(255, 255, 255, 0.02) 1px,
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
  opacity: 0.78;
  pointer-events: none;
}

.member-card-card::after {
  content: '';
  position: absolute;
  inset: 16px;
  border-radius: 28px;
  border: 1px solid rgba(216, 185, 114, 0.14);
  pointer-events: none;
}

.member-card-card__veil,
.member-card-card__ornament {
  position: absolute;
  pointer-events: none;
}

.member-card-card__veil {
  inset: 0;
  background:
    radial-gradient(circle at 50% 18%, rgba(255, 255, 255, 0.08), transparent 28%),
    radial-gradient(circle at 50% 88%, rgba(8, 31, 45, 0.54), transparent 40%);
  opacity: 0.9;
}

.member-card-card__ornament {
  top: 28px;
  bottom: 28px;
  width: 1px;
  background: linear-gradient(180deg, rgba(216, 185, 114, 0), rgba(216, 185, 114, 0.62), rgba(216, 185, 114, 0));
  opacity: 0.72;
}

.member-card-card__ornament::before,
.member-card-card__ornament::after {
  content: '';
  position: absolute;
  left: -4px;
  width: 9px;
  height: 9px;
  border-radius: 999px;
  border: 1px solid rgba(216, 185, 114, 0.4);
  background: rgba(7, 27, 37, 0.92);
}

.member-card-card__ornament::before {
  top: 0;
}

.member-card-card__ornament::after {
  bottom: 0;
}

.member-card-card__ornament--left {
  left: 36px;
}

.member-card-card__ornament--right {
  right: 36px;
}

.member-card-card__content {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 14px;
  height: 100%;
  padding: 30px 30px 24px;
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
.member-card-card__avatar-note,
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
  font-size: clamp(52px, 6.5vw, 90px);
  line-height: 0.98;
  letter-spacing: 0.06em;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.member-card-card__subtitle {
  color: rgba(244, 239, 226, 0.72);
  line-height: 1.72;
  letter-spacing: 0.1em;
}

.member-card-card__seal {
  position: relative;
  display: grid;
  place-items: center;
  width: 136px;
  min-height: 136px;
}

.member-card-card__seal-ring {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  border: 1px solid rgba(216, 185, 114, 0.36);
  background:
    radial-gradient(circle at 32% 30%, rgba(216, 185, 114, 0.32), transparent 32%),
    linear-gradient(160deg, rgba(11, 39, 53, 0.98), rgba(6, 19, 27, 0.98));
  box-shadow:
    inset 0 0 0 10px rgba(216, 185, 114, 0.08),
    0 16px 30px rgba(0, 0, 0, 0.2);
}

.member-card-card__seal-copy {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 6px;
  justify-items: center;
  text-align: center;
}

.member-card-card__seal-copy strong {
  font-size: 26px;
  letter-spacing: 0.16em;
  color: #f0dfb0;
}

.member-card-card__seal-copy span {
  color: rgba(244, 239, 226, 0.76);
  font-size: 12px;
  letter-spacing: 0.14em;
}

.member-card-card__ribbon {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding: 11px 16px;
  border-radius: 18px;
  border: 1px solid rgba(216, 185, 114, 0.18);
  background:
    linear-gradient(180deg, rgba(7, 31, 43, 0.62), rgba(6, 22, 31, 0.86)),
    rgba(7, 27, 37, 0.42);
}

.member-card-card__ribbon-item {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(216, 185, 114, 0.14);
  background: rgba(7, 27, 37, 0.34);
  color: rgba(244, 239, 226, 0.88);
  font-size: 0.8rem;
  letter-spacing: 0.08em;
}

.member-card-card__ribbon-item--strong {
  color: #f0dfb0;
  border-color: rgba(216, 185, 114, 0.24);
}

.member-card-card__identity {
  display: grid;
  grid-template-columns: minmax(210px, 0.82fr) minmax(0, 1.18fr);
  gap: 16px;
  align-items: start;
}

.member-card-card__avatar-panel {
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
  border-radius: 28px;
  border: 1px solid rgba(216, 185, 114, 0.18);
  background:
    radial-gradient(circle at 32% 28%, rgba(139, 208, 203, 0.2), transparent 30%),
    linear-gradient(180deg, rgba(8, 29, 40, 0.92), rgba(6, 19, 27, 0.98));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
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
    radial-gradient(circle at 34% 32%, rgba(216, 185, 114, 0.26), transparent 30%),
    linear-gradient(145deg, rgba(16, 49, 66, 0.96), rgba(6, 19, 27, 0.98));
}

.member-card-card__avatar-fallback span {
  font-size: clamp(2.3rem, 4vw, 3.6rem);
  letter-spacing: 0.18em;
  color: #f0dfb0;
}

.member-card-card__avatar-note {
  color: rgba(244, 239, 226, 0.62);
  letter-spacing: 0.12em;
}

.member-card-card__identity-body {
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

.member-card-card__info-value,
.member-card-card__hobby-text,
.member-card-card__story-copy,
.member-card-card__signature {
  margin: 0;
  color: rgba(244, 239, 226, 0.94);
  line-height: 1.75;
  word-break: break-word;
}

.member-card-card__info-value {
  margin-top: 6px;
  font-size: 1rem;
}

.member-card-card__info-value--title {
  font-size: 1.08rem;
  color: #f0dfb0;
}

.member-card-card__hobby-card {
  display: grid;
  gap: 10px;
  min-height: 154px;
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
  line-height: 1.6;
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
  font-size: 0.84rem;
  letter-spacing: 0.06em;
}

.member-card-card__hobby-text {
  color: rgba(244, 239, 226, 0.9);
}

.member-card-card__story-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr);
  gap: 12px;
}

.member-card-card__story-card {
  display: grid;
  gap: 10px;
  min-height: 172px;
}

.member-card-card__story-card--origin {
  background:
    linear-gradient(180deg, rgba(41, 29, 15, 0.2), rgba(7, 27, 37, 0.92)),
    rgba(7, 27, 37, 0.52);
}

.member-card-card__story-card--motto {
  background:
    linear-gradient(180deg, rgba(9, 34, 44, 0.56), rgba(7, 27, 37, 0.94)),
    rgba(7, 27, 37, 0.52);
}

.member-card-card__story-copy {
  font-size: 1rem;
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

.member-card-card--reduced,
.member-card-card--reduced * {
  transition: none !important;
  animation: none !important;
}

@media (max-width: 960px) {
  .member-card-card__content {
    padding: 22px 18px 18px;
    gap: 12px;
  }

  .member-card-card__masthead,
  .member-card-card__identity,
  .member-card-card__story-grid,
  .member-card-card__footer {
    gap: 12px;
  }

  .member-card-card__identity {
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

  .member-card-card__ornament {
    top: 18px;
    bottom: 18px;
  }

  .member-card-card__ornament--left {
    left: 24px;
  }

  .member-card-card__ornament--right {
    right: 24px;
  }

  .member-card-card__content {
    padding: 16px 12px 14px;
    gap: 10px;
  }

  .member-card-card__masthead {
    grid-template-columns: 1fr;
  }

  .member-card-card__seal {
    width: 94px;
    min-height: 94px;
  }

  .member-card-card__seal-copy strong {
    font-size: 18px;
  }

  .member-card-card__title {
    font-size: clamp(2rem, 8vw, 2.8rem);
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
  .member-card-card__story-card {
    padding: 12px 12px;
    border-radius: 16px;
  }

  .member-card-card__hobby-card,
  .member-card-card__story-card {
    min-height: 0;
  }

  .member-card-card__avatar-shell {
    width: min(100%, 178px);
  }

  .member-card-card__info-value,
  .member-card-card__hobby-text,
  .member-card-card__story-copy,
  .member-card-card__signature {
    font-size: 0.88rem;
    line-height: 1.68;
  }

  .member-card-card__story-copy--quote {
    font-size: 0.9rem;
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
