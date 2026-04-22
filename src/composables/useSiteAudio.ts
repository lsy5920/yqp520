import { computed, readonly, ref, shallowRef } from 'vue'
import type { MusicLyricLine, MusicTrack } from '@/types/site'

/** 用途：记录当前曲目选择，刷新后仍能恢复到同一首曲子。 */
const TRACK_STORAGE_KEY = 'yunqi-site-audio-track'
/** 用途：记录用户最近一次是否希望继续播放背景音乐。 */
const PLAY_INTENT_STORAGE_KEY = 'yunqi-site-audio-intent'
/** 用途：记录用户上次调整后的音量，避免每次刷新都回到默认值。 */
const VOLUME_STORAGE_KEY = 'yunqi-site-audio-volume'
/** 用途：记录用户手动暂停音乐的时间戳，方便十五分钟后重新检测。 */
const MANUAL_PAUSE_AT_STORAGE_KEY = 'yunqi-site-audio-manual-pause-at'
/** 用途：记录用户手动暂停时的播放进度，后续可以从停下处继续。 */
const MANUAL_PAUSE_POSITION_STORAGE_KEY = 'yunqi-site-audio-manual-pause-position'
/** 用途：统一控制手动暂停后的复检时长，当前固定为十五分钟。 */
const MANUAL_PAUSE_RECHECK_DELAY_MS = 15 * 60 * 1000

/**
 * 全屏播放引导浮窗原因
 * 用途：区分首次就绪、异常停止和手动暂停后的复检场景，方便输出不同文案。
 */
type PlaybackPromptReason = 'initial-ready' | 'abnormal-stop' | 'manual-recheck'

/** 用途：全站唯一的音频实例，避免多个页面同时各播各的。 */
const audioElement = shallowRef<HTMLAudioElement | null>(null)
/** 用途：保存当前可用的背景音乐列表。 */
const trackList = ref<MusicTrack[]>([])
/** 用途：记录当前选中的曲目 id。 */
const currentTrackId = ref<string>('')

/** 用途：标记背景音乐当前是否正在播放。 */
const isPlaying = ref(false)
/** 用途：记录用户此刻是否希望音乐继续播放。 */
const desiredPlaying = ref(false)
/** 用途：保存当前音量。 */
const volume = ref(0.56)
/** 用途：保存当前播放进度秒数，供歌词和续播提示使用。 */
const currentTimeSeconds = ref(0)
/** 用途：保存最近一次错误信息。 */
const lastError = ref('')
/** 用途：保存当前给用户看的状态文案。 */
const statusText = ref('背景音乐待置入')
/** 用途：记录是否正在等待浏览器放行下一次手势重试。 */
const waitingForGestureRetry = ref(false)
/** 用途：记录当前曲目是否已经加载到可播放状态。 */
const isTrackReady = ref(false)
/** 用途：控制全屏播放引导浮窗是否显示。 */
const isPlaybackPromptVisible = ref(false)
/** 用途：记录当前浮窗对应的触发原因。 */
const playbackPromptReason = ref<PlaybackPromptReason>('initial-ready')
/** 用途：记录手动暂停发生的时间。 */
const manualPauseAt = ref(0)
/** 用途：记录手动暂停时的播放位置。 */
const manualPausePositionSeconds = ref(0)
/** 用途：在音频元数据就绪后恢复上次停下的位置。 */
const pendingResumeTimeSeconds = ref<number | null>(null)

/** 用途：避免重复绑定整站手势重试监听。 */
let gestureListenersBound = false
/** 用途：记录音量是否已经从本地缓存恢复过。 */
let restoredVolumeFromStorage = false
/** 用途：保存手动暂停后的复检定时器编号，方便重新安排。 */
let manualPauseReminderTimerId: number | null = null
/** 用途：保证同一首曲目在一次加载周期里只弹一次“已备好”提示。 */
let hasShownInitialPromptForCurrentTrack = false

/**
 * 安全读取本地缓存
 * 用途：避免浏览器禁用缓存时直接抛错，影响主流程。
 * 入参：key 为需要读取的缓存键名。
 * 返回值：读取成功时返回字符串，失败时返回空字符串。
 */
