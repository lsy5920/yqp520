import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'

// 这里把页面组件改成按路由加载，减少首次打开首页时需要下载的代码量。
const HomeView = () => import('@/views/HomeView.vue')
const CanonView = () => import('@/views/CanonView.vue')
const DisciplineView = () => import('@/views/DisciplineView.vue')
const LifeView = () => import('@/views/LifeView.vue')
const AssessmentView = () => import('@/views/AssessmentView.vue')
const PosterView = () => import('@/views/PosterView.vue')
const MemberCardView = () => import('@/views/MemberCardView.vue')
const RosterRegistrationView = () => import('@/views/RosterRegistrationView.vue')
const RosterListView = () => import('@/views/RosterListView.vue')
const RosterEntryDetailView = () => import('@/views/RosterEntryDetailView.vue')
const RosterReviewRedirectView = () => import('@/views/RosterReviewRedirectView.vue')
const RosterAdminLoginView = () => import('@/views/RosterAdminLoginView.vue')
const RosterAdminView = () => import('@/views/RosterAdminView.vue')

// 这里集中定义全站路由，方便后续继续扩展专题页与工作台。
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
    component: AssessmentView,
    meta: { title: '入派考核' },
  },
  {
    path: '/assessment',
    name: 'assessment',
    redirect: '/join#exam',
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
    meta: { title: '江湖名帖' },
  },
  {
    path: '/roster',
    name: 'rosterRegistration',
    component: RosterRegistrationView,
    meta: { title: '云栖名册登记' },
  },
  {
    path: '/roster/list',
    name: 'rosterList',
    component: RosterListView,
    meta: { title: '云栖名册' },
  },
  {
    path: '/roster/entry/:publicSlug',
    name: 'rosterEntryDetail',
    component: RosterEntryDetailView,
    meta: { title: '云栖名帖详情' },
  },
  {
    path: '/roster/review/:publicSlug',
    name: 'rosterReviewRedirect',
    component: RosterReviewRedirectView,
    meta: { title: '云海名册令' },
  },
  {
    path: '/roster/admin/login',
    name: 'rosterAdminLogin',
    component: RosterAdminLoginView,
    meta: { title: '名册审核登录' },
  },
  {
    path: '/roster/admin',
    name: 'rosterAdmin',
    component: RosterAdminView,
    meta: { title: '名册审核台', requiresRosterAdmin: true },
  },
]

// 这里创建路由实例，统一负责全站页面切换和滚动行为。
export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, _from, savedPosition) {
    // 这里优先恢复浏览器记住的位置，避免前进后退时滚动体验跳动。
    if (savedPosition) {
      return savedPosition
    }

    // 这里遇到锚点时平滑滚到对应位置，并给固定页头预留空间。
    if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth',
        top: 96,
      }
    }

    // 这里普通页面切换直接回到顶部，避免残留旧页面滚动位置。
    return {
      top: 0,
      behavior: 'auto',
    }
  },
})

// 这里在每次切换页面后同步浏览器标题。
router.afterEach((to) => {
  const pageTitle = typeof to.meta.title === 'string' ? to.meta.title : '云栖派'
  document.title = `${pageTitle} | 云栖派`
})
