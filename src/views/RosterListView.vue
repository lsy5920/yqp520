<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import PageBanner from '@/components/common/PageBanner.vue'
import RosterRegistrationPosterStudio from '@/components/roster/RosterRegistrationPosterStudio.vue'
import { useRevealMotion } from '@/composables/useRevealMotion'
import { rosterContent, rosterHallOptions, rosterRegistrationPosterTemplate } from '@/data/rosterContent'
import { getSupabaseConfigErrorText, isSupabaseConfigured } from '@/lib/supabase'
import { listPublicRosterEntries } from '@/services/roster'
import type { PublicRosterEntry, RosterHallKey } from '@/types/roster'

// 这里保存页面根节点，供列表页静态区块使用统一显现动效。
const pageRef = ref<HTMLElement | null>(null)

// 这里启用页面显现动效，让名录卡片出现更顺滑。
useRevealMotion({
  rootRef: pageRef,
})

// 这里拿到路由实例，供工具栏按钮做显式跳转，避免桌面端复杂层级下点击看起来没有反应。
const router = useRouter()

// 这里保存搜索关键字，供名录检索使用。
const keyword = ref<string>('')

// 这里保存堂口筛选值，供名录过滤使用。
const selectedHallKey = ref<RosterHallKey | ''>('')

// 这里保存公开条目列表。
const entryList = ref<PublicRosterEntry[]>([])

// 这里保存当前弹窗正在查看的公开条目，关闭弹窗时会清空，避免残留旧资料。
const selectedEntry = ref<PublicRosterEntry | null>(null)

// 这里记录加载状态，避免重复请求时用户没有反馈。
const isLoading = ref<boolean>(false)

// 这里记录当前错误提示，名录请求失败时直接显示中文说明。
const errorMessage = ref<string>('')

// 这里保存搜索防抖定时器，避免每敲一个字就立刻发请求。
let searchTimer: number | null = null

/**
 * 玉佩展示样式
 * 用途：给每一枚玉佩提供稳定的错落漂浮参数
 * 入参：无
 * 返回值：返回带公开条目和样式变量的列表
 */
const jadeEntryList = computed(() => entryList.value.map((entry, index) => ({
  entry,
  style: buildJadePendantStyle(entry, index),
})))

/**
 * 生成稳定数字
 * 用途：把公开标识转成稳定数字，让玉佩位置看起来随机但不会频繁跳动
 * 入参：source 为用于计算的文字
 * 返回值：返回稳定数字
 */
function buildStableNumber(source: string): number {
  // 这里准备默认数字，避免空字符串导致计算结果不可用。
  let total = 0

  // 这里逐字累加字符编号，保证同一条记录每次得到同样数字。
  Array.from(source || '云栖').forEach((char, index) => {
    total += char.charCodeAt(0) * (index + 3)
  })

  return total
}

/**
 * 生成玉佩样式
 * 用途：统一控制玉佩大小、旋转、浮动距离和动画速度
 * 入参：entry 为公开条目，index 为列表序号
 * 返回值：返回可绑定到 style 的样式变量
 */
function buildJadePendantStyle(entry: PublicRosterEntry, index: number): Record<string, string> {
  // 这里用公开标识与序号生成稳定种子，避免筛选后所有玉佩都长得一样。
  const seed = buildStableNumber(`${entry.publicSlug}-${entry.daohao}-${index}`)
  // 这里让玉佩尺寸在合理范围内变化，形成远近层次。
  const size = 188 + (seed % 42)
  // 这里让玉佩左右错开，营造漂浮在江湖云雾里的感觉。
  const offset = ((seed % 7) - 3) * 10
  // 这里让玉佩轻微旋转，不影响道名阅读。
  const rotate = ((seed % 9) - 4) * 1.8
  // 这里让每枚玉佩上下浮动距离不同，避免动画整齐呆板。
  const floatDistance = 10 + (seed % 10)
  // 这里让动画时长错开，形成更自然的漂浮节奏。
  const duration = 5.8 + (seed % 8) * 0.36
  // 这里让动画延迟错开，避免同时起伏。
  const delay = (seed % 10) * -0.32
  // 这里通过层级让部分玉佩更靠前。
  const depth = 1 + (seed % 5)

  return {
    '--jade-size': `${size}px`,
    '--jade-offset': `${offset}px`,
    '--jade-rotate': `${rotate}deg`,
    '--jade-float-distance': `${floatDistance}px`,
    '--jade-duration': `${duration}s`,
    '--jade-delay': `${delay}s`,
    '--jade-depth': String(depth),
  }
}

