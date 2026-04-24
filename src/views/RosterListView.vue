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
 * 木签展示样式
 * 用途：给每一枚木签提供稳定的错落漂浮参数
 * 入参：无
 * 返回值：返回带公开条目和样式变量的列表
 */
const woodenEntryList = computed(() => entryList.value.map((entry, index) => ({
  entry,
  style: buildWoodenSlipStyle(entry, index),
})))

/**
 * 生成稳定数字
 * 用途：把公开标识转成稳定数字，让木签位置看起来随机但不会频繁跳动
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
 * 生成木签样式
 * 用途：统一控制木签大小、旋转、浮动距离和动画速度
 * 入参：entry 为公开条目，index 为列表序号
 * 返回值：返回可绑定到 style 的样式变量
 */
function buildWoodenSlipStyle(entry: PublicRosterEntry, index: number): Record<string, string> {
  // 这里用公开标识与序号生成稳定种子，避免筛选后所有木签都长得一样。
  const seed = buildStableNumber(`${entry.publicSlug}-${entry.daohao}-${index}`)
  // 这里让木签宽度在合理范围内变化，形成远近层次。
  const width = 176 + (seed % 34)
  // 这里让木签高度在合理范围内变化，模拟不同长短的江湖名签。
  const height = 270 + (seed % 46)
  // 这里让木签左右错开，营造漂浮在江湖云雾里的感觉。
  const offset = ((seed % 9) - 4) * 12
  // 这里让木签轻微旋转，不影响道名阅读。
  const rotate = ((seed % 11) - 5) * 1.4
  // 这里让木签左右游移幅度不同，动画更像悬在风里。
  const driftDistance = 6 + (seed % 8)
  // 这里让每枚木签上下浮动距离不同，避免动画整齐呆板。
  const floatDistance = 12 + (seed % 12)
  // 这里让动画时长错开，形成更自然的漂浮节奏。
  const duration = 6.4 + (seed % 9) * 0.42
  // 这里让动画延迟错开，避免同时起伏。
  const delay = (seed % 12) * -0.28
  // 这里通过层级让部分木签更靠前。
  const depth = 1 + (seed % 5)

  return {
    '--wooden-width': `${width}px`,
    '--wooden-height': `${height}px`,
    '--wooden-offset': `${offset}px`,
    '--wooden-rotate': `${rotate}deg`,
    '--wooden-drift-distance': `${driftDistance}px`,
    '--wooden-float-distance': `${floatDistance}px`,
    '--wooden-duration': `${duration}s`,
    '--wooden-delay': `${delay}s`,
    '--wooden-depth': String(depth),
  }
}

/**
 * 获取名册编号文案
 * 用途：弹窗和木签统一显示文牒号或回执号
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
 * 打开木签弹窗
 * 用途：点击道名后展示该同门公开信息
 * 入参：entry 为要查看的公开条目
 * 返回值：无返回值
 */
function openEntryDialog(entry: PublicRosterEntry): void {
  selectedEntry.value = entry
}

