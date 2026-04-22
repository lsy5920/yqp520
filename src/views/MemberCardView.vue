<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import PageBanner from '@/components/common/PageBanner.vue'
import MemberCardStudio from '@/components/member-card/MemberCardStudio.vue'
import { useRevealMotion } from '@/composables/useRevealMotion'
import { memberCardCopy } from '@/data/memberCardContent'

// 这里保存当前页面根节点，供滚动显现动效统一使用。
const pageRef = ref<HTMLElement | null>(null)

// 这里判断当前是不是手机小屏，小屏时直接展示内容，避免主内容先被动效藏起来。
const shouldReduceRevealMotion = typeof window !== 'undefined'
  ? window.matchMedia('(max-width: 720px)').matches
  : false

// 这里启用云栖同门名帖页的滚动显现动效，手机端则改为直接显示。
useRevealMotion({
  rootRef: pageRef,
  reducedMotion: { value: shouldReduceRevealMotion },
})
</script>

<template>
  <div ref="pageRef" class="page page--member-card">
    <PageBanner
      :eyebrow="memberCardCopy.banner.eyebrow"
      :title="memberCardCopy.banner.title"
      :lead="memberCardCopy.banner.lead"
      :note="memberCardCopy.banner.note"
    >
      <template #actions>
        <RouterLink class="ink-button ink-button--secondary" to="/join">
          返回入派指引
        </RouterLink>
        <RouterLink class="ink-button ink-button--ghost" to="/poster">
          去云栖海报
        </RouterLink>
      </template>
    </PageBanner>

    <MemberCardStudio data-reveal />
  </div>
</template>
