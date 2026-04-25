import { readonly, ref } from 'vue'

// 这里定义存储模式类型，方便页面知道当前是本地持久记录还是仅当前会话可用。
type AssessmentStorageMode = 'local' | 'session'

// 这里集中定义考核草稿存储键名，方便答题页和其他页面统一复用。
export const ASSESSMENT_DRAFT_STORAGE_KEY = 'yunqi-assessment-draft-v2'

// 这里保留旧版考核草稿键名，新版启动时只清理它，不再恢复旧草稿。
export const ASSESSMENT_LEGACY_DRAFT_STORAGE_KEY = 'yunqi-assessment-draft'

// 这里集中定义考核结果存储键名，方便名册登记页读取最近一次考核资格。
export const ASSESSMENT_RESULT_STORAGE_KEY = 'yunqi-assessment-result'

// 这里导出考核专用存储工具，统一兜底本地存储不可用的情况。
export function useAssessmentStorage() {
  // 这里记录当前存储模式，默认先按本地持久模式处理。
  const storageMode = ref<AssessmentStorageMode>('local')

  /**
   * 安全读取 JSON 数据
   * 用途：从浏览器本地存储中读取考核草稿或结果，失败时自动退化为当前会话模式
   * 入参：key 为本地存储键名
   * 返回值：读取成功时返回解析后的对象，失败时返回 null
   */
  function safeReadJson<T>(key: string): T | null {
    if (typeof window === 'undefined') {
      return null
    }

    try {
      const rawValue = window.localStorage.getItem(key)

      if (!rawValue) {
        return null
      }

      storageMode.value = 'local'
      return JSON.parse(rawValue) as T
    } catch (error) {
      // 这里兜底隐私模式、权限受限或 JSON 损坏的场景，避免页面直接报错。
      console.warn('读取入派考核本地记录失败：', error)
      storageMode.value = 'session'
      return null
    }
  }

  /**
   * 安全写入 JSON 数据
   * 用途：把考核草稿或最近一次结果写入浏览器本地存储，失败时退化为当前会话模式
   * 入参：key 为本地存储键名，value 为要保存的对象
   * 返回值：写入成功返回 true，失败返回 false
   */
  function safeWriteJson(key: string, value: unknown): boolean {
    if (typeof window === 'undefined') {
      return false
    }

    try {
      window.localStorage.setItem(key, JSON.stringify(value))
      storageMode.value = 'local'
      return true
    } catch (error) {
      // 这里仅记录警告，不中断主流程，让页面继续以当前会话模式运行。
      console.warn('写入入派考核本地记录失败：', error)
      storageMode.value = 'session'
      return false
    }
  }

  /**
   * 安全删除本地记录
   * 用途：正式交卷或重新开考时清理旧草稿，避免恢复到过期进度
   * 入参：key 为本地存储键名
   * 返回值：删除成功返回 true，失败返回 false
   */
  function safeRemove(key: string): boolean {
    if (typeof window === 'undefined') {
      return false
    }

    try {
      window.localStorage.removeItem(key)
      storageMode.value = 'local'
      return true
    } catch (error) {
      // 这里兜底删除失败，避免因为清理失败影响答题主流程。
      console.warn('删除入派考核本地记录失败：', error)
      storageMode.value = 'session'
      return false
    }
  }

  /**
   * 清理旧版考核草稿
   * 用途：新版问心榜海报不再读取旧草稿，避免旧答题进度影响新版结果
   * 入参：无
   * 返回值：删除成功返回 true，失败返回 false
   */
  function clearLegacyDraft(): boolean {
    return safeRemove(ASSESSMENT_LEGACY_DRAFT_STORAGE_KEY)
  }
  return {
    storageMode: readonly(storageMode),
    safeReadJson,
    safeRemove,
    safeWriteJson,
    clearLegacyDraft,
  }
}


