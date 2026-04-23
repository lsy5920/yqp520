// 这里定义名册状态类型，统一约束登记、公开详情、公开名录和后台审核台的状态值。
export type RosterEntryStatus = 'pending' | 'approved' | 'deferred' | 'rejected'

// 这里定义堂口键名类型，避免前后端字段写错。
export type RosterHallKey = 'yunyi' | 'qimo' | 'yunshao' | 'qiying' | 'yunce' | 'other'

// 这里定义性别键名类型，方便前后端和数据库统一收口。
export type RosterGender = 'male' | 'female' | 'other'

// 这里定义门中分工键名类型，职位不分高低，只区分自愿承担的服务分工。
export type RosterPositionKey = 'tongmen' | 'zongzhu' | 'yunsi_wen' | 'yunsi_shi' | 'yunsi_cai'

// 这里定义空闲时段类型，方便多选值保持稳定。
export type RosterFreeTimeSlot = 'weekday_evening' | 'weekend_all_day' | 'holiday' | 'other'

// 这里定义效力意愿类型，方便前台单选和后台查看统一取值。
export type RosterContributionLevel = 'steward' | 'help_when_available' | 'focus_on_learning'

// 这里定义登记页六段结构键名，方便页面按固定顺序渲染。
export type RosterRegistrationSectionKey =
  | 'identity'
  | 'duty'
  | 'contact'
  | 'ability'
  | 'oath'
  | 'submit'

// 这里定义堂口选项类型，供表单、筛选器和详情页统一复用。
export interface RosterHallOption {
  /** 用途：堂口键名 */
  key: RosterHallKey
  /** 用途：堂口中文名 */
  label: string
  /** 用途：堂口简短说明 */
  description: string
}

// 这里定义性别选项类型，供登记页和后台编辑页统一复用。
export interface RosterGenderOption {
  /** 用途：性别键名 */
  key: RosterGender
  /** 用途：性别文案 */
  label: string
}

// 这里定义门中分工选项类型，供后台编辑页统一复用。
export interface RosterPositionOption {
  /** 用途：职位键名 */
  key: RosterPositionKey
  /** 用途：职位文案 */
  label: string
  /** 用途：职位说明 */
  description: string
}

// 这里定义空闲时段选项类型，方便多选配置统一管理。
export interface RosterFreeTimeOption {
  /** 用途：时段键名 */
  key: RosterFreeTimeSlot
  /** 用途：时段文案 */
  label: string
}

// 这里定义效力意愿选项类型，方便单选配置统一管理。
export interface RosterContributionOption {
  /** 用途：意愿键名 */
  key: RosterContributionLevel
  /** 用途：意愿标题 */
  label: string
  /** 用途：意愿说明 */
  description: string
}

// 这里定义登记页每一段的配置类型，方便大表单统一渲染。
export interface RosterRegistrationSection {
  /** 用途：段落键名 */
  key: RosterRegistrationSectionKey
  /** 用途：段落眉题 */
  eyebrow: string
  /** 用途：段落标题 */
  title: string
  /** 用途：段落说明 */
  description: string
}

// 这里定义前台登记表单类型，统一约束提交、草稿回显和后台编辑口径。
export interface RosterRegistrationFormValue {
  /** 用途：道号 */
  daohao: string
  /** 用途：俗家姓名 */
  secularName: string
  /** 用途：性别 */
  gender: RosterGender | ''
  /** 用途：现居城市 */
  currentCity: string
  /** 用途：生年 */
  birthYear: string
  /** 用途：俗务 */
  profession: string
  /** 用途：引荐人 */
  referrerName: string
  /** 用途：归属堂口 */
  hallKey: RosterHallKey | ''
  /** 用途：其他堂口说明 */
  otherHallText: string
  /** 用途：入派本心 */
  entryIntent: string
  /** 用途：微信号 */
  wechatId: string
  /** 用途：小红书或抖音 */
  socialXiaohongshuDouyin: string
  /** 用途：QQ */
  socialQq: string
  /** 用途：其他社交号 */
  socialOther: string
  /** 用途：是否同意在同门间公开传讯号 */
  allowContactPublic: boolean
  /** 用途：身怀所长 */
  strengths: string
  /** 用途：所好雅事 */
  hobbies: string
  /** 用途：闲暇时段 */
  freeTimeSlots: RosterFreeTimeSlot[]
  /** 用途：效力意愿 */
  contributionLevel: RosterContributionLevel | ''
  /** 用途：弟子签押 */
  oathSignedName: string
  /** 用途：立誓日期 */
  oathSignedDate: string
  /** 用途：是否同意誓约 */
  agreedToOath: boolean
}

