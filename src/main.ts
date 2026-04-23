import { createApp } from 'vue'
import App from './App.vue'
import { useRosterAuth } from '@/composables/useRosterAuth'
import { router } from '@/router'
import './style.css'

// 这里拿到名册鉴权工具，路由守卫会用它确认审核台权限。
const {
  initializeRosterAuth,
  isAdmin,
} = useRosterAuth()

// 这里给审核台加路由守卫，只拦需要执事权限的后台页。
// 登录页本身不再提前阻塞，这样从公开页点击“执事管理入口”时可以先立刻打开登录页。
router.beforeEach(async (to) => {
  const requiresRosterAdmin = Boolean(to.meta.requiresRosterAdmin)

  // 这里放行所有公开页和登录页，避免登录入口先卡在鉴权初始化阶段。
  if (!requiresRosterAdmin) {
    return true
  }

  // 这里仅在进入真正的审核后台前再初始化权限状态。
  await initializeRosterAuth()

  // 这里如果当前不是执事账号，就统一带着回跳地址去登录页。
  if (requiresRosterAdmin && !isAdmin.value) {
    return {
      path: '/roster/admin/login',
      query: {
        redirect: to.fullPath,
      },
    }
  }

  return true
})

// 这里创建并挂载整个应用。
createApp(App).use(router).mount('#app')