/**
 * 获取名册编号文案
 * 用途：弹窗和玉佩统一显示文牒号或回执号
 * 入参：entry 为公开条目
 * 返回值：返回编号文案
 */
function getEntryNumberText(entry: PublicRosterEntry): string {
  return entry.status === 'approved'
    ? `文牒号：${entry.entryNo || '待定'}`
    : `回执号：${entry.receiptCode || '待定'}`
}

/**
 * 获取名册日期文案
 * 用途：弹窗统一展示入册日期或提交日期
 * 入参：entry 为公开条目
 * 返回值：返回日期文案
 */
function getEntryDateText(entry: PublicRosterEntry): string {
  return entry.status === 'approved'
    ? `入册日期：${entry.effectiveDate || entry.reviewedAt || '待定'}`
    : `提交日期：${entry.createdAt || '待定'}`
}

/**
 * 打开玉佩弹窗
 * 用途：点击道名后展示该同门公开信息
 * 入参：entry 为要查看的公开条目
 * 返回值：无返回值
 */
function openEntryDialog(entry: PublicRosterEntry): void {
  selectedEntry.value = entry
}

/**
 * 关闭玉佩弹窗
 * 用途：关闭后清空当前条目，避免下次打开时闪旧内容
 * 入参：无
 * 返回值：无返回值
 */
function closeEntryDialog(): void {
  selectedEntry.value = null
}

/**
 * 处理键盘关闭弹窗
 * 用途：按退出键时关闭弹窗，方便键盘用户使用
 * 入参：event 为键盘事件
 * 返回值：无返回值
 */
function handleDialogKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && selectedEntry.value) {
    closeEntryDialog()
  }
}

/**
 * 拉取公开名录
 * 用途：首屏加载与搜索筛选变更时统一刷新数据
 * 入参：无
 * 返回值：无返回值
 */
/**
 * 前往名册登记页
 * 用途：工具栏主按钮点击后显式跳转到登记页
 * 入参：无
 * 返回值：无返回值
 */
function handleGoToRegistration(): void {
  void router.push('/roster')
}

/**
 * 前往执事登录页
 * 用途：工具栏管理入口点击后显式跳转到登录页，减少按钮被布局覆盖时的无响应体感
 * 入参：无
 * 返回值：无返回值
 */
function handleGoToAdminLogin(): void {
  void router.push('/roster/admin/login')
}

async function loadEntryList(): Promise<void> {
  if (!isSupabaseConfigured()) {
    errorMessage.value = getSupabaseConfigErrorText()
    entryList.value = []
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    entryList.value = await listPublicRosterEntries({
      keyword: keyword.value,
      hallKey: selectedHallKey.value,
      pageSize: 60,
      pageOffset: 0,
    })
  } catch (error) {
    entryList.value = []
    errorMessage.value = error instanceof Error ? error.message : '公开名录加载失败，请稍后再试'
  } finally {
    isLoading.value = false
  }
}

watch(
  () => [keyword.value, selectedHallKey.value],
  () => {
    if (typeof window === 'undefined') {
      return
    }

    if (searchTimer) {
      window.clearTimeout(searchTimer)
    }

    // 这里做一个轻量防抖，避免用户输入时频繁请求公开列表。
    searchTimer = window.setTimeout(() => {
      void loadEntryList()
    }, 220)
  },
)

onMounted(() => {
  // 这里绑定退出键关闭弹窗，提升弹窗可用性。
  window.addEventListener('keydown', handleDialogKeydown)
  void loadEntryList()
})

