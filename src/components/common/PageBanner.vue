<script setup lang="ts">
// 这里定义页面横幅的入参，方便所有内页复用同一套头图结构。
withDefaults(
  defineProps<{
    eyebrow: string
    title: string
    lead: string
    note?: string
  }>(),
  {
    note: '',
  },
)
</script>

<template>
  <section class="page-banner" data-reveal>
    <div class="page-banner__mist" aria-hidden="true"></div>
    <div class="page-banner__body">
      <p class="eyebrow">{{ eyebrow }}</p>
      <h1 class="page-banner__title">{{ title }}</h1>
      <p class="page-banner__lead">{{ lead }}</p>
      <p v-if="note" class="page-banner__note">{{ note }}</p>
      <div v-if="$slots.actions" class="page-banner__actions">
        <slot name="actions"></slot>
      </div>
    </div>
  </section>
</template>
