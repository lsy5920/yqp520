<script setup lang="ts">
import { computed } from 'vue'
import type { PublicRosterCard } from '@/types/roster'
import { formatRosterDate, getRosterCoverGradient } from '@/utils/roster'

// 这里定义海报状态，待审和已入册会使用不同印记与文案。
type RosterPosterStatus = 'pending' | 'approved'

// 这里定义海报卡片入参，二维码可为空，方便详情页和登记成功弹窗复用。
const props = withDefaults(defineProps<{
  /** 用途：公开安全名帖数据；入参含义：无；返回值含义：无 */
  entry: PublicRosterCard
  /** 用途：二维码图片地址；入参含义：无；返回值含义：无 */
  qrCodeUrl?: string
  /** 用途：二维码提示文案；入参含义：无；返回值含义：无 */
  qrHint?: string
  /** 用途：海报状态；入参含义：pending 为待审，approved 为已入册；返回值含义：无 */
  status?: RosterPosterStatus
  /** 用途：是否减少动效；入参含义：true 时关闭浮云动画；返回值含义：无 */
  reduceMotion?: boolean
}>(), {
  status: 'approved',
  reduceMotion: false,
})

// 这里判断当前是不是待审海报，模板会据此显示审核提示。
const isPending = computed<boolean>(() => props.status === 'pending')

// 这里计算海报顶部状态文案，方便扫码者第一眼看懂名帖阶段。
const statusText = computed<string>(() => (isPending.value ? '待云司审核' : '已正式入册'))

// 这里计算海报主标题，统一使用“云海名册令”作为新版视觉名称。
const posterTitle = computed<string>(() => (isPending.value ? '云海待审令' : '云海入册令'))

// 这里计算印章文字，待审和正式入册区分明确。
const sealText = computed<string>(() => (isPending.value ? '待审' : '入册'))

// 这里计算底部日期文案，待审显示递交时间，入册显示通过时间。
const displayDate = computed<string>(() => (isPending.value ? formatRosterDate(props.entry.createdAt) : formatRosterDate(props.entry.approvedAt)))

// 这里计算编号文案，待审阶段不会暴露后台编号。
const entryNoText = computed<string>(() => (props.entry.entryNo ? `云栖第 ${props.entry.entryNo} 号` : '待授入册编号'))

// 这里计算二维码说明，待审提醒保存分享，入册提醒查看公开详情。
const qrCaption = computed<string>(() => (isPending.value ? '保存此令，分享给云司扫码审核' : '扫码查看公开入册详情'))
</script>

<template>
  <article
    class="cloud-poster-card"
    :class="{
      'cloud-poster-card--pending': isPending,
      'cloud-poster-card--approved': !isPending,
      'cloud-poster-card--reduce-motion': props.reduceMotion,
    }"
    :style="{ '--roster-card-gradient': getRosterCoverGradient(entry.coverKey) }"
  >
    <span class="cloud-poster-card__mist cloud-poster-card__mist--one" aria-hidden="true"></span>
    <span class="cloud-poster-card__mist cloud-poster-card__mist--two" aria-hidden="true"></span>
    <span class="cloud-poster-card__blade" aria-hidden="true"></span>

    <header class="cloud-poster-card__header">
      <div>
        <span>{{ statusText }}</span>
        <h2>{{ posterTitle }}</h2>
      </div>
      <i>{{ sealText }}</i>
    </header>

    <section class="cloud-poster-card__body">
      <p>{{ entry.identityLabel }} · {{ entry.genderLabel }} · {{ entry.bondLabel }}</p>
      <h3>{{ entry.jianghuName }}</h3>
      <blockquote>{{ entry.motto }}</blockquote>
      <div class="cloud-poster-card__tags">
        <i v-for="tag in entry.skillTags.slice(0, 5)" :key="tag">#{{ tag }}</i>
      </div>
    </section>

    <footer class="cloud-poster-card__footer">
      <div class="cloud-poster-card__meta">
        <strong>{{ isPending ? '云司未落印' : entryNoText }}</strong>
        <span>{{ displayDate }}</span>
      </div>

      <div class="cloud-poster-card__qr">
        <img v-if="qrCodeUrl" :src="qrCodeUrl" :alt="qrHint || '云海名册令二维码'" />
        <small v-else>二维码生成中</small>
        <em>{{ qrCaption }}</em>
      </div>
    </footer>
  </article>
</template>

<style scoped>
/* 云海名册令：固定画幅，方便预览和导出保持一致。 */
.cloud-poster-card {
  --roster-card-gradient: linear-gradient(145deg, rgba(255, 255, 255, 0.92), rgba(198, 239, 238, 0.76), rgba(255, 245, 191, 0.72));
  position: relative;
  display: grid;
  grid-template-rows: auto 1fr auto;
  width: 420px;
  height: 680px;
  overflow: hidden;
  padding: 30px;
  border: 1px solid rgba(255, 255, 255, 0.82);
  border-radius: 34px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(234, 251, 249, 0.52)),
    var(--roster-card-gradient);
  color: #103f4a;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.66),
    inset 0 0 60px rgba(255, 255, 255, 0.3);
  isolation: isolate;
}

.cloud-poster-card::before {
  position: absolute;
  inset: 14px;
  border: 1px solid rgba(18, 92, 102, 0.16);
  border-radius: 26px;
  content: '';
  pointer-events: none;
}

