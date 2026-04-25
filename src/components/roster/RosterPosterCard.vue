<script setup lang="ts">
import type { PublicRosterCard } from '@/types/roster'
import { formatRosterDate, getRosterCoverGradient } from '@/utils/roster'

// 这里定义海报卡片入参，二维码可为空，方便详情页预览。
const props = defineProps<{
  /** 用途：公开名帖数据；入参含义：无；返回值含义：无 */
  entry: PublicRosterCard
  /** 用途：二维码图片地址；入参含义：无；返回值含义：无 */
  qrCodeUrl?: string
  /** 用途：二维码提示文案；入参含义：无；返回值含义：无 */
  qrHint?: string
  /** 用途：是否减少动效；入参含义：无；返回值含义：无 */
  reduceMotion?: boolean
}>()
</script>

<template>
  <article
    class="roster-poster-card"
    :class="{ 'roster-poster-card--reduce-motion': props.reduceMotion }"
    :style="{ '--roster-card-gradient': getRosterCoverGradient(entry.coverKey) }"
  >
    <div class="roster-poster-card__glow"></div>
    <header>
      <span>云栖名帖</span>
      <small>{{ formatRosterDate(entry.approvedAt) }}</small>
    </header>
    <section class="roster-poster-card__body">
      <p>{{ entry.identityLabel }} · {{ entry.displayTitle }}</p>
      <h2>{{ entry.jianghuName }}</h2>
      <blockquote>{{ entry.motto }}</blockquote>
      <div class="roster-poster-card__tags">
        <i v-for="tag in entry.skillTags.slice(0, 5)" :key="tag">#{{ tag }}</i>
      </div>
    </section>
    <footer>
      <div>
        <strong>{{ entry.bondLabel }}</strong>
        <span>{{ entry.entryNo ? `编号 ${entry.entryNo}` : '待授编号' }}</span>
      </div>
      <img v-if="qrCodeUrl" :src="qrCodeUrl" :alt="qrHint || '名帖二维码'" />
      <small v-else>扫码同游云栖</small>
    </footer>
  </article>
</template>

<style scoped>
.roster-poster-card {
  --roster-card-gradient: linear-gradient(145deg, #111827, #28445f 52%, #d9b56d);
  position: relative;
  display: grid;
  width: 420px;
  height: 680px;
  overflow: hidden;
  padding: 34px;
  border-radius: 36px;
  background: var(--roster-card-gradient);
  color: #fff8e7;
  box-shadow: inset 0 0 0 1px rgba(255, 239, 190, 0.28);
}

.roster-poster-card__glow {
  position: absolute;
  inset: -120px -100px auto auto;
  width: 260px;
  height: 260px;
  border-radius: 999px;
  background: rgba(255, 235, 180, 0.24);
  filter: blur(18px);
  animation: posterGlow 4.8s ease-in-out infinite;
}

.roster-poster-card--reduce-motion .roster-poster-card__glow {
  animation: none;
}

.roster-poster-card header,
.roster-poster-card footer {
  position: relative;
  display: flex;
  justify-content: space-between;
  gap: 18px;
}

.roster-poster-card header span,
.roster-poster-card footer strong {
  color: #ffe1a3;
  font-weight: 900;
  letter-spacing: 0.14em;
}

.roster-poster-card header small,
.roster-poster-card footer span,
.roster-poster-card footer small {
  color: rgba(255, 248, 231, 0.72);
}

.roster-poster-card__body {
  position: relative;
  display: grid;
  gap: 18px;
  align-self: center;
}

.roster-poster-card__body p,
.roster-poster-card__body h2,
.roster-poster-card__body blockquote {
  margin: 0;
}

.roster-poster-card__body p {
  color: #ffe1a3;
  font-size: 20px;
}

.roster-poster-card__body h2 {
  font-size: 86px;
  line-height: 0.98;
  letter-spacing: 0.08em;
}

.roster-poster-card__body blockquote {
  color: rgba(255, 248, 231, 0.86);
  font-size: 24px;
  line-height: 1.65;
}

.roster-poster-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.roster-poster-card__tags i {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  font-style: normal;
}

.roster-poster-card footer {
  align-items: end;
}

.roster-poster-card footer div {
  display: grid;
  gap: 8px;
}

.roster-poster-card footer img {
  width: 96px;
  height: 96px;
  padding: 8px;
  border-radius: 18px;
  background: #fff8e7;
}

@keyframes posterGlow {
  0%, 100% { transform: translate3d(0, 0, 0); opacity: 0.78; }
  50% { transform: translate3d(-20px, 18px, 0); opacity: 1; }
}
</style>

