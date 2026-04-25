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
  /** 用途：当前要展示的江湖名帖表单内容 */
  form: MemberCardFormValue
  /** 用途：当前江湖名帖的帖号 */
  number: number
  /** 用途：当前江湖名帖的立帖时间文字 */
  createdAtText: string
  /** 用途：卡片顶部总标题 */
  cardTitle?: string
  /** 用途：卡片副标题 */
  cardSubtitle?: string
  /** 用途：卡片底部落款前缀 */
  signaturePrefix?: string
  /** 用途：卡片底部纪年文本 */
  yearText?: string
  /** 用途：卡片里的二维码图片地址 */
  qrCodeUrl?: string
  /** 用途：二维码面板标题 */
  qrLabel?: string
  /** 用途：二维码面板提示语 */
  qrHint?: string
  /** 用途：是否关闭卡片里的动效 */
  reduceMotion?: boolean
}

const props = withDefaults(defineProps<MemberCardCardProps>(), {
  cardTitle: memberCardCopy.generated.title,
  cardSubtitle: memberCardCopy.generated.subtitle,
  signaturePrefix: memberCardCopy.generated.signaturePrefix,
  yearText: memberCardCopy.generated.yearText,
  qrCodeUrl: '',
  qrLabel: memberCardCopy.generated.qrLabel,
  qrHint: memberCardCopy.generated.qrHint,
  reduceMotion: false,
})

/** 用途：展示用江湖名号，空值时使用兜底名号。 */
const displayJianghuName = computed<string>(() => normalizeMemberCardShortText(props.form.jianghuName, memberCardCopy.generated.fallbackJianghuName))

/** 用途：展示用旧名或本名，空值时使用兜底称呼。 */
const displayFormerName = computed<string>(() => normalizeMemberCardShortText(props.form.formerName, memberCardCopy.generated.fallbackFormerName))

/** 用途：展示用来处，空值时使用兜底地点。 */
const displayFromPlace = computed<string>(() => normalizeMemberCardShortText(props.form.fromPlace, memberCardCopy.generated.fallbackFromPlace))

/** 用途：展示用身份短句，空值时使用兜底身份。 */
const displayIdentityLine = computed<string>(() => normalizeMemberCardShortText(props.form.identityLine, memberCardCopy.generated.fallbackIdentityLine))

/** 用途：展示用江湖短签，最多保留六个让画面整齐。 */
const skillTagList = computed<string[]>(() => splitMemberCardTags(props.form.skillTags, memberCardCopy.generated.fallbackSkillTags).slice(0, 6))

/** 用途：展示用入门缘起，空值时使用默认故事。 */
const displayEntryStory = computed<string>(() => normalizeMemberCardLongText(props.form.entryStory, memberCardCopy.generated.fallbackEntryStory))

/** 用途：展示用留名一句，空值时使用默认落款。 */
const displaySignatureLine = computed<string>(() => normalizeMemberCardLongText(props.form.signatureLine, memberCardCopy.generated.fallbackSignatureLine))

/** 用途：帖号文本，方便和工作台编号保持一致。 */
const numberText = computed<string>(() => formatMemberCardNumber(props.number))

/** 用途：立帖时间文本，空值时提示待立帖。 */
const createdAtLabel = computed<string>(() => props.createdAtText.trim() || '待立帖')

/** 用途：头像占位文字，没有上传头像时显示名号首字。 */
const portraitInitial = computed<string>(() => displayJianghuName.value.slice(0, 1) || '栖')

/** 用途：二维码提示文本，空值时使用配置兜底。 */
const displayQrHint = computed<string>(() => props.qrHint?.trim() || memberCardCopy.generated.qrHint)
</script>

