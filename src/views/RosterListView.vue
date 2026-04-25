<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { gsap } from 'gsap'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { useRevealMotion } from '@/composables/useRevealMotion'
import { rosterContent, rosterIdentityOptions } from '@/data/rosterContent'
import { getSupabaseConfigErrorText, isSupabaseConfigured } from '@/lib/supabase'
import { listPublicRosterEntries } from '@/services/roster'
import type { PublicRosterCard, RosterIdentityKey } from '@/types/roster'
import { formatRosterDate, getRosterGenderGlowStyle } from '@/utils/roster'

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

/**
 * 玉佩布局样式类型
 * 用途：约束每枚玉佩稳定漂浮所需的 CSS 变量；入参无；返回值无
 */
interface RosterPendantStyle extends Record<string, string> {
  /** 用途：横向错位值。 */
  '--jade-x': string
  /** 用途：纵向错位值。 */
  '--jade-y': string
  /** 用途：旋转角度。 */
  '--jade-rotate': string
  /** 用途：缩放比例。 */
  '--jade-scale': string
  /** 用途：入场与漂浮延迟。 */
  '--jade-delay': string
  /** 用途：漂浮距离。 */
  '--jade-float': string
  /** 用途：性别柔光。 */
  '--roster-gender-glow': string
  /** 用途：性别强光。 */
  '--roster-gender-glow-strong': string
  /** 用途：性别文字颜色。 */
  '--roster-gender-ink': string
}

// 这里保存页面根节点，供显现动效扫描。
const pageRef = ref<HTMLElement | null>(null)

// 这里启用显现动效，让云海模块分层进入视线。
useRevealMotion({ rootRef: pageRef })

// 这里读取系统减少动态效果偏好，决定是否关闭玉佩循环漂浮和卷轴展开动画。
const prefersReducedMotion = useReducedMotion()

// 这里保存搜索关键字。
const keyword = ref<string>('')

// 这里保存身份筛选值。
const selectedIdentityKey = ref<RosterIdentityKey | ''>('')

// 这里保存公开名帖列表。
const cardList = ref<PublicRosterCard[]>([])

// 这里保存被按下或键盘聚焦点亮的名帖编号。
const glowingCardId = ref<string>('')

// 这里保存当前展开卷轴的名帖，空值表示没有打开详情浮层。
const selectedCard = ref<PublicRosterCard | null>(null)

// 这里保存卷轴浮层节点，方便 GSAP 执行展开动画。
const scrollDialogRef = ref<HTMLElement | null>(null)

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

// 这里监听被选中的玉佩，让卷轴在节点出现后慢慢展开。
watch(selectedCard, async (nextCard) => {
  if (!nextCard || prefersReducedMotion.value) {
    return
  }

  await nextTick()

  if (!scrollDialogRef.value) {
    return
  }

  if (isMobileRosterViewport()) {
    gsap.fromTo(
      scrollDialogRef.value,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.28, ease: 'power2.out' },
    )
    return
  }

  gsap.fromTo(
    scrollDialogRef.value,
    { opacity: 0, scaleX: 0.26, scaleY: 0.92, y: 28, filter: 'blur(10px)' },
    { opacity: 1, scaleX: 1, scaleY: 1, y: 0, filter: 'blur(0px)', duration: 0.86, ease: 'power3.out' },
  )
}, { flush: 'post' })

/**
 * 判断当前是否为手机名册视口
 * 用途：手机浏览器对模糊形变动画更敏感，这里用于切换为更稳的轻量动画
 * 入参：无
 * 返回值：是手机窄屏时返回 true，否则返回 false
 */
function isMobileRosterViewport(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  return window.matchMedia('(max-width: 720px)').matches
}

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
 * 生成稳定随机数
 * 用途：根据名帖编号生成固定漂浮位置，刷新后不会乱跳
 * 入参：seed 为名帖标识，salt 为扰动编号
 * 返回值：返回 0 到 1 之间的小数
 */
function createStableRandom(seed: string, salt: number): number {
  let hash = 2166136261 + salt * 16777619

  for (const char of seed) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }

  return ((hash >>> 0) % 10000) / 10000
}