onBeforeUnmount(() => {
  // 这里清理搜索定时器和键盘监听，避免页面切换后残留无效任务。
  if (searchTimer) {
    window.clearTimeout(searchTimer)
  }

  window.removeEventListener('keydown', handleDialogKeydown)
})
</script>

<template>
  <div ref="pageRef" class="page roster-list-page">
    <PageBanner
      eyebrow="云栖名册"
      :title="rosterContent.list.title"
      :lead="rosterContent.list.lead"
      :note="rosterContent.page.note"
    />

    <section class="roster-list-toolbar content-card" data-reveal>
      <div class="roster-list-toolbar__head">
        <div>
          <p class="content-card__eyebrow">公开名录</p>
          <h2>只展示已经准予入册的公开条目</h2>
          <p>{{ errorMessage || `当前共收录 ${entryList.length} 条公开记录，可按道号、文牒号或堂口筛选。` }}</p>
        </div>

        <div class="roster-list-toolbar__actions">
          <button type="button" class="ink-button ink-button--primary" @click="handleGoToRegistration">
            {{ rosterContent.list.registerButton }}
          </button>
          <button type="button" class="ink-button ink-button--ghost" @click="handleGoToAdminLogin">
            {{ rosterContent.list.adminButton }}
          </button>
        </div>
      </div>

      <p class="roster-list-toolbar__admin-note">
        {{ rosterContent.list.adminHint }}
      </p>

      <div class="roster-list-toolbar__controls">
        <label class="roster-list-toolbar__search">
          <span>搜索道号 / 文牒号</span>
          <input
            v-model="keyword"
            class="roster-list-toolbar__input"
            :placeholder="rosterContent.list.searchPlaceholder"
            type="text"
          />
        </label>

        <div class="roster-list-toolbar__hall-filter">
          <span>堂口筛选</span>
          <div class="roster-list-toolbar__chips">
            <button
              type="button"
              class="roster-list-toolbar__chip"
              :class="{ 'roster-list-toolbar__chip--active': selectedHallKey === '' }"
              @click="selectedHallKey = ''"
            >
              {{ rosterContent.list.allHallLabel }}
            </button>
            <button
              v-for="hall in rosterHallOptions"
              :key="hall.key"
              type="button"
              class="roster-list-toolbar__chip"
              :class="{ 'roster-list-toolbar__chip--active': selectedHallKey === hall.key }"
              @click="selectedHallKey = hall.key"
            >
              {{ hall.label }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <section class="roster-list-poster" data-reveal>
      <RosterRegistrationPosterStudio :template="rosterRegistrationPosterTemplate" />
    </section>

    <section v-if="isLoading" class="content-card roster-list-state" data-reveal>
      <p class="content-card__eyebrow">加载中</p>
      <h3>公开名录正在整理，请稍候</h3>
      <p>云栖档案司正在翻页，请稍后片刻。</p>
    </section>

    <section v-else-if="errorMessage" class="content-card content-card--warning roster-list-state" data-reveal>
      <p class="content-card__eyebrow">暂未连通</p>
      <h3>公开名录暂时无法读取</h3>
      <p>{{ errorMessage }}</p>
    </section>

    <section v-else-if="entryList.length === 0" class="content-card roster-list-state" data-reveal>
      <p class="content-card__eyebrow">暂无结果</p>
      <h3>{{ rosterContent.list.emptyTitle }}</h3>
      <p>{{ rosterContent.list.emptyDescription }}</p>
    </section>

    <section v-else class="roster-jade-field" data-reveal>
      <div class="roster-jade-field__sky" aria-hidden="true"></div>
      <div class="roster-jade-field__head">
        <p class="content-card__eyebrow">玉佩江湖墙</p>
        <h2>道名入玉，云中浮录</h2>
        <p>点击玉佩上的道名，可展开该同门的公开名帖小窗。</p>
      </div>

      <div class="roster-jade-field__grid">
        <article
          v-for="item in jadeEntryList"
          :key="item.entry.publicSlug"
          class="roster-jade-pendant"
          :style="item.style"
        >
          <div class="roster-jade-pendant__cord" aria-hidden="true"></div>
          <div class="roster-jade-pendant__body">
            <span class="roster-jade-pendant__hole" aria-hidden="true"></span>
            <p class="roster-jade-pendant__hall">{{ item.entry.hallLabel }}</p>
            <button
              type="button"
              class="roster-jade-pendant__name"
              :aria-label="`查看${item.entry.daohao}的公开名帖`"
              @click="openEntryDialog(item.entry)"
            >
              {{ item.entry.daohao }}
            </button>
            <p class="roster-jade-pendant__number">{{ item.entry.entryNo || '牒号待定' }}</p>
            <p class="roster-jade-pendant__status">{{ item.entry.positionLabel }} · {{ item.entry.statusLabel }}</p>
          </div>
          <div class="roster-jade-pendant__tassel" aria-hidden="true"></div>
        </article>
      </div>
    </section>

    <Teleport to="body">
      <div
        v-if="selectedEntry"
        class="roster-entry-dialog"
        role="dialog"
        aria-modal="true"
        :aria-label="`${selectedEntry.daohao}的公开名帖`"
      >
        <button class="roster-entry-dialog__mask" type="button" aria-label="关闭公开名帖弹窗" @click="closeEntryDialog"></button>
        <article class="roster-entry-dialog__panel">
          <button class="roster-entry-dialog__close" type="button" aria-label="关闭弹窗" @click="closeEntryDialog">
            ×
          </button>

          <div class="roster-entry-dialog__title">
            <p>云栖名帖</p>
            <h2>{{ selectedEntry.daohao }}</h2>
            <span>{{ selectedEntry.hallLabel }} · {{ selectedEntry.positionLabel }}</span>
          </div>

          <div class="roster-entry-dialog__meta">
            <p><strong>当前状态</strong><span>{{ selectedEntry.statusLabel }}</span></p>
            <p><strong>名册编号</strong><span>{{ getEntryNumberText(selectedEntry) }}</span></p>
            <p><strong>登记日期</strong><span>{{ getEntryDateText(selectedEntry) }}</span></p>
            <p><strong>公开性别</strong><span>{{ selectedEntry.genderLabel }}</span></p>
          </div>

          <div class="roster-entry-dialog__sections">
            <section>
              <p>入派本心</p>
              <span>{{ selectedEntry.entryIntent }}</span>
            </section>
            <section>
              <p>身怀所长</p>
              <span>{{ selectedEntry.strengths || '暂未公开所长' }}</span>
            </section>
            <section>
              <p>所好雅事</p>
              <span>{{ selectedEntry.hobbies || '暂未公开雅事' }}</span>
            </section>
            <section v-if="selectedEntry.reviewComment">
              <p>执事批语</p>
              <span>{{ selectedEntry.reviewComment }}</span>
            </section>
          </div>

          <div class="roster-entry-dialog__actions">
            <RouterLink class="ink-button ink-button--primary" :to="`/roster/entry/${selectedEntry.publicSlug}`">
              查看完整名帖
            </RouterLink>
            <button type="button" class="ink-button ink-button--ghost" @click="closeEntryDialog">
              收起名帖
            </button>
          </div>
        </article>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.roster-list-page {
  gap: 30px;
}

.roster-list-toolbar {
  position: relative;
  z-index: 2;
  isolation: isolate;
}

.roster-list-toolbar,
.roster-list-poster,
.roster-jade-field {
  display: grid;
  gap: 18px;
}

.roster-list-poster {
  align-items: start;
}

.roster-list-toolbar__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.roster-list-toolbar__actions {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 12px;
}

.roster-list-toolbar__head h2 {
  margin: 0 0 12px;
  font-size: clamp(1.5rem, 3vw, 2.2rem);
  line-height: 1.24;
}

.roster-list-toolbar__head p:last-child {
  margin: 0;
  color: var(--color-text-soft);
  line-height: 1.78;
}

.roster-list-toolbar__admin-note {
  margin: 0;
  color: rgba(248, 237, 204, 0.74);
  line-height: 1.74;
}

.roster-list-toolbar__controls {
  display: grid;
  gap: 16px;
}

.roster-list-toolbar__search,
.roster-list-toolbar__hall-filter {
  display: grid;
  gap: 10px;
}

.roster-list-toolbar__search span,
.roster-list-toolbar__hall-filter span {
  color: var(--color-cyan);
  font-size: 0.84rem;
  letter-spacing: 0.16em;
}

.roster-list-toolbar__input {
  width: 100%;
  min-height: 48px;
  padding: 12px 14px;
  border: 1px solid rgba(216, 185, 114, 0.18);
  border-radius: 16px;
  background: rgba(5, 19, 28, 0.62);
  color: var(--color-text);
  outline: none;
}

.roster-list-toolbar__input:focus {
  border-color: rgba(216, 185, 114, 0.34);
  box-shadow: 0 0 0 3px rgba(216, 185, 114, 0.1);
}

.roster-list-toolbar__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.roster-list-toolbar__chip {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(216, 185, 114, 0.14);
  background: rgba(5, 19, 28, 0.52);
  color: var(--color-text-soft);
  cursor: pointer;
  transition:
    transform var(--transition-base),
    border-color var(--transition-base),
    background-color var(--transition-base);
}

.roster-list-toolbar__chip:hover {
  transform: translateY(-2px);
}

.roster-list-toolbar__chip--active {
  border-color: rgba(216, 185, 114, 0.32);
  background:
    linear-gradient(180deg, rgba(216, 185, 114, 0.14), rgba(35, 25, 9, 0.76)),
    rgba(23, 17, 8, 0.88);
  color: rgba(248, 237, 204, 0.98);
}

.roster-jade-field {
  position: relative;
  display: grid;
  gap: 28px;
  overflow: hidden;
  padding: clamp(24px, 5vw, 48px);
  border-radius: 36px;
  border: 1px solid rgba(216, 185, 114, 0.2);
  background:
    radial-gradient(circle at 18% 14%, rgba(139, 208, 203, 0.18), transparent 26%),
    radial-gradient(circle at 84% 22%, rgba(216, 185, 114, 0.14), transparent 28%),
    linear-gradient(145deg, rgba(5, 18, 28, 0.94), rgba(9, 30, 42, 0.9) 52%, rgba(5, 16, 24, 0.96));
  box-shadow: var(--shadow-strong);
  isolation: isolate;
}

.roster-jade-field::before,
.roster-jade-field::after,
.roster-jade-field__sky {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: '';
}

.roster-jade-field::before {
  background:
    linear-gradient(115deg, transparent 0 20%, rgba(244, 239, 226, 0.06) 21%, transparent 22% 54%, rgba(216, 185, 114, 0.08) 55%, transparent 56%),
    radial-gradient(ellipse at 50% 100%, rgba(0, 0, 0, 0.28), transparent 58%);
  opacity: 0.9;
  z-index: -2;
}

.roster-jade-field::after {
  background:
    radial-gradient(ellipse at 20% 86%, rgba(139, 208, 203, 0.13), transparent 34%),
    radial-gradient(ellipse at 78% 78%, rgba(244, 239, 226, 0.1), transparent 30%);
  filter: blur(14px);
  z-index: -1;
}

.roster-jade-field__sky {
  background-image:
    linear-gradient(rgba(216, 185, 114, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(216, 185, 114, 0.06) 1px, transparent 1px);
  background-size: 68px 68px;
  mask-image: radial-gradient(circle at center, rgba(0, 0, 0, 0.62), transparent 70%);
  z-index: -1;
}

.roster-jade-field__head {
  max-width: 720px;
}

.roster-jade-field__head h2,
.roster-jade-field__head p {
  margin: 0;
}

.roster-jade-field__head h2 {
  margin-top: 8px;
  font-size: clamp(1.8rem, 4vw, 3rem);
  line-height: 1.18;
}

.roster-jade-field__head p:last-child {
  margin-top: 10px;
  color: var(--color-text-soft);
  line-height: 1.78;
}

.roster-jade-field__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(22px, 4vw, 42px);
  align-items: start;
  padding: 10px 0 18px;
}

.roster-jade-pendant {
  position: relative;
  z-index: var(--jade-depth);
  display: grid;
  justify-items: center;
  width: min(100%, var(--jade-size));
  min-height: calc(var(--jade-size) + 80px);
  margin-inline: auto;
  transform: translateX(var(--jade-offset)) rotate(var(--jade-rotate));
  animation: jadePendantFloat var(--jade-duration) ease-in-out var(--jade-delay) infinite alternate;
}

.roster-jade-pendant__cord {
  width: 4px;
  height: 44px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(128, 42, 30, 0.94), rgba(216, 185, 114, 0.86));
  box-shadow: 0 0 16px rgba(216, 185, 114, 0.22);
}

