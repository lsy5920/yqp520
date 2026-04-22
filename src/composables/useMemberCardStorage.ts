import { readonly, ref } from 'vue'
import type {
  MemberCardArchiveRecord,
  MemberCardFormValue,
} from '@/types/memberCard'
import { memberCardStorageKeys } from '@/data/memberCardContent'

// 这里记录当前存储模式，方便页面提示用户本机保存是否正常。
type MemberCardStorageMode = 'local' | 'session'

// 这里导出云栖名片专用存储工具，统一处理草稿、档案和删除。
export function useMemberCardStorage() {
  // 这里保存当前存储模式，默认先按本机持久化处理。
  const storageMode = ref<MemberCardStorageMode>('local')

  /**
   * 安全读取 JSON 数据
   * 用途：从本机存储中读取名片草稿或同门录，失败时自动退化为当前会话模式
   * 入参：key 为本地存储键名
   * 返回值：读取成功返回解析后的对象，失败返回 null
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
      console.warn('读取云栖同门名片本地记录失败：', error)
      storageMode.value = 'session'
      return null
    }
  }

  /**
   * 安全写入 JSON 数据
   * 用途：把名片草稿或档案写入本机存储，失败时保留当前会话内容
   * 入参：key 为本地存储键名，value 为要保存的对象
   * 返回值：写入成功返回 true，失败返回 false
   */
  function safeWriteJson<T>(key: string, value: T): boolean {
    if (typeof window === 'undefined') {
      return false
    }

    try {
      window.localStorage.setItem(key, JSON.stringify(value))
      storageMode.value = 'local'
      return true
    } catch (error) {
      // 这里兜底本机容量不足或权限异常，避免页面因为保存失败而卡住。
      console.warn('写入云栖同门名片本地记录失败：', error)
      storageMode.value = 'session'
      return false
    }
  }

  /**
   * 安全删除本地记录
   * 用途：清理草稿或档案，避免删不掉时影响新记录保存
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
      // 这里兜底删除失败，避免因为清理失败影响主流程。
      console.warn('删除云栖同门名片本地记录失败：', error)
      storageMode.value = 'session'
      return false
    }
  }

  /**
   * 读取草稿
   * 用途：刷新页面后恢复上次填写内容
   * 入参：无
   * 返回值：返回草稿对象，不存在则返回 null
   */
  function loadDraft(): MemberCardFormValue | null {
    return safeReadJson<MemberCardFormValue>(memberCardStorageKeys.draft)
  }

  /**
   * 保存草稿
   * 用途：把当前填写内容实时存到本机，防止刷新后丢失
   * 入参：draft 为当前表单内容
   * 返回值：保存成功返回 true，失败返回 false
   */
  function saveDraft(draft: MemberCardFormValue): boolean {
    return safeWriteJson<MemberCardFormValue>(memberCardStorageKeys.draft, draft)
  }

  /**
   * 清理草稿
   * 用途：把当前编辑内容彻底清空
   * 入参：无
   * 返回值：清理成功返回 true，失败返回 false
   */
  function clearDraft(): boolean {
    return safeRemove(memberCardStorageKeys.draft)
  }

  /**
   * 读取档案
   * 用途：把已经归档的同门名片列表取出来
   * 入参：无
   * 返回值：返回档案数组，没有记录时返回空数组
   */
  function loadArchives(): MemberCardArchiveRecord[] {
    return safeReadJson<MemberCardArchiveRecord[]>(memberCardStorageKeys.archives) ?? []
  }

  /**
   * 保存档案
   * 用途：把同门录保存到本机，方便后续翻阅
   * 入参：archives 为最新档案数组
   * 返回值：保存成功返回 true，失败返回 false
   */
  function saveArchives(archives: MemberCardArchiveRecord[]): boolean {
    return safeWriteJson<MemberCardArchiveRecord[]>(memberCardStorageKeys.archives, archives)
  }

  /**
   * 计算下一个顺延编号
   * 用途：每生成一张新名片，就自动往后顺延一个编号
   * 入参：archives 为当前已有档案列表
   * 返回值：返回下一个编号
   */
  function getNextArchiveNumber(archives: MemberCardArchiveRecord[]): number {
    const maxNumber = archives.reduce((currentMax, item) => Math.max(currentMax, item.number), 0)
    return maxNumber + 1
  }

  /**
   * 追加新档案
   * 用途：把刚生成的同门名片加入同门录
   * 入参：form 为当前表单内容
   * 返回值：返回新生成的档案记录
   */
  function appendArchive(form: MemberCardFormValue): MemberCardArchiveRecord {
    const archives = loadArchives()
    const nextArchive: MemberCardArchiveRecord = {
      id: `member-card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      number: getNextArchiveNumber(archives),
      createdAt: Date.now(),
      form,
    }

    saveArchives([nextArchive, ...archives])
    return nextArchive
  }

  /**
   * 删除档案
   * 用途：允许用户从同门录里移除某一条记录
   * 入参：archiveId 为要删除的档案编号
   * 返回值：删除成功返回 true，失败返回 false
   */
  function removeArchive(archiveId: string): boolean {
    const nextArchives = loadArchives().filter((item) => item.id !== archiveId)
    return saveArchives(nextArchives)
  }

  return {
    storageMode: readonly(storageMode),
    loadArchives,
    loadDraft,
    saveDraft,
    saveArchives,
    appendArchive,
    removeArchive,
    clearDraft,
    getNextArchiveNumber,
  }
}
