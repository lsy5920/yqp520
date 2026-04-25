<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import RosterPosterStudio from '@/components/roster/RosterPosterStudio.vue'
import { useRevealMotion } from '@/composables/useRevealMotion'
import { createEmptyPublicRosterCard, rosterContent } from '@/data/rosterContent'
import { getSupabaseConfigErrorText, isSupabaseConfigured } from '@/lib/supabase'
import { getPublicRosterEntryBySlug } from '@/services/roster'
import type { PublicRosterCard } from '@/types/roster'
import { formatRosterDate, getRosterCoverGradient } from '@/utils/roster'

// 这里保存页面根节点，供详情页显现动效使用。
const pageRef = ref<HTMLElement | null>(null)

// 这里启用显现动效，让详情抽屉出现更柔和。
useRevealMotion({ rootRef: pageRef })

// 这里读取路由参数里的公开标识。
const route = useRoute()

// 这里保存详情名帖，先给空结构避免模板报错。
const entry = ref<PublicRosterCard>(createEmptyPublicRosterCard())

// 这里记录加载状态。
const isLoading = ref<boolean>(false)

// 这里记录错误提示。
const errorMessage = ref<string>('')

// 这里计算当前名帖封面背景。
const detailStyle = computed<Record<string, string>>(() => ({
  '--roster-card-gradient': getRosterCoverGradient(entry.value.coverKey),
}))

// 这里进入页面时加载详情。
onMounted(() => {
  void loadEntryDetail()
})

/**
 * 加载名帖详情
 * 用途：根据路由公开标识请求单张公开名帖
 * 入参：无
 * 返回值：无返回值
 */
async function loadEntryDetail(): Promise<void> {
  errorMessage.value = ''

  if (!isSupabaseConfigured()) {
    errorMessage.value = getSupabaseConfigErrorText()
    return
  }

  const publicSlug = String(route.params.publicSlug || '').trim()
  if (!publicSlug) {
    errorMessage.value = rosterContent.detail.notFound
    return
  }

  isLoading.value = true

  try {
    const result = await getPublicRosterEntryBySlug(publicSlug)
    if (!result) {
      errorMessage.value = rosterContent.detail.notFound
      return
    }

    entry.value = result
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载名帖详情失败，请稍后重试。'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <main ref="pageRef" class="roster-mobile-page roster-detail-page">
    <section class="roster-phone-shell">
      <div v-if="isLoading" class="roster-detail-state reveal-on-scroll">{{ rosterContent.detail.loading }}</div>

      <div v-else-if="errorMessage" class="roster-detail-state roster-detail-state--error reveal-on-scroll">
        <p>{{ errorMessage }}</p>
        <RouterLink to="/roster/list">返回云栖名册</RouterLink>
      </div>

      <template v-else>
        <article class="roster-detail-card reveal-on-scroll" :style="detailStyle">
          <div class="roster-detail-card__halo"></div>
          <header>
            <span>{{ entry.identityLabel }}</span>
            <small>{{ formatRosterDate(entry.approvedAt) }} 入册</small>
          </header>
          <h1>{{ entry.jianghuName }}</h1>
          <em>{{ entry.displayTitle }}</em>
          <p>{{ entry.motto }}</p>
          <div class="roster-detail-card__tags">
            <i v-for="tag in entry.skillTags" :key="tag">#{{ tag }}</i>
          </div>
        </article>

        <section class="roster-detail-drawer reveal-on-scroll">
          <div class="roster-drawer-section">
            <span>所在江湖</span>
            <p>{{ entry.regionText }}</p>
          </div>
          <div class="roster-drawer-section">
            <span>同门故事</span>
            <p>{{ entry.storyText }}</p>
          </div>
          <div class="roster-drawer-section">
            <span>羁绊状态</span>
            <p>{{ entry.bondLabel }} · {{ entry.bondText }}</p>
          </div>
          <div class="roster-detail-actions">
            <RouterLink to="/roster/list">继续翻名册</RouterLink>
            <RouterLink to="/roster">我也递名帖</RouterLink>
          </div>
        </section>

        <RosterPosterStudio class="reveal-on-scroll" :entry="entry" />
      </template>
    </section>
  </main>
</template>

<style scoped>
.roster-mobile-page {
  min-height: 100vh;
  padding: 108px 14px 96px;
  background:
    radial-gradient(circle at 50% 0%, rgba(231, 190, 107, 0.24), transparent 30%),
    linear-gradient(180deg, #070b12 0%, #111827 48%, #07090d 100%);
}

.roster-phone-shell {
  display: grid;
  gap: 16px;
  width: min(100%, 430px);
  margin: 0 auto;
  color: #f8efd8;
}

.roster-detail-card,
.roster-detail-drawer,
.roster-detail-state {
  border: 1px solid rgba(231, 190, 107, 0.24);
  border-radius: 32px;
  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.35);
}

.roster-detail-card {
  --roster-card-gradient: linear-gradient(145deg, #111827, #28445f 52%, #d9b56d);
  position: relative;
  display: grid;
  gap: 14px;
  min-height: 430px;
  overflow: hidden;
  padding: 26px 22px;
  background: var(--roster-card-gradient);
}

.roster-detail-card__halo {
  position: absolute;
  inset: -90px -80px auto auto;
  width: 210px;
  height: 210px;
  border-radius: 999px;
  background: rgba(255, 238, 183, 0.22);
  filter: blur(14px);
}

.roster-detail-card header {
  position: relative;
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.roster-detail-card header span,
.roster-detail-card em,
.roster-drawer-section span {
  color: #ffe1a3;
  font-weight: 800;
}

.roster-detail-card header small {
  color: rgba(255, 248, 231, 0.7);
}

.roster-detail-card h1,
.roster-detail-card em,
.roster-detail-card p {
  position: relative;
  margin: 0;
}

.roster-detail-card h1 {
  align-self: end;
  margin-top: auto;
  font-size: clamp(3rem, 18vw, 5rem);
  line-height: 0.98;
}

.roster-detail-card em {
  font-style: normal;
  font-size: 1.15rem;
}

.roster-detail-card p {
  color: rgba(255, 248, 231, 0.84);
  font-size: 1.08rem;
  line-height: 1.72;
}

.roster-detail-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.roster-detail-card__tags i {
  padding: 7px 11px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  color: #fff8e7;
  font-style: normal;
}

.roster-detail-drawer {
  display: grid;
  gap: 16px;
  padding: 22px;
  background: rgba(10, 15, 26, 0.9);
  backdrop-filter: blur(18px);
}

.roster-drawer-section {
  display: grid;
  gap: 8px;
}

.roster-drawer-section p {
  margin: 0;
  color: rgba(248, 239, 216, 0.78);
  line-height: 1.82;
}

.roster-detail-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.roster-detail-actions a,
.roster-detail-state a {
  display: grid;
  min-height: 46px;
  place-items: center;
  border-radius: 999px;
  background: linear-gradient(135deg, #dfad55, #fff0b8);
  color: #160f07;
  font-weight: 800;
  text-decoration: none;
}

.roster-detail-state {
  display: grid;
  gap: 14px;
  padding: 24px;
  background: rgba(10, 15, 26, 0.9);
  line-height: 1.8;
}

.roster-detail-state p {
  margin: 0;
}

.roster-detail-state--error {
  border-color: rgba(248, 113, 113, 0.3);
}

@media (min-width: 760px) {
  .roster-mobile-page {
    padding-top: 128px;
  }
}
</style>
