<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useRevealMotion } from '@/composables/useRevealMotion'
import { rosterContent, rosterIdentityOptions } from '@/data/rosterContent'
import { getSupabaseConfigErrorText, isSupabaseConfigured } from '@/lib/supabase'
import { listPublicRosterEntries } from '@/services/roster'
import type { PublicRosterCard, RosterIdentityKey } from '@/types/roster'
import { formatRosterDate, getRosterCoverGradient } from '@/utils/roster'

// 这里保存页面根节点，供显现动效扫描。
const pageRef = ref<HTMLElement | null>(null)

// 这里启用显现动效，让卡册加载更有层次。
useRevealMotion({ rootRef: pageRef })

// 这里拿到路由实例，用于点击卡片进入详情。
const router = useRouter()

// 这里保存搜索关键字。
const keyword = ref<string>('')

// 这里保存身份筛选值。
const selectedIdentityKey = ref<RosterIdentityKey | ''>('')

// 这里保存公开名帖列表。
const cardList = ref<PublicRosterCard[]>([])

// 这里保存长按或点击时被点亮的名帖编号。
const glowingCardId = ref<string>('')

// 这里记录加载状态。
const isLoading = ref<boolean>(false)

// 这里记录错误提示。
const errorMessage = ref<string>('')

// 这里保存搜索防抖定时器。
let searchTimer: number | undefined

// 这里计算当前列表总热度。
const totalHeat = computed<number>(() => cardList.value.reduce((total, card) => total + card.heatValue, 0))

// 这里监听搜索和筛选变化，自动重新加载名册。
watch([keyword, selectedIdentityKey], () => {
  if (searchTimer) {
    window.clearTimeout(searchTimer)
  }

  searchTimer = window.setTimeout(() => {
    void loadCardList()
  }, 280)
})

// 这里页面进入时加载公开名册。
onMounted(() => {
  void loadCardList()
})

// 这里页面离开时清理防抖定时器。
onBeforeUnmount(() => {
  if (searchTimer) {
    window.clearTimeout(searchTimer)
  }
})

/**
 * 加载公开名帖列表
 * 用途：按当前搜索和身份筛选请求公开卡册
 * 入参：无
 * 返回值：无返回值
 */
async function loadCardList(): Promise<void> {
  errorMessage.value = ''

  if (!isSupabaseConfigured()) {
    errorMessage.value = getSupabaseConfigErrorText()
    return
  }

  isLoading.value = true

  try {
    cardList.value = await listPublicRosterEntries({
      keyword: keyword.value,
      identityKey: selectedIdentityKey.value,
    })
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载云栖名册失败，请稍后重试。'
  } finally {
    isLoading.value = false
  }
}

/**
 * 选择身份筛选
 * 用途：点击顶部横向筛选时刷新列表
 * 入参：key 为身份键名或空值
 * 返回值：无返回值
 */
function selectIdentity(key: RosterIdentityKey | ''): void {
  selectedIdentityKey.value = key
}

/**
 * 点亮名帖
 * 用途：长按或按下卡片时触发光效，增强互动感
 * 入参：cardId 为名帖编号
 * 返回值：无返回值
 */
function glowCard(cardId: string): void {
  glowingCardId.value = cardId
}

/**
 * 熄灭名帖
 * 用途：用户松手或离开卡片后关闭光效
 * 入参：无
 * 返回值：无返回值
 */
function clearGlow(): void {
  glowingCardId.value = ''
}

/**
 * 打开名帖详情
 * 用途：点击卡片进入详情页
 * 入参：card 为公开名帖
 * 返回值：无返回值
 */
function openCard(card: PublicRosterCard): void {
  void router.push(`/roster/entry/${card.publicSlug}`)
}
</script>

