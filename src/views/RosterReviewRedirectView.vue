<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useRevealMotion } from '@/composables/useRevealMotion'
import { useRosterAuth } from '@/composables/useRosterAuth'
import { getSupabaseConfigErrorText, isSupabaseConfigured } from '@/lib/supabase'
import { getPublicRosterEntryBySlug } from '@/services/roster'

// 这里保存页面根节点，用于让登录提示卡片带有统一显现动效。
const pageRef = ref<HTMLElement | null>(null)

// 这里启用页面显现动效，让扫码过来的云司看到更柔和的过渡。
useRevealMotion({ rootRef: pageRef })

// 这里拿到当前路由参数，二维码里的名帖标识会从这里读取。
const route = useRoute()

// 这里拿到路由跳转能力，用来自动分流到公开详情或审核台。
const router = useRouter()

// 这里接入名册鉴权状态，用来判断扫码者是不是已经登录的云司。
const { initializeRosterAuth, isAdmin } = useRosterAuth()

// 这里记录当前是否正在判断二维码去向，避免页面空白。
const isChecking = ref<boolean>(true)

// 这里记录扫码入口无法继续时的中文错误提示。
const errorMessage = ref<string>('')

// 这里记录是否需要展示云司登录提示。
const shouldShowLoginPrompt = ref<boolean>(false)

// 这里计算二维码中的公开标识，兼容路由参数是数组的极端情况。
const publicSlug = computed<string>(() => {
  const rawSlug = route.params.publicSlug
  return Array.isArray(rawSlug) ? (rawSlug[0] || '') : String(rawSlug || '')
})

// 这里计算当前动态审核入口路径，登录成功后会带着它回跳。
const reviewRedirectPath = computed<string>(() => `/roster/review/${encodeURIComponent(publicSlug.value)}`)

// 这里计算云司登录页地址，未登录扫码时会跳到这里。
const loginRouteTarget = computed(() => ({
  path: '/roster/admin/login',
  query: {
    redirect: reviewRedirectPath.value,
  },
}))

/**
 * 分流二维码入口
 * 用途：已入册名帖跳公开详情，待审名帖按云司登录状态进入审核流
 * 入参：无
 * 返回值：无返回值
 */
async function resolveReviewTarget(): Promise<void> {
  isChecking.value = true
  errorMessage.value = ''
  shouldShowLoginPrompt.value = false

  if (!publicSlug.value) {
    errorMessage.value = '这张玉佩帖缺少名帖标识，暂时无法打开。'
    isChecking.value = false
    return
  }

  if (!isSupabaseConfigured()) {
    errorMessage.value = getSupabaseConfigErrorText()
    isChecking.value = false
    return
  }

  try {
    // 这里先查公开详情；审核通过并公开后，同一二维码会直接进入正式名帖。
    const publicEntry = await getPublicRosterEntryBySlug(publicSlug.value)
    if (publicEntry) {
      await router.replace(`/roster/entry/${encodeURIComponent(publicEntry.publicSlug)}`)
      return
    }

    // 这里再恢复云司登录状态，已登录云司直接进入对应名帖审核。
    await initializeRosterAuth()
    if (isAdmin.value) {
      await router.replace({
        path: '/roster/admin',
        query: {
          entry: publicSlug.value,
        },
      })
      return
    }

    // 这里说明名帖还没公开，扫码者需要先用云司账号登录。
    shouldShowLoginPrompt.value = true
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '玉佩帖识别失败，请稍后再试。'
  } finally {
    isChecking.value = false
  }
}

// 这里页面打开后立即分流，用户无需手动点击。
onMounted(() => {
  void resolveReviewTarget()
})
</script>

<template>
  <main ref="pageRef" class="cloud-roster-review-page">
    <div class="cloud-review-sky" aria-hidden="true">
      <span class="cloud-review-sky__cloud cloud-review-sky__cloud--one"></span>
      <span class="cloud-review-sky__cloud cloud-review-sky__cloud--two"></span>
      <span class="cloud-review-sky__blade"></span>
    </div>

    <section class="cloud-review-card reveal-on-scroll">
      <p>云海玉佩帖</p>
      <h1>{{ isChecking ? '正在辨认名帖去向' : (shouldShowLoginPrompt ? '此帖待云司审核' : '玉佩帖暂不可用') }}</h1>
      <span v-if="isChecking">正在查看这张名帖是否已经正式入册，请稍候。</span>
      <span v-else-if="shouldShowLoginPrompt">这张名帖尚未公开，需要云司登录后进入审核台处理。</span>
      <span v-else>{{ errorMessage || '暂时没有可继续处理的名帖信息。' }}</span>

      <div class="cloud-review-card__actions">
        <RouterLink v-if="shouldShowLoginPrompt" :to="loginRouteTarget">云司登录审核</RouterLink>
        <RouterLink to="/roster/list">查看公开名册</RouterLink>
        <button v-if="errorMessage" type="button" @click="resolveReviewTarget">重新识别</button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.cloud-roster-review-page {
  position: relative;
  display: grid;
  min-height: 100dvh;
  place-items: center;
  padding: 24px;
  color: #103f4a;
  isolation: isolate;
}

