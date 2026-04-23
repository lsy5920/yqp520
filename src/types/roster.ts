// 这里定义名册状态类型，统一约束登记、审核、公开详情和审核台展示状态。
export type RosterEntryStatus = 'pending' | 'approved' | 'deferred' | 'rejected'

// 这里定义堂口键名类型，避免前后端字段写错。
export type RosterHallKey = 'yunyi' | 'qimo' | 'yunshao' | 'qiying' | 'yunce' | 'other'

// 这里定义空闲时段类型，方便多选值保持稳定。
export type RosterFreeTimeSlot = 'weekday_evening' | 'weekend_all_day' | 'holiday' | 'other'

// 这里定义效力意愿类型，方便前台单选和审核台查看。
export type RosterContributionLevel = 'steward' | 'help_when_available' | 'focus_on_learning'

// 这里定义表单分段键名，方便登记页按固定六段渲染。
export type RosterRegistrationSectionKey =
  | 'identity'
  | 'duty'
  | 'contact'
  | 'ability'
  | 'oath'
  | 'submit'

// 这里定义法号参考项类型，用于做静态字号清单和一键带入。
export interface RosterStyleNameOption {
  /** 用途：字号实际值 */
  value: string
  /** 用途：字号归属的堂口高亮范围 */
  hallKeys: RosterHallKey[]
}

// 这里定义字号意境分组类型，用于页面里按“山水意境”“风雅意境”等分组展示。
export interface RosterStyleNameCategory {
  /** 用途：分组唯一键名 */
  key: string
  /** 用途：分组标题 */
  title: string
  /** 用途：分组说明 */
  description: string
  /** 用途：本组所有字号 */
  items: RosterStyleNameOption[]
}

// 这里定义字号辈分分组类型，用于区分“云字辈”和“栖字辈”。
export interface RosterStyleNameBranch {
  /** 用途：辈分唯一键名 */
  key: 'yun' | 'qi'
  /** 用途：辈分标题 */
  title: string
  /** 用途：辈分说明 */
  lead: string
  /** 用途：该辈分下的意境分组 */
  categories: RosterStyleNameCategory[]
}