<template>
  <main ref="pageRef" class="roster-mobile-page roster-list-page">
    <section class="roster-phone-shell">
      <div class="roster-list-hero reveal-on-scroll">
        <p>{{ rosterContent.list.eyebrow }}</p>
        <h1>{{ rosterContent.list.title }}</h1>
        <span>{{ rosterContent.list.lead }}</span>
        <div class="roster-hero-stats">
          <b>{{ cardList.length }}</b><small>公开名帖</small>
          <b>{{ totalHeat }}</b><small>江湖热度</small>
        </div>
      </div>

      <div class="roster-search-panel reveal-on-scroll">
        <input v-model="keyword" :placeholder="rosterContent.list.searchPlaceholder" type="search" />
        <div class="roster-filter-track">
          <button type="button" :class="{ active: selectedIdentityKey === '' }" @click="selectIdentity('')">全部</button>
          <button
            v-for="item in rosterIdentityOptions"
            :key="item.key"
            type="button"
            :class="{ active: selectedIdentityKey === item.key }"
            @click="selectIdentity(item.key)"
          >{{ item.icon }} {{ item.label }}</button>
        </div>
      </div>

      <div v-if="errorMessage" class="roster-state-card roster-state-card--error reveal-on-scroll">
        <p>{{ errorMessage }}</p>
        <button type="button" @click="loadCardList">重新寻访</button>
      </div>

      <div v-else-if="isLoading" class="roster-card-stack">
        <article v-for="index in 3" :key="index" class="roster-public-card roster-public-card--skeleton"></article>
      </div>

      <div v-else-if="cardList.length === 0" class="roster-state-card reveal-on-scroll">
        <p>{{ rosterContent.list.emptyText }}</p>
        <RouterLink to="/roster">我来递一张名帖</RouterLink>
      </div>

      <div v-else class="roster-card-stack">
        <article
          v-for="(card, index) in cardList"
          :key="card.id"
          class="roster-public-card reveal-on-scroll"
          :class="{ 'roster-public-card--glow': glowingCardId === card.id }"
          :style="{ '--roster-card-gradient': getRosterCoverGradient(card.coverKey), '--roster-card-delay': `${index * 0.06}s` }"
          @click="openCard(card)"
          @pointerdown="glowCard(card.id)"
          @pointerleave="clearGlow"
          @pointerup="clearGlow"
        >
          <div class="roster-public-card__shine"></div>
          <div class="roster-public-card__top">
            <span>{{ card.identityLabel }}</span>
            <small>{{ formatRosterDate(card.approvedAt) }}</small>
          </div>
          <strong>{{ card.jianghuName }}</strong>
          <em>{{ card.titleName }}</em>
          <p>{{ card.motto }}</p>
          <div class="roster-public-card__tags">
            <i v-for="tag in card.skillTags.slice(0, 4)" :key="tag">#{{ tag }}</i>
          </div>
          <footer>
            <span>{{ card.regionText }}</span>
            <b>热度 {{ card.heatValue }}</b>
          </footer>
        </article>
      </div>

      <nav class="roster-float-actions" aria-label="名册快捷操作">
        <RouterLink to="/roster">递名帖</RouterLink>
        <RouterLink to="/roster/admin/login">执事台</RouterLink>
      </nav>
    </section>
  </main>
</template>