.roster-jade-pendant__body {
  position: relative;
  display: grid;
  place-items: center;
  width: var(--jade-size);
  min-height: calc(var(--jade-size) * 1.08);
  padding: 46px 22px 28px;
  border: 1px solid rgba(244, 239, 226, 0.48);
  border-radius: 46% 46% 50% 50% / 38% 38% 58% 58%;
  background:
    radial-gradient(circle at 32% 24%, rgba(255, 255, 255, 0.78), transparent 12%),
    radial-gradient(circle at 72% 78%, rgba(32, 112, 105, 0.28), transparent 28%),
    linear-gradient(145deg, rgba(238, 255, 241, 0.94), rgba(145, 214, 189, 0.9) 46%, rgba(54, 134, 122, 0.96));
  box-shadow:
    inset 0 0 28px rgba(255, 255, 255, 0.54),
    inset 0 -18px 30px rgba(11, 64, 61, 0.28),
    0 22px 44px rgba(0, 0, 0, 0.3),
    0 0 38px rgba(139, 208, 203, 0.2);
}

.roster-jade-pendant__body::before,
.roster-jade-pendant__body::after {
  position: absolute;
  content: '';
  pointer-events: none;
}

.roster-jade-pendant__body::before {
  inset: 16px;
  border: 1px solid rgba(21, 73, 68, 0.22);
  border-radius: inherit;
}

