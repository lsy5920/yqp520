import type { RouteRecordRaw } from 'vue-router'
import CanonView from '@/views/CanonView.vue'
import DisciplineView from '@/views/DisciplineView.vue'
import HomeView from '@/views/HomeView.vue'
import JoinView from '@/views/JoinView.vue'
import LifeView from '@/views/LifeView.vue'
import PosterView from '@/views/PosterView.vue'

// 这里集中定义全站路由，方便后续继续扩展活动页或公告页。
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
    path: '/poster',
    name: 'poster',
    component: PosterView,
    meta: { title: '云栖海报' },
  },
]
