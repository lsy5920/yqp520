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
      eyebrow="立派全典"
      title="云栖派 · 半文半白立派全典"
      lead="此页收录云栖派立派定名、总旨、规矩、宗门架构、日常、入退派与结语，是云栖立门之本。"
      :note="siteContent.site.motto"
    />

    <section class="canon-layout">
      <aside class="canon-aside content-card" data-reveal>
        <p class="content-card__eyebrow">章节引路</p>
        <nav class="anchor-list" aria-label="立派全典章节索引">
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
