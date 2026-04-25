<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useRevealMotion } from '@/composables/useRevealMotion'
import { rosterContent, rosterIdentityOptions } from '@/data/rosterContent'
import { getSupabaseConfigErrorText, isSupabaseConfigured } from '@/lib/supabase'
import { listPublicRosterEntries } from '@/services/roster'
import type { PublicRosterCard, RosterIdentityKey } from '@/types/roster'
import { formatRosterDate, getRosterCoverGradient } from '@/utils/roster'

/**
 * 云岛展示项类型
 * 用途：约束首屏漂浮云岛的文字和数值；入参无；返回值无
 */
interface RosterCloudIsland {
  /** 用途：云岛标题。 */
  label: string
  /** 用途：云岛核心数值。 */
  value: string
  /** 用途：云岛补充说明。 */
  hint: string
}

/**
 * 云层装饰类型
 * 用途：约束背景云朵的位置和动效节奏；入参无；返回值无
 */
interface RosterCloudLayer {
  /** 用途：云层唯一编号。 */
  key: string
  /** 用途：云层横向位置。 */
  left: string
  /** 用途：云层纵向位置。 */
  top: string
  /** 用途：云层尺寸。 */
  size: string
  /** 用途：云层动画延迟。 */
  delay: string
}

// 这里保存页面根节点，供显现动效扫描。
const pageRef = ref<HTMLElement | null>(null)

// 这里启用显现动效，让云海模块分层进入视线。
useRevealMotion({ rootRef: pageRef })

// 这里拿到路由实例，用于点击云笺后进入详情。
const router = useRouter()

// 这里保存搜索关键字。
const keyword = ref<string>('')

// 这里保存身份筛选值。
const selectedIdentityKey = ref<RosterIdentityKey | ''>('')

// 这里保存公开名帖列表。
const cardList = ref<PublicRosterCard[]>([])

// 这里保存被按下或键盘聚焦点亮的名帖编号。
const glowingCardId = ref<string>('')

// 这里记录加载状态。
const isLoading = ref<boolean>(false)

// 这里记录错误提示。
const errorMessage = ref<string>('')

// 这里保存搜索防抖定时器。
let searchTimer: number | undefined

// 这里定义背景云层，纯装饰不参与业务逻辑。
const cloudLayers: RosterCloudLayer[] = [
  { key: 'near', left: '-8%', top: '6%', size: '280px', delay: '0s' },
  { key: 'middle', left: '62%', top: '12%', size: '240px', delay: '1.2s' },
  { key: 'far', left: '18%', top: '62%', size: '320px', delay: '2.4s' },
  { key: 'light', left: '74%', top: '72%', size: '220px', delay: '3.1s' },
]

// 这里计算当前列表总热度。
const totalHeat = computed<number>(() => cardList.value.reduce((total, card) => total + card.heatValue, 0))

// 这里计算当前筛选的展示名称。
const selectedIdentityLabel = computed<string>(() => {
  if (!selectedIdentityKey.value) {
    return '全部同门'
  }

  return rosterIdentityOptions.find((item) => item.key === selectedIdentityKey.value)?.label ?? '全部同门'
})

// 这里计算首屏云岛数据，让访问者一眼看到名册活跃度。
const cloudIslands = computed<RosterCloudIsland[]>(() => [
  { label: '公开云笺', value: String(cardList.value.length), hint: '已在云海中亮起' },
  { label: '江湖热度', value: String(totalHeat.value), hint: '同门留下的回响' },
  { label: '当前筛选', value: selectedIdentityLabel.value, hint: '轻点云签切换视角' },
])

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
 * 用途：点击顶部云签时刷新列表
 * 入参：key 为身份键名或空值
 * 返回值：无返回值
 */
function selectIdentity(key: RosterIdentityKey | ''): void {
  selectedIdentityKey.value = key
  playSoftTapFeedback()
}

/**
 * 播放轻触反馈
 * 用途：在支持振动的手机上给关键互动一点确认感
 * 入参：无
 * 返回值：无返回值
 */
function playSoftTapFeedback(): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return
  }

  navigator.vibrate(8)
}

/**
 * 点亮名帖
 * 用途：按下或键盘聚焦云笺时触发光效，增强互动感
 * 入参：cardId 为名帖编号
 * 返回值：无返回值
 */
