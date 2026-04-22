<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import PageBanner from '@/components/common/PageBanner.vue'
import { useRevealMotion } from '@/composables/useRevealMotion'
import { memberCardCopy } from '@/data/memberCardContent'
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
        <p class="eyebrow">入派考核</p>
        <h2>认同宗旨之后，再以一卷问心</h2>
        <p>
          首版入派考核采用固定三十题标准题卷，按七个章节分步作答。考核不为难人，只为让新同门先把门风、规矩与禁律读明白。
        </p>
      </div>

      <article class="content-card content-card--soft">
        <p class="content-card__eyebrow">问心入门</p>
        <h3>答题限时十分钟，交卷后自动显示成绩、错题解析与结果海报</h3>
        <p>
          若本轮未过，可先看错题对应的《立派全典》原文，再从容重来。首版补考只做提醒，不做本地强锁。
        </p>
        <div class="page-banner__actions">
          <RouterLink class="ink-button ink-button--primary" to="/assessment">
            前往入派考核
          </RouterLink>
          <RouterLink class="ink-button ink-button--ghost" to="/canon">
            先看立派全典
          </RouterLink>
        </div>
      </article>
    </section>

    <section class="content-section" data-reveal>
      <div class="section-heading">
        <p class="eyebrow">同门入山门帖</p>
        <h2>填七项，就能生成一张云栖专属古风门帖</h2>
        <p>
          新同门只要把道号（宗门称谓）、所处地域、门中短签与入栖初心写清楚，系统便会自动排版成可直接发群的文字版和高清图片版。
        </p>
      </div>

      <div class="split-showcase">
        <article class="content-card content-card--soft">
          <p class="content-card__eyebrow">填写提示</p>
          <h3>轻量填写，不用复杂资料</h3>
          <ul class="list-column">
            <li v-for="line in memberCardCopy.introLines" :key="line">{{ line }}</li>
          </ul>
        </article>

        <article class="content-card content-card--serif">
          <p class="content-card__eyebrow">进入门帖页</p>
          <h3>先生成门帖，再归档同门录</h3>
          <p>生成完成后，文字版可以直接发进微信群，图片版会保存在本机同门录里，方便日后翻阅。</p>
          <div class="page-banner__actions">
            <RouterLink class="ink-button ink-button--primary" to="/member-card">
              制我栖名门帖
            </RouterLink>
            <RouterLink class="ink-button ink-button--ghost" to="/poster">
              顺手看云栖海报
            </RouterLink>
          </div>
        </article>
      </div>
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
