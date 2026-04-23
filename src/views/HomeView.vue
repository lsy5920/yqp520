<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useRevealMotion } from '@/composables/useRevealMotion'
import { useSiteAudio } from '@/composables/useSiteAudio'
import { siteContent } from '@/data/siteContent'

// 这里拿到页面根节点，供滚动显现动效统一使用。
const pageRef = ref<HTMLElement | null>(null)

// 这里接入音频状态，让首页入口直接尝试播放，不再弹启播说明。
const { hasAvailableTrack, retryPlay } = useSiteAudio(siteContent.musicTracks)

// 这里启用页面滚动显现动效，让首页层次更清晰。
useRevealMotion({
  rootRef: pageRef,
})

// 这里根据曲目状态动态切换按钮文案，避免误导用户。
const musicButtonLabel = computed(() => (hasAvailableTrack.value ? '启清音' : '清音待置入'))

// 这里处理首页的清音入口。若暂无曲目，会保留按钮兜底文案，不会抛错。
function handleMusicEntry(): void {
  if (!hasAvailableTrack.value) {
    return
  }

  void retryPlay()
}
</script>

<template>
  <div ref="pageRef" class="page page--home">
    <section class="hero-panel" data-reveal>
      <div class="hero-panel__glow" aria-hidden="true"></div>
      <div class="hero-panel__content">
        <p class="eyebrow">云栖派 · 官方山门</p>
        <h1 class="hero-panel__title">
          {{ siteContent.site.name }}
          <span>{{ siteContent.site.subtitle }}</span>
        </h1>
        <p class="hero-panel__lead">{{ siteContent.site.lead }}</p>

        <div class="hero-panel__poem">
          <span v-for="line in siteContent.home.credoLines" :key="line">{{ line }}</span>
        </div>

        <div class="hero-panel__actions">
          <RouterLink
            v-for="action in siteContent.home.actions"
            :key="action.path"
            :to="action.path"
            class="ink-button"
            :class="`ink-button--${action.style}`"
          >
            {{ action.label }}
          </RouterLink>
          <button class="ink-button ink-button--ghost" type="button" @click="handleMusicEntry">
            {{ musicButtonLabel }}
          </button>
          <RouterLink to="/member-card" class="ink-button ink-button--ghost">
            生成江湖帖
          </RouterLink>
        </div>
      </div>

      <div class="hero-panel__aside" data-reveal data-delay="0.12">
        <div class="ornament-card">
          <p class="ornament-card__label">对外箴言</p>
          <h2>{{ siteContent.site.motto }}</h2>
          <p>以群为门，以诚立派，以缘聚散，以情相守。</p>
        </div>
        <div class="ornament-card ornament-card--dense">
          <p class="ornament-card__label">首页导引</p>
          <ul class="list-column">
            <li>阅全典，看完整立派精神。</li>
            <li>观门规，知相处底线与禁律。</li>
            <li>览日常，感受门中烟火与温度。</li>
            <li>赴考核，完成问心入门卷。</li>
            <li>入海报，生成专属分享图。</li>
          </ul>
        </div>
      </div>
    </section>

    <section class="content-section" data-reveal>
      <div class="section-heading">
        <p class="eyebrow">立派总览</p>
        <h2>在尘世之中，为同道留一处可安心停靠的港湾</h2>
        <p>{{ siteContent.home.opening[1] }}</p>
      </div>

      <div class="card-grid card-grid--four">
        <article
          v-for="item in siteContent.home.highlights"
          :key="item.title"
          class="content-card"
          data-reveal
        >
          <p class="content-card__eyebrow">{{ item.lead }}</p>
          <h3>{{ item.title }}</h3>
          <p>{{ item.description }}</p>
        </article>
      </div>
    </section>

    <section class="split-showcase" data-reveal>
      <article class="content-card content-card--serif">
        <p class="content-card__eyebrow">立派初衷</p>
        <h3>不争名夺利，只寻真心难得的同道</h3>
        <p>{{ siteContent.home.opening[0] }}</p>
        <p>
          当今之世，人人奔波劳碌，为生计所困，为功利所扰。云栖派所求，不是扩大声量，
          而是在人情稀薄处，重拾一份自在与真诚。
        </p>
      </article>

      <article class="content-card">
        <p class="content-card__eyebrow">宗门日常</p>
        <h3>闲时闲话风月，忙时各自安好</h3>
        <ul class="list-column">
          <li v-for="item in siteContent.home.dailyFocus" :key="item">{{ item }}</li>
        </ul>
      </article>
    </section>

    <section class="content-section" data-reveal>
      <div class="section-heading">
        <p class="eyebrow">一站览尽</p>
        <h2>几大板块，完整呈现云栖派的门风、气韵、日常与入门之路</h2>
      </div>

      <div class="quick-grid">
        <RouterLink
          v-for="item in siteContent.navItems.slice(1)"
          :key="item.path"
          :to="item.path"
          class="quick-card"
          data-reveal
        >
          <span>{{ item.label }}</span>
          <small>{{ item.hint }}</small>
        </RouterLink>
      </div>
    </section>
  </div>
</template>