/**
 * 生成玉佩漂浮样式
 * 用途：给每枚玉佩提供稳定错位、旋转、缩放和性别光效
 * 入参：card 为公开名帖，index 为当前列表序号
 * 返回值：返回 CSS 变量对象
 */
function resolvePendantStyle(card: PublicRosterCard, index: number): RosterPendantStyle {
  const seed = card.publicSlug || card.id || String(index)
  const x = Math.round((createStableRandom(seed, 1) - 0.5) * 36)
  const y = Math.round((createStableRandom(seed, 2) - 0.5) * 46)
  const rotate = Math.round((createStableRandom(seed, 3) - 0.5) * 16)
  const scale = 0.92 + createStableRandom(seed, 4) * 0.18
  const float = 10 + Math.round(createStableRandom(seed, 5) * 12)
  const glowStyle = getRosterGenderGlowStyle(card.genderKey)

  return {
    '--jade-x': `${x}px`,
    '--jade-y': `${y}px`,
    '--jade-rotate': `${rotate}deg`,
    '--jade-scale': scale.toFixed(2),
    '--jade-delay': `${(index * 0.08 + createStableRandom(seed, 6) * 0.8).toFixed(2)}s`,
    '--jade-float': `${float}px`,
    '--roster-gender-glow': glowStyle['--roster-gender-glow'] || 'rgba(255, 255, 255, 0)',
    '--roster-gender-glow-strong': glowStyle['--roster-gender-glow-strong'] || 'rgba(255, 255, 255, 0)',
    '--roster-gender-ink': glowStyle['--roster-gender-ink'] || '#6f8e8a',
  }
}

/**
 * 打开名帖卷轴
 * 用途：点击玉佩后在当前页面放大并展开公开信息
 * 入参：card 为公开名帖
 * 返回值：无返回值
 */
function openCard(card: PublicRosterCard): void {
  playSoftTapFeedback()
  selectedCard.value = card
}

/**
 * 关闭名帖卷轴
 * 用途：用户点击遮罩或关闭按钮后收起公开信息
 * 入参：无
 * 返回值：无返回值
 */