function safeGetStorage(key: string): string {
  if (typeof window === 'undefined') {
    return ''
  }

  try {
    return window.localStorage.getItem(key) ?? ''
  } catch (error) {
    // 这里兜底浏览器禁用缓存或隐私模式导致的读取失败。
    console.warn('读取本地缓存失败', error)
    return ''
  }
}

/**
 * 安全写入本地缓存
 * 用途：即使缓存写入失败，也不要打断网站正常使用。
 * 入参：key 为缓存键名，value 为要写入的内容。
 * 返回值：无返回值。
 */
function safeSetStorage(key: string, value: string): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(key, value)
  } catch (error) {
    // 这里仅做警告，不阻断主流程。
    console.warn('写入本地缓存失败', error)
  }
}

/**
 * 安全删除本地缓存
 * 用途：清理过期状态时避免浏览器存储异常把流程打断。
 * 入参：key 为需要删除的缓存键名。
 * 返回值：无返回值。
 */
function safeRemoveStorage(key: string): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.removeItem(key)
  } catch (error) {
    // 这里仅记录失败，避免影响用户继续浏览。
    console.warn('删除本地缓存失败', error)
  }
}

/**
 * 限制音量范围
 * 用途：把音量安全限制在 0 到 1 之间，避免外部传入异常值。
 * 入参：rawVolume 为原始音量值。
 * 返回值：返回修正后的安全音量值。
 */
function clampVolume(rawVolume: number): number {
  if (!Number.isFinite(rawVolume)) {
    return 0.56
  }

  return Math.min(1, Math.max(0, rawVolume))
}

/**
 * 规范化歌词时间轴
 * 用途：清理掉异常歌词，并按时间先后排序，保证播放时稳定取值。
 * 入参：lyrics 为原始歌词数组。
 * 返回值：返回清理后的歌词数组。
 */
function normalizeTrackLyrics(lyrics: readonly MusicLyricLine[] = []): MusicLyricLine[] {
  return lyrics
    .filter((item) => Number.isFinite(item.time) && item.time >= 0 && Boolean(item.text.trim()))
    .map((item) => ({
      time: item.time,
      text: item.text.trim(),
    }))
    .sort((previousItem, nextItem) => previousItem.time - nextItem.time)
}

/**
 * 规范化曲目数据
 * 用途：统一整理曲目附加字段，避免后续使用时出现空值问题。
 * 入参：track 为原始曲目配置。
 * 返回值：返回处理后的曲目对象。
 */
function normalizeTrack(track: MusicTrack): MusicTrack {
  return {
    ...track,
    lyrics: normalizeTrackLyrics(track.lyrics ?? []),
  }
}

/**
 * 解析曲目真实地址
 * 用途：兼容本地开发与子路径部署，保证音频资源都能被正确访问。
 * 入参：filePath 为曲目原始路径。
 * 返回值：返回当前站点下可直接访问的完整地址。
 */
function resolveTrackFileUrl(filePath: string): string {
  if (typeof window === 'undefined') {
    return filePath
  }

  // 这里保留完整外链，避免重复拼接成错误地址。
  if (/^(https?:|data:|blob:)/.test(filePath)) {
    return filePath
  }

  // 这里去掉开头斜杠，让 public 资源自动跟随站点基础路径。
  const normalizedFilePath = filePath.replace(/^\/+/, '')
  const siteBaseUrl = new URL(import.meta.env.BASE_URL || '/', window.location.origin)
  return new URL(normalizedFilePath, siteBaseUrl).href
}

/**
 * 查找当前曲目
 * 用途：根据当前选中的 id，找到真正要播放的曲目对象。
 * 入参：无。
 * 返回值：找到时返回曲目对象，否则返回 null。
 */
function findCurrentTrack(): MusicTrack | null {
  if (trackList.value.length === 0) {
    return null
  }

  const matchedTrack = trackList.value.find((item) => item.id === currentTrackId.value)
  return matchedTrack ?? trackList.value[0] ?? null
}

/**
 * 持久化播放偏好
 * 用途：把用户当前的曲目选择、播放意图和音量写入本地缓存。
 * 入参：无。
 * 返回值：无返回值。
 */
function persistPreferences(): void {
  safeSetStorage(TRACK_STORAGE_KEY, currentTrackId.value)
  safeSetStorage(PLAY_INTENT_STORAGE_KEY, desiredPlaying.value ? '1' : '0')
  safeSetStorage(VOLUME_STORAGE_KEY, String(volume.value))
}

