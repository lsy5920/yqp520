<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import PageBanner from '@/components/common/PageBanner.vue'
import { useRevealMotion } from '@/composables/useRevealMotion'
import { useRosterAuth } from '@/composables/useRosterAuth'
import { rosterContent } from '@/data/rosterContent'
import { getSupabaseConfigErrorText, isSupabaseConfigured } from '@/lib/supabase'

// 这里保存页面根节点，供登录页静态区块使用统一显现动效。
const pageRef = ref<HTMLElement | null>(null)

// 这里启用页面显现动效，让登录页视觉节奏更完整。
useRevealMotion({
  rootRef: pageRef,
})

// 这里拿到路由与导航实例，登录成功后要回到审核台。
const route = useRoute()
const router = useRouter()

// 这里接入名册鉴权状态，统一管理登录和已登录跳转。
const {
  isAdmin,
  isLoading,
  initializeRosterAuth,
  loginRosterAdmin,
} = useRosterAuth()

// 这里保存邮箱输入值。
const email = ref<string>('')

// 这里保存密码输入值。
const password = ref<string>('')

// 这里保存页面提示语，给用户明确反馈。
const actionMessage = ref<string>(rosterContent.admin.loginLead)

/**
 * 登录成功后的跳转地址
 * 用途：从守卫跳回登录页时，登录完成后能自动返回原目标页
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
  if (!isSupabaseConfigured()) {
    actionMessage.value = getSupabaseConfigErrorText()
    return
  }

  try {
    actionMessage.value = '正在核对执事身份，请稍候...'
    await loginRosterAdmin(email.value, password.value)
    actionMessage.value = '执事身份已确认，正在进入审核台...'
    await router.replace(resolveRedirectPath())
  } catch (error) {
    actionMessage.value = error instanceof Error ? error.message : '执事登录失败，请稍后再试'
  }
}

onMounted(async () => {
  await initializeRosterAuth()

  if (isAdmin.value) {
    await router.replace(resolveRedirectPath())
  }
})
</script>

<template>
  <div ref="pageRef" class="page roster-admin-login-page">
    <PageBanner
      eyebrow="云栖名册"
      :title="rosterContent.admin.loginTitle"
      :lead="rosterContent.admin.loginLead"
      :note="rosterContent.page.note"
    />

    <section class="roster-admin-login-shell" data-reveal>
      <article class="roster-admin-login-card">
        <div class="roster-admin-login-card__head">
          <p class="eyebrow">执事登录</p>
          <h2>使用白名单邮箱密码进入审核台</h2>
          <p>{{ isSupabaseConfigured() ? actionMessage : getSupabaseConfigErrorText() }}</p>
        </div>

        <label class="roster-admin-login-field">
          <span>执事邮箱</span>
          <input v-model="email" class="roster-admin-login-input" autocomplete="username" placeholder="请输入执事邮箱" type="email" />
        </label>

        <label class="roster-admin-login-field">
          <span>登录密码</span>
          <input v-model="password" class="roster-admin-login-input" autocomplete="current-password" placeholder="请输入登录密码" type="password" />
        </label>

        <div class="roster-admin-login-actions">
          <button
            type="button"
            class="ink-button ink-button--primary"
            :disabled="isLoading || !isSupabaseConfigured()"
            @click="handleLogin"
          >
            {{ isLoading ? '登录中...' : rosterContent.admin.loginButton }}
          </button>
          <RouterLink class="ink-button ink-button--ghost" to="/roster/list">
            返回公开名录
          </RouterLink>
        </div>
      </article>

      <article class="content-card content-card--soft">
        <p class="content-card__eyebrow">说明</p>
        <h3>站内审核台与 Supabase 后台共用同一套数据源</h3>
        <ul class="list-column">
          <li>只有已经登录且被加入白名单的执事账号，才能读取完整原始登记字段。</li>
          <li>审核通过时，系统会自动分配正式牒号，记录审核执事、审核时间与公开批语。</li>
          <li>匿名用户与普通访客无法直接读取主表原始数据，公开页面只拿脱敏后的最小字段。</li>
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
  display: grid;
  gap: 18px;
  padding: 24px;
  border-radius: 28px;
  border: 1px solid rgba(216, 185, 114, 0.16);
  background:
    linear-gradient(180deg, rgba(8, 30, 42, 0.92), rgba(5, 18, 28, 0.96)),
    rgba(5, 18, 28, 0.94);
  box-shadow: var(--shadow-soft);
}

.roster-admin-login-card__head {
  display: grid;
  gap: 8px;
}

.roster-admin-login-card__head h2 {
  margin: 0;
  font-size: clamp(1.5rem, 3vw, 2rem);
  line-height: 1.26;
}

.roster-admin-login-card__head p:last-child {
  margin: 0;
  color: var(--color-text-soft);
  line-height: 1.76;
}

.roster-admin-login-field {
  display: grid;
  gap: 10px;
}

.roster-admin-login-field span {
  color: var(--color-cyan);
  font-size: 0.84rem;
  letter-spacing: 0.16em;
}

.roster-admin-login-input {
  width: 100%;
  min-height: 48px;
  padding: 12px 14px;
  border: 1px solid rgba(216, 185, 114, 0.18);
  border-radius: 16px;
  background: rgba(5, 19, 28, 0.62);
  color: var(--color-text);
  outline: none;
}

.roster-admin-login-input:focus {
  border-color: rgba(216, 185, 114, 0.34);
  box-shadow: 0 0 0 3px rgba(216, 185, 114, 0.1);
}

.roster-admin-login-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

@media (max-width: 920px) {
  .roster-admin-login-shell {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .roster-admin-login-card {
    padding: 18px 16px;
    border-radius: 24px;
  }

  .roster-admin-login-actions {
    flex-direction: column;
  }

  .roster-admin-login-actions .ink-button {
    width: 100%;
  }
}
</style>
