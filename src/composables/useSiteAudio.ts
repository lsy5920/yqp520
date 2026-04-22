import { computed, readonly, ref, shallowRef } from 'vue'
import type { MusicTrack } from '@/types/site'

// 这里定义本地缓存键名，用于记住用户的音乐偏好。
const TRACK_STORAGE_KEY = 'yunqi-site-audio-track'
const PLAY_INTENT_STORAGE_KEY = 'yunqi-site-audio-intent'
const VOLUME_STORAGE_KEY = 'yunqi-site-audio-volume'

// 这里保存全站唯一的音频实例，避免重复创建导致多段音乐同时播放。
const audioElement = shallowRef<HTMLAudioElement | null>(null)

// 这里保存当前可用曲目列表。
const trackList = ref<MusicTrack[]>([])

// 这里保存当前曲目 id，方便刷新后恢复上次选择。
const currentTrackId = ref<string>('')

// 这里保存播放器核心状态。
const isPlaying = ref(false)
const desiredPlaying = ref(false)
const volume = ref(0.56)
const lastError = ref('')
const statusText = ref('背景音乐待置入')
const waitingForGestureRetry = ref(false)

// 这里避免重复注册全局监听器。
let gestureListenersBound = false

// 这里记录音量是否已经从本地缓存恢复。
let restoredVolumeFromStorage = false

// 这里安全读取本地缓存，避免浏览器禁用存储时报错。
function safeGetStorage(key: string): string {
  if (typeof window === 'undefined') {
    return ''
  }

  try {
    return window.localStorage.getItem(key) ?? ''
  } catch (error) {
    // 这里兜底隐私模式或浏览器禁用存储的情况。
    console.warn('读取本地缓存失败：', error)
    return ''
  }
}

// 这里安全写入本地缓存，保证缓存失败也不影响主流程。
function safeSetStorage(key: string, value: string): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(key, value)
  } catch (error) {
    // 这里仅记录警告，不打断用户操作。
    console.warn('写入本地缓存失败：', error)
  }
}

// 这里把音量限制在 0 到 1 之间，避免传入异常值。
function clampVolume(rawVolume: number): number {
  if (!Number.isFinite(rawVolume)) {
    return 0.56
  }

  return Math.min(1, Math.max(0, rawVolume))
}

// 这里把曲目路径统一转换成当前站点可访问的真实地址，兼容本地开发和 GitHub Pages 子路径部署。
function resolveTrackFileUrl(filePath: string): string {
  if (typeof window === 'undefined') {
    return filePath
  }

  // 这里保留完整外链地址，避免错误拼接成站内路径。
  if (/^(https?:|data:|blob:)/.test(filePath)) {
    return filePath
  }

  // 这里去掉开头的斜杠，让 public 目录资源能自动跟随站点基础路径。
  const normalizedFilePath = filePath.replace(/^\/+/, '')
  const siteBaseUrl = new URL(import.meta.env.BASE_URL || '/', window.location.origin)
  return new URL(normalizedFilePath, siteBaseUrl).href
}

// 这里根据当前 id 找到真正要播放的曲目。
function findCurrentTrack(): MusicTrack | null {
  if (trackList.value.length === 0) {
    return null
  }

  const matchedTrack = trackList.value.find((item) => item.id === currentTrackId.value)
  return matchedTrack ?? trackList.value[0] ?? null
}

// 这里把用户偏好写入本地缓存，刷新后仍能保持。
function persistPreferences(): void {
  safeSetStorage(TRACK_STORAGE_KEY, currentTrackId.value)
  safeSetStorage(PLAY_INTENT_STORAGE_KEY, desiredPlaying.value ? '1' : '0')
  safeSetStorage(VOLUME_STORAGE_KEY, String(volume.value))
}

