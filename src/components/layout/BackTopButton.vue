<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

// 这里记录按钮是否需要显示，避免用户刚进站就看到悬浮按钮。
const isVisible = ref(false)

// 这里根据滚动高度决定是否显示返回顶部按钮。
function syncVisibleState() {
  isVisible.value = window.scrollY > 680
}

// 这里把页面平滑滚动回顶部，提升长页面浏览体验。
function backToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  })
}

onMounted(() => {
  syncVisibleState()
  window.addEventListener('scroll', syncVisibleState, { passive: true })
})

onBeforeUnmount(() => {
  // 这里移除滚动监听，避免组件销毁后残留事件。
  window.removeEventListener('scroll', syncVisibleState)
})
</script>

<template>
  <Transition name="utility-fade">
    <button v-if="isVisible" class="back-top-button" type="button" @click="backToTop">
      回山门
    </button>
  </Transition>
</template>
