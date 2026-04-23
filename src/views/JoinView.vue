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
        <p class="eyebrow">云栖名册</p>
        <h2>考核通过后，可再递上一份正式入册文牒</h2>
        <p>
          江湖名帖更像个人风格名帖，而云栖名册是正式门籍流程。你可以在线填写入册文牒，提交后立刻生成待审核名帖，待执事批阅后转为正式入册名帖并进入公开名录。
        </p>
      </div>

      <div class="split-showcase">
        <article class="content-card content-card--soft">
          <p class="content-card__eyebrow">线上登记</p>
          <h3>长表单分段填写，公开信息严格脱敏</h3>
          <p>
            这套流程会把道号、堂口、入派本心与所长雅事整理成正式门籍文牒。俗家姓名、微信号、现居洞府等敏感信息只入库审核，不会出现在公开名帖与公开名录里。
          </p>
        </article>

        <article class="content-card content-card--serif">
          <p class="content-card__eyebrow">进入名册</p>
          <h3>先看公开名录，也可直接去递交文牒</h3>
          <div class="page-banner__actions">
            <RouterLink class="ink-button ink-button--primary" to="/roster">
              前往云栖名册登记
            </RouterLink>
            <RouterLink class="ink-button ink-button--ghost" to="/roster/list">
              浏览公开名录
            </RouterLink>
          </div>
        </article>
      </div>
    </section>

    <section class="content-section" data-reveal>
      <div class="section-heading">
        <p class="eyebrow">江湖名帖</p>
        <h2>填好名号与缘起，就能立成一张云栖江湖正帖</h2>
        <p>
          现在这套名帖已经重做成沉浸式单屏工作台。你只要写下江湖名号、来处、身份一句、江湖短签、入门缘起和留名一句，系统就会自动排成更正式的江湖名帖成图。
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
          <p class="content-card__eyebrow">进入名帖页</p>
          <h3>以成图为主，草稿会自动续写</h3>
          <p>新版以高清成图为主能力，同时保留自动存草稿和文字版复制。刷新页面后会优先恢复当前草稿，不再展示旧式归档列表。</p>
          <div class="page-banner__actions">
            <RouterLink class="ink-button ink-button--primary" to="/member-card">
              生成江湖帖
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
