<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { siteContent } from '@/data/siteContent'

// 这里生成年份文本，方便页脚展示当前年份。
const currentYear = computed(() => new Date().getFullYear())

// 这里把云栖名册入口补到页脚导航，方便从站尾也能直接进入。
const navItems = computed(() => ([
  ...siteContent.navItems,
  { label: '云栖名册', path: '/roster/list', hint: '线上入册' },
  { label: '执事审核', path: '/roster/admin/login', hint: '管理入口' },
]))
</script>

<template>
  <footer class="site-footer">
    <div class="site-footer__inner">
      <div class="site-footer__intro">
        <p class="eyebrow">云栖派 · 立派结语</p>
        <h2>{{ siteContent.site.motto }}</h2>
        <p>{{ siteContent.site.closing }}</p>
      </div>

      <div class="site-footer__links">
        <RouterLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="site-footer__link"
        >
          {{ item.label }}
        </RouterLink>
      </div>

      <div class="site-footer__meta">
        <p>云栖无山，以心为山；宗门无殿，以情为殿。</p>
        <p>{{ currentYear }} · 云栖派官方网站首版</p>
      </div>
    </div>
  </footer>
</template>