/**
 * 关闭木签弹窗
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

    <section v-else class="roster-wooden-field" data-reveal>
      <div class="roster-wooden-field__sky" aria-hidden="true"></div>
      <div class="roster-wooden-field__head">
        <p class="content-card__eyebrow">木签江湖墙</p>
        <h2>木签悬名，江湖浮录</h2>
        <p>点击木签上的道名，可展开该同门的公开名帖小窗。</p>
      </div>

      <div class="roster-wooden-field__grid">
        <article
          v-for="item in woodenEntryList"
          :key="item.entry.publicSlug"
          class="roster-wooden-slip"
          :style="item.style"
        >
          <div class="roster-wooden-slip__cord" aria-hidden="true"></div>
          <div class="roster-wooden-slip__knot" aria-hidden="true"></div>
          <div class="roster-wooden-slip__body">
            <span class="roster-wooden-slip__copper" aria-hidden="true"></span>
            <span class="roster-wooden-slip__grain" aria-hidden="true"></span>
            <p class="roster-wooden-slip__seal">{{ item.entry.hallLabel }}</p>
            <button
              type="button"
              class="roster-wooden-slip__name"
              :aria-label="`查看${item.entry.daohao}的公开名帖`"
              @click="openEntryDialog(item.entry)"
            >
              {{ item.entry.daohao }}
            </button>
            <p class="roster-wooden-slip__number">{{ item.entry.entryNo || '牒号待定' }}</p>
            <p class="roster-wooden-slip__status">{{ item.entry.positionLabel }} · {{ item.entry.statusLabel }}</p>
            <span class="roster-wooden-slip__corner roster-wooden-slip__corner--left" aria-hidden="true"></span>
            <span class="roster-wooden-slip__corner roster-wooden-slip__corner--right" aria-hidden="true"></span>
          </div>
          <div class="roster-wooden-slip__tassel" aria-hidden="true"></div>
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
.roster-list-poster {
  display: grid;
  gap: 18px;
}

.roster-list-poster {
  align-items: start;
}

.roster-wooden-field {
  position: relative;
  display: grid;
  gap: 30px;
  overflow: hidden;
  padding: clamp(26px, 5vw, 52px);
  border-radius: 38px;
  border: 1px solid rgba(212, 164, 82, 0.24);
  background:
    radial-gradient(circle at 16% 10%, rgba(212, 164, 82, 0.18), transparent 26%),
    radial-gradient(circle at 86% 18%, rgba(139, 208, 203, 0.12), transparent 30%),
    linear-gradient(145deg, rgba(8, 20, 24, 0.97), rgba(28, 18, 11, 0.9) 48%, rgba(6, 16, 22, 0.98));
  box-shadow: var(--shadow-strong);
  isolation: isolate;
}
.roster-wooden-field::before,
.roster-wooden-field::after,
.roster-wooden-field__sky {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: '';
}

.roster-wooden-field::before {
  background:
    linear-gradient(115deg, transparent 0 18%, rgba(212, 164, 82, 0.08) 19%, transparent 20% 54%, rgba(139, 43, 28, 0.1) 55%, transparent 56%),
    radial-gradient(ellipse at 50% 100%, rgba(0, 0, 0, 0.34), transparent 60%);
  opacity: 0.96;
  z-index: -3;
}

.roster-wooden-field::after {
  background:
    radial-gradient(ellipse at 22% 84%, rgba(139, 208, 203, 0.12), transparent 34%),
    radial-gradient(ellipse at 80% 78%, rgba(212, 164, 82, 0.14), transparent 32%);
  filter: blur(16px);
  animation: woodenMistDrift 14s ease-in-out infinite alternate;
  z-index: -2;
}

.roster-wooden-field__sky {
  background-image:
    linear-gradient(rgba(212, 164, 82, 0.07) 1px, transparent 1px),
    linear-gradient(90deg, rgba(212, 164, 82, 0.05) 1px, transparent 1px),
    radial-gradient(circle, rgba(244, 239, 226, 0.1) 1px, transparent 1px);
  background-size: 76px 76px, 76px 76px, 34px 34px;
  mask-image: radial-gradient(circle at center, rgba(0, 0, 0, 0.68), transparent 72%);
  animation: woodenSkyFlow 24s linear infinite;
  z-index: -1;
}

.roster-wooden-field__head {
  max-width: 760px;
}

.roster-wooden-field__head h2,
.roster-wooden-field__head p {
  margin: 0;
}

.roster-wooden-field__head h2 {
  margin-top: 8px;
  font-size: clamp(1.9rem, 4vw, 3.2rem);
  line-height: 1.16;
}

.roster-wooden-field__head p:last-child {
  margin-top: 10px;
  color: var(--color-text-soft);
  line-height: 1.78;
}

.roster-wooden-field__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(26px, 4vw, 48px);
  align-items: start;
  padding: 14px 0 20px;
}

.roster-wooden-slip {
  position: relative;
  z-index: var(--wooden-depth);
  display: grid;
  justify-items: center;
  width: min(100%, var(--wooden-width));
  min-height: calc(var(--wooden-height) + 94px);
  margin-inline: auto;
  transform: translateX(var(--wooden-offset)) rotate(var(--wooden-rotate));
  animation:
    woodenSlipEnter 0.72s ease-out both,
    woodenSlipFloat var(--wooden-duration) ease-in-out var(--wooden-delay) infinite alternate;
  transition:
    transform var(--transition-base),
    filter var(--transition-base);
}

.roster-wooden-slip:hover,
.roster-wooden-slip:focus-within {
  filter: drop-shadow(0 22px 28px rgba(0, 0, 0, 0.34));
  transform: translateX(var(--wooden-offset)) translateY(-6px) rotate(calc(var(--wooden-rotate) * 0.72));
}

.roster-wooden-slip__cord {
  width: 5px;
  height: 42px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(116, 24, 20, 0.98), rgba(190, 62, 36, 0.92) 48%, rgba(212, 164, 82, 0.86));
  box-shadow: 0 0 18px rgba(190, 62, 36, 0.24);
}

.roster-wooden-slip__knot {
  width: 42px;
  height: 16px;
  margin-top: -4px;
  border-radius: 999px;
  background:
    radial-gradient(circle at 28% 50%, rgba(244, 239, 226, 0.26), transparent 24%),
    linear-gradient(135deg, rgba(128, 36, 26, 0.98), rgba(212, 164, 82, 0.9));
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.26);
}

.roster-wooden-slip__body {
  position: relative;
  display: grid;
  justify-items: center;
  width: var(--wooden-width);
  min-height: var(--wooden-height);
  padding: 48px 18px 28px;
  overflow: hidden;
  border: 1px solid rgba(212, 164, 82, 0.42);
  border-radius: 22px 22px 34px 34px;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.06), transparent 18% 82%, rgba(0, 0, 0, 0.18)),
    repeating-linear-gradient(96deg, rgba(255, 224, 156, 0.08) 0 2px, transparent 2px 13px),
    linear-gradient(145deg, #6f3f22 0%, #9b6335 28%, #5c321d 54%, #2d1710 100%);
  box-shadow:
    inset 0 0 24px rgba(255, 226, 164, 0.22),
    inset 0 -28px 36px rgba(20, 8, 4, 0.42),
    0 24px 46px rgba(0, 0, 0, 0.34),
    0 0 32px rgba(212, 164, 82, 0.1);
}

.roster-wooden-slip__body::before,
.roster-wooden-slip__body::after {
  position: absolute;
  content: '';
  pointer-events: none;
}

.roster-wooden-slip__body::before {
  inset: 12px;
  border: 1px solid rgba(23, 10, 5, 0.36);
  border-radius: 16px 16px 28px 28px;
  box-shadow: inset 0 0 0 1px rgba(212, 164, 82, 0.18);
}

.roster-wooden-slip__body::after {
  inset: 0 auto 0 -70%;
  width: 54%;
  background: linear-gradient(90deg, transparent, rgba(255, 236, 186, 0.2), transparent);
  transform: skewX(-18deg);
  transition: left 0.72s ease;
}

.roster-wooden-slip:hover .roster-wooden-slip__body::after,
.roster-wooden-slip:focus-within .roster-wooden-slip__body::after {
  left: 118%;
}

.roster-wooden-slip__copper {
  position: absolute;
  top: 16px;
  left: 50%;
  width: 42px;
  height: 22px;
  border-radius: 999px;
  background:
    radial-gradient(circle at 32% 32%, rgba(255, 241, 192, 0.75), transparent 24%),
    linear-gradient(135deg, rgba(212, 164, 82, 0.98), rgba(96, 49, 20, 0.96));
  box-shadow:
    inset 0 -3px 8px rgba(59, 26, 9, 0.42),
    0 6px 12px rgba(0, 0, 0, 0.28);
  transform: translateX(-50%);
}

.roster-wooden-slip__grain {
  position: absolute;
  inset: 24px 14px;
  border-radius: 18px 18px 28px 28px;
  background:
    radial-gradient(ellipse at 30% 24%, transparent 0 18px, rgba(45, 20, 8, 0.18) 19px 21px, transparent 22px),
    radial-gradient(ellipse at 70% 62%, transparent 0 24px, rgba(255, 223, 156, 0.12) 25px 27px, transparent 28px);
  opacity: 0.76;
  pointer-events: none;
}

.roster-wooden-slip__seal,
.roster-wooden-slip__number,
.roster-wooden-slip__status {
  position: relative;
  z-index: 1;
  margin: 0;
  text-align: center;
}

.roster-wooden-slip__seal {
  align-self: start;
  padding: 4px 9px;
  border: 1px solid rgba(122, 24, 18, 0.36);
  border-radius: 999px;
  background: rgba(68, 20, 12, 0.22);
  color: rgba(255, 222, 160, 0.92);
  font-size: 0.76rem;
  letter-spacing: 0.14em;
}

.roster-wooden-slip__name {
  position: relative;
  z-index: 1;
  margin: 22px 0 12px;
  padding: 0;
  border: 0;
  background: transparent;
  color: rgba(255, 225, 156, 0.96);
  font-family: inherit;
  font-size: clamp(1.52rem, 3vw, 2.06rem);
  font-weight: 900;
  line-height: 1.18;
  text-align: center;
  text-shadow:
    0 2px 0 rgba(38, 12, 4, 0.88),
    0 0 16px rgba(212, 164, 82, 0.24);
  cursor: pointer;
  writing-mode: horizontal-tb;
}

.roster-wooden-slip__name::after {
  position: absolute;
  left: 50%;
  bottom: -8px;
  width: 0;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, rgba(255, 226, 164, 0.94), transparent);
  content: '';
  transform: translateX(-50%);
  transition: width var(--transition-base);
}

.roster-wooden-slip__name:hover,
.roster-wooden-slip__name:focus-visible {
  color: rgba(255, 244, 206, 0.98);
  outline: none;
  text-shadow:
    0 2px 0 rgba(38, 12, 4, 0.9),
    0 0 22px rgba(255, 216, 134, 0.48);
}

.roster-wooden-slip__name:hover::after,
.roster-wooden-slip__name:focus-visible::after {
  width: 110%;
}

.roster-wooden-slip__number {
  padding: 6px 10px;
  border-radius: 12px;
  background: rgba(20, 8, 4, 0.22);
  color: rgba(244, 239, 226, 0.9);
  font-size: 0.86rem;
  font-weight: 700;
}

.roster-wooden-slip__status {
  margin-top: 10px;
  padding: 7px 10px;
  border: 1px solid rgba(212, 164, 82, 0.18);
  border-radius: 999px;
  background: rgba(255, 238, 194, 0.08);
  color: rgba(244, 239, 226, 0.74);
  font-size: 0.78rem;
  line-height: 1.45;
}

.roster-wooden-slip__corner {
  position: absolute;
  bottom: 14px;
  width: 22px;
  height: 22px;
  border-bottom: 2px solid rgba(212, 164, 82, 0.34);
  pointer-events: none;
}

.roster-wooden-slip__corner--left {
  left: 14px;
  border-left: 2px solid rgba(212, 164, 82, 0.34);
  border-radius: 0 0 0 10px;
}

.roster-wooden-slip__corner--right {
  right: 14px;
  border-right: 2px solid rgba(212, 164, 82, 0.34);
  border-radius: 0 0 10px;
}

.roster-wooden-slip__tassel {
  width: 34px;
  height: 62px;
  border-radius: 0 0 999px 999px;
  background:
    repeating-linear-gradient(90deg, rgba(116, 24, 20, 0.95) 0 3px, rgba(212, 164, 82, 0.9) 3px 5px),
    rgba(116, 24, 20, 0.95);
  filter: drop-shadow(0 12px 14px rgba(0, 0, 0, 0.26));
  transform-origin: top center;
  animation: woodenTasselSwing calc(var(--wooden-duration) * 0.7) ease-in-out var(--wooden-delay) infinite alternate;
}

@keyframes woodenSlipEnter {
  from {
    opacity: 0;
    translate: 0 18px;
    scale: 0.96;
  }

  to {
    opacity: 1;
    translate: 0 0;
    scale: 1;
  }
}

@keyframes woodenSlipFloat {
  from {
    translate: calc(var(--wooden-drift-distance) * -0.5) calc(var(--wooden-float-distance) * -0.35);
  }

  to {
    translate: var(--wooden-drift-distance) var(--wooden-float-distance);
  }
}

@keyframes woodenTasselSwing {
  from {
    rotate: -3deg;
  }

  to {
    rotate: 4deg;
  }
}

@keyframes woodenMistDrift {
  from {
    transform: translate3d(-12px, 0, 0) scale(1);
  }

  to {
    transform: translate3d(18px, -10px, 0) scale(1.04);
  }
}

@keyframes woodenSkyFlow {
  from {
    background-position: 0 0, 0 0, 0 0;
  }

  to {
    background-position: 76px 76px, -76px 76px, 34px 34px;
  }
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

.roster-list-state {
  text-align: left;
}

@media (max-width: 1180px) {
  .roster-wooden-field__grid {
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

  .roster-wooden-field {
    padding: 20px 14px;
    border-radius: 26px;
  }

  .roster-wooden-field__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px 10px;
  }

  .roster-wooden-slip {
    width: min(100%, 156px);
    min-height: 258px;
    transform: rotate(calc(var(--wooden-rotate) * 0.45));
    animation-duration: calc(var(--wooden-duration) * 1.12);
  }

  .roster-wooden-slip__cord {
    height: 32px;
  }

  .roster-wooden-slip__body {
    width: 100%;
    min-height: 192px;
    padding: 42px 10px 20px;
    border-radius: 18px 18px 28px 28px;
  }

  .roster-wooden-slip__copper {
    top: 14px;
    width: 34px;
    height: 18px;
  }

  .roster-wooden-slip__name {
    margin-top: 18px;
    font-size: 1.18rem;
  }

  .roster-wooden-slip__seal,
  .roster-wooden-slip__number,
  .roster-wooden-slip__status {
    font-size: 0.68rem;
  }

  .roster-wooden-slip__tassel {
    width: 28px;
    height: 44px;
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

