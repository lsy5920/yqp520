<script setup lang="ts">
import { ref } from 'vue'
import PageBanner from '@/components/common/PageBanner.vue'
import PosterStudio from '@/components/poster/PosterStudio.vue'
import { useRevealMotion } from '@/composables/useRevealMotion'
import { siteContent } from '@/data/siteContent'

// 这里拿到页面根节点，给海报页做统一显现动效。
const pageRef = ref<HTMLElement | null>(null)

// 这里启用海报页的内容显现动效。
useRevealMotion({
  rootRef: pageRef,
})
</script>

<template>
  <div ref="pageRef" class="page">
    <PageBanner
      eyebrow="云栖海报"
      title="把门派气韵带走，也把相逢心意分享出去"
      lead="首版海报采用官方定制模板，你只需填入同门称呼与一句寄语，便可生成一张属于自己的云栖分享图。"
      :note="siteContent.poster.template.phrase"
    />

    <section class="content-section" data-reveal>
      <div class="section-heading">
        <p class="eyebrow">使用说明</p>
        <h2>实时预览、保存图片、支持原生分享</h2>
      </div>

      <div class="card-grid card-grid--three">
        <article
          v-for="line in siteContent.poster.introLines"
          :key="line"
          class="content-card content-card--soft"
          data-reveal
        >
          <p>{{ line }}</p>
        </article>
      </div>
    </section>

    <PosterStudio
      :default-message="siteContent.poster.template.defaultBlessing"
      :default-title="siteContent.poster.defaultTitle"
      :export-height="siteContent.poster.template.exportHeight"
      :export-width="siteContent.poster.template.exportWidth"
      :headline="siteContent.poster.template.title"
      :share-text="siteContent.site.motto"
      :share-title="siteContent.poster.template.title"
      :signature="`${siteContent.site.name} · ${siteContent.poster.template.stampText}`"
      :subtitle="siteContent.poster.template.phrase"
      :qr-label="siteContent.poster.template.qrLabel"
    />
  </div>
</template>
