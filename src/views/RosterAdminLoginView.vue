<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import PageBanner from '@/components/common/PageBanner.vue'
import { useRevealMotion } from '@/composables/useRevealMotion'
import { useRosterAuth } from '@/composables/useRosterAuth'
import { getSupabaseConfigErrorText, isSupabaseConfigured } from '@/lib/supabase'

// 这里保存页面根节点，供登录页显现动效使用。
const pageRef = ref<HTMLElement | null>(null)

// 这里启用页面显现动效，让登录卡片出现更顺滑。
useRevealMotion({ rootRef: pageRef })

// 这里拿到路由与导航实例，登录成功后要回到审核台。
const route = useRoute()
const router = useRouter()

// 这里接入名册鉴权状态，统一管理登录和已登录跳转。
const { isAdmin, initializeRosterAuth, loginRosterAdmin } = useRosterAuth()

// 这里保存邮箱输入值。
const email = ref<string>('')

// 这里保存密码输入值。
const password = ref<string>('')

// 这里保存页面提示语，给用户明确反馈。
const actionMessage = ref<string>('执事登录后可审核新名帖、调整公开展示和查看迁移备注。')

// 这里单独记录登录提交状态，避免把初始化鉴权也算成按钮禁用。
const isSubmitting = ref<boolean>(false)

/**
 * 登录成功后的跳转地址
 * 用途：从守卫跳回登录页时，登录完成后能自动返回原目标页
 * 入参：无
 * 返回值：返回跳转路径
 */
function resolveRedirectPath(): string {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
  return redirect || '/roster/admin'
}

/**
 * 提交登录
 * 用途：执事登录页点击按钮后统一处理登录和跳转
 * 入参：无
 * 返回值：无返回值
 */
async function handleLogin(): Promise<void> {
  if (isSubmitting.value) {
    return
  }

  if (!isSupabaseConfigured()) {
    actionMessage.value = getSupabaseConfigErrorText()
    return
  }

  isSubmitting.value = true

  try {
    actionMessage.value = '正在核对执事身份，请稍候……'
    await loginRosterAdmin(email.value, password.value)
    actionMessage.value = '执事身份已确认，正在进入审核台……'
    await router.replace(resolveRedirectPath())
  } catch (error) {
    actionMessage.value = error instanceof Error ? error.message : '执事登录失败，请稍后再试。'
  } finally {
    isSubmitting.value = false
  }
}

// 这里页面打开时恢复登录状态，已登录执事直接进入审核台。
onMounted(async () => {
  try {
    await initializeRosterAuth()

    if (isAdmin.value) {
      await router.replace(resolveRedirectPath())
    }
  } catch (error) {
    actionMessage.value = error instanceof Error ? error.message : '执事登录页初始化失败，请稍后再试。'
  }
})
</script>

<template>
  <div ref="pageRef" class="page roster-admin-login-page">
    <PageBanner
      eyebrow="云栖名册"
      title="名册审核执事登录"
      lead="进入新版江湖卡册审核台，处理登记、公开展示和审核记录。"
      note="普通访客请返回公开名册或登记页，审核台仅限已授权执事使用。"
    />

    <section class="roster-admin-login-shell" data-reveal>
      <article class="roster-admin-login-card">
        <div class="roster-admin-login-card__head">
          <p class="eyebrow">执事登录</p>
          <h2>使用白名单邮箱密码进入审核台</h2>
          <p>{{ isSupabaseConfigured() ? actionMessage : getSupabaseConfigErrorText() }}</p>
        </div>

        <form class="roster-admin-login-form" @submit.prevent="handleLogin">
          <label class="roster-admin-login-field">
            <span>执事邮箱</span>
            <input v-model="email" class="roster-admin-login-input" autocomplete="username" placeholder="请输入执事邮箱" type="email" />
          </label>

          <label class="roster-admin-login-field">
            <span>登录密码</span>
            <input v-model="password" class="roster-admin-login-input" autocomplete="current-password" placeholder="请输入登录密码" type="password" />
          </label>

          <div class="roster-admin-login-actions">
            <button type="submit" class="ink-button ink-button--primary" :disabled="isSubmitting || !isSupabaseConfigured()">
              {{ isSubmitting ? '登录中……' : '进入审核台' }}
            </button>
            <RouterLink class="ink-button ink-button--ghost" to="/roster/list">返回公开名册</RouterLink>
          </div>
        </form>
      </article>

      <article class="content-card content-card--soft">
        <p class="content-card__eyebrow">说明</p>
        <h3>新版审核台只处理江湖卡册字段</h3>
        <ul class="list-column">
          <li>登记页提交的新名帖默认待审，不会立刻公开。</li>
          <li>执事可调整身份、封面、热度、推荐等级和公开开关。</li>
          <li>旧名册迁移来的无法映射信息会进入内部备注，便于人工核对。</li>
        </ul>
      </article>
    </section>
  </div>
</template>

<style scoped>
.roster-admin-login-page {
  gap: 30px;
}

.roster-admin-login-shell {
  display: grid;
  grid-template-columns: minmax(0, 0.96fr) minmax(280px, 0.84fr);
  gap: 20px;
}

.roster-admin-login-card {
  padding: 28px;
  border: 1px solid rgba(216, 185, 114, 0.18);
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.18);
}

.roster-admin-login-card__head,
.roster-admin-login-form,
.roster-admin-login-field {
  display: grid;
  gap: 12px;
}

.roster-admin-login-card__head {
  margin-bottom: 22px;
}

.roster-admin-login-card__head p,
.roster-admin-login-card__head h2 {
  margin: 0;
}

.roster-admin-login-card__head h2 {
  color: #173d42;
  font-size: clamp(1.45rem, 4vw, 2.3rem);
}

.roster-admin-login-card__head p:not(.eyebrow) {
  color: rgba(35, 83, 86, 0.72);
  line-height: 1.75;
}

.roster-admin-login-field span {
  color: #173d42;
  font-weight: 700;
}

.roster-admin-login-input {
  min-height: 48px;
  padding: 0 16px;
  border: 1px solid rgba(84, 154, 151, 0.24);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.86);
  color: #173d42;
  font: inherit;
}

.roster-admin-login-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 10px;
}

@media (max-width: 820px) {
  .roster-admin-login-shell {
    grid-template-columns: 1fr;
  }

  .roster-admin-login-actions {
    display: grid;
    grid-template-columns: 1fr;
  }
}
</style>