function closeScroll(): void {
  selectedCard.value = null
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

        <div v-else-if="isLoading" class="jade-pendant-field" aria-label="名册加载中">
          <article v-for="index in 6" :key="index" class="jade-pendant-skeleton"></article>
        </div>

        <div v-else-if="cardList.length === 0" class="cloud-state-card">
          <span>云海未见踪迹</span>
          <p>{{ rosterContent.list.emptyText }}</p>
          <RouterLink to="/roster">我来递一张名帖</RouterLink>
        </div>

        <div v-else class="jade-pendant-field">
          <button
            v-for="(card, index) in cardList"
            :key="card.id"
            v-memo="[card.id, card.heatValue, card.genderKey, glowingCardId === card.id]"
            type="button"
            class="jade-pendant"
            :class="[`jade-pendant--${card.genderKey}`, { 'jade-pendant--active': glowingCardId === card.id }]"
            :style="resolvePendantStyle(card, index)"
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
            <span class="jade-pendant__glow" aria-hidden="true"></span>
            <span class="jade-pendant__body">
              <i class="jade-pendant__hole" aria-hidden="true"></i>
              <small>{{ card.identityLabel }}</small>
              <strong>{{ card.jianghuName }}</strong>
              <em>{{ card.displayTitle }}</em>
              <b>{{ card.genderLabel }}</b>
            </span>
            <span class="jade-pendant__shadow" aria-hidden="true"></span>
          </button>
        </div>
      </section>

      <section v-if="selectedCard" class="jade-scroll-overlay" role="dialog" aria-modal="true" :aria-label="`${selectedCard.jianghuName}的公开名帖卷轴`" @click.self="closeScroll">
        <article ref="scrollDialogRef" class="jade-scroll" :style="getRosterGenderGlowStyle(selectedCard.genderKey)">
          <span class="jade-scroll__glow" aria-hidden="true"></span>
          <span class="jade-scroll__axis jade-scroll__axis--left" aria-hidden="true"></span>
          <span class="jade-scroll__axis jade-scroll__axis--right" aria-hidden="true"></span>
          <button type="button" class="jade-scroll__close" aria-label="关闭名帖卷轴" @click="closeScroll">收起</button>

          <header class="jade-scroll__head">
            <span>云中名帖 · {{ selectedCard.genderLabel }}</span>
            <h2>{{ selectedCard.jianghuName }}</h2>
            <p>{{ selectedCard.displayTitle }} · {{ selectedCard.identityLabel }}</p>
          </header>

          <blockquote>{{ selectedCard.motto }}</blockquote>

          <div class="jade-scroll__grid">
            <section class="jade-scroll__panel jade-scroll__panel--wide">
              <span>公开故事</span>
              <p>{{ selectedCard.storyText }}</p>
            </section>
            <section class="jade-scroll__panel">
              <span>所在江湖</span>
              <p>{{ selectedCard.regionText }}</p>
            </section>
            <section class="jade-scroll__panel">
              <span>羁绊状态</span>
              <p>{{ selectedCard.bondLabel }} · {{ selectedCard.bondText }}</p>
            </section>
            <section class="jade-scroll__panel">
              <span>玉佩光效</span>
              <p>{{ selectedCard.genderKey === 'male' ? '青蓝玉光' : selectedCard.genderKey === 'female' ? '粉红玉光' : '清白本色' }}</p>
            </section>
            <section class="jade-scroll__panel">
              <span>入册时间</span>
              <p>{{ formatRosterDate(selectedCard.approvedAt) }}</p>
            </section>
          </div>

          <div class="jade-scroll__tags">
            <i v-for="tag in selectedCard.skillTags" :key="tag">#{{ tag }}</i>
            <i v-if="selectedCard.skillTags.length === 0">#云深待补</i>
          </div>

          <footer class="jade-scroll__actions">
            <RouterLink :to="`/roster/entry/${selectedCard.publicSlug}`">打开独立详情</RouterLink>
            <button type="button" @click="closeScroll">继续看玉佩</button>
          </footer>
        </article>
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

.jade-pendant-field {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(172px, 1fr));
  gap: clamp(18px, 4vw, 44px);
  align-items: center;
  min-height: 560px;
  padding: clamp(28px, 5vw, 68px) clamp(10px, 3vw, 28px);
}

.jade-pendant {
  --jade-x: 0px;
  --jade-y: 0px;
  --jade-rotate: 0deg;
  --jade-scale: 1;
  --jade-delay: 0s;
  --jade-float: 14px;
  --roster-gender-glow: rgba(255, 255, 255, 0);
  --roster-gender-glow-strong: rgba(255, 255, 255, 0);
  --roster-gender-ink: #6f8e8a;
  position: relative;
  display: grid;
  min-height: 270px;
  place-items: center;
  border: 0;
  background: transparent;
  color: #104650;
  cursor: pointer;
  transform: translate3d(var(--jade-x), var(--jade-y), 0) rotate(var(--jade-rotate)) scale(var(--jade-scale));
  transform-origin: center;
  transition: transform 260ms ease, filter 260ms ease;
}

.jade-pendant__glow {
  position: absolute;
  width: 190px;
  height: 220px;
  border-radius: 999px;
  background: var(--roster-gender-glow);
  filter: blur(28px);
  opacity: 0.88;
  transform: translateY(8px);
  pointer-events: none;
}

.jade-pendant--unspecified .jade-pendant__glow {
  opacity: 0;
}

.jade-pendant__body {
  position: relative;
  display: grid;
  width: 156px;
  min-height: 206px;
  place-items: center;
  padding: 46px 18px 22px;
  border: 1px solid rgba(255, 255, 255, 0.86);
  border-radius: 48% 52% 50% 50% / 44% 44% 56% 56%;
  background:
    radial-gradient(circle at 30% 24%, rgba(255, 255, 255, 0.98), transparent 24%),
    radial-gradient(circle at 70% 78%, rgba(124, 198, 181, 0.34), transparent 34%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(223, 246, 237, 0.95) 54%, rgba(142, 211, 193, 0.88));
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.48),
    inset 0 -22px 42px rgba(77, 151, 142, 0.16),
    0 26px 58px rgba(55, 143, 158, 0.2),
    0 0 34px var(--roster-gender-glow);
  animation: jadePendantFloat 5.6s ease-in-out infinite;
  animation-delay: var(--jade-delay);
}

