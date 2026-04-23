<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import PageBanner from '@/components/common/PageBanner.vue'
import { useRevealMotion } from '@/composables/useRevealMotion'
import { rosterContent, rosterHallOptions } from '@/data/rosterContent'
import { getSupabaseConfigErrorText, isSupabaseConfigured } from '@/lib/supabase'
import { listPublicRosterEntries } from '@/services/roster'
import type { PublicRosterEntry, RosterHallKey } from '@/types/roster'

// 这里保存页面根节点，供列表页静态区块使用统一显现动效。
const pageRef = ref<HTMLElement | null>(null)

// 这里启用页面显现动效，让名录卡片出现更顺滑。
useRevealMotion({
  rootRef: pageRef,
})

// 这里保存搜索关键字，供名录检索使用。
const keyword = ref<string>('')

// 这里保存堂口筛选值，供名录过滤使用。
const selectedHallKey = ref<RosterHallKey | ''>('')

// 这里保存公开条目列表。
const entryList = ref<PublicRosterEntry[]>([])

// 这里记录加载状态，避免重复请求时用户没有反馈。
const isLoading = ref<boolean>(false)

// 这里记录当前错误提示，名录请求失败时直接显示中文说明。
const errorMessage = ref<string>('')

// 这里保存搜索防抖定时器，避免每敲一个字就立刻发请求。
let searchTimer: number | null = null

/**
 * 拉取公开名录
 * 用途：首屏加载与搜索筛选变更时统一刷新数据
 * 入参：无
 * 返回值：无返回值
 */
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
  void loadEntryList()
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
          <RouterLink class="ink-button ink-button--primary" to="/roster">
            {{ rosterContent.list.registerButton }}
          </RouterLink>
          <RouterLink class="ink-button ink-button--ghost" to="/roster/admin/login">
            {{ rosterContent.list.adminButton }}
          </RouterLink>
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

    <section v-else class="roster-list-grid" data-reveal>
      <RouterLink
        v-for="entry in entryList"
        :key="entry.publicSlug"
        :to="`/roster/entry/${entry.publicSlug}`"
        class="roster-list-card"
      >
        <div class="roster-list-card__head">
          <div>
            <p>{{ entry.hallLabel }}</p>
            <h3>{{ entry.daohao }}</h3>
          </div>
          <span>{{ entry.statusLabel }}</span>
        </div>

        <div class="roster-list-card__meta">
          <strong>{{ entry.entryNo || '牒号待定' }}</strong>
          <small>公开道号：{{ entry.daohao }}</small>
        </div>

        <div class="roster-list-card__section">
          <p>入派本心</p>
          <span>{{ entry.entryIntent }}</span>
        </div>

        <div class="roster-list-card__section">
          <p>身怀所长</p>
          <span>{{ entry.strengths || '暂未公开所长' }}</span>
        </div>

        <div class="roster-list-card__section">
          <p>所好雅事</p>
          <span>{{ entry.hobbies || '暂未公开雅事' }}</span>
        </div>

        <div class="roster-list-card__footer">
          <span>{{ entry.reviewedAt || entry.effectiveDate || entry.createdAt }}</span>
          <strong>查看详情</strong>
        </div>
      </RouterLink>
    </section>
  </div>
</template>

<style scoped>
.roster-list-page {
  gap: 30px;
}

.roster-list-toolbar,
.roster-list-grid {
  display: grid;
  gap: 18px;
}

.roster-list-toolbar__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.roster-list-toolbar__actions {
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

.roster-list-toolbar__chip:hover,
.roster-list-card:hover {
  transform: translateY(-2px);
}

.roster-list-toolbar__chip--active {
  border-color: rgba(216, 185, 114, 0.32);
  background:
    linear-gradient(180deg, rgba(216, 185, 114, 0.14), rgba(35, 25, 9, 0.76)),
    rgba(23, 17, 8, 0.88);
  color: rgba(248, 237, 204, 0.98);
}

.roster-list-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.roster-list-card {
  display: grid;
  gap: 14px;
  min-height: 280px;
  padding: 20px;
  border-radius: 28px;
  border: 1px solid rgba(216, 185, 114, 0.16);
  background:
    radial-gradient(circle at top right, rgba(216, 185, 114, 0.1), transparent 20%),
    linear-gradient(180deg, rgba(8, 30, 42, 0.92), rgba(5, 18, 28, 0.96)),
    rgba(5, 18, 28, 0.94);
  box-shadow: var(--shadow-soft);
  transition:
    transform var(--transition-base),
    border-color var(--transition-base),
    box-shadow var(--transition-base);
}

.roster-list-card:hover {
  border-color: rgba(216, 185, 114, 0.34);
  box-shadow: var(--shadow-strong);
}

.roster-list-card__head,
.roster-list-card__footer {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.roster-list-card__head p,
.roster-list-card__head h3,
.roster-list-card__meta strong,
.roster-list-card__meta small,
.roster-list-card__section p,
.roster-list-card__section span,
.roster-list-card__footer span,
.roster-list-card__footer strong {
  margin: 0;
}

.roster-list-card__head p {
  color: var(--color-cyan);
  letter-spacing: 0.12em;
  font-size: 0.82rem;
}

.roster-list-card__head h3 {
  margin-top: 8px;
  font-size: 1.5rem;
  line-height: 1.3;
}

.roster-list-card__head span {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(216, 185, 114, 0.1);
  color: var(--color-gold-strong);
  font-size: 0.82rem;
}

.roster-list-card__meta {
  display: grid;
  gap: 6px;
}

.roster-list-card__meta strong {
  font-size: 1.08rem;
  color: var(--color-text);
}

.roster-list-card__meta small {
  color: var(--color-text-faint);
  font-size: 0.88rem;
}

.roster-list-card__section {
  display: grid;
  gap: 6px;
}

.roster-list-card__section p {
  color: var(--color-cyan);
  font-size: 0.82rem;
  letter-spacing: 0.14em;
}

.roster-list-card__section span {
  color: var(--color-text-soft);
  line-height: 1.76;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.roster-list-card__footer {
  margin-top: auto;
  color: var(--color-text-faint);
}

.roster-list-card__footer strong {
  color: var(--color-gold-strong);
}

.roster-list-state {
  text-align: left;
}

@media (max-width: 1180px) {
  .roster-list-grid {
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
    width: 100%;
  }

  .roster-list-grid {
    grid-template-columns: 1fr;
  }

  .roster-list-toolbar__chips {
    gap: 8px;
  }

  .roster-list-toolbar__chip {
    min-height: 36px;
    padding: 0 12px;
    font-size: 0.86rem;
  }

  .roster-list-card {
    padding: 16px;
    border-radius: 24px;
  }
}
</style>