function glowCard(cardId: string): void {
  glowingCardId.value = cardId
}

/**
 * 熄灭名帖
 * 用途：用户松手、移出或失焦后关闭光效
 * 入参：无
 * 返回值：无返回值
 */
function clearGlow(): void {
  glowingCardId.value = ''
}

/**
 * 打开名帖详情
 * 用途：点击云笺进入详情页
 * 入参：card 为公开名帖
 * 返回值：无返回值
 */
function openCard(card: PublicRosterCard): void {
  playSoftTapFeedback()
  void router.push(`/roster/entry/${card.publicSlug}`)
}
</script>

<template>
  <main ref="pageRef" class="cloud-roster-page cloud-roster-list-page">
    <div class="cloud-roster-sky" aria-hidden="true">
      <span
        v-for="layer in cloudLayers"
        :key="layer.key"
        class="cloud-roster-sky__cloud"
        :style="{ left: layer.left, top: layer.top, width: layer.size, height: layer.size, animationDelay: layer.delay }"
      ></span>
      <span class="cloud-roster-sky__halo"></span>
      <span class="cloud-roster-sky__stars"></span>
    </div>

    <section class="cloud-roster-shell">
      <header class="cloud-roster-hero" data-reveal>
        <div class="cloud-roster-hero__copy">
          <p>{{ rosterContent.list.eyebrow }}</p>
          <h1>{{ rosterContent.list.title }}</h1>
          <span>{{ rosterContent.list.lead }}</span>
          <div class="cloud-roster-hero__actions" aria-label="云栖名册主要操作">
            <RouterLink to="/roster">递一张云笺</RouterLink>
            <a href="#cloud-roster-map">进入同门星图</a>
          </div>
        </div>

        <div class="cloud-roster-islands" aria-label="名册概览">
          <article
            v-for="(item, index) in cloudIslands"
            :key="item.label"
            class="cloud-roster-island"
            :style="{ '--cloud-island-delay': `${index * 0.12}s` }"
          >
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <small>{{ item.hint }}</small>
          </article>
        </div>
      </header>

      <section class="cloud-roster-command" data-reveal aria-label="名册搜索与筛选">
        <label class="cloud-search-box">
          <span>寻云签</span>
          <input v-model="keyword" :placeholder="rosterContent.list.searchPlaceholder" type="search" />
        </label>

        <div class="cloud-filter-track" aria-label="同门身份筛选">
          <button
            type="button"
            :class="{ 'cloud-filter-chip--active': selectedIdentityKey === '' }"
            :aria-pressed="selectedIdentityKey === ''"
            @click="selectIdentity('')"
          >
            <b>全</b>
            <span>全部同门</span>
          </button>
          <button
            v-for="item in rosterIdentityOptions"
            :key="item.key"
            type="button"
            :class="{ 'cloud-filter-chip--active': selectedIdentityKey === item.key }"
            :aria-pressed="selectedIdentityKey === item.key"
            @click="selectIdentity(item.key)"
          >
            <b>{{ item.icon }}</b>
            <span>{{ item.label }}</span>
          </button>
        </div>
      </section>

      <section id="cloud-roster-map" class="cloud-roster-map" data-reveal aria-label="云海同门星图">
        <div v-if="errorMessage" class="cloud-state-card cloud-state-card--error">
          <span>云门暂闭</span>
          <p>{{ errorMessage }}</p>
          <button type="button" @click="loadCardList">重新寻访</button>
        </div>

        <div v-else-if="isLoading" class="cloud-card-grid" aria-label="名册加载中">
          <article v-for="index in 6" :key="index" class="cloud-person-card cloud-person-card--skeleton"></article>
        </div>

        <div v-else-if="cardList.length === 0" class="cloud-state-card">
          <span>云海未见踪迹</span>
          <p>{{ rosterContent.list.emptyText }}</p>
          <RouterLink to="/roster">我来递一张名帖</RouterLink>
        </div>

        <div v-else class="cloud-card-grid">
          <article
            v-for="(card, index) in cardList"
            :key="card.id"
            v-memo="[card.id, card.heatValue, glowingCardId === card.id]"
            class="cloud-person-card"
            :class="{ 'cloud-person-card--glow': glowingCardId === card.id }"
            :style="{ '--roster-card-gradient': getRosterCoverGradient(card.coverKey), '--cloud-card-delay': `${index * 0.045}s` }"
            role="button"
            tabindex="0"
            :aria-label="`打开${card.jianghuName}的云栖名帖`"
            @click="openCard(card)"
            @keydown.enter.prevent="openCard(card)"
            @keydown.space.prevent="openCard(card)"
            @focus="glowCard(card.id)"
            @blur="clearGlow"
            @pointerdown="glowCard(card.id)"
            @pointerleave="clearGlow"
            @pointerup="clearGlow"
          >
            <span class="cloud-person-card__mist" aria-hidden="true"></span>
            <header>
              <span>{{ card.identityLabel }}</span>
              <small>{{ formatRosterDate(card.approvedAt) }}</small>
            </header>
            <strong>{{ card.jianghuName }}</strong>
            <em>{{ card.displayTitle }}</em>
            <p>{{ card.motto }}</p>
            <div class="cloud-person-card__tags">
              <i v-for="tag in card.skillTags.slice(0, 4)" :key="tag">#{{ tag }}</i>
            </div>
            <footer>
              <span>{{ card.regionText }}</span>
              <b>热度 {{ card.heatValue }}</b>
            </footer>
          </article>
        </div>
      </section>

      <nav class="cloud-roster-floating" aria-label="名册快捷操作">
        <RouterLink to="/roster">递名帖</RouterLink>
        <RouterLink to="/roster/admin/login">执事台</RouterLink>
      </nav>
    </section>
  </main>