.jade-pendant__body::before,
.jade-pendant__body::after {
  position: absolute;
  content: '';
  pointer-events: none;
}

.jade-pendant__body::before {
  inset: 14px 22px auto;
  height: 78px;
  border-radius: 999px;
  background: linear-gradient(120deg, rgba(255, 255, 255, 0.76), rgba(255, 255, 255, 0));
  transform: rotate(-10deg);
}

.jade-pendant__body::after {
  inset: auto 18px 18px;
  height: 48px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.6), transparent 68%);
}

.jade-pendant__hole {
  position: absolute;
  top: 22px;
  left: 50%;
  width: 34px;
  height: 34px;
  border: 1px solid rgba(91, 145, 137, 0.38);
  border-radius: 999px;
  background:
    radial-gradient(circle, rgba(232, 251, 245, 0.98) 0 42%, rgba(119, 172, 161, 0.28) 43% 54%, rgba(255, 255, 255, 0.72) 55%);
  transform: translateX(-50%);
}

.jade-pendant small,
.jade-pendant strong,
.jade-pendant em,
.jade-pendant b {
  position: relative;
  z-index: 1;
  margin: 0;
  text-align: center;
}

.jade-pendant small {
  color: #0d7c8a;
  font-size: 0.78rem;
  font-weight: 900;
}

.jade-pendant strong {
  max-width: 4.6em;
  color: #103f4a;
  font-size: clamp(1.72rem, 4vw, 2.45rem);
  line-height: 1.04;
}

.jade-pendant em {
  color: rgba(16, 70, 80, 0.68);
  font-style: normal;
  font-weight: 800;
}

.jade-pendant b {
  color: var(--roster-gender-ink);
  font-size: 0.82rem;
}

.jade-pendant__shadow {
  position: absolute;
  right: 18%;
  bottom: 4px;
  left: 18%;
  height: 18px;
  border-radius: 999px;
  background: rgba(55, 143, 158, 0.16);
  filter: blur(10px);
  transform: rotate(calc(var(--jade-rotate) * -1));
}

.jade-pendant--active,
.jade-pendant:hover {
  filter: saturate(1.08);
  transform: translate3d(var(--jade-x), calc(var(--jade-y) - 8px), 0) rotate(var(--jade-rotate)) scale(calc(var(--jade-scale) + 0.05));
}

.jade-pendant--active .jade-pendant__body,
.jade-pendant:hover .jade-pendant__body {
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.62),
    inset 0 -22px 42px rgba(77, 151, 142, 0.16),
    0 32px 72px rgba(55, 143, 158, 0.26),
    0 0 48px var(--roster-gender-glow-strong);
}

.jade-pendant-skeleton {
  min-height: 236px;
  border-radius: 48% 52% 50% 50% / 44% 44% 56% 56%;
  background:
    linear-gradient(110deg, rgba(255, 255, 255, 0.44), rgba(255, 255, 255, 0.86), rgba(255, 255, 255, 0.44)),
    rgba(210, 242, 242, 0.58);
  animation: cloudSkeleton 1.35s ease-in-out infinite;
}

.jade-scroll-overlay {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: grid;
  place-items: center;
  padding: max(22px, env(safe-area-inset-top)) max(18px, env(safe-area-inset-right)) max(22px, env(safe-area-inset-bottom)) max(18px, env(safe-area-inset-left));
  background: rgba(23, 78, 83, 0.26);
  backdrop-filter: blur(12px);
}

