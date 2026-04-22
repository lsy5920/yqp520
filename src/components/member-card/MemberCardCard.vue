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
 * 用途：保留换行内容，但清掉多余空格，方便名片段落展示
 * 入参：rawValue 为原始文本，fallback 为兜底文本
 * 返回值：返回可直接展示的段落文本
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
    <div class="member-card-card__frame" aria-hidden="true"></div>
    <div class="member-card-card__trace member-card-card__trace--left" aria-hidden="true"></div>
    <div class="member-card-card__trace member-card-card__trace--right" aria-hidden="true"></div>

    <div class="member-card-card__content">
      <header class="member-card-card__header">
        <div class="member-card-card__title-block">
          <p class="member-card-card__eyebrow">{{ cardTitle }}</p>
          <h3 class="member-card-card__title">{{ displayTitle }}</h3>
          <p class="member-card-card__subtitle">{{ cardSubtitle }}</p>
        </div>

        <div class="member-card-card__stamp">
          <span class="member-card-card__stamp-ring" aria-hidden="true"></span>
          <div class="member-card-card__stamp-copy">
            <strong>流云抱月</strong>
            <span>云栖派徽记</span>
          </div>
        </div>
      </header>

      <section class="member-card-card__hero">
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

        <div class="member-card-card__profile">
          <div class="member-card-card__meta-row">
            <span class="member-card-card__chip">{{ numberText }}</span>
            <span class="member-card-card__chip member-card-card__chip--soft">{{ displayRegion }}</span>
          </div>

          <div class="member-card-card__info-grid">
            <div class="member-card-card__info-item">
              <p class="member-card-card__info-label">俗世名号</p>
              <p class="member-card-card__info-value">{{ displaySecularName }}</p>
            </div>
            <div class="member-card-card__info-item">
              <p class="member-card-card__info-label">生成时刻</p>
              <p class="member-card-card__info-value">{{ createdAtLabel }}</p>
            </div>
          </div>

          <div class="member-card-card__summary">
            <p class="member-card-card__summary-label">平生所好</p>
            <p class="member-card-card__summary-copy">{{ displayHobbies }}</p>
          </div>
        </div>
      </section>

      <section class="member-card-card__sections">
        <article class="member-card-card__section member-card-card__section--origin">
          <p class="member-card-card__section-label">入栖初心</p>
          <p class="member-card-card__section-copy">{{ displayOrigin }}</p>
        </article>

        <article class="member-card-card__section member-card-card__section--motto">
          <p class="member-card-card__section-label">心之所语</p>
          <p class="member-card-card__section-copy member-card-card__section-copy--quote">“{{ displayMotto }}”</p>
        </article>
      </section>

      <footer class="member-card-card__footer">
        <div class="member-card-card__signature-group">
          <p class="member-card-card__section-label">落款</p>
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
    radial-gradient(circle at 18% 14%, rgba(139, 208, 203, 0.18), transparent 24%),
    radial-gradient(circle at 84% 10%, rgba(216, 185, 114, 0.18), transparent 20%),
    linear-gradient(180deg, #123044 0%, #0b1f2b 42%, #07131b 100%);
  border: 1px solid rgba(216, 185, 114, 0.24);
  box-shadow: 0 28px 68px rgba(0, 0, 0, 0.34);
  color: #f4efe2;
}