.roster-jade-pendant__body::after {
  inset: 24px 18px auto;
  height: 36px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.42), transparent);
  transform: rotate(-14deg);
}

.roster-jade-pendant__hole {
  position: absolute;
  top: 18px;
  left: 50%;
  width: 28px;
  height: 28px;
  border: 6px solid rgba(42, 113, 103, 0.52);
  border-radius: 999px;
  background: rgba(4, 18, 24, 0.72);
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.36);
  transform: translateX(-50%);
}

.roster-jade-pendant__hall,
.roster-jade-pendant__number,
.roster-jade-pendant__status {
  margin: 0;
  text-align: center;
  color: rgba(6, 44, 45, 0.78);
}

.roster-jade-pendant__hall {
  font-size: 0.78rem;
  letter-spacing: 0.18em;
}

.roster-jade-pendant__name {
  margin: 10px 0 8px;
  padding: 0;
  border: 0;
  background: transparent;
  color: rgba(14, 54, 50, 0.96);
  font-family: inherit;
  font-size: clamp(1.45rem, 3vw, 2rem);
  font-weight: 800;
  line-height: 1.2;
  text-align: center;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.42), 0 0 12px rgba(255, 255, 255, 0.36);
  cursor: pointer;
}

.roster-jade-pendant__name:hover,
.roster-jade-pendant__name:focus-visible {
  color: rgba(112, 46, 18, 0.98);
  outline: none;
  text-decoration: underline;
  text-underline-offset: 6px;
}

