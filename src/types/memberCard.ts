// 这里定义云栖同门名片的模板编号，方便后续扩展更多样式。
export type MemberCardTemplateKey = 'simple' | 'ornate'

// 这里定义允许被表单直接编辑的字段，方便区分文本项和其他控制项。
export type MemberCardEditableFieldKey = 'title' | 'secularName' | 'region' | 'hobbies' | 'origin' | 'motto'

// 这里定义名片表单字段的基础结构，方便页面按统一规则生成表单。
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
  // 这里保存字段最大长度，避免内容太长把名片撑坏。
  maxLength: number
}

// 这里定义名片模板结构，方便前端统一切换“极简素雅”和“重纹典藏”。
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

// 这里定义名片表单数据，保存新同门填写的全部基础信息。
export interface MemberCardFormValue {
  // 这里保存宗门称谓，也就是名片上的主道号。
  title: string
  // 这里保存俗世名号，真实姓名可不填。
  secularName: string
  // 这里保存所处地域，默认只写城市。
  region: string
  // 这里保存平生所好，用来写兴趣、爱好和擅长之事。
  hobbies: string
  // 这里保存入栖初心，用来写为什么愿意加入云栖派。
  origin: string
  // 这里保存个人寄语，用来写座右铭或一句心里话。
  motto: string
  // 这里保存头像图片的数据地址，方便预览和导出后长期留存。
  avatarDataUrl: string
  // 这里保存当前选中的模板编号。
  templateKey: MemberCardTemplateKey
}

// 这里定义名片档案结构，方便把新同门信息永久留在本机同门录里。
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

// 这里定义本地存储里的整份名片状态，方便统一保存和恢复。
export interface MemberCardPersistedState {
  // 这里保存正在编辑的草稿。
  draft: MemberCardFormValue | null
  // 这里保存已经归档的同门名片列表。
  archives: MemberCardArchiveRecord[]
}
