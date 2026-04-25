// 这里定义登记招募海报模板类型，保留组件导出能力但改成新卡册文案。
export interface RosterRegistrationPosterTemplate {
  /** 用途：海报眉题；入参含义：无；返回值含义：无 */
  eyebrow: string
  /** 用途：海报标题；入参含义：无；返回值含义：无 */
  title: string
  /** 用途：海报副标题；入参含义：无；返回值含义：无 */
  subtitle: string
  /** 用途：海报说明；入参含义：无；返回值含义：无 */
  lead: string
  /** 用途：流程标题；入参含义：无；返回值含义：无 */
  processTitle: string
  /** 用途：流程列表；入参含义：无；返回值含义：无 */
  processList: string[]
  /** 用途：二维码标题；入参含义：无；返回值含义：无 */
  qrLabel: string
  /** 用途：二维码说明；入参含义：无；返回值含义：无 */
  qrCaption: string
  /** 用途：收束标题；入参含义：无；返回值含义：无 */
  closingTitle: string
  /** 用途：收束正文；入参含义：无；返回值含义：无 */
  closingCopy: string
  /** 用途：印记文字；入参含义：无；返回值含义：无 */
  sealText: string
  /** 用途：底部落款；入参含义：无；返回值含义：无 */
  signature: string
  /** 用途：分享标题；入参含义：无；返回值含义：无 */
  shareTitle: string
  /** 用途：分享文案；入参含义：无；返回值含义：无 */
  shareText: string
  /** 用途：导出宽度；入参含义：无；返回值含义：无 */
  exportWidth: number
  /** 用途：导出高度；入参含义：无；返回值含义：无 */
  exportHeight: number
}

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
  id: string
  publicSlug: string
  jianghuName: string
  titleName: string
  identityKey: RosterIdentityKey
  identityLabel: string
  regionText: string
  motto: string
  storyText: string
  skillTags: string[]
  bondKey: RosterBondKey
  bondLabel: string
  bondText: string
  coverKey: RosterCoverKey
  heatValue: number
  featuredLevel: number
  approvedAt: string
  createdAt: string
}

// 这里定义后台管理员资料，复用原登录体系但文案换成名帖审核。
export interface RosterAdminProfile {
  id: string
  userId: string
  email: string
  displayName: string
  role: string
  isActive: boolean
}

// 这里定义后台名帖记录，比公开记录多联系方式和审核备注。
export interface AdminRosterCardRecord extends PublicRosterCard {
  status: RosterCardStatus
  isPublic: boolean
  isRegionPublic: boolean
  isStoryPublic: boolean
  contactText: string
  reviewNote: string
  internalNote: string
  updatedAt: string
}

// 这里定义后台保存载荷，审核台每次保存只传这套字段。
export interface AdminRosterCardSavePayload {
  id: string
  jianghuName: string
  titleName: string
  identityKey: RosterIdentityKey
  regionText: string
  motto: string
  storyText: string
  skillTags: string[]
  bondKey: RosterBondKey
  bondText: string
  coverKey: RosterCoverKey
  status: RosterCardStatus
  isPublic: boolean
  isRegionPublic: boolean
  isStoryPublic: boolean
  contactText: string
  heatValue: number
  featuredLevel: number
  reviewNote: string
  internalNote: string
}

// 这里定义审核日志结构，方便后台追踪每次处理。
export interface RosterReviewLogRecord {
  id: string
  cardId: string
  actionType: string
  previousStatus: RosterCardStatus | null
  nextStatus: RosterCardStatus
  reviewNote: string
  reviewedByName: string
  createdAt: string
}

// 这里定义名帖可用性检查结果，登记页用它提示重名。
export interface RosterNameAvailabilityResult {
  available: boolean
  message: string
}

// 这里提供登记招募海报默认模板，旧组件继续可用但展示新名册方向。
export const defaultRosterRegistrationPosterTemplate: RosterRegistrationPosterTemplate = {
  eyebrow: '云栖名册',
  title: '递上你的江湖名帖',
  subtitle: '手机端江湖卡册全新开启',
  lead: '五步写下名号、气质、羁绊与封面，审核后即可入册公开。',
  processTitle: '入册流程',
  processList: ['写名帖', '选身份', '定封面', '按印提交', '执事审核'],
  qrLabel: '扫码登记',
  qrCaption: '长按识别二维码，进入云栖名册登记页。',
  closingTitle: '风起云栖，来日方长',
  closingCopy: '愿每一张名帖，都成为同门相逢的灯。',
  sealText: '云栖',
  signature: '云栖名册执事处',
  shareTitle: '云栖名册登记开启',
  shareText: '来写一张属于你的江湖名帖。',
  exportWidth: 420,
  exportHeight: 680,
}

// 这里提供封面渐变查询给需要纯类型文件导入的旧组件兜底。
export function resolveRosterCoverGradient(coverKey: RosterCoverKey): string {
  const gradientMap: Record<RosterCoverKey, string> = {
    mist: 'linear-gradient(145deg, #111827, #28445f 52%, #d9b56d)',
    sword: 'linear-gradient(145deg, #0b1020, #4a1f2b 55%, #d6a84f)',
    bamboo: 'linear-gradient(145deg, #0d1f1a, #1f6b5f 58%, #d7c58b)',
    moon: 'linear-gradient(145deg, #101827, #315f85 58%, #f1e6c9)',
    gold: 'linear-gradient(145deg, #1d1308, #805b25 55%, #f6d78b)',
    jade: 'linear-gradient(145deg, #10201f, #7aa89b 55%, #f8edd2)',
  }
  return gradientMap[coverKey]
}

