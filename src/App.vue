<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import MusicPlayer from '@/components/music/MusicPlayer.vue'
import BackTopButton from '@/components/layout/BackTopButton.vue'
import SiteFooter from '@/components/layout/SiteFooter.vue'
import SiteHeader from '@/components/layout/SiteHeader.vue'
import { useSiteAudio } from '@/composables/useSiteAudio'
import { siteContent } from '@/data/siteContent'

// 这里接入全局音频控制，让页面和播放器共用一份播放状态。
const {
  currentTrack,
  desiredPlaying,
  hasAvailableTrack,
  initializeAudio,
  isPlaying,
  lastError,
  togglePlayback,
} = useSiteAudio(siteContent.musicTracks)

// 这里在应用挂载后初始化音频系统，恢复上次的用户选择。
onMounted(() => {
  initializeAudio()
})
</script>

<template>
  <div class="site-shell">
    <div class="site-background" aria-hidden="true">
      <div class="site-background__mist site-background__mist--near"></div>
      <div class="site-background__mist site-background__mist--far"></div>
      <div class="site-background__glow"></div>
      <div class="site-background__grid"></div>
    </div>

    <SiteHeader />

    <main class="site-main">
      <RouterView v-slot="{ Component, route }">
        <Transition name="page-fade" mode="out-in">
          <component :is="Component" :key="route.fullPath" />
        </Transition>
      </RouterView>
    </main>

    <SiteFooter />

    <BackTopButton />

    <MusicPlayer
      :cover-text="currentTrack?.coverText ?? '待置入曲目'"
      :desired-playing="desiredPlaying"
      :has-track="hasAvailableTrack"
      :is-playing="isPlaying"
      :last-error="lastError"
      :track-name="currentTrack?.name ?? '云栖清音'"
      @toggle-play="togglePlayback"
    />
  </div>
</template>