/**
 * 恢复播放偏好
 * 用途：刷新页面后恢复曲目选择、播放意图、音量和手动暂停信息。
 * 入参：无。
 * 返回值：无返回值。
 */
function restorePreferences(): void {
  currentTrackId.value = safeGetStorage(TRACK_STORAGE_KEY)
  desiredPlaying.value = safeGetStorage(PLAY_INTENT_STORAGE_KEY) === '1'

  const cachedVolume = safeGetStorage(VOLUME_STORAGE_KEY)

  if (cachedVolume) {
    restoredVolumeFromStorage = true
    volume.value = clampVolume(Number(cachedVolume))
  }

  restoreManualPauseState()

  if (manualPauseAt.value > 0) {
    statusText.value = '背景音乐已暂歇，十五分钟后会再来轻唤'
    return
  }

  statusText.value = desiredPlaying.value
    ? '正在为你温载云栖清音'
    : '正在为你温载云栖清音'
}

/**
 * 持久化手动暂停信息
 * 用途：让手动暂停后的十五分钟复检与暂停续播能跨刷新保留下来。
 * 入参：无。
 * 返回值：无返回值。
 */
function persistManualPauseState(): void {
  safeSetStorage(MANUAL_PAUSE_AT_STORAGE_KEY, String(manualPauseAt.value))
  safeSetStorage(MANUAL_PAUSE_POSITION_STORAGE_KEY, String(manualPausePositionSeconds.value))
}

/**
 * 清理手动暂停信息
 * 用途：当用户已经恢复播放，或切换到其他场景时，把旧的暂停痕迹清掉。
 * 入参：clearPosition 为是否同时清理暂停位置，默认会一起清理。
 * 返回值：无返回值。
 */
function clearManualPauseState(clearPosition = true): void {
  manualPauseAt.value = 0
  safeRemoveStorage(MANUAL_PAUSE_AT_STORAGE_KEY)

  if (clearPosition) {
    manualPausePositionSeconds.value = 0
    pendingResumeTimeSeconds.value = null
    safeRemoveStorage(MANUAL_PAUSE_POSITION_STORAGE_KEY)
  }
}

/**
 * 恢复手动暂停信息
 * 用途：刷新页面后继续记住用户上次停下的时间和暂停时刻。
 * 入参：无。
 * 返回值：无返回值。
 */
function restoreManualPauseState(): void {
  const cachedPauseAt = Number(safeGetStorage(MANUAL_PAUSE_AT_STORAGE_KEY))
  const cachedPausePosition = Number(safeGetStorage(MANUAL_PAUSE_POSITION_STORAGE_KEY))

  manualPauseAt.value = Number.isFinite(cachedPauseAt) && cachedPauseAt > 0 ? cachedPauseAt : 0
  manualPausePositionSeconds.value = Number.isFinite(cachedPausePosition) && cachedPausePosition >= 0
    ? cachedPausePosition
    : 0
  pendingResumeTimeSeconds.value = manualPausePositionSeconds.value > 0
    ? manualPausePositionSeconds.value
    : null
}

/**
 * 计算手动暂停剩余等待时间
 * 用途：判断距离十五分钟复检还剩多久，便于安排定时器。
 * 入参：无。
 * 返回值：返回剩余毫秒数，小于等于 0 代表已经到期。
 */
function getManualPauseRemainingMs(): number {
  if (manualPauseAt.value <= 0) {
    return 0
  }

  const elapsed = Date.now() - manualPauseAt.value
  return Math.max(0, MANUAL_PAUSE_RECHECK_DELAY_MS - elapsed)
}

/**
 * 清理手动暂停复检定时器
 * 用途：避免多次暂停或恢复播放后出现多个复检计时器叠加。
 * 入参：无。
 * 返回值：无返回值。
 */
function clearManualPauseReminder(): void {
  if (manualPauseReminderTimerId === null || typeof window === 'undefined') {
    return
  }

  window.clearTimeout(manualPauseReminderTimerId)
  manualPauseReminderTimerId = null
}

