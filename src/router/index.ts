import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import AssessmentView from '@/views/AssessmentView.vue'
import CanonView from '@/views/CanonView.vue'
import DisciplineView from '@/views/DisciplineView.vue'
import HomeView from '@/views/HomeView.vue'
import JoinView from '@/views/JoinView.vue'
import LifeView from '@/views/LifeView.vue'
import MemberCardView from '@/views/MemberCardView.vue'
import PosterView from '@/views/PosterView.vue'

// 这里集中定义全站路由，方便后续继续扩展活动页或专题页。
export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: { title: '首页' },
  },
  {
    path: '/canon',
    name: 'canon',
    component: CanonView,
    meta: { title: '立派全典' },
  },
  {
    path: '/discipline',
    name: 'discipline',
    component: DisciplineView,
    meta: { title: '门规与禁律' },
  },
  {
    path: '/life',
    name: 'life',
    component: LifeView,
    meta: { title: '宗门日常' },
  },
  {
    path: '/join',
    name: 'join',
    component: JoinView,
    meta: { title: '入派指引' },
  },
  {
    path: '/assessment',
    name: 'assessment',
    component: AssessmentView,
    meta: { title: '入派考核' },
  },
  {
    path: '/poster',
    name: 'poster',
    component: PosterView,
    meta: { title: '云栖海报' },
  },
  {
    path: '/member-card',
    name: 'memberCard',
    component: MemberCardView,
    meta: { title: '同门入山名帖' },
  },
]

// 这里创建路由实例，负责整站页面切换与滚动行为。
export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to) {
    // 如果跳转到了锚点，就平滑滚到对应章节。
    if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth',
        top: 96,
      }
    }

    // 普通页面切换时回到顶部，避免残留旧页面滚动位置。
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