.member-card-card--simple {
  background:
    radial-gradient(circle at 16% 16%, rgba(139, 208, 203, 0.2), transparent 24%),
    radial-gradient(circle at 88% 12%, rgba(241, 217, 160, 0.18), transparent 18%),
    linear-gradient(180deg, #14384b 0%, #0d2432 42%, #071721 100%);
}

.member-card-card--ornate {
  background:
    radial-gradient(circle at 16% 16%, rgba(139, 208, 203, 0.16), transparent 18%),
    radial-gradient(circle at 84% 10%, rgba(216, 185, 114, 0.24), transparent 18%),
    linear-gradient(180deg, #1a3d54 0%, #0b2230 42%, #06131b 100%);
}

.member-card-card__veil,
.member-card-card__frame,
.member-card-card__trace {
  position: absolute;
  pointer-events: none;
}

.member-card-card__veil {
  inset: 0;
  background:
    radial-gradient(circle at 50% 18%, rgba(255, 255, 255, 0.08), transparent 26%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 22%);
  opacity: 0.85;
}

.member-card-card__frame {
  inset: 18px;
  border: 1px solid rgba(216, 185, 114, 0.16);
  border-radius: 28px;
}

.member-card-card__trace {
  top: 110px;
  bottom: 110px;
  width: 1px;
  background: linear-gradient(180deg, rgba(216, 185, 114, 0), rgba(216, 185, 114, 0.62), rgba(216, 185, 114, 0));
  opacity: 0.6;
}

.member-card-card__trace--left {
  left: 58px;
}

.member-card-card__trace--right {
  right: 58px;
}

.member-card-card__content {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: auto auto auto auto;
  gap: 22px;
  height: 100%;
  padding: 40px 40px 36px;
}

.member-card-card__header,
.member-card-card__hero,
.member-card-card__sections,
.member-card-card__footer {
  display: grid;
  gap: 18px;
}

.member-card-card__header {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 18px;
}

.member-card-card__title-block {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.member-card-card__eyebrow,
.member-card-card__subtitle,
.member-card-card__info-label,
.member-card-card__summary-label,
.member-card-card__section-label,
.member-card-card__avatar-note,
.member-card-card__year-text,
.member-card-card__divider {
  margin: 0;
  color: rgba(139, 208, 203, 0.88);
  font-size: 13px;
  letter-spacing: 0.22em;
}

.member-card-card__eyebrow {
  overflow-wrap: anywhere;
}

.member-card-card__title {
  margin: 0;
  font-size: clamp(46px, 6vw, 82px);
  line-height: 1.05;
  letter-spacing: 0.05em;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.member-card-card__subtitle {
  color: rgba(244, 239, 226, 0.74);
  line-height: 1.8;
  letter-spacing: 0.12em;
}

.member-card-card__stamp {
  position: relative;
  display: grid;
  place-items: center;
  width: 122px;
  min-height: 122px;
}

.member-card-card__stamp-ring {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  border: 1px solid rgba(216, 185, 114, 0.38);
  background:
    radial-gradient(circle at 32% 30%, rgba(216, 185, 114, 0.3), transparent 32%),
    linear-gradient(160deg, rgba(11, 39, 53, 0.96), rgba(6, 19, 27, 0.98));
  box-shadow:
    inset 0 0 0 10px rgba(216, 185, 114, 0.08),
    0 16px 30px rgba(0, 0, 0, 0.2);
}

.member-card-card__stamp-copy {
  position: relative;
  z-index: 1;
  display: grid;
  justify-items: center;
  gap: 6px;
  text-align: center;
}

.member-card-card__stamp-copy strong {
  font-size: 26px;
  letter-spacing: 0.18em;
  color: #f0dfb0;
}

.member-card-card__stamp-copy span {
  color: rgba(244, 239, 226, 0.76);
  font-size: 12px;
  letter-spacing: 0.16em;
}

.member-card-card__hero {
  grid-template-columns: minmax(180px, 0.72fr) minmax(0, 1.28fr);
  align-items: stretch;
}

.member-card-card__avatar-panel {
  display: grid;
  gap: 14px;
  justify-items: center;
  align-content: start;
}

.member-card-card__avatar-shell {
  display: grid;
  width: min(100%, 240px);
  aspect-ratio: 1 / 1;
  place-items: center;
  overflow: hidden;
  border-radius: 28px;
  border: 1px solid rgba(216, 185, 114, 0.18);
  background:
    radial-gradient(circle at 32% 28%, rgba(139, 208, 203, 0.2), transparent 30%),
    linear-gradient(180deg, rgba(8, 29, 40, 0.9), rgba(6, 19, 27, 0.96));
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
  font-size: clamp(2.2rem, 4vw, 3.4rem);
  letter-spacing: 0.18em;
  color: #f0dfb0;
}

.member-card-card__avatar-note {
  color: rgba(244, 239, 226, 0.62);
  letter-spacing: 0.12em;
}

.member-card-card__profile {
  display: grid;
  gap: 14px;
  min-width: 0;
}

.member-card-card__meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.member-card-card__chip {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(216, 185, 114, 0.18);
  background: rgba(7, 31, 43, 0.42);
  color: #f0dfb0;
  font-size: 0.84rem;
  letter-spacing: 0.08em;
}

.member-card-card__chip--soft {
  color: rgba(244, 239, 226, 0.86);
}

.member-card-card__info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.member-card-card__info-item,
.member-card-card__summary,
.member-card-card__section {
  padding: 16px 18px;
  border-radius: 22px;
  border: 1px solid rgba(147, 203, 198, 0.14);
  background: rgba(7, 27, 37, 0.52);
}

.member-card-card__info-value,
.member-card-card__summary-copy,
.member-card-card__section-copy,
.member-card-card__signature {
  margin: 0;
  color: rgba(244, 239, 226, 0.92);
  line-height: 1.8;
  word-break: break-word;
}

.member-card-card__info-value {
  margin-top: 6px;
  font-size: 1rem;
}

.member-card-card__summary-copy {
  font-size: 1rem;
}

.member-card-card__sections {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.member-card-card__section {
  min-height: 100%;
}

.member-card-card__section--origin {
  background:
    linear-gradient(180deg, rgba(38, 26, 14, 0.18), rgba(7, 27, 37, 0.94)),
    rgba(7, 27, 37, 0.52);
}

.member-card-card__section--motto {
  background:
    linear-gradient(180deg, rgba(9, 34, 44, 0.58), rgba(7, 27, 37, 0.94)),
    rgba(7, 27, 37, 0.52);
}

.member-card-card__section-copy--quote {
  font-size: 1.04rem;
}

.member-card-card__footer {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
}

.member-card-card__signature-group {
  display: grid;
  gap: 10px;
}

.member-card-card__signature-line {
  width: min(220px, 100%);
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
  letter-spacing: 0.24em;
}

.member-card-card--reduced,
.member-card-card--reduced * {
  transition: none !important;
  animation: none !important;
}

@media (max-width: 960px) {
  .member-card-card__content {
    padding: 28px 24px 24px;
    gap: 18px;
  }

  .member-card-card__header,
  .member-card-card__hero,
  .member-card-card__sections,
  .member-card-card__footer {
    gap: 14px;
  }

  .member-card-card__hero {
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

  .member-card-card__frame {
    inset: 14px;
    border-radius: 22px;
  }

  .member-card-card__trace {
    top: 84px;
    bottom: 84px;
  }

  .member-card-card__trace--left {
    left: 30px;
  }

  .member-card-card__trace--right {
    right: 30px;
  }

  .member-card-card__content {
    padding: 18px 14px 16px;
    gap: 10px;
  }

  .member-card-card__header {
    grid-template-columns: 1fr;
  }

  .member-card-card__stamp {
    width: 88px;
    min-height: 88px;
  }

  .member-card-card__stamp-copy strong {
    font-size: 18px;
  }

  .member-card-card__title {
    font-size: clamp(1.75rem, 8vw, 2.45rem);
    line-height: 1.08;
  }

  .member-card-card__subtitle {
    font-size: 11px;
    line-height: 1.66;
    letter-spacing: 0.08em;
  }

  .member-card-card__info-grid,
  .member-card-card__sections,
  .member-card-card__footer {
    grid-template-columns: 1fr;
  }

  .member-card-card__info-item,
  .member-card-card__summary,
  .member-card-card__section {
    padding: 12px 12px;
    border-radius: 16px;
  }

  .member-card-card__chip {
    min-height: 28px;
    padding: 0 10px;
    font-size: 0.74rem;
  }

  .member-card-card__summary-copy,
  .member-card-card__section-copy,
  .member-card-card__signature {
    font-size: 0.88rem;
    line-height: 1.68;
  }

  .member-card-card__avatar-shell {
    width: min(100%, 180px);
  }

  .member-card-card__year-block {
    justify-items: start;
    text-align: left;
  }
}
</style>