// 这里恢复上次的播放偏好，尽量让刷新后的行为保持一致。
function restorePreferences(): void {
  currentTrackId.value = safeGetStorage(TRACK_STORAGE_KEY)
  desiredPlaying.value = safeGetStorage(PLAY_INTENT_STORAGE_KEY) === '1'

  const cachedVolume = safeGetStorage(VOLUME_STORAGE_KEY)

  if (cachedVolume) {
    restoredVolumeFromStorage = true
    volume.value = clampVolume(Number(cachedVolume))
  }

  if (desiredPlaying.value) {
    statusText.value = '等待恢复背景音乐播放'
  }
}

// 这里把当前状态同步到真实的 audio 元素。
function syncAudioElement(): void {
  if (!audioElement.value) {
    return
  }

  const track = findCurrentTrack()

  if (!track) {
    audioElement.value.removeAttribute('src')
    audioElement.value.load()
    isPlaying.value = false
    statusText.value = '背景音乐待置入'
    return
  }

  const resolvedUrl = resolveTrackFileUrl(track.filePath)

  if (audioElement.value.src !== resolvedUrl) {
    audioElement.value.src = resolvedUrl
  }

  audioElement.value.loop = true
  audioElement.value.preload = 'auto'
  audioElement.value.volume = volume.value
  // 这里强制保持非静音，避免旧缓存把用户卡在“无静音按钮却一直没声”的状态里。
  audioElement.value.muted = false
}

// 这里绑定 audio 事件，让真实播放器状态回写到响应式数据。
function bindAudioEvents(target: HTMLAudioElement): void {
  target.addEventListener('play', () => {
    isPlaying.value = true
    waitingForGestureRetry.value = false
    lastError.value = ''
    statusText.value = '背景音乐播放中'
  })

  target.addEventListener('pause', () => {
    isPlaying.value = false
    statusText.value = desiredPlaying.value ? '等待恢复背景音乐播放' : '背景音乐已暂停'
  })

  target.addEventListener('error', () => {
    // 这里兜底曲目资源失效或加载失败的情况。
    isPlaying.value = false
    waitingForGestureRetry.value = false
    lastError.value = '音频资源加载失败，请稍后重试'
    statusText.value = lastError.value
  })
}

// 这里按需创建单例播放器，只在需要时才真正生成。
function ensureAudioElement(): HTMLAudioElement {
  if (audioElement.value) {
    return audioElement.value
  }

  const target = new Audio()
  bindAudioEvents(target)
  audioElement.value = target
  syncAudioElement()
  return target
}

// 这里统一处理播放逻辑，兼顾手动播放和自动恢复。
async function playAudio(fromGesture: boolean): Promise<{ success: boolean; message: string }> {
  const track = findCurrentTrack()

  if (!track) {
    statusText.value = '背景音乐待置入'
    return { success: false, message: statusText.value }
  }

  const target = ensureAudioElement()
  syncAudioElement()
  desiredPlaying.value = true
  persistPreferences()

  try {
    await target.play()
    statusText.value = `正在播放：${track.name}`
    return { success: true, message: statusText.value }
  } catch (error) {
    // 这里处理浏览器拦截自动播放的情况，等待用户下一次手势重试。
    console.warn('播放背景音乐失败：', error)
    isPlaying.value = false
    waitingForGestureRetry.value = !fromGesture
    lastError.value = fromGesture ? '背景音乐播放失败，请稍后重试' : '浏览器已拦截自动播放，点击页面任意位置后将自动重试'
    statusText.value = lastError.value
    return { success: false, message: lastError.value }
  }
}

// 这里注册首个手势重试逻辑，解决刷新后的自动播放限制问题。
function bindGestureRetry(): void {
  if (gestureListenersBound || typeof window === 'undefined') {
    return
  }

  const retryByGesture = async (): Promise<void> => {
    if (!waitingForGestureRetry.value || !desiredPlaying.value) {
      return
    }

    await playAudio(true)
  }

  const options: AddEventListenerOptions = { passive: true }
  window.addEventListener('pointerdown', retryByGesture, options)
  window.addEventListener('keydown', retryByGesture, options)
  gestureListenersBound = true
}

