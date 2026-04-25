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

// 这里启用显现动效，让云中名帖出现更柔和。
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

// 这里计算公开标签汇总，避免空标签撑出无意义区域。
const visibleTags = computed<string[]>(() => entry.value.skillTags.filter(Boolean))

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
  <main ref="pageRef" class="cloud-roster-page cloud-roster-detail-page">
    <div class="cloud-detail-sky" aria-hidden="true">
      <span class="cloud-detail-sky__cloud cloud-detail-sky__cloud--one"></span>
      <span class="cloud-detail-sky__cloud cloud-detail-sky__cloud--two"></span>
      <span class="cloud-detail-sky__ribbon"></span>
    </div>

    <section class="cloud-detail-shell">
      <div v-if="isLoading" class="cloud-detail-state" data-reveal>
        <span>云笺展开中</span>
        <p>{{ rosterContent.detail.loading }}</p>
      </div>

      <div v-else-if="errorMessage" class="cloud-detail-state cloud-detail-state--error" data-reveal>
        <span>云门未寻到名帖</span>
        <p>{{ errorMessage }}</p>
        <RouterLink to="/roster/list">返回云海名册</RouterLink>
      </div>

      <template v-else>
        <article class="cloud-detail-hero" :style="detailStyle" data-reveal>
          <span class="cloud-detail-hero__mist" aria-hidden="true"></span>
          <header>
            <span>{{ entry.identityLabel }}</span>
            <small>{{ formatRosterDate(entry.approvedAt) }} 入册</small>
          </header>
          <div class="cloud-detail-hero__name">
            <p>云中名帖</p>
            <h1>{{ entry.jianghuName }}</h1>
            <em>{{ entry.displayTitle }}</em>
          </div>
          <blockquote>{{ entry.motto }}</blockquote>
        </article>

        <section class="cloud-detail-grid" aria-label="名帖公开信息">
          <article class="cloud-detail-panel cloud-detail-panel--story" data-reveal>
            <span>同门故事</span>
            <p>{{ entry.storyText }}</p>
          </article>

          <article class="cloud-detail-panel" data-reveal>
            <span>所在江湖</span>
            <p>{{ entry.regionText }}</p>
          </article>

          <article class="cloud-detail-panel" data-reveal>
            <span>羁绊状态</span>
            <p>{{ entry.bondLabel }} · {{ entry.bondText }}</p>
          </article>

          <article class="cloud-detail-panel" data-reveal>
            <span>云签标签</span>
            <div class="cloud-detail-tags">
              <i v-for="tag in visibleTags" :key="tag">#{{ tag }}</i>
              <i v-if="visibleTags.length === 0">#云深待补</i>
            </div>
          </article>
        </section>

        <nav class="cloud-detail-actions" data-reveal aria-label="名帖后续操作">
          <RouterLink to="/roster/list">继续翻名册</RouterLink>
          <RouterLink to="/roster">我也递名帖</RouterLink>
        </nav>

        <RosterPosterStudio class="cloud-detail-poster" :entry="entry" />
      </template>
    </section>
  </main>
</template>

<style scoped>
.cloud-roster-page {
  position: relative;
  min-height: 100dvh;
  padding: 18px 0 calc(108px + env(safe-area-inset-bottom));
  overflow: hidden;
  color: #103f4a;
  isolation: isolate;
}

.cloud-detail-sky {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
  background:
    radial-gradient(circle at 20% 8%, rgba(255, 255, 255, 0.95), transparent 24%),
    radial-gradient(circle at 76% 14%, rgba(162, 224, 235, 0.4), transparent 30%),
    linear-gradient(180deg, #eefcff 0%, #def7f8 48%, #f8fbef 100%);
}

.cloud-detail-sky__cloud,
.cloud-detail-sky__ribbon {
  position: absolute;
  pointer-events: none;
}

.cloud-detail-sky__cloud {
  border-radius: 999px;
  background:
    radial-gradient(circle at 26% 38%, rgba(255, 255, 255, 0.96), transparent 34%),
    radial-gradient(circle at 58% 42%, rgba(255, 255, 255, 0.82), transparent 38%),
    radial-gradient(circle at 50% 72%, rgba(151, 220, 228, 0.36), transparent 44%);
  filter: blur(4px);
  opacity: 0.78;
  animation: detailCloudDrift 17s ease-in-out infinite alternate;
}

.cloud-detail-sky__cloud--one {
  left: -8%;
  top: 12%;
  width: 330px;
  height: 260px;
}

.cloud-detail-sky__cloud--two {
  right: -12%;
  bottom: 12%;
  width: 380px;
  height: 280px;
  animation-delay: 1.4s;
}

.cloud-detail-sky__ribbon {
  inset: 18% -12% auto;
  height: 240px;
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.42), transparent);
  transform: rotate(-6deg);
}

.cloud-detail-shell {
  display: grid;
  gap: 22px;
  width: min(1060px, calc(100vw - 28px));
  margin: 0 auto;
}

