<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import PageBanner from '@/components/common/PageBanner.vue'
import RosterPosterStudio from '@/components/roster/RosterPosterStudio.vue'
import { useRevealMotion } from '@/composables/useRevealMotion'
import { createEmptyPublicRosterEntry, rosterContent } from '@/data/rosterContent'
import { getSupabaseConfigErrorText, isSupabaseConfigured } from '@/lib/supabase'
import { getPublicRosterEntryBySlug } from '@/services/roster'
import type { PublicRosterEntry } from '@/types/roster'
import { buildRosterPublicText, getRosterStatusDescription } from '@/utils/roster'

// 这里保存页面根节点，供详情页静态区块使用统一显现动效。
const pageRef = ref<HTMLElement | null>(null)

// 这里启用页面显现动效，让详情区块更有层次感。
useRevealMotion({
  rootRef: pageRef,
})

// 这里读取当前路由参数，详情页靠 publicSlug 拿记录。
const route = useRoute()

// 这里保存详情记录，默认先给一份空占位，避免页面闪烁。
const entry = ref<PublicRosterEntry>(createEmptyPublicRosterEntry())

// 这里记录加载状态，方便展示加载提示。
const isLoading = ref<boolean>(false)

// 这里记录错误状态，详情不存在或连接失败时给中文说明。
const errorMessage = ref<string>('')

/**
 * 详情页标题
 * 用途：根据状态切换更贴切的页头文案
 */
const detailTitle = computed<string>(() => (
  entry.value.status === 'approved' ? rosterContent.detail.approvedTitle : rosterContent.detail.pendingTitle
))

/**
 * 详情页编号标题
 * 用途：正式入册和待审核状态分别展示牒号或回执号
 */
const numberLabel = computed<string>(() => (
  entry.value.status === 'approved' ? '正式牒号' : '回执编号'
))

/**
 * 详情页编号内容
 * 用途：统一给状态卡展示当前编号
 */
const numberText = computed<string>(() => (
  entry.value.status === 'approved' ? (entry.value.entryNo || '待分配') : (entry.value.receiptCode || '待生成')
))

/**
 * 详情页公开文本
 * 用途：把当前公开信息整理成一段简洁文字说明
 */
const publicText = computed<string>(() => buildRosterPublicText(entry.value))

/**
 * 读取公开详情
 * 用途：根据 slug 拉取当前记录的脱敏公开信息
 * 入参：无
 * 返回值：无返回值
 */
async function loadEntryDetail(): Promise<void> {
  const publicSlug = String(route.params.publicSlug || '').trim()

  if (!publicSlug) {
    errorMessage.value = '当前公开详情地址不完整，请返回名录重新进入'
    return
  }

  if (!isSupabaseConfigured()) {
    errorMessage.value = getSupabaseConfigErrorText()
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const record = await getPublicRosterEntryBySlug(publicSlug)

    if (!record) {
      errorMessage.value = '这条记录不存在或已移除，请返回公开名录重新查看'
      return
    }

    entry.value = record
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '公开详情读取失败，请稍后再试'
  } finally {
    isLoading.value = false
  }
}

watch(
  () => route.params.publicSlug,
  () => {
    void loadEntryDetail()
  },
)

onMounted(() => {
  void loadEntryDetail()
})
</script>

