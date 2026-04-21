<script setup lang="ts">
import { ref } from 'vue'
import PageBanner from '@/components/common/PageBanner.vue'
import { useRevealMotion } from '@/composables/useRevealMotion'
import { siteContent } from '@/data/siteContent'

// 这里保存页面根节点，让入派流程按节奏显现。
const pageRef = ref<HTMLElement | null>(null)

// 这里启用入派页的统一显现动效。
useRevealMotion({
  rootRef: pageRef,
})
</script>

<template>
  <div ref="pageRef" class="page">
    <PageBanner
      eyebrow="入派指引"
      title="认同宗旨，真诚相待，便可入云栖"
      lead="云栖派不设门槛高墙，也不搞复杂考核。认同门派总旨，愿与同门真诚相处，便已迈进大半步。"
      :note="siteContent.join.note"
    />

    <section class="content-section" data-reveal>
      <div class="section-heading">
        <p class="eyebrow">入派流程</p>
        <h2>四步入门，轻而不失仪式感</h2>
      </div>

      <div class="flow-grid">
        <article
          v-for="(step, index) in siteContent.join.steps"
          :key="step.title"
          class="content-card flow-card"
          data-reveal
        >
          <span class="flow-card__index">第 {{ index + 1 }} 步</span>
          <h3>{{ step.title }}</h3>
          <p>{{ step.description }}</p>
        </article>
      </div>
    </section>

    <section class="split-showcase" data-reveal>
      <article class="content-card">
        <p class="content-card__eyebrow">退派说明</p>
        <h3>来去皆自由，情谊不散场</h3>
        <ul class="list-column">
          <li v-for="item in siteContent.join.leaves" :key="item.title">
            <strong>{{ item.title }}：</strong>{{ item.description }}
          </li>
        </ul>
      </article>

      <article class="content-card content-card--serif">
        <p class="content-card__eyebrow">云栖铜章</p>
        <h3>一枚可自愿申领的身份信物</h3>
        <p>
          铜章不是权力象征，也不是门槛证明，它更像一枚纪念章，记下“我曾在这里，与同道并肩一段”的缘分。
        </p>
        <p>申领与否，全凭自愿；重在仪式感，不作硬性要求。</p>
      </article>
    </section>

    <section class="content-section" data-reveal>
      <div class="section-heading">
        <p class="eyebrow">常见问题</p>
        <h2>先把大家最常问的事说清楚</h2>
      </div>

      <div class="card-grid card-grid--two">
        <article
          v-for="faq in siteContent.join.faqs"
          :key="faq.question"
          class="content-card"
          data-reveal
        >
          <h3>{{ faq.question }}</h3>
          <p>{{ faq.answer }}</p>
        </article>
      </div>
    </section>
  </div>
</template>
