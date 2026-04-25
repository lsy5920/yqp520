import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * 读取系统减弱动态效果偏好
 * 用途：让动画、背景和滚动显现尊重用户系统设置
 * 入参：无
 * 返回值：返回一个布尔响应式值，true 表示用户希望减少动态效果
 */
export function useReducedMotion() {
  // 这里保存系统是否开启减少动态效果，默认先按不减少处理，避免服务端或测试环境报错。
  const prefersReducedMotion = ref(false)

  // 这里保存媒体查询对象，方便卸载时移除监听。
  let mediaQuery: MediaQueryList | null = null

  /**
   * 同步系统减弱动态效果状态
   * 用途：系统设置变化时更新页面动效开关
   * 入参：event 可选，为浏览器媒体查询变化事件
   * 返回值：无返回值
   */
  function syncReducedMotion(event?: MediaQueryListEvent): void {
    prefersReducedMotion.value = Boolean(event?.matches ?? mediaQuery?.matches)
  }

  // 这里在组件挂载后读取系统设置，并监听用户后续修改。
  onMounted(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    syncReducedMotion()
    mediaQuery.addEventListener('change', syncReducedMotion)
  })

  // 这里在组件卸载时释放媒体查询监听，避免页面切换后残留监听。
  onBeforeUnmount(() => {
    mediaQuery?.removeEventListener('change', syncReducedMotion)
    mediaQuery = null
  })

  return prefersReducedMotion
}
