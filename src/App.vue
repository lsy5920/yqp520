<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import MusicLyricOverlay from '@/components/music/MusicLyricOverlay.vue'
import MusicPlaybackOverlay from '@/components/music/MusicPlaybackOverlay.vue'
import MusicPlayer from '@/components/music/MusicPlayer.vue'
import BackTopButton from '@/components/layout/BackTopButton.vue'
import SiteFooter from '@/components/layout/SiteFooter.vue'
import SiteHeader from '@/components/layout/SiteHeader.vue'
import { useSiteAudio } from '@/composables/useSiteAudio'
import { siteContent } from '@/data/siteContent'

// 这里接入全局音频控制，让页面和播放器共用一份播放状态。
const {
  currentTrack,
  currentLyricLine,
  desiredPlaying,
  confirmPlaybackPrompt,
  hasAvailableTrack,
  initializeAudio,
  isPlaybackPromptVisible,
  isPlaying,
  lastError,
  playbackPromptActionText,
  playbackPromptDescription,
  playbackPromptResumeText,
  playbackPromptTitle,
  statusText,
  shouldShowLyricOverlay,
  togglePlayback,
} = useSiteAudio(siteContent.musicTracks)

// 这里读取当前路由，方便给特定页面单独抬高悬浮控件。
const route = useRoute()

// 这里给特定页面预留播放器和返回顶部按钮的位置，避免和底部操作条挤在一起。
const siteShellStyle = computed<Record<string, string>>(() => {
  if (route.name !== 'memberCard') {
    return {} as Record<string, string>
  }

  return {
    '--site-player-bottom': '118px',
    '--site-player-bottom-mobile': '118px',
    '--site-backtop-bottom': '214px',
    '--site-backtop-bottom-mobile': '214px',
    '--site-lyric-bottom': '44px',
    '--site-lyric-bottom-mobile': '44px',
  }
})

// 这里在应用挂载后初始化音频系统，恢复上次的用户选择。
onMounted(() => {
  initializeAudio()
})
</script>

<template>
  <div class="site-shell" :style="siteShellStyle">
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

    <MusicLyricOverlay
      :current-line="currentLyricLine?.text ?? ''"
      :visible="shouldShowLyricOverlay"
    />

    <MusicPlaybackOverlay
      :action-text="playbackPromptActionText"
      :description="playbackPromptDescription"
      :error-text="lastError"
      :resume-text="playbackPromptResumeText"
      :title="playbackPromptTitle"
      :track-name="currentTrack?.name ?? ''"
      :visible="isPlaybackPromptVisible"
      @confirm-play="confirmPlaybackPrompt"
    />

    <MusicPlayer
      :cover-text="currentTrack?.coverText ?? '待置入曲目'"
      :desired-playing="desiredPlaying"
      :has-track="hasAvailableTrack"
      :is-playing="isPlaying"
      :last-error="lastError"
      :status-text="statusText"
      :track-name="currentTrack?.name ?? '云栖清音'"
      @toggle-play="togglePlayback"
    />
  </div>
</template>
