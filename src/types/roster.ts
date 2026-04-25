// 这里定义名帖审核状态，统一约束登记、公开展示和后台审核。
export type RosterCardStatus = 'pending' | 'approved' | 'deferred' | 'rejected'

// 这里定义公开身份类型，方便卡册筛选和后台编辑保持一致。
export type RosterIdentityKey = 'swordsman' | 'healer' | 'strategist' | 'artisan' | 'wanderer' | 'guardian'

// 这里定义羁绊状态类型，用大白话说明成员当前同行意愿。
export type RosterBondKey = 'seeking' | 'companion' | 'mentor' | 'quiet'

// 这里定义展示封面类型，用来给手机卡片提供不同视觉气质。
export type RosterCoverKey = 'mist' | 'sword' | 'bamboo' | 'moon' | 'gold' | 'jade'

// 这里定义分步登记步骤键名，确保页面步骤顺序稳定。
export type RosterRegistrationStepKey = 'basic' | 'spirit' | 'bond' | 'display' | 'pledge'

// 这里定义身份选项结构，供登记页、筛选器和后台统一复用。
export interface RosterIdentityOption {
  /** 用途：身份键名；入参含义：无；返回值含义：无 */
  key: RosterIdentityKey
  /** 用途：身份中文名；入参含义：无；返回值含义：无 */
  label: string
  /** 用途：身份短说明；入参含义：无；返回值含义：无 */
  description: string
  /** 用途：身份图标文字；入参含义：无；返回值含义：无 */
  icon: string
}

// 这里定义羁绊选项结构，供登记和详情展示统一使用。
export interface RosterBondOption {
  /** 用途：羁绊键名；入参含义：无；返回值含义：无 */
  key: RosterBondKey
  /** 用途：羁绊中文名；入参含义：无；返回值含义：无 */
  label: string
  /** 用途：羁绊说明；入参含义：无；返回值含义：无 */
  description: string
}

// 这里定义封面选项结构，供登记页和后台选择卡片皮肤。
export interface RosterCoverOption {
  /** 用途：封面键名；入参含义：无；返回值含义：无 */
  key: RosterCoverKey
  /** 用途：封面中文名；入参含义：无；返回值含义：无 */
  label: string
  /** 用途：封面渐变色；入参含义：无；返回值含义：无 */
  gradient: string
}

// 这里定义登记步骤文案结构，方便手机端分步卷轴统一渲染。
export interface RosterRegistrationStep {
  /** 用途：步骤键名；入参含义：无；返回值含义：无 */
  key: RosterRegistrationStepKey
  /** 用途：步骤序号；入参含义：无；返回值含义：无 */
  indexText: string
  /** 用途：步骤标题；入参含义：无；返回值含义：无 */
  title: string
  /** 用途：步骤说明；入参含义：无；返回值含义：无 */
  description: string
}

// 这里定义手机名帖登记表单，所有页面只认这套新结构。
export interface RosterCardFormValue {
  /** 用途：江湖名；入参含义：无；返回值含义：无 */
  jianghuName: string
  /** 用途：称号；入参含义：无；返回值含义：无 */
  titleName: string
  /** 用途：门派身份；入参含义：无；返回值含义：无 */
  identityKey: RosterIdentityKey | ''
  /** 用途：所在地域；入参含义：无；返回值含义：无 */
  regionText: string
  /** 用途：江湖宣言；入参含义：无；返回值含义：无 */
  motto: string
  /** 用途：个人故事；入参含义：无；返回值含义：无 */
  storyText: string
  /** 用途：专长标签；入参含义：无；返回值含义：无 */
  skillTags: string[]
  /** 用途：羁绊状态；入参含义：无；返回值含义：无 */
  bondKey: RosterBondKey | ''
  /** 用途：同行期待；入参含义：无；返回值含义：无 */
  bondText: string
  /** 用途：封面皮肤；入参含义：无；返回值含义：无 */
  coverKey: RosterCoverKey
  /** 用途：是否公开地域；入参含义：无；返回值含义：无 */
  isRegionPublic: boolean
  /** 用途：是否公开故事；入参含义：无；返回值含义：无 */
  isStoryPublic: boolean
  /** 用途：联系方式；入参含义：无；返回值含义：无 */
  contactText: string
  /** 用途：是否同意盟约；入参含义：无；返回值含义：无 */
  agreedToPledge: boolean
}

