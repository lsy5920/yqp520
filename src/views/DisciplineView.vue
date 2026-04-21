<script setup lang="ts">
import { ref } from 'vue'
import PageBanner from '@/components/common/PageBanner.vue'
import { useRevealMotion } from '@/composables/useRevealMotion'
import { siteContent } from '@/data/siteContent'

// 这里拿到页面根节点，供门规卡片做滚动显现。
const pageRef = ref<HTMLElement | null>(null)

// 这里启用门规页的统一显现动效。
useRevealMotion({
  rootRef: pageRef,
})
</script>

<template>
  <div ref="pageRef" class="page">
    <PageBanner
      eyebrow="门规与禁律"
      title="共守清净风气，不以繁规压人"
      lead="云栖派不靠层层戒条维系秩序，只守四条底线、三条禁律，让真诚、和气与信任长久留在门中。"
      :note="siteContent.discipline.note"
    />

    <section class="content-section" data-reveal>
      <div class="section-heading">
        <p class="eyebrow">四条底线</p>
        <h2>守礼、守心、守和、守缘</h2>
        <p>这四条不是束缚人的锁，而是让同门能长期舒服相处的底板。</p>
      </div>

      <div class="card-grid card-grid--four">
        <article
          v-for="rule in siteContent.discipline.rules"
          :key="rule.title"
          class="content-card content-card--rule"
          data-reveal
        >
          <p class="content-card__eyebrow">{{ rule.summary }}</p>
          <h3>{{ rule.title }}</h3>
          <ul class="list-column">
            <li v-for="detail in rule.details" :key="detail">{{ detail }}</li>
          </ul>
        </article>
      </div>
    </section>

    <section class="content-section" data-reveal>
      <div class="section-heading">
        <p class="eyebrow">三条禁律</p>
        <h2>禁妄言、禁失信、禁败名</h2>
        <p>底线一旦被踩，不再只是风格问题，而是会伤害同门与门派根本的问题。</p>
      </div>

      <div class="card-grid card-grid--three">
        <article
          v-for="rule in siteContent.discipline.prohibitions"
          :key="rule.title"
          class="content-card content-card--warning"
          data-reveal
        >
          <p class="content-card__eyebrow">{{ rule.summary }}</p>
          <h3>{{ rule.title }}</h3>
          <ul class="list-column">
            <li v-for="detail in rule.details" :key="detail">{{ detail }}</li>
          </ul>
        </article>
      </div>
    </section>
  </div>
</template>