.cloud-poster-card::after {
  position: absolute;
  inset: auto -50px -64px -50px;
  height: 220px;
  border-radius: 999px;
  background:
    radial-gradient(circle at 24% 44%, rgba(255, 255, 255, 0.98), transparent 34%),
    radial-gradient(circle at 58% 48%, rgba(177, 230, 236, 0.5), transparent 42%),
    radial-gradient(circle at 78% 58%, rgba(255, 245, 191, 0.34), transparent 34%);
  content: '';
  filter: blur(3px);
  pointer-events: none;
}

.cloud-poster-card__mist,
.cloud-poster-card__blade {
  position: absolute;
  pointer-events: none;
}

.cloud-poster-card__mist {
  z-index: 0;
  border-radius: 999px;
  background:
    radial-gradient(circle at 30% 42%, rgba(255, 255, 255, 0.96), transparent 34%),
    radial-gradient(circle at 64% 48%, rgba(255, 255, 255, 0.78), transparent 38%),
    radial-gradient(circle at 50% 70%, rgba(148, 218, 225, 0.32), transparent 46%);
  opacity: 0.68;
  filter: blur(3px);
  animation: posterCloudFloat 7s ease-in-out infinite alternate;
}

.cloud-poster-card__mist--one {
  left: -82px;
  top: 118px;
  width: 210px;
  height: 138px;
}

.cloud-poster-card__mist--two {
  right: -90px;
  top: 330px;
  width: 230px;
  height: 150px;
  animation-delay: 1.2s;
}

.cloud-poster-card__blade {
  left: 28px;
  right: 28px;
  top: 196px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(18, 92, 102, 0.34), transparent);
  transform: rotate(-7deg);
  animation: posterBladeSweep 5s ease-in-out infinite;
}

.cloud-poster-card--reduce-motion .cloud-poster-card__mist,
.cloud-poster-card--reduce-motion .cloud-poster-card__blade {
  animation: none;
}

.cloud-poster-card__header,
.cloud-poster-card__body,
.cloud-poster-card__footer {
  position: relative;
  z-index: 1;
}

.cloud-poster-card__header {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: start;
}

.cloud-poster-card__header div {
  display: grid;
  gap: 7px;
}

.cloud-poster-card__header span,
.cloud-poster-card__body p,
.cloud-poster-card__meta strong {
  color: #0d7c8a;
  font-weight: 900;
}

.cloud-poster-card__header h2,
.cloud-poster-card__body h3,
.cloud-poster-card__body blockquote {
  margin: 0;
}

.cloud-poster-card__header h2 {
  color: #103f4a;
  font-size: 30px;
  line-height: 1.05;
}

.cloud-poster-card__header i {
  display: grid;
  width: 72px;
  height: 72px;
  place-items: center;
  border: 2px solid rgba(173, 63, 54, 0.62);
  border-radius: 50%;
  color: #9f3e33;
  font-size: 22px;
  font-style: normal;
  font-weight: 900;
  transform: rotate(-10deg);
}

.cloud-poster-card--pending .cloud-poster-card__header i {
  border-color: rgba(186, 129, 45, 0.64);
  color: #966323;
}

.cloud-poster-card__body {
  display: grid;
  gap: 16px;
  align-content: center;
  padding: 18px 0 8px;
}

.cloud-poster-card__body p {
  margin: 0;
  font-size: 18px;
}

.cloud-poster-card__body h3 {
  max-width: 5.4em;
  color: #103f4a;
  font-size: 76px;
  line-height: 0.96;
}

.cloud-poster-card__body blockquote {
  max-width: 12em;
  color: rgba(16, 63, 74, 0.78);
  font-size: 24px;
  line-height: 1.58;
}

.cloud-poster-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
}

.cloud-poster-card__tags i {
  padding: 7px 11px;
  border: 1px solid rgba(46, 143, 158, 0.2);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.68);
  color: #185d68;
  font-size: 14px;
  font-style: normal;
  font-weight: 800;
}

.cloud-poster-card__footer {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 14px;
  align-items: end;
}

.cloud-poster-card__meta {
  display: grid;
  gap: 8px;
}

.cloud-poster-card__meta span {
  color: rgba(16, 63, 74, 0.68);
  line-height: 1.6;
}

.cloud-poster-card__qr {
  display: grid;
  justify-items: center;
  gap: 7px;
  width: 112px;
}

.cloud-poster-card__qr img {
  width: 100px;
  height: 100px;
  padding: 8px;
  border: 1px solid rgba(46, 143, 158, 0.18);
  border-radius: 18px;
  background: #fff;
}

.cloud-poster-card__qr small,
.cloud-poster-card__qr em {
  color: rgba(16, 63, 74, 0.68);
  font-size: 12px;
  font-style: normal;
  line-height: 1.35;
  text-align: center;
}

@keyframes posterCloudFloat {
  from {
    transform: translate3d(-12px, 0, 0) scale(1);
  }

  to {
    transform: translate3d(18px, -10px, 0) scale(1.05);
  }
}

@keyframes posterBladeSweep {
  0%, 100% {
    opacity: 0.16;
    transform: translate3d(-18px, 0, 0) rotate(-7deg);
  }

  50% {
    opacity: 0.44;
    transform: translate3d(22px, -8px, 0) rotate(-7deg);
  }
}
</style>
