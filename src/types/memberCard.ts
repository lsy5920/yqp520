// 这里定义云栖同门名帖的版本号，方便以后继续升级数据结构。
export const memberCardSchemaVersion = 2 as const

// 这里定义云栖同门名帖的模板编号，方便后续继续扩展更多门帖样式。
export type MemberCardTemplateKey = 'qingya' | 'zhuyin'

// 这里定义允许被表单直接编辑的字段，方便页面按同一套顺序渲染输入框。
export type MemberCardEditableFieldKey =
  | 'daoName'
  | 'worldName'
  | 'residence'
  | 'shortTags'
  | 'origin'
  | 'motto'

// 这里定义名帖表单字段的基础结构，方便页面按统一规则生成表单。
export interface MemberCardFieldConfig {
  // 这里保存字段键名，和表单数据一一对应。
  key: MemberCardEditableFieldKey
  // 这里保存字段标题，给用户直接看。
  label: string
  // 这里保存输入提示，减少用户填写时的犹豫。
  placeholder: string
  // 这里保存字段说明，帮助新同门知道这项要写什么。
  help: string
  // 这里保存输入框行数，长文本时会自动变成多行输入。
  rows?: number
  // 这里保存字段最大长度，避免内容太长把名帖撑坏。
  maxLength: number
}

// 这里定义名帖模板结构，方便前端统一切换“清雅门帖”和“朱印典藏”。
export interface MemberCardTemplateConfig {
  // 这里保存模板编号。
  key: MemberCardTemplateKey
  // 这里保存模板名称，给用户直接选择。
  name: string
  // 这里保存模板说明，解释这套样式更适合什么场景。
  description: string
  // 这里保存模板在卡片组件上要使用的样式类名。
  cardClass: string
}

// 这里定义名帖表单数据，保存新同门填写的全部基础信息。
export interface MemberCardFormValue {
  // 这里保存道号，也就是名帖上的主称呼。
  daoName: string
  // 这里保存俗世名号，真实姓名可不填。
  worldName: string
  // 这里保存所处地域，默认只写城市。
  residence: string
  // 这里保存门中短签，用来把兴趣、爱好、擅长之事拆成几枚短签。
  shortTags: string
  // 这里保存入栖初心，用来写为什么愿意加入云栖派。
  origin: string
  // 这里保存个人寄语，用来写座右铭或一句心里话。
  motto: string
  // 这里保存头像图片的数据地址，方便预览和导出后长期留存。
  avatarDataUrl: string
  // 这里保存当前选中的模板编号。
  templateKey: MemberCardTemplateKey
}

// 这里定义名帖档案结构，方便把新同门信息永久留在本机同门录里。
export interface MemberCardArchiveRecord {
  // 这里保存档案唯一编号，便于删除和恢复。
  id: string
  // 这里保存门派编号，按顺序自动递增。
  number: number
  // 这里保存生成时间，方便档案回看。
  createdAt: number
  // 这里保存完整表单内容，方便后续重新载入。
  form: MemberCardFormValue
}

// 这里定义本地存储里的整份名帖状态，方便统一保存和恢复。
export interface MemberCardPersistedState {
  // 这里保存数据版本号，方便后续升级和迁移。
  version: typeof memberCardSchemaVersion
  // 这里保存正在编辑的草稿。
  draft: MemberCardFormValue | null
  // 这里保存已经归档的同门名帖列表。
  archives: MemberCardArchiveRecord[]
}

// 这里定义旧版表单结构，方便把旧草稿和旧同门录自动迁移到新版本。
export interface MemberCardLegacyFormValue {
  // 这里保存旧版道号字段。
  title?: string
  // 这里保存旧版俗世名号字段。
  secularName?: string
  // 这里保存旧版地域字段。
  region?: string
  // 这里保存旧版所好字段。
  hobbies?: string
  // 这里保存旧版入栖初心字段。
  origin?: string
  // 这里保存旧版个人寄语字段。
  motto?: string
  // 这里保存旧版头像字段。
  avatarDataUrl?: string
  // 这里保存旧版模板字段。
  templateKey?: string
}

// 这里定义旧版档案结构，方便把旧同门录自动迁移到新版本。
export interface MemberCardLegacyArchiveRecord {
  // 这里保存旧版档案编号。
  id: string
  // 这里保存旧版门派编号。
  number: number
  // 这里保存旧版生成时间。
  createdAt: number
  // 这里保存旧版表单内容。
  form: MemberCardLegacyFormValue
}
