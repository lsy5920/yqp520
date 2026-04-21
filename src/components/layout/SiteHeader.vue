<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { siteContent } from '@/data/siteContent'

// 这里保存移动端菜单是否展开。
const isMenuOpen = ref(false)

// 这里读取当前路由，方便高亮当前导航。
const route = useRoute()

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
</script>

<template>
  <header class="site-header">
    <div class="site-header__inner">
      <RouterLink class="site-brand" to="/">
        <span class="site-brand__seal">云栖</span>
        <span>
          <strong class="site-brand__name">{{ siteContent.site.name }}</strong>
          <span class="site-brand__sub">{{ siteContent.site.subtitle }}</span>
        </span>
      </RouterLink>

      <nav class="site-nav site-nav--desktop" aria-label="主导航">
        <RouterLink
          v-for="item in siteContent.navItems"
          :key="item.path"
          :to="item.path"
          class="site-nav__link"
          :class="{ 'site-nav__link--active': route.path === item.path }"
        >
          <span>{{ item.label }}</span>
          <small>{{ item.hint }}</small>
        </RouterLink>
      </nav>

      <div class="site-header__actions">
        <button class="site-menu-button" type="button" @click="toggleMenu">
          <span></span>
          <span></span>
          <span></span>
          <i class="sr-only">切换导航菜单</i>
        </button>
      </div>
    </div>

    <Transition name="drawer-fade">
      <div v-if="isMenuOpen" class="site-drawer">
        <nav class="site-nav site-nav--mobile" aria-label="移动端导航">
          <RouterLink
            v-for="item in siteContent.navItems"
            :key="item.path"
            :to="item.path"
            class="site-nav__link"
            :class="{ 'site-nav__link--active': route.path === item.path }"
          >
            <span>{{ item.label }}</span>
            <small>{{ item.hint }}</small>
          </RouterLink>
        </nav>
      </div>
    </Transition>
  </header>
</template>
