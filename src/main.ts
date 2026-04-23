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

// 这里给审核台加路由守卫，未登录或不在白名单时统一跳到登录页。
router.beforeEach(async (to) => {
  const requiresRosterAdmin = Boolean(to.meta.requiresRosterAdmin)

  if (!requiresRosterAdmin && to.name !== 'rosterAdminLogin') {
    return true
  }

  await initializeRosterAuth()

  if (to.name === 'rosterAdminLogin' && isAdmin.value) {
    const redirect = typeof to.query.redirect === 'string' ? to.query.redirect : '/roster/admin'
    return redirect
  }

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
