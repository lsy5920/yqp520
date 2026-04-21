<script setup lang="ts">
import { ref } from 'vue'
import PageBanner from '@/components/common/PageBanner.vue'
import { useRevealMotion } from '@/composables/useRevealMotion'
import { siteContent } from '@/data/siteContent'

// 这里保存页面根节点，用来驱动进入视口动效。
const pageRef = ref<HTMLElement | null>(null)

// 这里为日常页启用章节显现动效。
useRevealMotion({
  rootRef: pageRef,
})
</script>

<template>
  <div ref="pageRef" class="page">
    <PageBanner
      eyebrow="宗门日常"
      title="这里有门派气韵，也有寻常烟火"
      lead="云栖派不靠任务和考核维持热闹，而是在闲谈、相助、相庆与偶尔相聚里，慢慢把一份人情留住。"
      :note="siteContent.life.note"
    />

    <section class="content-section" data-reveal>
      <div class="section-heading">
        <p class="eyebrow">服务分工</p>
        <h2>无高低尊卑，只有分工不同的服务者</h2>
      </div>

      <div class="card-grid card-grid--three">
        <article
          v-for="role in siteContent.life.roles"
          :key="role.title"
          class="content-card"
          data-reveal
        >
          <p class="content-card__eyebrow">{{ role.duty }}</p>
          <h3>{{ role.title }}</h3>
          <ul class="list-column">
            <li v-for="detail in role.details" :key="detail">{{ detail }}</li>
          </ul>
        </article>
      </div>
    </section>

    <section class="content-section" data-reveal>
      <div class="section-heading">
        <p class="eyebrow">门中日常</p>
        <h2>群聊、分享、小聚与互助，构成云栖真正的烟火气</h2>
      </div>

      <div class="card-grid card-grid--three">
        <article
          v-for="routine in siteContent.life.routines"
          :key="routine.title"
          class="content-card content-card--soft"
          data-reveal
        >
          <h3>{{ routine.title }}</h3>
          <p>{{ routine.description }}</p>
        </article>
      </div>
    </section>
  </div>
</template>