<template>
  <div ref="pageRef" class="page roster-entry-page">
    <PageBanner
      eyebrow="云栖名册"
      :title="errorMessage ? '公开详情暂不可读' : `${entry.daohao} · ${detailTitle}`"
      :lead="errorMessage || getRosterStatusDescription(entry.status)"
      :note="rosterContent.detail.publicInfoLead"
    />

    <section v-if="isLoading" class="content-card roster-entry-state" data-reveal>
      <p class="content-card__eyebrow">正在翻阅</p>
      <h2>档案司正在取出这一页文牒</h2>
      <p>请稍候片刻，公开详情与名帖会一并加载。</p>
    </section>

    <section v-else-if="errorMessage" class="content-card content-card--warning roster-entry-state" data-reveal>
      <p class="content-card__eyebrow">读取失败</p>
      <h2>当前公开详情暂时无法显示</h2>
      <p>{{ errorMessage }}</p>
      <div class="page-banner__actions">
        <RouterLink class="ink-button ink-button--primary" to="/roster/list">
          返回公开名录
        </RouterLink>
        <RouterLink class="ink-button ink-button--ghost" to="/roster">
          前往登记入册
        </RouterLink>
      </div>
    </section>

    <template v-else>
      <section class="roster-entry-summary" data-reveal>
        <article class="content-card">
          <p class="content-card__eyebrow">{{ rosterContent.detail.statusTitle }}</p>
          <h2>{{ entry.statusLabel }}</h2>
          <p>{{ getRosterStatusDescription(entry.status) }}</p>
        </article>

        <article class="content-card content-card--soft">
          <p class="content-card__eyebrow">{{ numberLabel }}</p>
          <h2>{{ numberText }}</h2>
          <p>{{ entry.status === 'approved' ? `入册日期：${entry.effectiveDate || entry.reviewedAt}` : `提交日期：${entry.createdAt}` }}</p>
        </article>

        <article class="content-card content-card--serif">
          <p class="content-card__eyebrow">公开字段</p>
          <h2>{{ entry.hallLabel }} · {{ entry.daohao }}</h2>
          <p>{{ rosterContent.detail.publicInfoLead }}</p>
        </article>
      </section>

      <section class="roster-entry-body" data-reveal>
        <div class="roster-entry-main">
          <RosterPosterStudio
            :entry="entry"
            :allow-poster-actions="entry.posterEnabled"
          />
        </div>

        <aside class="roster-entry-side">
          <article class="content-card">
            <p class="content-card__eyebrow">公开文字版</p>
            <h3>这段文字遵循同一套克制公开口径</h3>
            <pre class="roster-entry-side__text">{{ publicText }}</pre>
          </article>

          <article class="content-card content-card--soft">
            <p class="content-card__eyebrow">公开说明</p>
            <h3>敏感信息不会进入分享名帖</h3>
            <ul class="list-column">
              <li v-for="line in rosterContent.privacyNotes" :key="line">{{ line }}</li>
            </ul>
          </article>

          <article class="content-card content-card--serif">
            <p class="content-card__eyebrow">下一步</p>
            <h3>{{ entry.status === 'approved' ? '可去名录中继续浏览其他同门' : '可先分享当前公开详情页' }}</h3>
            <div class="page-banner__actions">
              <RouterLink class="ink-button ink-button--primary" to="/roster/list">
                浏览公开名录
              </RouterLink>
              <RouterLink class="ink-button ink-button--ghost" to="/roster">
                再递一份新文牒
              </RouterLink>
            </div>
          </article>
        </aside>
      </section>
    </template>
  </div>
</template>

<style scoped>
.roster-entry-page {
  gap: 30px;
}

.roster-entry-summary,
.roster-entry-body {
  display: grid;
  gap: 18px;
}

.roster-entry-summary {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.roster-entry-summary h2 {
  margin: 0 0 12px;
  font-size: clamp(1.5rem, 3vw, 2rem);
  line-height: 1.24;
}

.roster-entry-summary p:last-child {
  margin: 0;
  color: var(--color-text-soft);
  line-height: 1.78;
}

.roster-entry-body {
  grid-template-columns: minmax(0, 1.26fr) minmax(280px, 0.74fr);
  align-items: start;
}

.roster-entry-main,
.roster-entry-side {
  display: grid;
  gap: 18px;
}

.roster-entry-side__text {
  margin: 0;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid rgba(216, 185, 114, 0.14);
  background: rgba(7, 27, 37, 0.42);
  color: var(--color-text-soft);
  white-space: pre-wrap;
  font-family: inherit;
  line-height: 1.82;
}

.roster-entry-state h2,
.roster-entry-side h3 {
  margin: 0 0 12px;
  font-size: 1.4rem;
  line-height: 1.32;
}

.roster-entry-state p:last-child {
  margin: 0;
  color: var(--color-text-soft);
  line-height: 1.8;
}

@media (max-width: 1180px) {
  .roster-entry-summary,
  .roster-entry-body {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .roster-entry-side__text {
    padding: 14px;
    border-radius: 16px;
    font-size: 0.92rem;
  }
}
</style>
