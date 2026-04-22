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

<style scoped>
.page-banner__body {
  min-width: 0;
}

.page-banner__title {
  max-width: 100%;
  overflow-wrap: anywhere;
  word-break: break-word;
}

@media (max-width: 720px) {
  .page-banner {
    padding: 30px 18px;
    border-radius: 28px;
  }

  .page-banner__title {
    font-size: clamp(1.9rem, 8vw, 3rem);
    line-height: 1.16;
  }

  .page-banner__lead,
  .page-banner__note {
    font-size: 0.96rem;
    line-height: 1.76;
  }

  .page-banner__actions {
    flex-direction: column;
    align-items: stretch;
  }

  .page-banner__actions :deep(.ink-button) {
    width: 100%;
  }
}
</style>
