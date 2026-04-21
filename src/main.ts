import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import { routes } from './router'
import './style.css'

// 这里创建路由实例，负责管理整站页面切换。
const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to) {
    // 如果跳转到了锚点，就平滑滚动到对应章节。
    if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth',
        top: 96,
      }
    }

    // 普通页面切换时回到顶部，保持浏览体验统一。
    return {
      top: 0,
      behavior: 'smooth',
    }
  },
})

// 这里在每次切换页面后同步浏览器标题。
router.afterEach((to) => {
  const pageTitle = typeof to.meta.title === 'string' ? to.meta.title : '云栖派'
  document.title = `${pageTitle} | 云栖派`
})

// 这里创建并挂载整个应用。
createApp(App).use(router).mount('#app')