.roster-jade-pendant__number {
  font-weight: 700;
}

.roster-jade-pendant__status {
  margin-top: 6px;
  font-size: 0.82rem;
  line-height: 1.5;
}

.roster-jade-pendant__tassel {
  width: 36px;
  height: 58px;
  border-radius: 0 0 999px 999px;
  background:
    repeating-linear-gradient(90deg, rgba(128, 42, 30, 0.9) 0 3px, rgba(216, 185, 114, 0.88) 3px 5px),
    rgba(128, 42, 30, 0.92);
  filter: drop-shadow(0 12px 14px rgba(0, 0, 0, 0.24));
}

.roster-entry-dialog {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 20px;
}

.roster-entry-dialog__mask {
  position: absolute;
  inset: 0;
  border: 0;
  background:
    radial-gradient(circle at 50% 36%, rgba(139, 208, 203, 0.12), transparent 34%),
    rgba(2, 10, 15, 0.78);
  backdrop-filter: blur(10px);
  cursor: pointer;
}

.roster-entry-dialog__panel {
  position: relative;
  display: grid;
  gap: 18px;
  width: min(760px, 100%);
  max-height: min(86vh, 860px);
  overflow: auto;
  padding: clamp(22px, 4vw, 34px);
  border-radius: 32px;
  border: 1px solid rgba(216, 185, 114, 0.32);
  background:
    radial-gradient(circle at top left, rgba(139, 208, 203, 0.15), transparent 34%),
    linear-gradient(160deg, rgba(8, 30, 42, 0.97), rgba(5, 18, 28, 0.98));
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.48);
}

