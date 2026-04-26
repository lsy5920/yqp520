<script setup lang="ts">
import { ref } from 'vue'
import PageBanner from '@/components/common/PageBanner.vue'
import { useRevealMotion } from '@/composables/useRevealMotion'
import { siteContent } from '@/data/siteContent'

// 这里拿到当前页面根节点，供章节显现动效使用。
const pageRef = ref<HTMLElement | null>(null)

// 这里启用金典页的滚动显现动效。
useRevealMotion({
  rootRef: pageRef,
})
</script>

<template>
  <div ref="pageRef" class="page">
    <PageBanner
      eyebrow="立派金典"
      title="云栖派 · 立派金典"
      lead="此处录云栖派立派定名、门派总旨、宗门规矩、入派退派与玉佩信物。"
      :note="siteContent.site.motto"
    />

    <section class="canon-layout">
      <aside class="canon-aside content-card" data-reveal>
        <p class="content-card__eyebrow">章节引路</p>
        <nav class="anchor-list" aria-label="立派金典章节索引">
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