/**
 * 隐藏播放引导浮窗
 * 用途：当音乐开始播放或场景不再需要提示时，统一关闭浮窗。
 * 入参：无。
 * 返回值：无返回值。
 */
function hidePlaybackPrompt(): void {
  isPlaybackPromptVisible.value = false
}

/**
 * 显示播放引导浮窗
 * 用途：在音乐就绪、异常停止或复检到期时，把引导层拉起。
 * 入参：reason 为当前浮窗出现的原因。
 * 返回值：无返回值。
 */
function showPlaybackPrompt(reason: PlaybackPromptReason): void {
  if (!findCurrentTrack() || !isTrackReady.value) {
    return
  }

  playbackPromptReason.value = reason
  isPlaybackPromptVisible.value = true
}

/**
 * 判断是否还处在手动暂停保护期
 * 用途：用户刚手动暂停后，十五分钟内不应立刻再次弹出全屏引导。
 * 入参：无。
 * 返回值：仍在保护期内返回 true，否则返回 false。
 */
function shouldDelayPromptBecauseOfManualPause(): boolean {
  return getManualPauseRemainingMs() > 0
}

/**
 * 到期后处理手动暂停复检
 * 用途：手动暂停满十五分钟后，重新把播放引导浮窗弹出来。
 * 入参：无。
 * 返回值：无返回值。
 */
function handleManualPauseRecheck(): void {
  manualPauseAt.value = 0
  safeRemoveStorage(MANUAL_PAUSE_AT_STORAGE_KEY)

  if (!findCurrentTrack() || isPlaying.value || !isTrackReady.value) {
    return
  }

  statusText.value = manualPausePositionSeconds.value > 0
    ? '云栖清音仍在候场，轻点任意位置可从停下处续上'
    : '云栖清音仍在候场，轻点任意位置即可再启'
  showPlaybackPrompt('manual-recheck')
}

/**
 * 安排手动暂停复检
 * 用途：用户手动暂停后，十五分钟后再来提醒一次继续播放。
 * 入参：无。
 * 返回值：无返回值。
 */
function scheduleManualPauseRecheck(): void {
  clearManualPauseReminder()

  if (manualPauseAt.value <= 0 || typeof window === 'undefined') {
    return
  }

  const remainingMs = getManualPauseRemainingMs()

  if (remainingMs <= 0) {
    handleManualPauseRecheck()
    return
  }

  manualPauseReminderTimerId = window.setTimeout(() => {
    manualPauseReminderTimerId = null
    handleManualPauseRecheck()
  }, remainingMs)
}

/**
 * 尝试弹出首次就绪提示
 * 用途：网站初次把音乐预加载好后，弹出一次全屏浮窗提示用户播放。
 * 入参：无。
 * 返回值：无返回值。
 */
function maybeShowInitialReadyPrompt(): void {
  if (hasShownInitialPromptForCurrentTrack || !isTrackReady.value || isPlaying.value) {
    return
  }

  if (shouldDelayPromptBecauseOfManualPause()) {
    scheduleManualPauseRecheck()
    return
  }

  hasShownInitialPromptForCurrentTrack = true
  statusText.value = '云栖之缘已备好，轻点任意位置播放'
  showPlaybackPrompt('initial-ready')
}

/**
 * 格式化时间文本
 * 用途：把秒数转换成更直观的 分:秒 文案，用在续播提示上。
 * 入参：seconds 为总秒数。
 * 返回值：返回格式化后的时间字符串。
 */