.roster-entry-dialog__close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 1px solid rgba(216, 185, 114, 0.24);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(244, 239, 226, 0.92);
  font-size: 1.5rem;
  cursor: pointer;
}

.roster-entry-dialog__title p,
.roster-entry-dialog__title h2,
.roster-entry-dialog__title span {
  margin: 0;
}

.roster-entry-dialog__title p {
  color: var(--color-cyan);
  letter-spacing: 0.18em;
  font-size: 0.82rem;
}

.roster-entry-dialog__title h2 {
  margin-top: 8px;
  color: rgba(244, 239, 226, 0.98);
  font-size: clamp(2rem, 6vw, 3.5rem);
  line-height: 1.08;
}

.roster-entry-dialog__title span {
  display: block;
  margin-top: 10px;
  color: var(--color-gold-strong);
}

.roster-entry-dialog__meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.roster-entry-dialog__meta p,
.roster-entry-dialog__sections section {
  margin: 0;
  padding: 14px;
  border-radius: 18px;
  border: 1px solid rgba(216, 185, 114, 0.13);
  background: rgba(255, 255, 255, 0.045);
}

.roster-entry-dialog__meta strong,
.roster-entry-dialog__sections p {
  display: block;
  margin: 0 0 6px;
  color: var(--color-cyan);
  font-size: 0.82rem;
  letter-spacing: 0.12em;
}

.roster-entry-dialog__meta span,
.roster-entry-dialog__sections span {
  color: var(--color-text-soft);
  line-height: 1.78;
}

.roster-entry-dialog__sections {
  display: grid;
  gap: 10px;
}

.roster-entry-dialog__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

@keyframes jadePendantFloat {
  from {
    translate: 0 calc(var(--jade-float-distance) * -0.35);
  }

  to {
    translate: 0 var(--jade-float-distance);
  }
}

.roster-list-state {
  text-align: left;
}

@media (max-width: 1180px) {
  .roster-jade-field__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 920px) {
  .roster-list-toolbar__head {
    flex-direction: column;
  }

  .roster-list-toolbar__actions {
    justify-content: flex-start;
  }
}

@media (max-width: 720px) {
  .roster-list-toolbar__actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
  }

  .roster-list-toolbar__actions > *:last-child:nth-child(odd) {
    grid-column: 1 / -1;
  }

  .roster-jade-field {
    padding: 20px 14px;
    border-radius: 26px;
  }

  .roster-jade-field__grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .roster-jade-pendant {
    width: min(100%, 210px);
    transform: rotate(calc(var(--jade-rotate) * 0.45));
  }

  .roster-list-toolbar__chips {
    gap: 8px;
  }

  .roster-list-toolbar__chip {
    min-height: 36px;
    padding: 0 12px;
    font-size: 0.86rem;
  }

  .roster-entry-dialog {
    padding: 12px;
  }

  .roster-entry-dialog__panel {
    max-height: 88vh;
    border-radius: 24px;
  }

  .roster-entry-dialog__meta {
    grid-template-columns: 1fr;
  }

  .roster-entry-dialog__actions {
    display: grid;
    grid-template-columns: 1fr;
  }
}
</style>

