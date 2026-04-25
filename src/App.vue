<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import MusicLyricOverlay from '@/components/music/MusicLyricOverlay.vue'
import MusicPlaybackOverlay from '@/components/music/MusicPlaybackOverlay.vue'
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
  currentTimeSeconds,
  hasAvailableTrack,
  initializeAudio,
  isPlaybackPromptVisible,
  isPlaying,
  lastError,
  nextLyricLine,
  playbackPromptActionText,
  playbackPromptDescription,
  playbackPromptResumeText,
  playbackPromptTitle,
  setVolume,
  statusText,
  togglePlayback,
  volume,
} = useSiteAudio(siteContent.musicTracks)

// 这里读取当前路由，方便给特定页面单独抬高悬浮控件。
const route = useRoute()

// 这里给特定页面预留返回顶部按钮的位置，避免和底部操作条挤在一起。
const siteShellStyle = computed<Record<string, string>>(() => {
  if (route.name !== 'memberCard') {
    return {} as Record<string, string>
  }

  return {
    '--site-backtop-bottom': '214px',
    '--site-backtop-bottom-mobile': '214px',
  }
})

// 这里在应用挂载后初始化音频系统，恢复上次的用户选择。
onMounted(() => {
  initializeAudio()
})
</script>

<template>
  <div class="site-shell" :style="siteShellStyle">
    <a class="skip-link" href="#site-main">跳到主要内容</a>

    <div class="site-background" aria-hidden="true">
      <div class="site-background__mist site-background__mist--near"></div>
      <div class="site-background__mist site-background__mist--far"></div>
      <div class="site-background__glow"></div>
      <div class="site-background__grid"></div>
    </div>

    <SiteHeader />

    <main id="site-main" class="site-main" tabindex="-1">
      <RouterView v-slot="{ Component, route }">
        <Transition name="page-fade" mode="out-in">
          <component :is="Component" :key="route.fullPath" />
        </Transition>
      </RouterView>
    </main>

    <SiteFooter />

    <BackTopButton />

    <MusicLyricOverlay
      :cover-text="currentTrack?.coverText ?? '待置入曲目'"
      :current-line="currentLyricLine?.text ?? ''"
      :current-time-seconds="currentTimeSeconds"
      :desired-playing="desiredPlaying"
      :has-track="hasAvailableTrack"
      :is-playing="isPlaying"
      :last-error="lastError"
      :next-line="nextLyricLine?.text ?? ''"
      :status-text="statusText"
      :track-name="currentTrack?.name ?? '云栖清音'"
      :visible="hasAvailableTrack"
      :volume="volume"
      @toggle-play="togglePlayback"
      @volume-change="setVolume"
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

  </div>
</template>