// 这里定义前台提交给 Supabase RPC 的载荷类型，字段名改成数据库口径。
export interface SubmitRosterEntryPayload {
  daohao: string
  secular_name: string
  gender: RosterGender
  current_city: string
  birth_year: string | null
  profession: string
  referrer_name: string
  hall_key: RosterHallKey
  hall_other_text: string
  entry_intent: string
  wechat_id: string
  social_xiaohongshu_douyin: string
  social_qq: string
  social_other: string
  allow_contact_public: boolean
  strengths: string
  hobbies: string
  free_time_slots: RosterFreeTimeSlot[]
  contribution_level: RosterContributionLevel
  oath_signed_name: string
  oath_signed_date: string
}

// 这里定义公开名录与公开详情使用的脱敏记录类型。
export interface PublicRosterEntry {
  /** 用途：公开详情页唯一标识 */
  publicSlug: string
  /** 用途：当前状态 */
  status: RosterEntryStatus
  /** 用途：回执号 */
  receiptCode: string
  /** 用途：格式化后的正式牒号 */
  entryNo: string
  /** 用途：正式牒号原始数字 */
  entryNoValue: number | null
  /** 用途：公开展示道号 */
  daohao: string
  /** 用途：公开展示性别 */
  gender: RosterGender | ''
  /** 用途：公开展示性别文案 */
  genderLabel: string
  /** 用途：公开展示职位键名 */
  positionKey: RosterPositionKey | ''
  /** 用途：公开展示职位文案 */
  positionLabel: string
  /** 用途：堂口键名 */
  hallKey: RosterHallKey
  /** 用途：堂口中文名 */
  hallLabel: string
  /** 用途：入派本心 */
  entryIntent: string
  /** 用途：身怀所长 */
  strengths: string
  /** 用途：所好雅事 */
  hobbies: string
  /** 用途：公开批语 */
  reviewComment: string
  /** 用途：状态中文名 */
  statusLabel: string
  /** 用途：提交日期 */
  createdAt: string
  /** 用途：审核日期 */
  reviewedAt: string
  /** 用途：生效日期 */
  effectiveDate: string
  /** 用途：是否允许导出名帖 */
  posterEnabled: boolean
}

// 这里定义道号可用性检查结果，方便前台给出明确提示。
export interface DaohaoAvailabilityResult {
  /** 用途：道号是否可用 */
  available: boolean
  /** 用途：后端回写的清洗后道号 */
  daohao: string
  /** 用途：中文提示文案 */
  message: string
}

// 这里定义提交成功结果，方便登记页跳到公开详情页。
export interface SubmitRosterEntryResult {
  /** 用途：公开详情页唯一标识 */
  publicSlug: string
  /** 用途：回执号 */
  receiptCode: string
  /** 用途：当前状态 */
  status: RosterEntryStatus
}

// 这里定义后台执事资料类型。
export interface RosterAdminProfile {
  /** 用途：用户 id */
  userId: string
  /** 用途：邮箱 */
  email: string
  /** 用途：显示名 */
  displayName: string
  /** 用途：角色 */
  role: string
  /** 用途：是否启用 */
  isActive: boolean
}

