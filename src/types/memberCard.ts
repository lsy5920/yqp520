// 这里定义江湖名帖的数据版本号，方便后续继续安全升级本机草稿结构。
export const memberCardSchemaVersion = 3 as const

// 这里定义江湖名帖允许直接编辑的文字字段键名，方便页面按统一规则渲染输入项。
export type MemberCardEditableFieldKey =
  | 'jianghuName'
  | 'formerName'
  | 'fromPlace'
  | 'identityLine'
  | 'skillTags'
  | 'entryStory'
  | 'signatureLine'

// 这里定义江湖名帖表单分组键名，方便把填写区整理成“立名、立身、留帖”三段。
export type MemberCardFieldGroupKey = 'naming' | 'identity' | 'closing'

// 这里定义单个字段的展示配置，方便页面统一渲染标题、提示和输入限制。
export interface MemberCardFieldConfig {
  // 这里保存字段键名，和表单数据一一对应。
  key: MemberCardEditableFieldKey
  // 这里保存字段标题，直接展示给用户看。
  label: string
  // 这里保存输入框占位提示，减少填写时的犹豫。
  placeholder: string
  // 这里保存字段说明，告诉用户这一项适合写什么。
  help: string
  // 这里保存输入框行数，长文本会改成多行输入。
  rows?: number
  // 这里保存最大长度，避免内容过长把版式撑坏。
  maxLength: number
}

// 这里定义字段分组配置，方便沉浸式工作台按固定顺序渲染三段内容。
export interface MemberCardFieldGroupConfig {
  // 这里保存分组键名，方便样式和逻辑识别。
  key: MemberCardFieldGroupKey
  // 这里保存分组眉题，方便快速区分当前填写阶段。
  label: string
  // 这里保存分组主标题，给用户更明确的填写引导。
  title: string
  // 这里保存分组说明，帮助用户理解这一段该写什么。
  lead: string
  // 这里保存当前分组要渲染的字段顺序。
  fieldKeys: MemberCardEditableFieldKey[]
}

// 这里定义江湖名帖表单结构，保存一张名帖当前需要的全部资料。
export interface MemberCardFormValue {
  // 这里保存江湖名号，也就是成品帖里最醒目的大标题。
  jianghuName: string
  // 这里保存旧名或本名，用来补一条人物来历。
  formerName: string
  // 这里保存来处，通常只写城市、州府或来路。
  fromPlace: string
  // 这里保存身份一句，用短句概括自己的门中气质。
  identityLine: string
  // 这里保存江湖短签，用来拆成几枚标签。
  skillTags: string
  // 这里保存入门缘起，用来写为什么想在云栖留名。
  entryStory: string
  // 这里保存留名一句，用来做成品帖底部落款短句。
  signatureLine: string
  // 这里保存人像图片的数据地址，方便预览和导出。
  portraitDataUrl: string
}

// 这里定义本机持久化状态，方便统一保存草稿、帖号和立帖时间。
export interface MemberCardPersistedState {
  // 这里保存数据版本号，方便后续继续迁移。
  version: typeof memberCardSchemaVersion
  // 这里保存当前正在编辑的草稿。
  draft: MemberCardFormValue | null
  // 这里保存已经立成过多少帖，方便顺延编号。
  issuedCount: number
  // 这里保存当前草稿已经拿到的帖号，没有立帖时为空。
  currentIssuedNumber: number | null
  // 这里保存当前草稿最近一次立帖时间，没有立帖时为空。
  lastIssuedAt: number | null
}

// 这里定义旧版第二阶段名帖表单结构，方便把已有草稿映射到新版江湖名帖。
export interface MemberCardLegacyCurrentFormValue {
  // 这里保存旧版道号字段。
  daoName?: string
  // 这里保存旧版俗世名号字段。
  worldName?: string
  // 这里保存旧版所居地域字段。
  residence?: string
  // 这里保存旧版门中短签字段。
  shortTags?: string
  // 这里保存旧版入栖初心字段。
  origin?: string
  // 这里保存旧版心之所语字段。
  motto?: string
  // 这里保存旧版头像字段。
  avatarDataUrl?: string
  // 这里保存旧版模板字段，迁移时不再沿用。
  templateKey?: string
}

// 这里定义旧版第一阶段名帖表单结构，方便继续兼容更早的草稿数据。
export interface MemberCardLegacyFormValue {
  // 这里保存旧版标题字段。
  title?: string
  // 这里保存旧版真实姓名字段。
  secularName?: string
  // 这里保存旧版地域字段。
  region?: string
  // 这里保存旧版所好字段。
  hobbies?: string
  // 这里保存旧版缘起字段。
  origin?: string
  // 这里保存旧版寄语字段。
  motto?: string
  // 这里保存旧版头像字段。
  avatarDataUrl?: string
  // 这里保存旧版模板字段。
  templateKey?: string
}

// 这里定义旧版归档记录结构，方便从旧同门录里统计历史帖号。
export interface MemberCardLegacyArchiveRecord {
  // 这里保存旧版档案编号。
  id?: string
  // 这里保存旧版顺延编号。
  number?: number
  // 这里保存旧版生成时间。
  createdAt?: number
  // 这里保存旧版表单内容。
  form?: MemberCardLegacyCurrentFormValue | MemberCardLegacyFormValue | unknown
}

// 这里定义旧版第二阶段整份状态结构，方便从 v2 状态迁移到 v3。
export interface MemberCardLegacyPersistedStateV2 {
  // 这里保存旧版状态版本号。
  version?: number
  // 这里保存旧版草稿。
  draft?: MemberCardLegacyCurrentFormValue | MemberCardLegacyFormValue | unknown
  // 这里保存旧版归档列表。
  archives?: MemberCardLegacyArchiveRecord[] | unknown
}
