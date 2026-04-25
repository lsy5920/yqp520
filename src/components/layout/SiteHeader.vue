<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { siteContent } from '@/data/siteContent'

// 这里保存移动端菜单是否展开。
const isMenuOpen = ref(false)

// 这里读取当前路由，方便高亮当前导航。
const route = useRoute()

// 这里把云栖名册入口补进导航，避免去改动内容量很大的总站文案文件。
const navItems = computed(() => ([
  ...siteContent.navItems,
  { label: '云栖名册', path: '/roster/list', hint: '线上入册' },
]))

// 这里在切换页面后自动收起移动端菜单，避免遮挡新页面内容。
watch(
  () => route.fullPath,
  () => {
    isMenuOpen.value = false
  },
)

// 这里处理移动端菜单展开与收起。
function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value
}

/**
 * 收起移动端菜单
 * 用途：在路由切换、键盘退出或其他场景统一关闭抽屉
 * 入参：无
 * 返回值：无返回值
 */
function closeMenu(): void {
  isMenuOpen.value = false
}

// 这里统一判断导航是否高亮，名册相关子页面都归到同一个入口下。
function isNavItemActive(path: string): boolean {
  if (path === '/roster/list') {
    return route.path.startsWith('/roster')
  }

  return route.path === path
}

/**
 * 处理键盘退出菜单
 * 用途：用户按下 Escape 时收起移动端导航，避免键盘用户被抽屉遮挡
 * 入参：event 为浏览器键盘事件
 * 返回值：无返回值
 */
function handleMenuEscape(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || !isMenuOpen.value) {
    return
  }

  closeMenu()
}

// 这里在组件挂载后监听键盘，给移动端抽屉补充键盘退出能力。
onMounted(() => {
  window.addEventListener('keydown', handleMenuEscape)
})

// 这里在组件卸载时清理监听，避免长期运行时残留重复事件。
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleMenuEscape)
})
</script>

<template>
  <header class="site-header">
    <div class="site-header__inner">
      <RouterLink class="site-brand" to="/">
        <span class="site-brand__seal" aria-hidden="true">
          <img src="/images/yunqi-logo.png" alt="" />
        </span>
        <span>
          <strong class="site-brand__name">{{ siteContent.site.name }}</strong>
          <span class="site-brand__sub">{{ siteContent.site.subtitle }}</span>
        </span>
      </RouterLink>

      <nav
        class="site-nav site-nav--desktop"
        aria-label="主导航"
        :style="{ '--site-nav-count': String(navItems.length) }"
      >
        <RouterLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="site-nav__link"
          :class="{ 'site-nav__link--active': isNavItemActive(item.path) }"
          :aria-current="isNavItemActive(item.path) ? 'page' : undefined"
        >
          <span>{{ item.label }}</span>
          <small>{{ item.hint }}</small>
        </RouterLink>
      </nav>

      <div class="site-header__actions">
        <button
          class="site-menu-button"
          type="button"
          :aria-expanded="isMenuOpen"
          aria-controls="site-mobile-drawer"
          :aria-label="isMenuOpen ? '收起导航菜单' : '展开导航菜单'"
          @click="toggleMenu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </div>

    <Transition name="drawer-fade">
      <div v-if="isMenuOpen" id="site-mobile-drawer" class="site-drawer">
        <nav class="site-nav site-nav--mobile" aria-label="移动端导航">
          <RouterLink
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="site-nav__link"
            :class="{ 'site-nav__link--active': isNavItemActive(item.path) }"
            :aria-current="isNavItemActive(item.path) ? 'page' : undefined"
          >
            <span>{{ item.label }}</span>
            <small>{{ item.hint }}</small>
          </RouterLink>
        </nav>
      </div>
    </Transition>
  </header>
</template>
