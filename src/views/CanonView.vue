<script setup lang="ts">
import { ref } from 'vue'
import PageBanner from '@/components/common/PageBanner.vue'
import { useRevealMotion } from '@/composables/useRevealMotion'
import { siteContent } from '@/data/siteContent'

// 这里拿到当前页面根节点，供章节显现动效使用。
const pageRef = ref<HTMLElement | null>(null)

// 这里启用全典页的滚动显现动效。
useRevealMotion({
  rootRef: pageRef,
})
</script>

<template>
  <div ref="pageRef" class="page">
    <PageBanner
      eyebrow="立派手册"
      title="云栖派 · 立派说明与同门手册"
      lead="这里用清楚、现代的方式说明云栖派为什么成立、怎样相处、如何加入和离开。"
      :note="siteContent.site.motto"
    />

    <section class="canon-layout">
      <aside class="canon-aside content-card" data-reveal>
        <p class="content-card__eyebrow">章节引路</p>
        <nav class="anchor-list" aria-label="立派手册章节索引">
          <a v-for="section in siteContent.canonSections" :key="section.id" :href="`#${section.id}`">
            {{ section.title }}
          </a>
        </nav>
      </aside>

      <div class="canon-content">
        <article
          v-for="section in siteContent.canonSections"
          :id="section.id"
          :key="section.id"
          class="canon-card content-card"
          data-reveal
        >
          <p class="content-card__eyebrow">{{ section.subtitle }}</p>
          <h2>{{ section.title }}</h2>
          <p v-for="paragraph in section.paragraphs" :key="paragraph">{{ paragraph }}</p>
        </article>
      </div>
    </section>
  </div>
</template>