.cloud-detail-hero {
  --roster-card-gradient: linear-gradient(145deg, rgba(255, 255, 255, 0.88), rgba(198, 239, 238, 0.72), rgba(255, 245, 191, 0.68));
  position: relative;
  display: grid;
  min-height: 520px;
  padding: clamp(26px, 5vw, 58px);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 46px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.34)),
    var(--roster-card-gradient);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.86),
    0 36px 92px rgba(55, 143, 158, 0.22);
  backdrop-filter: blur(24px);
}

.cloud-detail-hero__mist {
  position: absolute;
  inset: auto -8% -18% -8%;
  height: 240px;
  background:
    radial-gradient(circle at 20% 42%, rgba(255, 255, 255, 0.98), transparent 28%),
    radial-gradient(circle at 52% 34%, rgba(255, 255, 255, 0.86), transparent 34%),
    radial-gradient(circle at 78% 52%, rgba(162, 224, 235, 0.4), transparent 38%);
  filter: blur(3px);
  animation: detailMistFloat 12s ease-in-out infinite alternate;
}

.cloud-detail-hero header,
.cloud-detail-hero__name,
.cloud-detail-hero blockquote {
  position: relative;
  z-index: 1;
}

.cloud-detail-hero header {
  display: flex;
  justify-content: space-between;
  gap: 14px;
}

.cloud-detail-hero header span,
.cloud-detail-hero__name p,
.cloud-detail-hero__name em,
.cloud-detail-panel span {
  color: #0d7c8a;
  font-weight: 900;
}

.cloud-detail-hero header small {
  color: rgba(16, 63, 74, 0.64);
}

.cloud-detail-hero__name {
  align-self: end;
  display: grid;
  gap: 10px;
  margin-top: auto;
}

.cloud-detail-hero__name p,
.cloud-detail-hero__name h1,
.cloud-detail-hero__name em,
.cloud-detail-hero blockquote,
.cloud-detail-panel p {
  margin: 0;
}

.cloud-detail-hero__name h1 {
  color: #103f4a;
  font-size: clamp(3.6rem, 13vw, 8.4rem);
  line-height: 0.9;
}

.cloud-detail-hero__name em {
  font-style: normal;
  font-size: 1.16rem;
}

.cloud-detail-hero blockquote {
  max-width: 820px;
  color: rgba(16, 63, 74, 0.78);
  font-size: clamp(1.15rem, 2.4vw, 1.5rem);
  line-height: 1.78;
}

.cloud-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.cloud-detail-panel,
.cloud-detail-state,
.cloud-detail-actions,
.cloud-detail-poster {
  border: 1px solid rgba(96, 170, 184, 0.22);
  border-radius: 32px;
  background: rgba(255, 255, 255, 0.76);
  box-shadow: 0 24px 58px rgba(55, 143, 158, 0.16);
  backdrop-filter: blur(22px);
}

.cloud-detail-panel {
  display: grid;
  gap: 10px;
  padding: 24px;
}

.cloud-detail-panel--story {
  grid-column: 1 / -1;
}

.cloud-detail-panel p {
  color: rgba(16, 63, 74, 0.74);
  line-height: 1.86;
}

.cloud-detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cloud-detail-tags i {
  padding: 7px 11px;
  border: 1px solid rgba(46, 143, 158, 0.18);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.62);
  color: #185d68;
  font-style: normal;
}

.cloud-detail-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 14px;
}

.cloud-detail-actions a,
.cloud-detail-state a {
  display: grid;
  min-height: 48px;
  place-items: center;
  border-radius: 999px;
  background: linear-gradient(135deg, #79d6dc, #fff5bf);
  color: #103f4a;
  font-weight: 900;
  text-decoration: none;
}

.cloud-detail-state {
  display: grid;
  gap: 14px;
  justify-items: center;
  padding: 28px;
  text-align: center;
}

.cloud-detail-state span {
  color: #0d7c8a;
  font-weight: 900;
}

.cloud-detail-state p {
  margin: 0;
  color: rgba(16, 63, 74, 0.72);
  line-height: 1.8;
}

.cloud-detail-state--error {
  border-color: rgba(188, 92, 74, 0.26);
}

@media (max-width: 720px) {
  .cloud-detail-shell {
    width: min(100vw - 20px, 430px);
  }

  .cloud-detail-hero {
    min-height: 430px;
    padding: 24px 18px;
    border-radius: 36px;
  }

  .cloud-detail-hero__name h1 {
    font-size: clamp(3.2rem, 18vw, 5.4rem);
  }

  .cloud-detail-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cloud-detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .cloud-detail-panel {
    padding: 18px 14px;
    border-radius: 26px;
  }

  .cloud-detail-panel--story {
    grid-column: 1 / -1;
  }

  .cloud-detail-actions a {
    min-width: 0;
    padding: 0 12px;
    text-align: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cloud-detail-sky__cloud,
  .cloud-detail-hero__mist {
    animation: none !important;
  }
}

@keyframes detailCloudDrift {
  from {
    transform: translate3d(-14px, 0, 0) scale(1);
  }

  to {
    transform: translate3d(22px, -10px, 0) scale(1.06);
  }
}

@keyframes detailMistFloat {
  from {
    transform: translate3d(-2%, 0, 0);
  }

  to {
    transform: translate3d(3%, -8px, 0);
  }
}
</style>