// 这里定义提交登记载荷，方便服务层清楚知道要写入什么。
export interface SubmitRosterCardPayload {
  /** 用途：已清洗的登记表单；入参含义：无；返回值含义：无 */
  form: RosterCardFormValue
}

// 这里定义提交成功结果，供页面展示回执。
export interface SubmitRosterCardResult {
  /** 用途：名帖编号；入参含义：无；返回值含义：无 */
  id: string
  /** 用途：公开链接标识；入参含义：无；返回值含义：无 */
  publicSlug: string
  /** 用途：审核状态；入参含义：无；返回值含义：无 */
  status: RosterCardStatus
}

// 这里定义公开名帖结构，公开页面只展示这些安全字段。
export interface PublicRosterCard {
  /** 用途：名帖编号；入参含义：无；返回值含义：无 */
  id: string
  /** 用途：公开链接标识；入参含义：无；返回值含义：无 */
  publicSlug: string
  /** 用途：江湖名；入参含义：无；返回值含义：无 */
  jianghuName: string
  /** 用途：称号；入参含义：无；返回值含义：无 */
  titleName: string
  /** 用途：门派身份；入参含义：无；返回值含义：无 */
  identityKey: RosterIdentityKey
  /** 用途：身份中文名；入参含义：无；返回值含义：无 */
  identityLabel: string
  /** 用途：所在地域；入参含义：无；返回值含义：无 */
  regionText: string
  /** 用途：江湖宣言；入参含义：无；返回值含义：无 */
  motto: string
  /** 用途：个人故事；入参含义：无；返回值含义：无 */
  storyText: string
  /** 用途：专长标签；入参含义：无；返回值含义：无 */
  skillTags: string[]
  /** 用途：羁绊状态；入参含义：无；返回值含义：无 */
  bondKey: RosterBondKey
  /** 用途：羁绊中文名；入参含义：无；返回值含义：无 */
  bondLabel: string
  /** 用途：同行期待；入参含义：无；返回值含义：无 */
  bondText: string
  /** 用途：封面皮肤；入参含义：无；返回值含义：无 */
  coverKey: RosterCoverKey
  /** 用途：互动热度；入参含义：无；返回值含义：无 */
  heatValue: number
  /** 用途：推荐等级；入参含义：无；返回值含义：无 */
  featuredLevel: number
  /** 用途：入册时间；入参含义：无；返回值含义：无 */
  approvedAt: string
  /** 用途：创建时间；入参含义：无；返回值含义：无 */
  createdAt: string
}

// 这里定义后台管理员资料，复用原登录体系但文案换成名帖审核。
export interface RosterAdminProfile {
  /** 用途：管理员编号；入参含义：无；返回值含义：无 */
  id: string
  /** 用途：用户编号；入参含义：无；返回值含义：无 */
  userId: string
  /** 用途：邮箱；入参含义：无；返回值含义：无 */
  email: string
  /** 用途：显示名；入参含义：无；返回值含义：无 */
  displayName: string
  /** 用途：角色；入参含义：无；返回值含义：无 */
  role: string
  /** 用途：是否启用；入参含义：无；返回值含义：无 */
  isActive: boolean
}