.jade-scroll {
  --roster-gender-glow: rgba(255, 255, 255, 0);
  position: relative;
  display: grid;
  gap: 18px;
  width: min(920px, 100%);
  max-height: calc(100dvh - 44px);
  overflow: auto;
  padding: clamp(28px, 5vw, 56px);
  border: 1px solid rgba(181, 133, 67, 0.32);
  border-radius: 32px;
  background:
    radial-gradient(circle at 18% 4%, var(--roster-gender-glow), transparent 24%),
    linear-gradient(90deg, rgba(177, 130, 62, 0.16), transparent 8% 92%, rgba(177, 130, 62, 0.16)),
    linear-gradient(145deg, #fffaf0, #f6ead0 48%, #fffdf6);
  color: #3b2d1d;
  box-shadow: 0 34px 92px rgba(55, 82, 80, 0.3);
  transform-origin: center;
}

.jade-scroll__glow {
  position: absolute;
  inset: -90px auto auto -70px;
  width: 280px;
  height: 280px;
  border-radius: 999px;
  background: var(--roster-gender-glow);
  filter: blur(36px);
  pointer-events: none;
}

.jade-scroll__axis {
  position: absolute;
  top: 22px;
  bottom: 22px;
  width: 28px;
  border-radius: 999px;
  background: linear-gradient(180deg, #c7974f, #8d5c29 52%, #d5aa66);
  box-shadow: inset 0 0 0 1px rgba(255, 244, 210, 0.32);
}

.jade-scroll__axis--left {
  left: -14px;
}

.jade-scroll__axis--right {
  right: -14px;
}

.jade-scroll__close {
  position: absolute;
  top: 18px;
  right: 22px;
  min-height: 38px;
  padding: 0 14px;
  border: 1px solid rgba(120, 84, 39, 0.18);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.58);
  color: #6b4a24;
  font-weight: 900;
}

.jade-scroll__head,
.jade-scroll blockquote,
.jade-scroll__grid,
.jade-scroll__tags,
.jade-scroll__actions {
  position: relative;
  z-index: 1;
}

.jade-scroll__head {
  display: grid;
  gap: 8px;
  padding-right: 78px;
}

.jade-scroll__head span,
.jade-scroll__panel span {
  color: #9b6830;
  font-weight: 900;
}

.jade-scroll__head h2,
.jade-scroll__head p,
.jade-scroll blockquote,
.jade-scroll__panel p {
  margin: 0;
}

.jade-scroll__head h2 {
  color: #103f4a;
  font-size: clamp(3rem, 9vw, 6.8rem);
  line-height: 0.92;
}

.jade-scroll__head p {
  color: #0d7c8a;
  font-weight: 900;
}

.jade-scroll blockquote {
  max-width: 760px;
  color: rgba(59, 45, 29, 0.78);
  font-size: clamp(1.16rem, 2.2vw, 1.48rem);
  line-height: 1.78;
}

.jade-scroll__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.jade-scroll__panel {
  display: grid;
  gap: 8px;
  min-height: 112px;
  padding: 16px;
  border: 1px solid rgba(181, 133, 67, 0.16);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.42);
}

.jade-scroll__panel--wide {
  grid-column: 1 / -1;
}

.jade-scroll__panel p {
  color: rgba(59, 45, 29, 0.74);
  line-height: 1.8;
}

.jade-scroll__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.jade-scroll__tags i {
  padding: 7px 11px;
  border: 1px solid rgba(181, 133, 67, 0.18);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.48);
  color: #805629;
  font-style: normal;
  font-weight: 800;
}

.jade-scroll__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.jade-scroll__actions a,
.jade-scroll__actions button {
  display: grid;
  min-height: 48px;
  place-items: center;
  border: 1px solid rgba(120, 84, 39, 0.18);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.58);
  color: #4f391e;
  font: inherit;
  font-weight: 900;
  text-decoration: none;
}

