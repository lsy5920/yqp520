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
    class="cloud-poster-card"
    :class="{ 'cloud-poster-card--reduce-motion': props.reduceMotion }"
    :style="{ '--roster-card-gradient': getRosterCoverGradient(entry.coverKey) }"
  >
    <div class="cloud-poster-card__glow"></div>
    <header>
      <span>云栖名帖</span>
      <small>{{ formatRosterDate(entry.approvedAt) }}</small>
    </header>
    <section class="cloud-poster-card__body">
      <p>{{ entry.identityLabel }} · {{ entry.displayTitle }}</p>
      <h2>{{ entry.jianghuName }}</h2>
      <blockquote>{{ entry.motto }}</blockquote>
      <div class="cloud-poster-card__tags">
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
.cloud-poster-card {
  --roster-card-gradient: linear-gradient(145deg, rgba(255, 255, 255, 0.9), rgba(198, 239, 238, 0.74), rgba(255, 245, 191, 0.7));
  position: relative;
  display: grid;
  width: 420px;
  height: 680px;
  overflow: hidden;
  padding: 34px;
  border-radius: 36px;
  border: 1px solid rgba(255, 255, 255, 0.78);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.88), rgba(255, 255, 255, 0.38)),
    var(--roster-card-gradient);
  color: #103f4a;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.62);
}

.cloud-poster-card__glow {
  position: absolute;
  inset: auto -70px -70px -70px;
  height: 220px;
  border-radius: 999px;
  background:
    radial-gradient(circle at 26% 42%, rgba(255, 255, 255, 0.96), transparent 34%),
    radial-gradient(circle at 62% 48%, rgba(175, 231, 236, 0.42), transparent 42%);
  filter: blur(4px);
  animation: posterGlow 4.8s ease-in-out infinite;
}

.cloud-poster-card--reduce-motion .cloud-poster-card__glow {
  animation: none;
}

.cloud-poster-card header,
.cloud-poster-card footer {
  position: relative;
  display: flex;
  justify-content: space-between;
  gap: 18px;
}

.cloud-poster-card header span,
.cloud-poster-card footer strong {
  color: #0d7c8a;
  font-weight: 900;
}

.cloud-poster-card header small,
.cloud-poster-card footer span,
.cloud-poster-card footer small {
  color: rgba(16, 63, 74, 0.68);
}

.cloud-poster-card__body {
  position: relative;
  display: grid;
  gap: 18px;
  align-self: center;
}

.cloud-poster-card__body p,
.cloud-poster-card__body h2,
.cloud-poster-card__body blockquote {
  margin: 0;
}

.cloud-poster-card__body p {
  color: #0d7c8a;
  font-size: 20px;
  font-weight: 900;
}

.cloud-poster-card__body h2 {
  font-size: 86px;
  line-height: 0.98;
  color: #103f4a;
}

.cloud-poster-card__body blockquote {
  color: rgba(16, 63, 74, 0.78);
  font-size: 24px;
  line-height: 1.65;
}

.cloud-poster-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.cloud-poster-card__tags i {
  padding: 8px 12px;
  border: 1px solid rgba(46, 143, 158, 0.18);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.62);
  color: #185d68;
  font-style: normal;
}

.cloud-poster-card footer {
  align-items: end;
}

.cloud-poster-card footer div {
  display: grid;
  gap: 8px;
}

.cloud-poster-card footer img {
  width: 96px;
  height: 96px;
  padding: 8px;
  border-radius: 18px;
  background: #fff;
}

@keyframes posterGlow {
  0%, 100% { transform: translate3d(0, 0, 0); opacity: 0.78; }
  50% { transform: translate3d(-20px, 18px, 0); opacity: 1; }
}
</style>