</template>

<style scoped>
.cloud-roster-page {
  position: relative;
  min-height: 100dvh;
  padding: 18px 0 calc(126px + env(safe-area-inset-bottom));
  overflow: hidden;
  color: #123f48;
  isolation: isolate;
}

.cloud-roster-sky {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
  background:
    radial-gradient(circle at 18% 10%, rgba(255, 255, 255, 0.92), transparent 22%),
    radial-gradient(circle at 82% 12%, rgba(153, 221, 234, 0.42), transparent 28%),
    radial-gradient(circle at 52% 88%, rgba(181, 237, 221, 0.44), transparent 30%),
    linear-gradient(180deg, #eefcff 0%, #dff7f8 42%, #f8fbef 100%);
}

.cloud-roster-sky__cloud {
  position: absolute;
  border-radius: 999px;
  background:
    radial-gradient(circle at 30% 36%, rgba(255, 255, 255, 0.98), transparent 34%),
    radial-gradient(circle at 62% 44%, rgba(255, 255, 255, 0.86), transparent 38%),
    radial-gradient(circle at 48% 66%, rgba(161, 222, 227, 0.38), transparent 44%);
  filter: blur(4px);
  opacity: 0.78;
  animation: cloudLayerDrift 16s ease-in-out infinite alternate;
}

.cloud-roster-sky__halo,
.cloud-roster-sky__stars {
  position: absolute;
  inset: 0;
}

.cloud-roster-sky__halo {
  background:
    radial-gradient(circle at 50% 16%, rgba(255, 255, 255, 0.62), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.26), rgba(255, 255, 255, 0));
  animation: cloudHaloPulse 8s ease-in-out infinite;
}

.cloud-roster-sky__stars {
  opacity: 0.34;
  background-image:
    radial-gradient(circle, rgba(34, 129, 150, 0.42) 0 1px, transparent 1.5px),
    radial-gradient(circle, rgba(255, 255, 255, 0.92) 0 1px, transparent 1.5px);
  background-position:
    0 0,
    28px 36px;
  background-size:
    88px 88px,
    122px 122px;
}

.cloud-roster-shell {
  display: grid;
  gap: 22px;
  width: min(1180px, calc(100vw - 28px));
  margin: 0 auto;
}

.cloud-roster-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  gap: 22px;
  min-height: 420px;
  padding: clamp(26px, 5vw, 56px);
  overflow: hidden;
  border: 1px solid rgba(96, 170, 184, 0.24);
  border-radius: 44px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.82), rgba(230, 250, 250, 0.54)),
    rgba(255, 255, 255, 0.58);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.86),
    0 34px 90px rgba(55, 143, 158, 0.2);
  backdrop-filter: blur(24px);
}

