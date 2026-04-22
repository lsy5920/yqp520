<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import MemberCardStudio from '@/components/member-card/MemberCardStudio.vue'
import { useRevealMotion } from '@/composables/useRevealMotion'

// 这里保存当前页面根节点，供滚动显现动效统一使用。
const pageRef = ref<HTMLElement | null>(null)

// 这里判断当前是不是手机小屏，小屏时直接展示内容，避免主内容先被动效藏起来。
const shouldReduceRevealMotion = typeof window !== 'undefined'
  ? window.matchMedia('(max-width: 720px)').matches
  : false

// 这里启用云栖江湖名帖页的滚动显现动效，手机端则改为直接显示。
useRevealMotion({
  rootRef: pageRef,
  reducedMotion: { value: shouldReduceRevealMotion },
})
</script>

<template>
  <div ref="pageRef" class="page page--member-card">
    <div class="member-card-view__actions" data-reveal>
      <RouterLink class="ink-button ink-button--ghost" to="/join">
        返回入派指引
      </RouterLink>
      <RouterLink class="ink-button ink-button--ghost" to="/poster">
        去云栖海报
      </RouterLink>
    </div>

    <MemberCardStudio data-reveal />
  </div>
</template>

<style scoped>
/* 这里放页面顶部的轻量跳转入口，避免再出现旧版大横幅。 */
.member-card-view__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

@media (max-width: 720px) {
  .member-card-view__actions {
    gap: 10px;
  }
}
</style>