// 这里定义堂口选项类型，方便表单、名录筛选和详情统一使用。
export interface RosterHallOption {
  /** 用途：堂口键名 */
  key: RosterHallKey
  /** 用途：堂口中文名 */
  label: string
  /** 用途：堂口一句说明 */
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

// 这里定义登记表单值类型，统一约束前台提交和草稿回显。
export interface RosterRegistrationFormValue {
  /** 用途：江湖名号 */
  jianghuName: string
  /** 用途：俗家姓名 */
  secularName: string
  /** 用途：现居城市 */
  currentCity: string
  /** 用途：生年 */
  birthYear: string
  /** 用途：俗务 */
  profession: string
  /** 用途：申请法号 */
  requestedStyleName: string
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
  /** 用途：是否同意传讯号在同门间公开 */
  allowContactPublic: boolean
  /** 用途：身怀所长 */
  strengths: string
  /** 用途：所好雅事 */
  hobbies: string
  /** 用途：闲暇时辰 */
  freeTimeSlots: RosterFreeTimeSlot[]
  /** 用途：效力意愿 */
  contributionLevel: RosterContributionLevel | ''
  /** 用途：弟子签押 */
  oathSignedName: string
  /** 用途：立誓日期 */
  oathSignedDate: string
  /** 用途：是否已通读门规并同意誓约 */
  agreedToOath: boolean
}

// 这里定义前台提交给 RPC 的载荷类型，和表单值基本一致，但字段名改成数据库口径。
export interface SubmitRosterEntryPayload {
  jianghu_name: string
  secular_name: string
  current_city: string
  birth_year: string | null
  profession: string
  requested_style_name: string
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

// 这里定义公开名录条目类型，只保留真正允许公开的最小字段。
export interface PublicRosterEntry {
  /** 用途：公开详情页唯一标识 */
  publicSlug: string
  /** 用途：状态 */
  status: RosterEntryStatus
  /** 用途：回执号 */
  receiptCode: string
  /** 用途：正式牒号 */
  entryNo: string
  /** 用途：江湖名号 */
  jianghuName: string
  /** 用途：最终法号 */
  styleName: string
  /** 用途：堂口键名 */
  hallKey: RosterHallKey
  /** 用途：堂口名称 */
  hallLabel: string
  /** 用途：入派本心 */
  entryIntent: string
  /** 用途：身怀所长 */
  strengths: string
  /** 用途：所好雅事 */
  hobbies: string
  /** 用途：公开批语 */
  reviewComment: string
  /** 用途：状态显示名 */
  statusLabel: string
  /** 用途：提交日期 */
  createdAt: string
  /** 用途：审核日期 */
  reviewedAt: string
  /** 用途：入册生效日期 */
  effectiveDate: string
  /** 用途：是否允许导出名帖 */
  posterEnabled: boolean
}

// 这里定义法号可用性检查结果，方便前台给出阻止或推荐提示。
export interface StyleNameAvailabilityResult {
  /** 用途：当前法号是否可用 */
  available: boolean
  /** 用途：命中的法号 */
  styleName: string
  /** 用途：推荐字号列表 */
  suggestions: string[]
  /** 用途：后端返回的提示文案 */
  message: string
}

// 这里定义提交成功结果类型，方便登记页跳到公开详情页。
export interface SubmitRosterEntryResult {
  /** 用途：公开详情唯一标识 */
  publicSlug: string
  /** 用途：回执号 */
  receiptCode: string
  /** 用途：当前状态 */
  status: RosterEntryStatus
}

// 这里定义审核台使用的管理员资料类型。
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

// 这里定义审核台详情记录类型，需要包含全部原始字段。
export interface AdminRosterEntryRecord {
  /** 用途：主键 id */
  id: string
  /** 用途：公开详情 slug */
  publicSlug: string
  /** 用途：回执号 */
  receiptCode: string
  /** 用途：状态 */
  status: RosterEntryStatus
  /** 用途：正式牒号 */
  entryNo: number | null
  /** 用途：江湖名号 */
  jianghuName: string
  /** 用途：俗家姓名 */
  secularName: string
  /** 用途：现居城市 */
  currentCity: string
  /** 用途：生年 */
  birthYear: string
  /** 用途：俗务 */
  profession: string
  /** 用途：申请法号 */
  requestedStyleName: string
  /** 用途：最终法号 */
  effectiveStyleName: string
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
  /** 用途：是否同意同门公开 */
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
  /** 用途：批语 */
  reviewComment: string
  /** 用途：审核执事 id */
  reviewedByUserId: string
  /** 用途：审核执事名 */
  reviewedByName: string
  /** 用途：审核时间 */
  reviewedAt: string
  /** 用途：创建时间 */
  createdAt: string
  /** 用途：更新时间 */
  updatedAt: string
}

// 这里定义审核动作载荷类型，方便审核台统一提交动作。
export interface ReviewRosterEntryPayload {
  /** 用途：目标记录 id */
  entryId: string
  /** 用途：目标状态 */
  nextStatus: Extract<RosterEntryStatus, 'approved' | 'deferred' | 'rejected'>
  /** 用途：最终法号，准予入册时可改 */
  effectiveStyleName: string
  /** 用途：公开批语 */
  reviewComment: string
}

// 这里定义审核日志类型，方便后续拓展审核历史展示。
export interface RosterReviewLogRecord {
  /** 用途：日志主键 */
  id: string
  /** 用途：记录 id */
  entryId: string
  /** 用途：变更前状态 */
  previousStatus: RosterEntryStatus | null
  /** 用途：变更后状态 */
  nextStatus: RosterEntryStatus
  /** 用途：变更前法号 */
  previousStyleName: string
  /** 用途：变更后法号 */
  nextStyleName: string
  /** 用途：审核批语 */
  reviewComment: string
  /** 用途：执事 id */
  reviewedByUserId: string
  /** 用途：执事名 */
  reviewedByName: string
  /** 用途：变更时间 */
  createdAt: string
}