.cloud-roster-hero::before,
.cloud-roster-hero::after {
  position: absolute;
  content: '';
  pointer-events: none;
}

.cloud-roster-hero::before {
  inset: auto -12% -34% -8%;
  height: 260px;
  border-radius: 999px;
  background:
    radial-gradient(circle at 24% 42%, rgba(255, 255, 255, 0.98), transparent 28%),
    radial-gradient(circle at 48% 38%, rgba(255, 255, 255, 0.88), transparent 30%),
    radial-gradient(circle at 70% 52%, rgba(159, 222, 228, 0.4), transparent 34%);
  filter: blur(3px);
  animation: cloudBankFloat 12s ease-in-out infinite alternate;
}

.cloud-roster-hero::after {
  top: 34px;
  right: 36px;
  width: 116px;
  height: 116px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.94), rgba(255, 240, 174, 0.2) 58%, transparent 70%);
  box-shadow: 0 0 64px rgba(255, 247, 196, 0.78);
}

.cloud-roster-hero__copy,
.cloud-roster-islands {
  position: relative;
  z-index: 1;
}

.cloud-roster-hero__copy {
  display: grid;
  align-content: center;
  gap: 18px;
}

.cloud-roster-hero__copy p,
.cloud-roster-hero__copy h1,
.cloud-roster-hero__copy span {
  margin: 0;
}

.cloud-roster-hero__copy p {
  color: #227f8d;
  font-size: 0.92rem;
  font-weight: 800;
}

.cloud-roster-hero__copy h1 {
  max-width: 10em;
  color: #104650;
  font-size: clamp(2.7rem, 8vw, 6.2rem);
  line-height: 0.96;
  text-wrap: balance;
}

.cloud-roster-hero__copy span {
  max-width: 680px;
  color: rgba(16, 70, 80, 0.74);
  font-size: 1.08rem;
  line-height: 1.86;
}

.cloud-roster-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.cloud-roster-hero__actions a,
.cloud-state-card a,
.cloud-state-card button,
.cloud-roster-floating a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 20px;
  border: 1px solid rgba(46, 143, 158, 0.24);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.78);
  color: #104650;
  font-weight: 800;
  text-decoration: none;
  box-shadow: 0 16px 36px rgba(55, 143, 158, 0.14);
  transition:
    transform 220ms ease,
    box-shadow 220ms ease,
    background-color 220ms ease;
}

.cloud-roster-hero__actions a:first-child,
.cloud-state-card a,
.cloud-state-card button {
  background: linear-gradient(135deg, #79d6dc, #fff5bf);
}

.cloud-roster-islands {
  display: grid;
  gap: 14px;
  align-content: center;
}

.cloud-roster-island {
  display: grid;
  gap: 5px;
  padding: 22px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 32px 32px 32px 12px;
  background:
    radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.94), transparent 42%),
    rgba(255, 255, 255, 0.58);
  box-shadow: 0 22px 48px rgba(55, 143, 158, 0.16);
  animation: cloudIslandFloat 5.2s ease-in-out infinite;
  animation-delay: var(--cloud-island-delay, 0s);
}

.cloud-roster-island span,
.cloud-roster-island small {
  color: rgba(16, 70, 80, 0.66);
}

.cloud-roster-island strong {
  color: #0d5f6c;
  font-size: clamp(1.7rem, 4vw, 3rem);
  line-height: 1.05;
}

.cloud-roster-command {
  position: sticky;
  top: 96px;
  z-index: 5;
  display: grid;
  gap: 14px;
  padding: 16px;
  border: 1px solid rgba(96, 170, 184, 0.22);
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.74);
  box-shadow: 0 24px 54px rgba(55, 143, 158, 0.16);
  backdrop-filter: blur(22px);
}

.cloud-search-box {
  display: grid;
  gap: 8px;
}

.cloud-search-box span {
  color: #227f8d;
  font-weight: 800;
}

.cloud-search-box input {
  width: 100%;
  min-height: 52px;
  padding: 0 18px;
  border: 1px solid rgba(46, 143, 158, 0.26);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.86);
  color: #104650;
  font: inherit;
  outline: none;
}

