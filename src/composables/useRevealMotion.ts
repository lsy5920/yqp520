import { gsap } from 'gsap'
import { onBeforeUnmount, onMounted, unref, type Ref } from 'vue'
import { useReducedMotion } from '@/composables/useReducedMotion'

// 这里定义可传入的参数类型，方便按需指定根节点和减动效状态。
interface RevealMotionOptions {
  rootRef: Ref<HTMLElement | null>
  reducedMotion?: Ref<boolean> | { value: boolean }
}

// 这里导出章节显现动效，让页面内容进入视口时更有层次感。
export function useRevealMotion(options: RevealMotionOptions) {
  // 这里读取系统减弱动态效果偏好，调用方未传入时使用这份默认状态。
  const systemReducedMotion = useReducedMotion()

  // 这里保存观察器，便于组件卸载时清理监听。
  let observer: IntersectionObserver | null = null

  // 这里保存当前页面内所有需要动效的元素，方便统一处理。
  let revealElements: HTMLElement[] = []

  // 这里把元素直接切换到最终状态，用于减少动态效果或兜底场景。
  const showElementImmediately = (element: HTMLElement) => {
    element.classList.add('is-visible')
    gsap.set(element, {
      autoAlpha: 1,
      clearProps: 'all',
      y: 0,
    })
  }

  onMounted(() => {
    const rootElement = unref(options.rootRef)

    // 如果当前页面根节点还没准备好，就不继续执行。
    if (!rootElement) {
      return
    }

    revealElements = Array.from(rootElement.querySelectorAll<HTMLElement>('[data-reveal]'))

    // 页面没有可动效元素时，直接跳过，避免多余监听。
    if (revealElements.length === 0) {
      return
    }

    // 如果用户开启了减少动态效果，就直接展示最终状态。
    if (options.reducedMotion?.value || systemReducedMotion.value) {
      revealElements.forEach(showElementImmediately)
      return
    }

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, index) => {
          if (!entry.isIntersecting) {
            return
          }

          const element = entry.target as HTMLElement
          const staggerDelay = Number(element.dataset.delay ?? index * 0.06)

          // 元素进入视口后再播放轻量动效，避免首屏一次性压太多动画。
          gsap.fromTo(
            element,
            {
              autoAlpha: 0,
              y: 28,
            },
            {
              autoAlpha: 1,
              duration: 0.86,
              ease: 'power3.out',
              y: 0,
              delay: staggerDelay,
              onStart: () => {
                element.classList.add('is-visible')
              },
            },
          )

          // 动画播放过一次即可，避免反复进出视口导致闪烁。
          observer?.unobserve(element)
        })
      },
      {
        rootMargin: '0px 0px -12% 0px',
        threshold: 0.16,
      },
    )

    revealElements.forEach((element) => {
      gsap.set(element, {
        autoAlpha: 0,
        y: 28,
      })
      observer?.observe(element)
    })
  })

  onBeforeUnmount(() => {
    // 页面离开时释放观察器，避免残留监听。
    observer?.disconnect()
    observer = null
    revealElements = []
  })
}