// 这里注入主线配置的曲目列表，只保留真正启用且有文件路径的曲目。
function applyTracks(tracks: readonly MusicTrack[]): void {
  trackList.value = tracks.filter((item) => item.enabled && Boolean(item.filePath.trim()))

  if (trackList.value.length === 0) {
    currentTrackId.value = ''
    statusText.value = '背景音乐待置入'
    syncAudioElement()
    return
  }

  const matchedTrack = trackList.value.find((item) => item.id === currentTrackId.value)
  const firstTrack = trackList.value[0]

  if (!matchedTrack && firstTrack) {
    currentTrackId.value = firstTrack.id
  }

  if (!restoredVolumeFromStorage) {
    volume.value = clampVolume(findCurrentTrack()?.defaultVolume ?? 0.56)
  }

  if (!desiredPlaying.value) {
    statusText.value = '点击播放音乐，开启云栖清音'
  }

  syncAudioElement()
}

// 这里尝试自动恢复播放，让刷新后的行为尽量接近上次选择。
async function tryAutoResume(): Promise<void> {
  if (!desiredPlaying.value || !findCurrentTrack()) {
    return
  }

  await playAudio(false)
}

// 这里给应用入口统一调用，完成初始化和自动恢复。
function initializeAudio(): void {
  bindGestureRetry()
  syncAudioElement()
  void tryAutoResume()
}

// 这里给播放按钮提供统一切换入口。
function togglePlayback(): void {
  if (!findCurrentTrack()) {
    statusText.value = '背景音乐待置入'
    return
  }

  if (isPlaying.value) {
    pauseAudio()
    return
  }

  void playAudio(true)
}

// 这里主动暂停音乐，并把用户意图保存下来。
function pauseAudio(): { success: boolean; message: string } {
  desiredPlaying.value = false
  persistPreferences()

  if (audioElement.value) {
    audioElement.value.pause()
  } else {
    isPlaying.value = false
  }

  statusText.value = '背景音乐已暂停'
  return { success: true, message: statusText.value }
}

// 这里支持后续切换曲目，首版虽然不做歌单界面，但先把扩展口留好。
async function setTrack(trackId: string): Promise<void> {
  const track = trackList.value.find((item) => item.id === trackId)

  if (!track) {
    lastError.value = '未找到对应曲目'
    statusText.value = lastError.value
    return
  }

  currentTrackId.value = track.id
  persistPreferences()
  syncAudioElement()

  if (desiredPlaying.value) {
    await playAudio(true)
    return
  }

  statusText.value = `已选择曲目：${track.name}`
}

// 这里支持后续外部调节音量，当前首版先把能力预留出来。
function setVolume(nextVolume: number): void {
  volume.value = clampVolume(nextVolume)

  if (audioElement.value) {
    audioElement.value.volume = volume.value
  }

  persistPreferences()
  statusText.value = `背景音乐音量已调整为 ${Math.round(volume.value * 100)}%`
}

restorePreferences()

// 这里导出全局音频组合式函数，供首页和播放器共用一套状态。
export function useSiteAudio(tracks: readonly MusicTrack[] = []) {
  applyTracks(tracks)

  const currentTrack = computed<MusicTrack | null>(() => findCurrentTrack())
  const hasAvailableTrack = computed<boolean>(() => trackList.value.length > 0)

  return {
    currentTrack,
    hasAvailableTrack,
    isPlaying: readonly(isPlaying),
    desiredPlaying: readonly(desiredPlaying),
    lastError: readonly(lastError),
    initializeAudio,
    togglePlayback,
    pauseAudio,
    statusText: readonly(statusText),
    tracks: readonly(trackList),
    volume: readonly(volume),
    waitingForGestureRetry: readonly(waitingForGestureRetry),
    setTrack,
    setVolume,
    retryPlay: () => playAudio(true),
    setTracks: applyTracks,
  }
}