.cloud-filter-track {
  display: flex;
  gap: 10px;
  margin: 0 -16px;
  padding: 0 16px 4px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
}

.cloud-filter-track button {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
  min-height: 46px;
  padding: 0 14px;
  border: 1px solid rgba(46, 143, 158, 0.2);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.68);
  color: rgba(16, 70, 80, 0.74);
  cursor: pointer;
  transition:
    transform 220ms ease,
    border-color 220ms ease,
    background-color 220ms ease;
}

.cloud-filter-track b {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 999px;
  background: rgba(121, 214, 220, 0.22);
  color: #0d5f6c;
}

.cloud-filter-chip--active {
  border-color: rgba(16, 126, 146, 0.42) !important;
  background: linear-gradient(135deg, rgba(121, 214, 220, 0.96), rgba(255, 245, 191, 0.92)) !important;
  color: #104650 !important;
  box-shadow: 0 14px 30px rgba(55, 143, 158, 0.16);
}

.cloud-roster-map {
  min-height: 240px;
}

.cloud-card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.cloud-person-card {
  --roster-card-gradient: linear-gradient(145deg, rgba(255, 255, 255, 0.9), rgba(198, 239, 238, 0.74), rgba(255, 245, 191, 0.7));
  position: relative;
  display: grid;
  gap: 12px;
  min-height: 286px;
  overflow: hidden;
  padding: 22px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 34px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.86), rgba(255, 255, 255, 0.38)),
    var(--roster-card-gradient);
  color: #104650;
  cursor: pointer;
  box-shadow: 0 24px 58px rgba(55, 143, 158, 0.16);
  animation: cloudCardRise 640ms ease both, cloudCardBreathe 6s ease-in-out infinite;
  animation-delay: var(--cloud-card-delay, 0s), calc(var(--cloud-card-delay, 0s) + 640ms);
  transition:
    transform 260ms ease,
    box-shadow 260ms ease,
    border-color 260ms ease;
}

.cloud-person-card--glow {
  border-color: rgba(83, 191, 208, 0.72);
  box-shadow:
    0 0 0 4px rgba(121, 214, 220, 0.16),
    0 32px 76px rgba(55, 143, 158, 0.26);
  transform: translateY(-7px) rotateX(2deg);
}

.cloud-person-card--skeleton {
  min-height: 230px;
  background:
    linear-gradient(110deg, rgba(255, 255, 255, 0.44), rgba(255, 255, 255, 0.86), rgba(255, 255, 255, 0.44)),
    rgba(210, 242, 242, 0.58);
  animation: cloudSkeleton 1.35s ease-in-out infinite;
}

.cloud-person-card__mist {
  position: absolute;
  inset: auto -28px -42px -28px;
  height: 128px;
  background:
    radial-gradient(circle at 18% 42%, rgba(255, 255, 255, 0.92), transparent 32%),
    radial-gradient(circle at 52% 36%, rgba(255, 255, 255, 0.82), transparent 34%),
    radial-gradient(circle at 78% 52%, rgba(159, 222, 228, 0.42), transparent 38%);
  filter: blur(2px);
}

.cloud-person-card header,
.cloud-person-card footer,
.cloud-person-card strong,
.cloud-person-card em,
.cloud-person-card p,
.cloud-person-card__tags {
  position: relative;
  z-index: 1;
}

.cloud-person-card header,
.cloud-person-card footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.cloud-person-card header span,
.cloud-person-card footer b,
.cloud-person-card em {
  color: #0d7c8a;
  font-weight: 900;
}

.cloud-person-card header small,
.cloud-person-card footer span {
  color: rgba(16, 70, 80, 0.62);
}

.cloud-person-card strong {
  margin-top: auto;
  font-size: clamp(2rem, 5vw, 3rem);
  line-height: 1.05;
}

.cloud-person-card em {
  font-style: normal;
}

.cloud-person-card p {
  margin: 0;
  color: rgba(16, 70, 80, 0.76);
  line-height: 1.72;
}

.cloud-person-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cloud-person-card__tags i {
  padding: 6px 10px;
  border: 1px solid rgba(46, 143, 158, 0.16);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.58);
  color: #185d68;
  font-style: normal;
  font-size: 0.84rem;
}