// 这里定义后台详情记录类型，包含后台可见的全部原始字段。
export interface AdminRosterEntryRecord {
  /** 用途：记录主键 */
  id: string
  /** 用途：公开详情 slug */
  publicSlug: string
  /** 用途：回执号 */
  receiptCode: string
  /** 用途：状态 */
  status: RosterEntryStatus
  /** 用途：正式牒号原始数字 */
  entryNo: number | null
  /** 用途：道号 */
  daohao: string
  /** 用途：俗家姓名 */
  secularName: string
  /** 用途：性别 */
  gender: RosterGender | ''
  /** 用途：职位键名 */
  positionKey: RosterPositionKey | ''
  /** 用途：现居城市 */
  currentCity: string
  /** 用途：生年 */
  birthYear: string
  /** 用途：俗务 */
  profession: string
  /** 用途：引荐人 */
  referrerName: string
  /** 用途：堂口键名 */
  hallKey: RosterHallKey
  /** 用途：其他堂口说明 */
  hallOtherText: string
  /** 用途：入派本心 */
  entryIntent: string
  /** 用途：微信号 */
  wechatId: string
  /** 用途：小红书或抖音 */
  socialXiaohongshuDouyin: string
  /** 用途：QQ */
  socialQq: string
  /** 用途：其他社交号 */
  socialOther: string
  /** 用途：是否同意同门公开传讯 */
  allowContactPublic: boolean
  /** 用途：身怀所长 */
  strengths: string
  /** 用途：所好雅事 */
  hobbies: string
  /** 用途：闲暇时段 */
  freeTimeSlots: RosterFreeTimeSlot[]
  /** 用途：效力意愿 */
  contributionLevel: RosterContributionLevel
  /** 用途：弟子签押 */
  oathSignedName: string
  /** 用途：立誓日期 */
  oathSignedDate: string
  /** 用途：公开批语 */
  reviewComment: string
  /** 用途：最近一次操作执事 id */
  reviewedByUserId: string
  /** 用途：最近一次操作执事名 */
  reviewedByName: string
  /** 用途：最近一次操作时间 */
  reviewedAt: string
  /** 用途：创建时间 */
  createdAt: string
  /** 用途：更新时间 */
  updatedAt: string
}

// 这里定义后台保存档案时的载荷类型，统一负责编辑全部字段与状态。
export interface AdminRosterEntrySavePayload {
  /** 用途：目标记录 id */
  entryId: string
  /** 用途：目标状态 */
  status: RosterEntryStatus
  /** 用途：正式牒号数字，非准予状态传 null */
  entryNo: number | null
  /** 用途：道号 */
  daohao: string
  /** 用途：俗家姓名 */
  secularName: string
  /** 用途：性别 */
  gender: RosterGender | ''
  /** 用途：职位键名 */
  positionKey: RosterPositionKey | ''
  /** 用途：现居城市 */
  currentCity: string
  /** 用途：生年 */
  birthYear: string
  /** 用途：俗务 */
  profession: string
  /** 用途：引荐人 */
  referrerName: string
  /** 用途：堂口键名 */
  hallKey: RosterHallKey
  /** 用途：其他堂口说明 */
  hallOtherText: string
  /** 用途：入派本心 */
  entryIntent: string
  /** 用途：微信号 */
  wechatId: string
  /** 用途：小红书或抖音 */
  socialXiaohongshuDouyin: string
  /** 用途：QQ */
  socialQq: string
  /** 用途：其他社交号 */
  socialOther: string
  /** 用途：是否同意同门公开传讯 */
  allowContactPublic: boolean
  /** 用途：身怀所长 */
  strengths: string
  /** 用途：所好雅事 */
  hobbies: string
  /** 用途：闲暇时段 */
  freeTimeSlots: RosterFreeTimeSlot[]
  /** 用途：效力意愿 */
  contributionLevel: RosterContributionLevel
  /** 用途：弟子签押 */
  oathSignedName: string
  /** 用途：立誓日期 */
  oathSignedDate: string
  /** 用途：公开批语 */
  reviewComment: string
}

// 这里定义审核日志类型，方便后台抽屉展示档案流转痕迹。
export interface RosterReviewLogRecord {
  /** 用途：日志主键 */
  id: string
  /** 用途：记录 id */
  entryId: string
  /** 用途：动作类型 */
  actionType: string
  /** 用途：变更前状态 */
  previousStatus: RosterEntryStatus | null
  /** 用途：变更后状态 */
  nextStatus: RosterEntryStatus
  /** 用途：变更前道号 */
  previousDaohao: string
  /** 用途：变更后道号 */
  nextDaohao: string
  /** 用途：变更前文牒号 */
  previousEntryNo: number | null
  /** 用途：变更后文牒号 */
  nextEntryNo: number | null
  /** 用途：公开批语 */
  reviewComment: string
  /** 用途：执事 id */
  reviewedByUserId: string
  /** 用途：执事名 */
  reviewedByName: string
  /** 用途：创建时间 */
  createdAt: string
}