.jade-scroll__actions a {
  background: linear-gradient(135deg, #79d6dc, #fff5bf);
  color: #103f4a;
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

  .jade-pendant-field {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    min-height: 520px;
  }
}

@media (max-width: 720px) {
  .cloud-roster-page {
    padding-bottom: calc(206px + env(safe-area-inset-bottom));
    overflow-x: clip;
    overflow-y: visible;
  }

  .cloud-roster-sky {
    position: absolute;
  }

  .cloud-roster-sky__cloud,
  .cloud-roster-sky__halo,
  .cloud-roster-hero::before,
  .cloud-roster-island,
  .cloud-person-card,
  .jade-pendant-skeleton {
    animation: none !important;
  }

  .cloud-roster-sky__cloud,
  .cloud-roster-hero::before,
  .jade-pendant__glow,
  .jade-pendant__shadow,
  .jade-scroll::before {
    filter: none;
  }

  .cloud-roster-hero,
  .cloud-roster-command,
  .cloud-state-card,
  .cloud-roster-floating a,
  .jade-scroll-overlay {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
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

  .jade-pendant-field {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px 10px;
    min-height: auto;
    padding: 18px 0 112px;
    contain: layout paint;
  }

  .jade-pendant {
    -webkit-tap-highlight-color: transparent;
    backface-visibility: hidden;
    contain: layout paint style;
    min-height: clamp(194px, 50vw, 220px);
    touch-action: manipulation;
    transform: translate3d(0, 0, 0) rotate(var(--jade-rotate)) scale(0.92);
    transition: transform 160ms ease;
    will-change: auto;
  }

  .jade-pendant__body {
    backface-visibility: hidden;
    width: min(36vw, 128px);
    min-height: clamp(166px, 45vw, 178px);
    padding: 38px 12px 16px;
    animation: none;
    transform: translateZ(0);
  }

  .jade-pendant__glow {
    width: min(42vw, 148px);
    height: min(50vw, 172px);
    opacity: 0.38;
  }

  .jade-pendant__shadow {
    opacity: 0.42;
  }

  .jade-pendant__hole {
    top: 18px;
    width: 30px;
    height: 30px;
  }

  .jade-pendant strong {
    max-width: 4.2em;
    overflow-wrap: anywhere;
    font-size: clamp(1.3rem, 6vw, 1.68rem);
  }

  .jade-pendant small {
    font-size: 0.72rem;
  }

  .jade-pendant em,
  .jade-pendant b {
    font-size: 0.76rem;
  }

  .jade-pendant:hover {
    filter: none;
    transform: translate3d(0, 0, 0) rotate(var(--jade-rotate)) scale(0.92);
  }

  .jade-pendant--active,
  .jade-pendant--active:hover {
    filter: none;
    transform: translate3d(0, -4px, 0) rotate(var(--jade-rotate)) scale(0.95);
  }

  .jade-scroll-overlay {
    background: rgba(23, 78, 83, 0.18);
  }

  .jade-scroll {
    gap: 14px;
    max-height: calc(100svh - 32px);
    overflow-x: hidden;
    overscroll-behavior: contain;
    padding: 34px 22px 24px;
    border-radius: 26px;
    transform: translateZ(0);
  }

  .jade-scroll__axis {
    width: 18px;
  }

  .jade-scroll__axis--left {
    left: -9px;
  }

  .jade-scroll__axis--right {
    right: -9px;
  }

  .jade-scroll__head {
    padding-right: 58px;
  }

  .jade-scroll__head h2 {
    font-size: clamp(2.25rem, 13vw, 4rem);
  }

  .jade-scroll blockquote {
    font-size: 1rem;
    line-height: 1.65;
  }

  .jade-scroll__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .jade-scroll__panel {
    min-height: 96px;
    padding: 12px 10px;
    border-radius: 16px;
  }

  .jade-scroll__panel p {
    overflow-wrap: anywhere;
    font-size: 0.9rem;
    line-height: 1.65;
  }

  .jade-scroll__actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .jade-scroll__actions a,
  .jade-scroll__actions button {
    min-width: 0;
    padding: 0 8px;
    text-align: center;
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

@media (max-width: 360px) {
  .jade-scroll__grid,
  .jade-scroll__actions {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cloud-roster-sky__cloud,
  .cloud-roster-sky__halo,
  .cloud-roster-hero::before,
  .cloud-roster-island,
  .cloud-person-card,
  .jade-pendant__body,
  .jade-pendant-skeleton {
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

@keyframes jadePendantFloat {
  0%,
  100% {
    transform: translate3d(0, 0, 0);
  }

  50% {
    transform: translate3d(0, calc(var(--jade-float) * -1), 0);
  }
}
</style>
