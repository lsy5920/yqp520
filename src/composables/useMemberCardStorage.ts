import { readonly, ref } from 'vue'
import { createDefaultMemberCardForm, memberCardStorageKeys } from '@/data/memberCardContent'
import {
  memberCardSchemaVersion,
  type MemberCardArchiveRecord,
  type MemberCardFormValue,
  type MemberCardLegacyArchiveRecord,
  type MemberCardPersistedState,
} from '@/types/memberCard'
import {
  migrateLegacyMemberCardForm,
  normalizeMemberCardFormValue,
  normalizeMemberCardTemplateKey,
} from '@/utils/memberCard'

// 这里记录当前存储模式，方便页面知道本机记录是否正常。
type MemberCardStorageMode = 'local' | 'session'

// 这里定义当前页面运行时读取到的状态结构，方便统一做迁移和校验。
interface MemberCardRawState {
  version?: unknown
  draft?: unknown
  archives?: unknown
}

// 这里定义旧版表单的宽松读取结构，方便把旧草稿和旧同门录自动迁移到新版本。
type MemberCardUnknownForm = Record<string, unknown>

// 这里导出云栖名帖专用存储工具，统一处理草稿、档案和删除。
export function useMemberCardStorage() {
  // 这里保存当前存储模式，默认先按本机持久化处理。
  const storageMode = ref<MemberCardStorageMode>('local')
  // 这里保存当前会话里的名帖状态，方便本机存储失效时还能继续用。
  const memoryState = ref<MemberCardPersistedState | null>(null)

  /**
   * 安全读取 JSON 数据
   * 用途：从浏览器本地存储中读取名帖状态，失败时自动退化为当前会话模式
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
      console.warn('读取云栖同门名帖本地记录失败：', error)
      storageMode.value = 'session'
      return null
    }
  }

  /**
   * 安全写入 JSON 数据
   * 用途：把名帖草稿或档案写入浏览器本地存储，失败时退化为当前会话模式
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
      console.warn('写入云栖同门名帖本地记录失败：', error)
      storageMode.value = 'session'
      return false
    }
  }

  /**
   * 规范化任意表单内容
   * 用途：把旧版字段和新版字段统一清洗成当前版本可直接使用的结构
   * 入参：rawForm 为原始表单内容
   * 返回值：返回清洗后的新版本表单
   */
  function normalizeAnyFormValue(rawForm: unknown): MemberCardFormValue {
    if (!rawForm || typeof rawForm !== 'object') {
      return createDefaultMemberCardForm()
    }

    const formObject = rawForm as MemberCardUnknownForm

    if ('daoName' in formObject || 'worldName' in formObject || 'residence' in formObject || 'shortTags' in formObject) {
      return normalizeMemberCardFormValue({
        daoName: typeof formObject.daoName === 'string' ? formObject.daoName : '',
        worldName: typeof formObject.worldName === 'string' ? formObject.worldName : '',
        residence: typeof formObject.residence === 'string' ? formObject.residence : '',
        shortTags: typeof formObject.shortTags === 'string' ? formObject.shortTags : '',
        origin: typeof formObject.origin === 'string' ? formObject.origin : '',
        motto: typeof formObject.motto === 'string' ? formObject.motto : '',
        avatarDataUrl: typeof formObject.avatarDataUrl === 'string' ? formObject.avatarDataUrl : '',
        templateKey: normalizeMemberCardTemplateKey(
          typeof formObject.templateKey === 'string' ? formObject.templateKey : null,
        ),
      })
    }

    return migrateLegacyMemberCardForm({
      title: typeof formObject.title === 'string' ? formObject.title : '',
      secularName: typeof formObject.secularName === 'string' ? formObject.secularName : '',
      region: typeof formObject.region === 'string' ? formObject.region : '',
      hobbies: typeof formObject.hobbies === 'string' ? formObject.hobbies : '',
      origin: typeof formObject.origin === 'string' ? formObject.origin : '',
      motto: typeof formObject.motto === 'string' ? formObject.motto : '',
      avatarDataUrl: typeof formObject.avatarDataUrl === 'string' ? formObject.avatarDataUrl : '',
      templateKey: typeof formObject.templateKey === 'string' ? formObject.templateKey : '',
    })
  }

  /**
   * 规范化档案列表
   * 用途：把本机同门录整理成稳定可用的数组
   * 入参：rawArchives 为原始档案内容
   * 返回值：返回清洗后的档案列表
   */
  function normalizeArchiveList(rawArchives: unknown): MemberCardArchiveRecord[] {
    if (!Array.isArray(rawArchives)) {
      return []
    }

    return rawArchives
      .map((rawRecord, index) => {
        if (!rawRecord || typeof rawRecord !== 'object') {
          return null
        }

        const archiveRecord = rawRecord as Partial<MemberCardArchiveRecord> & {
          form?: MemberCardLegacyArchiveRecord['form'] | MemberCardFormValue | unknown
        }

        return {
          id: typeof archiveRecord.id === 'string' && archiveRecord.id.trim()
            ? archiveRecord.id
            : `member-card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          number: typeof archiveRecord.number === 'number' && Number.isFinite(archiveRecord.number) && archiveRecord.number > 0
            ? Math.floor(archiveRecord.number)
            : index + 1,
          createdAt: typeof archiveRecord.createdAt === 'number' && Number.isFinite(archiveRecord.createdAt)
            ? archiveRecord.createdAt
            : Date.now(),
          form: normalizeAnyFormValue(archiveRecord.form),
        }
      })
      .filter((item): item is MemberCardArchiveRecord => Boolean(item))
  }

  /**
   * 规范化当前状态
   * 用途：把版本正确的新状态整理成统一结构
   * 入参：rawState 为原始状态
   * 返回值：返回清洗后的状态，无法识别时返回 null
   */
  function normalizePersistedState(rawState: unknown): MemberCardPersistedState | null {
    if (!rawState || typeof rawState !== 'object') {
      return null
    }

    const state = rawState as MemberCardRawState

    if (state.version !== memberCardSchemaVersion) {
      return null
    }

    return {
      version: memberCardSchemaVersion,
      draft: state.draft ? normalizeAnyFormValue(state.draft) : null,
      archives: normalizeArchiveList(state.archives),
    }
  }

  /**
   * 安全写入整份状态
   * 用途：把草稿和同门录统一写进新版本状态里
   * 入参：state 为要保存的完整状态
   * 返回值：保存成功返回 true，失败返回 false
   */
  function saveState(state: MemberCardPersistedState): boolean {
    const nextState: MemberCardPersistedState = {
      version: memberCardSchemaVersion,
      draft: state.draft ? normalizeAnyFormValue(state.draft) : null,
      archives: normalizeArchiveList(state.archives),
    }

    memoryState.value = nextState
    safeWriteJson<MemberCardPersistedState>(memberCardStorageKeys.state, nextState)
    return true
  }

  /**
   * 读取旧版本状态
   * 用途：把旧草稿和旧同门录自动迁移到新版本
   * 入参：无
   * 返回值：有旧数据时返回迁移后的新状态，没有则返回 null
   */
  function loadLegacyState(): MemberCardPersistedState | null {
    const legacyDraft = safeReadJson<unknown>(memberCardStorageKeys.draft)
    const legacyArchives = safeReadJson<unknown>(memberCardStorageKeys.archives)

    if (legacyDraft === null && legacyArchives === null) {
      return null
    }

    return {
      version: memberCardSchemaVersion,
      draft: legacyDraft === null ? null : normalizeAnyFormValue(legacyDraft),
      archives: normalizeArchiveList(legacyArchives),
    }
  }

  /**
   * 读取当前状态
   * 用途：优先读取新版本状态，旧数据则自动迁移一次
   * 入参：无
   * 返回值：返回当前可用的完整状态
   */
  function loadState(): MemberCardPersistedState {
    const currentState = normalizePersistedState(safeReadJson<unknown>(memberCardStorageKeys.state))

    if (currentState) {
      memoryState.value = currentState
      return currentState
    }

    if (memoryState.value) {
      return memoryState.value
    }

    const legacyState = loadLegacyState()

    if (legacyState) {
      saveState(legacyState)
      return legacyState
    }

    memoryState.value = {
      version: memberCardSchemaVersion,
      draft: null,
      archives: [],
    }

    return memoryState.value
  }

  /**
   * 读取草稿
   * 用途：刷新页面后恢复上次填写内容
   * 入参：无
   * 返回值：返回草稿对象，不存在则返回 null
   */
  function loadDraft(): MemberCardFormValue | null {
    return loadState().draft
  }

  /**
   * 保存草稿
   * 用途：把当前填写内容实时存到本机，防止刷新后丢失
   * 入参：draft 为当前表单内容
   * 返回值：保存成功返回 true，失败返回 false
   */
  function saveDraft(draft: MemberCardFormValue): boolean {
    const currentState = loadState()
    return saveState({
      ...currentState,
      draft: normalizeAnyFormValue(draft),
    })
  }

  /**
   * 清理草稿
   * 用途：把当前编辑内容彻底清空，但不影响同门录
   * 入参：无
   * 返回值：清理成功返回 true，失败返回 false
   */
  function clearDraft(): boolean {
    const currentState = loadState()
    return saveState({
      ...currentState,
      draft: null,
    })
  }

  /**
   * 读取档案
   * 用途：把已经归档的同门名帖列表取出来
   * 入参：无
   * 返回值：返回档案数组，没有记录时返回空数组
   */
  function loadArchives(): MemberCardArchiveRecord[] {
    return loadState().archives
  }

  /**
   * 保存档案
   * 用途：把同门录保存到本机，方便后续翻阅
   * 入参：archives 为最新档案数组
   * 返回值：保存成功返回 true，失败返回 false
   */
  function saveArchives(archives: MemberCardArchiveRecord[]): boolean {
    const currentState = loadState()
    return saveState({
      ...currentState,
      archives: normalizeArchiveList(archives),
    })
  }

  /**
   * 计算下一个顺延编号
   * 用途：每生成一张新名帖，就自动往后顺延一个编号
   * 入参：archives 为当前已有档案列表
   * 返回值：返回下一个编号
   */
  function getNextArchiveNumber(archives: MemberCardArchiveRecord[]): number {
    const maxNumber = archives.reduce((currentMax, item) => Math.max(currentMax, item.number), 0)
    return maxNumber + 1
  }

  /**
   * 追加新档案
   * 用途：把刚生成的同门名帖加入同门录
   * 入参：form 为当前表单内容
   * 返回值：返回新生成的档案记录
   */
  function appendArchive(form: MemberCardFormValue): MemberCardArchiveRecord {
    const currentState = loadState()
    const normalizedForm = normalizeAnyFormValue(form)
    const nextArchive: MemberCardArchiveRecord = {
      id: `member-card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      number: getNextArchiveNumber(currentState.archives),
      createdAt: Date.now(),
      form: normalizedForm,
    }

    saveState({
      ...currentState,
      draft: normalizedForm,
      archives: [nextArchive, ...currentState.archives],
    })

    return nextArchive
  }

  /**
   * 删除档案
   * 用途：允许用户从同门录里移除某一条记录
   * 入参：archiveId 为要删除的档案编号
   * 返回值：删除成功返回 true，失败返回 false
   */
  function removeArchive(archiveId: string): boolean {
    const currentState = loadState()
    const nextArchives = currentState.archives.filter((item) => item.id !== archiveId)
    return saveState({
      ...currentState,
      archives: nextArchives,
    })
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