<template>
  <article class="member-card-card" :class="{ 'member-card-card--reduced': reduceMotion }" aria-label="云栖江湖名帖海报预览">
    <div class="member-card-card__texture" aria-hidden="true" />
    <div class="member-card-card__mountain member-card-card__mountain--back" aria-hidden="true" />
    <div class="member-card-card__mountain member-card-card__mountain--front" aria-hidden="true" />
    <div class="member-card-card__mist member-card-card__mist--top" aria-hidden="true" />
    <div class="member-card-card__mist member-card-card__mist--bottom" aria-hidden="true" />
    <div class="member-card-card__border" aria-hidden="true" />

    <div class="member-card-card__content">
      <header class="member-card-card__header">
        <div class="member-card-card__title-block">
          <p class="member-card-card__eyebrow">{{ cardTitle }}</p>
          <h3 class="member-card-card__name">{{ displayJianghuName }}</h3>
          <p class="member-card-card__subtitle">{{ cardSubtitle }}</p>
        </div>

        <div class="member-card-card__seal">
          <img src="/images/yunqi-logo.png" alt="云栖派标识" />
          <span>名牒</span>
        </div>
      </header>

      <section class="member-card-card__hero">
        <div class="member-card-card__portrait">
          <img v-if="form.portraitDataUrl" :src="form.portraitDataUrl" alt="江湖名帖头像" />
          <span v-else>{{ portraitInitial }}</span>
        </div>

        <article class="member-card-card__edict">
          <p class="member-card-card__section-label">入山名牒</p>
          <p class="member-card-card__identity">{{ displayIdentityLine }}</p>
          <div class="member-card-card__meta-row">
            <span>旧名：{{ displayFormerName }}</span>
            <span>来处：{{ displayFromPlace }}</span>
            <span>帖号：{{ numberText }}</span>
          </div>
        </article>
      </section>

      <section class="member-card-card__story">
        <div class="member-card-card__tag-list">
          <span v-for="tag in skillTagList" :key="tag">{{ tag }}</span>
        </div>
        <p>{{ displayEntryStory }}</p>
      </section>

      <footer class="member-card-card__footer">
        <div class="member-card-card__signature">
          <strong>{{ signaturePrefix }} · {{ displaySignatureLine }}</strong>
          <small>{{ yearText }} · {{ createdAtLabel }}</small>
        </div>

        <div class="member-card-card__qr-panel">
          <div class="member-card-card__qr-box">
            <img v-if="qrCodeUrl" :src="qrCodeUrl" alt="云栖江湖名帖二维码" />
            <span v-else>帖</span>
          </div>
          <div class="member-card-card__qr-copy">
            <strong>{{ qrLabel }}</strong>
            <span>{{ displayQrHint }}</span>
          </div>
        </div>
      </footer>
    </div>
  </article>
</template>