<style scoped>
.roster-mobile-page {
  min-height: 100vh;
  padding: 108px 14px 112px;
  background:
    radial-gradient(circle at 50% 2%, rgba(221, 176, 87, 0.22), transparent 30%),
    radial-gradient(circle at 80% 20%, rgba(75, 113, 156, 0.28), transparent 26%),
    linear-gradient(180deg, #070b12 0%, #111827 48%, #07090d 100%);
}

.roster-phone-shell {
  width: min(100%, 430px);
  margin: 0 auto;
  color: #f8efd8;
}

.roster-list-hero,
.roster-search-panel,
.roster-state-card,
.roster-public-card {
  border: 1px solid rgba(231, 190, 107, 0.24);
  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(18px);
}

.roster-list-hero {
  position: relative;
  display: grid;
  gap: 12px;
  overflow: hidden;
  padding: 28px 22px;
  border-radius: 32px;
  background:
    radial-gradient(circle at 78% 18%, rgba(255, 236, 183, 0.26), transparent 28%),
    linear-gradient(145deg, rgba(24, 31, 45, 0.96), rgba(13, 17, 28, 0.92));
}

.roster-list-hero::after {
  position: absolute;
  right: -30px;
  bottom: -46px;
  width: 150px;
  height: 150px;
  border: 1px solid rgba(231, 190, 107, 0.28);
  border-radius: 999px;
  content: '';
}

.roster-list-hero p,
.roster-list-hero h1,
.roster-list-hero span {
  position: relative;
  margin: 0;
}

.roster-list-hero p {
  color: #e8bd68;
  font-size: 0.78rem;
  letter-spacing: 0.18em;
}

.roster-list-hero h1 {
  font-size: clamp(2rem, 9vw, 3.25rem);
  line-height: 1.1;
}

.roster-list-hero span,
.roster-state-card p {
  color: rgba(248, 239, 216, 0.72);
  line-height: 1.75;
}

.roster-hero-stats {
  display: grid;
  grid-template-columns: auto 1fr auto 1fr;
  gap: 8px;
  align-items: end;
}

.roster-hero-stats b {
  color: #ffe1a3;
  font-size: 1.8rem;
}

.roster-hero-stats small {
  color: rgba(248, 239, 216, 0.62);
}

.roster-search-panel {
  position: sticky;
  top: 84px;
  z-index: 5;
  display: grid;
  gap: 12px;
  margin: 16px 0;
  padding: 14px;
  border-radius: 24px;
  background: rgba(10, 15, 26, 0.9);
}

.roster-search-panel input {
  width: 100%;
  min-height: 48px;
  padding: 0 16px;
  border: 1px solid rgba(231, 190, 107, 0.18);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff8e7;
  outline: none;
}

.roster-filter-track {
  display: flex;
  gap: 8px;
  margin: 0 -14px;
  padding: 0 14px 2px;
  overflow-x: auto;
}

.roster-filter-track button,
.roster-state-card button,
.roster-state-card a,
.roster-float-actions a {
  border: 1px solid rgba(231, 190, 107, 0.22);
  border-radius: 999px;
  color: #f8efd8;
  text-decoration: none;
}

.roster-filter-track button {
  flex: 0 0 auto;
  min-height: 40px;
  padding: 0 14px;
  background: rgba(255, 255, 255, 0.07);
}

.roster-filter-track button.active {
  background: linear-gradient(135deg, #dfad55, #fff0b8);
  color: #160f07;
}

.roster-card-stack {
  display: grid;
  gap: 16px;
}

.roster-public-card {
  --roster-card-gradient: linear-gradient(145deg, #111827, #28445f 52%, #d9b56d);
  position: relative;
  display: grid;
  gap: 12px;
  min-height: 268px;
  overflow: hidden;
  padding: 22px;
  border-radius: 30px;
  background: var(--roster-card-gradient);
  color: #fff8e7;
  cursor: pointer;
  animation: rosterCardFloat 5.6s ease-in-out infinite;
  animation-delay: var(--roster-card-delay, 0s);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.roster-public-card--glow {
  box-shadow: 0 0 0 2px rgba(255, 230, 170, 0.24), 0 24px 70px rgba(231, 190, 107, 0.28);
  transform: translateY(-5px) rotateX(4deg);
}

.roster-public-card--skeleton {
  min-height: 220px;
  background: linear-gradient(110deg, rgba(255,255,255,0.06), rgba(255,255,255,0.14), rgba(255,255,255,0.06));
  animation: rosterSkeleton 1.2s ease-in-out infinite;
}

.roster-public-card__shine {
  position: absolute;
  inset: -80px auto auto -80px;
  width: 180px;
  height: 180px;
  border-radius: 999px;
  background: rgba(255, 240, 190, 0.18);
  filter: blur(12px);
}

.roster-public-card__top,
.roster-public-card footer {
  position: relative;
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.roster-public-card__top span,
.roster-public-card footer b {
  color: #ffe1a3;
  font-weight: 800;
}

.roster-public-card__top small,
.roster-public-card footer span {
  color: rgba(255, 248, 231, 0.72);
}

.roster-public-card strong,
.roster-public-card em,
.roster-public-card p {
  position: relative;
  margin: 0;
}

.roster-public-card strong {
  font-size: 2.45rem;
  line-height: 1.05;
}

.roster-public-card em {
  color: #ffe1a3;
  font-style: normal;
}

.roster-public-card p {
  color: rgba(255, 248, 231, 0.82);
  line-height: 1.7;
}

.roster-public-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.roster-public-card__tags i {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  color: #fff7dd;
  font-style: normal;
  font-size: 0.82rem;
}

.roster-state-card {
  display: grid;
  gap: 14px;
  padding: 22px;
  border-radius: 26px;
  background: rgba(10, 15, 26, 0.86);
}

.roster-state-card p {
  margin: 0;
}

.roster-state-card button,
.roster-state-card a {
  justify-self: start;
  padding: 10px 16px;
  background: rgba(231, 190, 107, 0.18);
}

.roster-state-card--error {
  border-color: rgba(248, 113, 113, 0.32);
}

.roster-float-actions {
  position: fixed;
  right: 14px;
  bottom: calc(18px + env(safe-area-inset-bottom));
  left: 14px;
  z-index: 10;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  width: min(calc(100% - 28px), 430px);
  margin: 0 auto;
}

.roster-float-actions a {
  display: grid;
  min-height: 48px;
  place-items: center;
  background: rgba(10, 15, 26, 0.88);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.34);
  backdrop-filter: blur(14px);
}

@keyframes rosterCardFloat {
  0%, 100% { transform: translateY(0) rotate(-0.5deg); }
  50% { transform: translateY(-6px) rotate(0.5deg); }
}

@keyframes rosterSkeleton {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}

@media (min-width: 760px) {
  .roster-mobile-page {
    padding-top: 128px;
  }
}
</style>