function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '00:00'
  }

  const roundedSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(roundedSeconds / 60)
  const remainSeconds = roundedSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainSeconds).padStart(2, '0')}`
}

/**
 * 同步当前状态到真实 audio 元素
 * 用途：把曲目、音量和预加载配置统一写回真实音频实例。
 * 入参：无。
 * 返回值：无返回值。
 */
function syncAudioElement(): void {
  if (!audioElement.value) {
    return
  }

  const track = findCurrentTrack()

  if (!track) {
    audioElement.value.removeAttribute('src')
    audioElement.value.load()
    isPlaying.value = false
    isTrackReady.value = false
    currentTimeSeconds.value = 0
    hidePlaybackPrompt()
    clearManualPauseReminder()
    clearManualPauseState()
    hasShownInitialPromptForCurrentTrack = false
    statusText.value = '背景音乐待置入'
    return
  }

  const resolvedUrl = resolveTrackFileUrl(track.filePath)

  if (audioElement.value.src !== resolvedUrl) {
    audioElement.value.src = resolvedUrl
    currentTimeSeconds.value = 0
    isTrackReady.value = false
    hasShownInitialPromptForCurrentTrack = false
    hidePlaybackPrompt()

    if (manualPausePositionSeconds.value > 0) {
      pendingResumeTimeSeconds.value = manualPausePositionSeconds.value
    }
  }

  audioElement.value.loop = true
  audioElement.value.preload = 'auto'
  audioElement.value.volume = volume.value
  audioElement.value.muted = false
}

/**
 * 同步当前播放时间
 * 用途：把真实音频当前时间写回响应式状态，供歌词和续播提示使用。
 * 入参：target 为真实音频元素。
 * 返回值：无返回值。
 */
function syncCurrentTime(target: HTMLAudioElement): void {
  currentTimeSeconds.value = Number.isFinite(target.currentTime) ? target.currentTime : 0
}

/**
 * 恢复手动暂停时的进度
 * 用途：在音频元数据可用后，尽量把播放位置跳回用户上次停下的地方。
 * 入参：target 为真实音频元素。
 * 返回值：无返回值。
 */
function applyPendingResumeTime(target: HTMLAudioElement): void {
  if (pendingResumeTimeSeconds.value === null) {
    return
  }

  const nextTime = pendingResumeTimeSeconds.value

  if (!Number.isFinite(nextTime) || nextTime < 0) {
    pendingResumeTimeSeconds.value = null
    return
  }

  try {
    const cappedTime = Number.isFinite(target.duration) && target.duration > 0
      ? Math.min(nextTime, Math.max(0, target.duration - 0.25))
      : nextTime

    target.currentTime = cappedTime
    currentTimeSeconds.value = target.currentTime
    pendingResumeTimeSeconds.value = null
  } catch (error) {
    // 这里兜底某些浏览器在元数据尚未完全准备好时禁止 seek 的情况。
    console.warn('恢复背景音乐进度失败', error)
  }
}

/**
 * 标记曲目已就绪
 * 用途：当音频缓冲到可播放状态后，更新“已备好”状态并决定是否弹浮窗。
 * 入参：target 为真实音频元素。
 * 返回值：无返回值。
 */
function markTrackReady(target: HTMLAudioElement): void {
  syncCurrentTime(target)
  applyPendingResumeTime(target)

  if (target.readyState < 3) {
    return
  }

  if (!isTrackReady.value) {
    isTrackReady.value = true
    lastError.value = ''

    if (shouldDelayPromptBecauseOfManualPause()) {
      statusText.value = '背景音乐已暂歇，十五分钟后会再来轻唤'
    } else if (desiredPlaying.value) {
      statusText.value = '云栖之缘已备好，轻点任意位置继续播放'
    } else {
      statusText.value = '云栖之缘已备好，轻点任意位置播放'
    }
  }

  maybeShowInitialReadyPrompt()
}

/**
 * 记录手动暂停
 * 用途：保存暂停时间与位置，后续十五分钟复检时可以从原位置续播。
 * 入参：pausedAtSeconds 为暂停时的播放秒数。
 * 返回值：无返回值。
 */
function recordManualPause(pausedAtSeconds: number): void {
  manualPauseAt.value = Date.now()
  manualPausePositionSeconds.value = Math.max(0, pausedAtSeconds)
  pendingResumeTimeSeconds.value = manualPausePositionSeconds.value
  persistManualPauseState()
  scheduleManualPauseRecheck()
}

/**
 * 绑定音频事件
 * 用途：让真实音频实例的状态变化都能同步回全局响应式数据。
 * 入参：target 为真实音频元素。
 * 返回值：无返回值。
 */
function bindAudioEvents(target: HTMLAudioElement): void {
  target.addEventListener('play', () => {
    isPlaying.value = true
    waitingForGestureRetry.value = false
    isTrackReady.value = target.readyState >= 3 || isTrackReady.value
    lastError.value = ''
    hidePlaybackPrompt()
    clearManualPauseReminder()
    clearManualPauseState()
    statusText.value = `正在播放：${findCurrentTrack()?.name ?? '云栖之缘'}`
    syncCurrentTime(target)
  })

  target.addEventListener('pause', () => {
    const shouldTreatAsUnexpectedStop = desiredPlaying.value

    isPlaying.value = false
    syncCurrentTime(target)

    if (shouldTreatAsUnexpectedStop) {
      statusText.value = '清音忽止，轻点任意位置继续播放'
      showPlaybackPrompt('abnormal-stop')
      return
    }

    statusText.value = manualPauseAt.value > 0
      ? '背景音乐已暂停，十五分钟后会再来轻唤'
      : '背景音乐已暂停'
  })

  target.addEventListener('error', () => {
    const shouldGuideRetry = desiredPlaying.value

    isPlaying.value = false
    waitingForGestureRetry.value = false
    isTrackReady.value = false
    currentTimeSeconds.value = 0
    lastError.value = '音频资源加载失败，请稍后重试'
    statusText.value = lastError.value

    if (shouldGuideRetry) {
      showPlaybackPrompt('abnormal-stop')
    }
  })

  target.addEventListener('loadedmetadata', () => {
    applyPendingResumeTime(target)
    syncCurrentTime(target)
  })

  target.addEventListener('loadeddata', () => {
    markTrackReady(target)
  })

  target.addEventListener('canplay', () => {
    markTrackReady(target)
  })

  target.addEventListener('canplaythrough', () => {
    markTrackReady(target)
  })

  target.addEventListener('timeupdate', () => {
    syncCurrentTime(target)
  })

  target.addEventListener('seeking', () => {
    syncCurrentTime(target)
  })

  target.addEventListener('seeked', () => {
    syncCurrentTime(target)
  })
}

/**
 * 确保音频实例存在
 * 用途：按需创建全站唯一的 audio 元素，并立刻写入当前配置开始预加载。
 * 入参：无。
 * 返回值：返回真实音频元素。
 */
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

/**
 * 统一处理播放逻辑
 * 用途：给全屏浮窗、播放器按钮和首页入口共用同一套播放入口。
 * 入参：fromGesture 表示这次播放是否来自用户真实点击或按键。
 * 返回值：返回播放结果和对应提示文案。
 */
async function playAudio(fromGesture: boolean): Promise<{ success: boolean; message: string }> {
  const track = findCurrentTrack()

  if (!track) {
    statusText.value = '背景音乐待置入'
    return { success: false, message: statusText.value }
  }

  const target = ensureAudioElement()
  syncAudioElement()
  applyPendingResumeTime(target)
  desiredPlaying.value = true
  lastError.value = ''
  persistPreferences()

  try {
    await target.play()
    hidePlaybackPrompt()
    statusText.value = `正在播放：${track.name}`
    return { success: true, message: statusText.value }
  } catch (error) {
    // 这里兜底浏览器拦截播放、音频尚未可播等异常情况。
    console.warn('播放背景音乐失败', error)
    isPlaying.value = false
    waitingForGestureRetry.value = !fromGesture
    lastError.value = fromGesture
      ? '云栖之缘暂未能响起，请再轻点一次试试'
      : '浏览器暂未放行自动播放，轻点页面任意位置即可启清音'
    statusText.value = lastError.value

    if (fromGesture && isTrackReady.value) {
      showPlaybackPrompt(playbackPromptReason.value)
    }

    return { success: false, message: lastError.value }
  }
}

/**
 * 处理浮窗点击播放
 * 用途：让全屏引导浮窗点击任意位置时直接触发播放。
 * 入参：无。
 * 返回值：返回播放结果 Promise。
 */
function confirmPlaybackPrompt(): Promise<{ success: boolean; message: string }> {
  return playAudio(true)
}

/**
 * 绑定手势重试
 * 用途：浏览器拦截后，下一次用户任意点击页面时自动再试一次。
 * 入参：无。
 * 返回值：无返回值。
 */
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

/**
 * 注入曲目列表
 * 用途：从站点内容里拿到可播放曲目，并同步到当前全局音频状态。
 * 入参：tracks 为外部传入的曲目数组。
 * 返回值：无返回值。
 */
function applyTracks(tracks: readonly MusicTrack[]): void {
  trackList.value = tracks
    .filter((item) => item.enabled && Boolean(item.filePath.trim()))
    .map((item) => normalizeTrack(item))

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

  if (manualPauseAt.value > 0) {
    statusText.value = '背景音乐已暂歇，十五分钟后会再来轻唤'
  } else if (desiredPlaying.value) {
    statusText.value = '正在为你温载云栖清音'
  } else {
    statusText.value = '正在为你温载云栖清音'
  }

  syncAudioElement()
}

/**
 * 初始化音频系统
 * 用途：在应用挂载后创建真实音频实例，并开始预加载与复检计时。
 * 入参：无。
 * 返回值：无返回值。
 */
function initializeAudio(): void {
  bindGestureRetry()
  ensureAudioElement()
  syncAudioElement()

  if (manualPauseAt.value > 0) {
    scheduleManualPauseRecheck()
  }
}

/**
 * 播放器开关入口
 * 用途：给右下角播放器按钮提供统一的播放与暂停切换。
 * 入参：无。
 * 返回值：无返回值。
 */
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

/**
 * 手动暂停音频
 * 用途：记录暂停时间与暂停位置，并开启十五分钟后的重新检测。
 * 入参：无。
 * 返回值：返回本次暂停结果和提示文案。
 */
function pauseAudio(): { success: boolean; message: string } {
  const pausedAtSeconds = audioElement.value
    ? audioElement.value.currentTime
    : currentTimeSeconds.value

  desiredPlaying.value = false
  persistPreferences()
  recordManualPause(pausedAtSeconds)
  hidePlaybackPrompt()

  if (audioElement.value) {
    audioElement.value.pause()
  } else {
    isPlaying.value = false
  }

  statusText.value = '背景音乐已暂停，十五分钟后会再来轻唤'
  return { success: true, message: statusText.value }
}

/**
 * 切换曲目
 * 用途：预留后续外部切歌能力，同时确保切歌后状态重置干净。
 * 入参：trackId 为目标曲目 id。
 * 返回值：无返回值。
 */
async function setTrack(trackId: string): Promise<void> {
  const track = trackList.value.find((item) => item.id === trackId)

  if (!track) {
    lastError.value = '未找到对应曲目'
    statusText.value = lastError.value
    return
  }

  clearManualPauseReminder()
  clearManualPauseState()
  currentTrackId.value = track.id
  persistPreferences()
  syncAudioElement()

  if (desiredPlaying.value) {
    await playAudio(true)
    return
  }

  statusText.value = `已选择曲目：${track.name}`
}

/**
 * 调整音量
 * 用途：给未来音量控制入口统一复用，确保修改后立刻同步到真实音频。
 * 入参：nextVolume 为新的音量值。
 * 返回值：无返回值。
 */
function setVolume(nextVolume: number): void {
  volume.value = clampVolume(nextVolume)

  if (audioElement.value) {
    audioElement.value.volume = volume.value
  }

  persistPreferences()
  statusText.value = `背景音乐音量已调整为 ${Math.round(volume.value * 100)}%`
}

restorePreferences()

/**
 * 导出全局背景音乐组合式函数
 * 用途：给首页、播放器、歌词浮层和全屏播放引导共用同一套状态。
 * 入参：tracks 为外部传入的曲目列表。
 * 返回值：返回全局背景音乐需要的全部响应式状态与操作方法。
 */
export function useSiteAudio(tracks: readonly MusicTrack[] = []) {
  applyTracks(tracks)

  /** 用途：当前选中的曲目对象。 */
  const currentTrack = computed<MusicTrack | null>(() => findCurrentTrack())
  /** 用途：当前是否存在可用曲目。 */
  const hasAvailableTrack = computed<boolean>(() => trackList.value.length > 0)

  /**
   * 当前歌词下标
   * 用途：根据当前播放时间，算出应该显示到哪一句歌词。
   */
  const currentLyricIndex = computed<number>(() => {
    const lyricList = currentTrack.value?.lyrics ?? []

    if (!isPlaying.value || lyricList.length === 0) {
      return -1
    }

    for (let lyricIndex = lyricList.length - 1; lyricIndex >= 0; lyricIndex -= 1) {
      const currentLyricItem = lyricList[lyricIndex]

      if (currentLyricItem && currentTimeSeconds.value >= currentLyricItem.time) {
        return lyricIndex
      }
    }

    return -1
  })

  /**
   * 当前歌词
   * 用途：给歌词浮层展示当前正在唱到的那一句。
   */
  const currentLyricLine = computed<MusicLyricLine | null>(() => {
    const lyricList = currentTrack.value?.lyrics ?? []
    return currentLyricIndex.value >= 0 ? lyricList[currentLyricIndex.value] ?? null : null
  })

  /**
   * 下一句歌词
   * 用途：保留扩展口，后续如果还想做提示动效可以直接复用。
   */
  const nextLyricLine = computed<MusicLyricLine | null>(() => {
    const lyricList = currentTrack.value?.lyrics ?? []
    const nextLyricIndex = currentLyricIndex.value + 1

    if (currentLyricIndex.value < 0 || nextLyricIndex >= lyricList.length) {
      return null
    }

    return lyricList[nextLyricIndex] ?? null
  })

  /**
   * 是否显示歌词浮层
   * 用途：只有真正播放到歌词区间时才显示，减少正文遮挡。
   */
  const shouldShowLyricOverlay = computed<boolean>(() => (
    isPlaying.value && Boolean(currentLyricLine.value?.text)
  ))

  /**
   * 浮窗主标题
   * 用途：根据不同触发原因，输出更贴合场景的标题文案。
   */
  const playbackPromptTitle = computed<string>(() => {
    if (playbackPromptReason.value === 'abnormal-stop') {
      return '清音忽止，请再唤一程'
    }

    if (playbackPromptReason.value === 'manual-recheck') {
      return '云栖清音仍在候场'
    }

    return '云栖之缘已备好'
  })

  /**
   * 浮窗说明文案
   * 用途：给用户说明当前为什么会弹出全屏引导，以及点击后会发生什么。
   */
  const playbackPromptDescription = computed<string>(() => {
    if (playbackPromptReason.value === 'abnormal-stop') {
      return '方才的江湖清音意外停下了。轻点任意位置，便可把这一阙江湖从断处续起。'
    }

    if (playbackPromptReason.value === 'manual-recheck') {
      return '你先前让这支曲子暂歇了片刻。如今十五分钟已到，若愿意，就让它从停下处重新回到你身边。'
    }

    return '山门清音已经温载妥当。轻点任意位置，便可让《云栖之缘》缓缓入场。'
  })

  /**
   * 浮窗动作提示
   * 用途：给用户一个更直接的“现在点击会发生什么”提示。
   */
  const playbackPromptActionText = computed<string>(() => {
    if (playbackPromptReason.value === 'abnormal-stop' || playbackPromptReason.value === 'manual-recheck') {
      return '轻点任意位置，续上云栖清音'
    }

    return '轻点任意位置，启这一阙江湖清音'
  })

  /**
   * 浮窗续播说明
   * 用途：如果有暂停位置，就明确告诉用户会从哪个时间点继续。
   */
  const playbackPromptResumeText = computed<string>(() => {
    const resumeAtSeconds = manualPausePositionSeconds.value > 0
      ? manualPausePositionSeconds.value
      : currentTimeSeconds.value

    if (resumeAtSeconds <= 0) {
      return ''
    }

    return `将从 ${formatClock(resumeAtSeconds)} 处续上`
  })

  return {
    currentTrack,
    currentLyricLine,
    currentTimeSeconds: readonly(currentTimeSeconds),
    hasAvailableTrack,
    isPlaying: readonly(isPlaying),
    desiredPlaying: readonly(desiredPlaying),
    isPlaybackPromptVisible: readonly(isPlaybackPromptVisible),
    isTrackReady: readonly(isTrackReady),
    lastError: readonly(lastError),
    initializeAudio,
    nextLyricLine,
    togglePlayback,
    pauseAudio,
    statusText: readonly(statusText),
    shouldShowLyricOverlay,
    tracks: readonly(trackList),
    volume: readonly(volume),
    waitingForGestureRetry: readonly(waitingForGestureRetry),
    playbackPromptTitle,
    playbackPromptDescription,
    playbackPromptActionText,
    playbackPromptResumeText,
    setTrack,
    setVolume,
    retryPlay: () => playAudio(true),
    confirmPlaybackPrompt,
    setTracks: applyTracks,
  }
}