.cloud-state-card {
  display: grid;
  gap: 14px;
  max-width: 620px;
  margin: 0 auto;
  padding: 28px;
  border: 1px solid rgba(96, 170, 184, 0.22);
  border-radius: 34px;
  background: rgba(255, 255, 255, 0.78);
  color: #104650;
  text-align: center;
  box-shadow: 0 24px 54px rgba(55, 143, 158, 0.16);
  backdrop-filter: blur(22px);
}

.cloud-state-card span {
  color: #227f8d;
  font-weight: 900;
}

.cloud-state-card p {
  margin: 0;
  color: rgba(16, 70, 80, 0.72);
  line-height: 1.8;
}

.cloud-state-card a,
.cloud-state-card button {
  justify-self: center;
}

.cloud-state-card--error {
  border-color: rgba(188, 92, 74, 0.28);
}

.cloud-roster-floating {
  position: fixed;
  right: max(18px, env(safe-area-inset-right));
  bottom: calc(18px + env(safe-area-inset-bottom));
  z-index: 12;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  width: min(360px, calc(100vw - 28px));
}

.cloud-roster-floating a {
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(18px);
}

@media (hover: hover) and (pointer: fine) {
  .cloud-roster-hero__actions a:hover,
  .cloud-filter-track button:hover,
  .cloud-person-card:hover,
  .cloud-roster-floating a:hover {
    transform: translateY(-3px);
    box-shadow: 0 26px 60px rgba(55, 143, 158, 0.2);
  }
}

@media (max-width: 960px) {
  .cloud-roster-hero {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .cloud-roster-islands {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .cloud-card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .cloud-roster-page {
    padding-bottom: calc(148px + env(safe-area-inset-bottom));
  }

  .cloud-roster-shell {
    width: min(100vw - 20px, 430px);
    gap: 16px;
  }

  .cloud-roster-hero {
    padding: 24px 18px 28px;
    border-radius: 34px;
  }

  .cloud-roster-hero__copy h1 {
    font-size: clamp(2.4rem, 15vw, 4.2rem);
  }

  .cloud-card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .cloud-roster-islands {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cloud-roster-island:last-child:nth-child(odd) {
    grid-column: 1 / -1;
  }

  .cloud-roster-command {
    top: 84px;
    border-radius: 26px;
  }

  .cloud-roster-hero__actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cloud-roster-hero__actions a {
    min-width: 0;
    padding: 0 12px;
    text-align: center;
  }

  .cloud-person-card {
    min-height: 244px;
    padding: 15px;
    border-radius: 26px;
    gap: 9px;
  }

  .cloud-person-card header,
  .cloud-person-card footer {
    display: grid;
    gap: 4px;
  }

  .cloud-person-card strong {
    font-size: clamp(1.55rem, 8vw, 2.15rem);
  }

  .cloud-person-card p {
    display: -webkit-box;
    overflow: hidden;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    font-size: 0.92rem;
  }

  .cloud-person-card__tags i:nth-child(n + 3) {
    display: none;
  }

  .cloud-roster-floating {
    right: 10px;
    left: 10px;
    width: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cloud-roster-sky__cloud,
  .cloud-roster-sky__halo,
  .cloud-roster-hero::before,
  .cloud-roster-island,
  .cloud-person-card {
    animation: none !important;
  }
}

@keyframes cloudLayerDrift {
  from {
    transform: translate3d(-18px, 0, 0) scale(1);
  }

  to {
    transform: translate3d(24px, -12px, 0) scale(1.08);
  }
}

@keyframes cloudHaloPulse {
  0%,
  100% {
    opacity: 0.72;
  }

  50% {
    opacity: 1;
  }
}

@keyframes cloudBankFloat {
  from {
    transform: translate3d(-2%, 0, 0);
  }

  to {
    transform: translate3d(3%, -6px, 0);
  }
}

@keyframes cloudIslandFloat {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-8px);
  }
}

@keyframes cloudCardRise {
  from {
    opacity: 0;
    transform: translateY(18px) scale(0.98);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes cloudCardBreathe {
  0%,
  100% {
    translate: 0 0;
  }

  50% {
    translate: 0 -4px;
  }
}

@keyframes cloudSkeleton {
  0%,
  100% {
    opacity: 0.58;
  }

  50% {
    opacity: 1;
  }
}
</style>