.cloud-review-sky {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
  background:
    radial-gradient(circle at 18% 12%, rgba(255, 255, 255, 0.96), transparent 25%),
    radial-gradient(circle at 82% 16%, rgba(133, 211, 223, 0.34), transparent 32%),
    linear-gradient(180deg, #eefcff 0%, #def6f4 52%, #f8fbef 100%);
}

.cloud-review-sky__cloud,
.cloud-review-sky__blade {
  position: absolute;
  pointer-events: none;
}

.cloud-review-sky__cloud {
  border-radius: 999px;
  background:
    radial-gradient(circle at 30% 42%, rgba(255, 255, 255, 0.98), transparent 34%),
    radial-gradient(circle at 64% 48%, rgba(255, 255, 255, 0.82), transparent 38%),
    radial-gradient(circle at 50% 70%, rgba(152, 222, 228, 0.34), transparent 44%);
  filter: blur(4px);
  opacity: 0.72;
  animation: reviewCloudDrift 16s ease-in-out infinite alternate;
}

.cloud-review-sky__cloud--one {
  left: -8%;
  top: 12%;
  width: 340px;
  height: 250px;
}

.cloud-review-sky__cloud--two {
  right: -10%;
  bottom: 12%;
  width: 380px;
  height: 280px;
  animation-delay: 1.5s;
}

.cloud-review-sky__blade {
  left: 10%;
  right: 10%;
  top: 46%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(18, 92, 102, 0.28), transparent);
  transform: rotate(-8deg);
  animation: reviewBladeSweep 4.8s ease-in-out infinite;
}

.cloud-review-card {
  position: relative;
  display: grid;
  gap: 14px;
  width: min(100%, 520px);
  overflow: hidden;
  padding: clamp(26px, 6vw, 46px);
  border: 1px solid rgba(96, 170, 184, 0.24);
  border-radius: 38px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(230, 250, 250, 0.64)),
    rgba(255, 255, 255, 0.78);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    0 34px 90px rgba(55, 143, 158, 0.2);
  backdrop-filter: blur(24px);
}

.cloud-review-card::after {
  position: absolute;
  right: -44px;
  bottom: -60px;
  width: 240px;
  height: 160px;
  border-radius: 999px;
  background:
    radial-gradient(circle at 28% 44%, rgba(255, 255, 255, 0.98), transparent 34%),
    radial-gradient(circle at 62% 48%, rgba(175, 231, 236, 0.42), transparent 42%);
  content: '';
  pointer-events: none;
}

.cloud-review-card > * {
  position: relative;
  z-index: 1;
}

.cloud-review-card p,
.cloud-review-card h1,
.cloud-review-card span {
  margin: 0;
}

.cloud-review-card p {
  color: #0d7c8a;
  font-weight: 900;
  letter-spacing: 0.16em;
}

.cloud-review-card h1 {
  color: #103f4a;
  font-size: clamp(2rem, 8vw, 4rem);
  line-height: 1.06;
}

.cloud-review-card span {
  color: rgba(16, 63, 74, 0.72);
  line-height: 1.8;
}

.cloud-review-card__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 8px;
}

.cloud-review-card__actions a,
.cloud-review-card__actions button {
  display: inline-flex;
  min-height: 46px;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(46, 143, 158, 0.24);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.78);
  color: #103f4a;
  font: inherit;
  font-weight: 900;
  text-decoration: none;
}

.cloud-review-card__actions a:first-child {
  background: linear-gradient(135deg, #79d6dc, #fff5bf);
}

@media (max-width: 560px) {
  .cloud-review-card__actions {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cloud-review-sky__cloud,
  .cloud-review-sky__blade {
    animation: none !important;
  }
}

@keyframes reviewCloudDrift {
  from {
    transform: translate3d(-14px, 0, 0) scale(1);
  }

  to {
    transform: translate3d(22px, -10px, 0) scale(1.06);
  }
}

@keyframes reviewBladeSweep {
  0%, 100% {
    opacity: 0.14;
    transform: translate3d(-24px, 0, 0) rotate(-8deg);
  }

  50% {
    opacity: 0.46;
    transform: translate3d(24px, -8px, 0) rotate(-8deg);
  }
}
</style>