// 这里定义后台名帖记录，比公开记录多联系方式和审核备注。
export interface AdminRosterCardRecord extends PublicRosterCard {
  /** 用途：审核状态；入参含义：无；返回值含义：无 */
  status: RosterCardStatus
  /** 用途：是否公开展示；入参含义：无；返回值含义：无 */
  isPublic: boolean
  /** 用途：是否公开地域；入参含义：无；返回值含义：无 */
  isRegionPublic: boolean
  /** 用途：是否公开故事；入参含义：无；返回值含义：无 */
  isStoryPublic: boolean
  /** 用途：联系方式；入参含义：无；返回值含义：无 */
  contactText: string
  /** 用途：审核备注；入参含义：无；返回值含义：无 */
  reviewNote: string
  /** 用途：内部备注；入参含义：无；返回值含义：无 */
  internalNote: string
  /** 用途：更新时间；入参含义：无；返回值含义：无 */
  updatedAt: string
}

// 这里定义后台保存载荷，审核台每次保存只传这套字段。
export interface AdminRosterCardSavePayload {
  /** 用途：名帖编号；入参含义：无；返回值含义：无 */
  id: string
  /** 用途：江湖名；入参含义：无；返回值含义：无 */
  jianghuName: string
  /** 用途：称号；入参含义：无；返回值含义：无 */
  titleName: string
  /** 用途：门派身份；入参含义：无；返回值含义：无 */
  identityKey: RosterIdentityKey
  /** 用途：所在地域；入参含义：无；返回值含义：无 */
  regionText: string
  /** 用途：江湖宣言；入参含义：无；返回值含义：无 */
  motto: string
  /** 用途：个人故事；入参含义：无；返回值含义：无 */
  storyText: string
  /** 用途：专长标签；入参含义：无；返回值含义：无 */
  skillTags: string[]
  /** 用途：羁绊状态；入参含义：无；返回值含义：无 */
  bondKey: RosterBondKey
  /** 用途：同行期待；入参含义：无；返回值含义：无 */
  bondText: string
  /** 用途：封面皮肤；入参含义：无；返回值含义：无 */
  coverKey: RosterCoverKey
  /** 用途：审核状态；入参含义：无；返回值含义：无 */
  status: RosterCardStatus
  /** 用途：是否公开展示；入参含义：无；返回值含义：无 */
  isPublic: boolean
  /** 用途：是否公开地域；入参含义：无；返回值含义：无 */
  isRegionPublic: boolean
  /** 用途：是否公开故事；入参含义：无；返回值含义：无 */
  isStoryPublic: boolean
  /** 用途：联系方式；入参含义：无；返回值含义：无 */
  contactText: string
  /** 用途：互动热度；入参含义：无；返回值含义：无 */
  heatValue: number
  /** 用途：推荐等级；入参含义：无；返回值含义：无 */
  featuredLevel: number
  /** 用途：审核备注；入参含义：无；返回值含义：无 */
  reviewNote: string
  /** 用途：内部备注；入参含义：无；返回值含义：无 */
  internalNote: string
}

// 这里定义审核日志结构，方便后台追踪每次处理。
export interface RosterReviewLogRecord {
  /** 用途：日志编号；入参含义：无；返回值含义：无 */
  id: string
  /** 用途：名帖编号；入参含义：无；返回值含义：无 */
  cardId: string
  /** 用途：动作类型；入参含义：无；返回值含义：无 */
  actionType: string
  /** 用途：旧状态；入参含义：无；返回值含义：无 */
  previousStatus: RosterCardStatus | null
  /** 用途：新状态；入参含义：无；返回值含义：无 */
  nextStatus: RosterCardStatus
  /** 用途：审核备注；入参含义：无；返回值含义：无 */
  reviewNote: string
  /** 用途：审核人；入参含义：无；返回值含义：无 */
  reviewedByName: string
  /** 用途：创建时间；入参含义：无；返回值含义：无 */
  createdAt: string
}

// 这里定义名帖可用性检查结果，登记页用它提示重名。
export interface RosterNameAvailabilityResult {
  /** 用途：是否可用；入参含义：无；返回值含义：无 */
  available: boolean
  /** 用途：提示文案；入参含义：无；返回值含义：无 */
  message: string
}

// 这里兼容旧海报组件引用名，避免非名册模块误报类型错误。
export type PublicRosterEntry = PublicRosterCard