<style scoped>
.member-card-card {
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

.member-card-card__texture,
.member-card-card__mountain,
.member-card-card__mist,
.member-card-card__border {
  position: absolute;
  pointer-events: none;
}

.member-card-card__texture {
  inset: 0;
  background:
    linear-gradient(90deg, rgba(23, 52, 47, 0.05) 1px, transparent 1px),
    linear-gradient(0deg, rgba(23, 52, 47, 0.04) 1px, transparent 1px),
    radial-gradient(circle at 26% 42%, rgba(255, 255, 255, 0.36), transparent 20%);
  background-size: 38px 38px, 44px 44px, auto;
  opacity: 0.58;
}

.member-card-card__mountain {
  left: 0;
  right: 0;
  bottom: 0;
}

.member-card-card__mountain--back {
  height: 35%;
  background: linear-gradient(180deg, transparent, rgba(23, 52, 47, 0.38));
  clip-path: polygon(0 100%, 0 58%, 14% 38%, 32% 70%, 49% 30%, 66% 72%, 83% 42%, 100% 68%, 100% 100%);
}

.member-card-card__mountain--front {
  height: 24%;
  background: linear-gradient(180deg, transparent, rgba(16, 37, 31, 0.72));
  clip-path: polygon(0 100%, 0 72%, 18% 48%, 38% 78%, 56% 42%, 73% 78%, 91% 54%, 100% 72%, 100% 100%);
}

.member-card-card__mist {
  width: 440px;
  height: 130px;
  border-radius: 999px;
  background: rgba(255, 248, 229, 0.42);
  filter: blur(24px);
  animation: member-card-mist 8s ease-in-out infinite;
}

.member-card-card__mist--top {
  top: 250px;
  left: -90px;
}

.member-card-card__mist--bottom {
  right: -90px;
  bottom: 260px;
  animation-delay: -3s;
}

.member-card-card__border {
  inset: 26px;
  border: 2px solid rgba(62, 111, 101, 0.44);
  border-radius: 28px;
  box-shadow: inset 0 0 0 1px rgba(244, 251, 247, 0.42);
}

.member-card-card__content {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  gap: 24px;
  height: 100%;
  padding: 58px 58px 46px;
}

.member-card-card__header,
.member-card-card__hero,
.member-card-card__footer {
  display: flex;
  justify-content: space-between;
  gap: 24px;
}

.member-card-card__title-block,
.member-card-card__edict,
.member-card-card__story,
.member-card-card__signature,
.member-card-card__qr-copy {
  display: grid;
  gap: 10px;
}

.member-card-card__eyebrow,
.member-card-card__section-label {
  margin: 0;
  color: #0f6f66;
  font-size: 28px;
  font-weight: 900;
  letter-spacing: 0.14em;
}

.member-card-card__name {
  margin: 0;
  color: #10251f;
  font-size: 92px;
  line-height: 1.04;
  letter-spacing: 0.08em;
}

.member-card-card__subtitle,
.member-card-card__signature small,
.member-card-card__qr-copy span {
  margin: 0;
  color: rgba(23, 52, 47, 0.72);
  font-size: 22px;
  letter-spacing: 0.12em;
}

.member-card-card__seal {
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

.member-card-card__seal img {
  width: 78px;
  height: 78px;
  object-fit: contain;
}

.member-card-card__seal span {
  font-size: 22px;
  font-weight: 900;
}

.member-card-card__hero {
  align-items: stretch;
}

.member-card-card__portrait {
  display: grid;
  place-items: center;
  width: 260px;
  min-height: 320px;
  border: 1px solid rgba(62, 111, 101, 0.34);
  border-radius: 34px;
  background: rgba(244, 251, 247, 0.62);
  overflow: hidden;
}

.member-card-card__portrait img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.member-card-card__portrait span {
  color: #0f6f66;
  font-size: 116px;
  font-weight: 900;
}

.member-card-card__edict,
.member-card-card__story,
.member-card-card__qr-panel {
  border: 1px solid rgba(62, 111, 101, 0.34);
  border-radius: 32px;
  background: rgba(244, 251, 247, 0.62);
  box-shadow: inset 0 0 40px rgba(23, 52, 47, 0.08);
}

.member-card-card__edict {
  flex: 1;
  align-content: center;
  padding: 34px;
}

.member-card-card__identity {
  margin: 0;
  color: #10251f;
  font-size: 46px;
  line-height: 1.36;
  font-weight: 900;
}

.member-card-card__meta-row,
.member-card-card__tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.member-card-card__meta-row span,
.member-card-card__tag-list span {
  display: inline-grid;
  place-items: center;
  min-height: 50px;
  padding: 0 18px;
  border-radius: 999px;
  background: rgba(62, 111, 101, 0.12);
  color: #21443d;
  font-size: 20px;
  font-weight: 800;
}

.member-card-card__story {
  align-content: start;
  padding: 30px 34px;
}

.member-card-card__story p {
  margin: 0;
  color: #17342f;
  font-size: 32px;
  line-height: 1.55;
  font-weight: 800;
}

.member-card-card__signature strong {
  color: #10251f;
  font-size: 26px;
  line-height: 1.35;
}

.member-card-card__qr-panel {
  display: grid;
  grid-template-columns: 146px 1fr;
  gap: 18px;
  align-items: center;
  max-width: 390px;
  padding: 18px;
}

.member-card-card__qr-box {
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

.member-card-card__qr-box img {
  width: 124px;
  height: 124px;
  object-fit: contain;
}

.member-card-card__qr-copy strong {
  color: #10251f;
  font-size: 26px;
}

@keyframes member-card-mist {
  0%, 100% { transform: translateX(0); opacity: 0.42; }
  50% { transform: translateX(48px); opacity: 0.72; }
}

.member-card-card--reduced,
.member-card-card--reduced * {
  animation: none !important;
  transition: none !important;
}
</style>


