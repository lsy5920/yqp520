import { rosterContributionOptions, rosterHallLabelMap, rosterStatusDescriptionMap, rosterStatusLabelMap } from '@/data/rosterContent'
import type {
  AdminRosterEntryRecord,
  PublicRosterEntry,
  ReviewRosterEntryPayload,
  RosterContributionLevel,
  RosterEntryStatus,
  RosterFreeTimeSlot,
  RosterHallKey,
  RosterRegistrationFormValue,
  SubmitRosterEntryPayload,
} from '@/types/roster'

// 这里定义公开日期格式化器，统一把数据库时间转成中文日期。
const publicDateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

// 这里定义公开日期时间格式化器，审核台会用到更完整的时间。
const publicDateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

/**
 * 清洗单行文本
 * 用途：统一去掉首尾空白并压缩连续空格，避免表单值带入脏字符
 * 入参：value 为原始文本，fallback 为兜底文本
 * 返回值：返回清洗后的文本
 */
export function normalizeRosterShortText(value: string, fallback = ''): string {
  const normalizedValue = value.replace(/\s+/g, ' ').trim()
  return normalizedValue || fallback
}

/**
 * 清洗多行文本
 * 用途：保留换行但去掉无意义的空白行，方便本心、所长与雅事稳定显示
 * 入参：value 为原始文本，fallback 为兜底文本
 * 返回值：返回清洗后的文本
 */
export function normalizeRosterLongText(value: string, fallback = ''): string {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  return lines.join('\n') || fallback
}

/**
 * 清洗登记表单
 * 用途：在提交、预览和草稿回显前统一清洗表单值
 * 入参：form 为原始表单
 * 返回值：返回清洗后的表单
 */
export function normalizeRosterFormValue(form: RosterRegistrationFormValue): RosterRegistrationFormValue {
  return {
    jianghuName: normalizeRosterShortText(form.jianghuName),
    secularName: normalizeRosterShortText(form.secularName),
    currentCity: normalizeRosterShortText(form.currentCity),
    birthYear: normalizeRosterShortText(form.birthYear),
    profession: normalizeRosterShortText(form.profession),
    requestedStyleName: normalizeRosterShortText(form.requestedStyleName),
    referrerName: normalizeRosterShortText(form.referrerName, '自行登门'),
    hallKey: form.hallKey,
    otherHallText: normalizeRosterShortText(form.otherHallText),
    entryIntent: normalizeRosterLongText(form.entryIntent),
    wechatId: normalizeRosterShortText(form.wechatId),
    socialXiaohongshuDouyin: normalizeRosterShortText(form.socialXiaohongshuDouyin),
    socialQq: normalizeRosterShortText(form.socialQq),
    socialOther: normalizeRosterShortText(form.socialOther),
    allowContactPublic: Boolean(form.allowContactPublic),
    strengths: normalizeRosterLongText(form.strengths),
    hobbies: normalizeRosterLongText(form.hobbies),
    freeTimeSlots: [...new Set(form.freeTimeSlots)],
    contributionLevel: form.contributionLevel,
    oathSignedName: normalizeRosterShortText(form.oathSignedName),
    oathSignedDate: normalizeRosterShortText(form.oathSignedDate),
    agreedToOath: Boolean(form.agreedToOath),
  }
}

/**
 * 判断法号格式是否正确
 * 用途：前端失焦校验和提交前校验共用一份规则
 * 入参：styleName 为法号
 * 返回值：符合规则返回 true，否则返回 false
 */
export function isValidRosterStyleName(styleName: string): boolean {
  return /^[云栖][\u4e00-\u9fa5]$/.test(normalizeRosterShortText(styleName))
}

/**
 * 获取法号格式错误提示
 * 用途：把法号校验失败原因用中文讲清楚
 * 入参：styleName 为法号
 * 返回值：返回提示文案，符合规则时返回空字符串
 */
export function getRosterStyleNameError(styleName: string): string {
  const normalizedStyleName = normalizeRosterShortText(styleName)

  if (!normalizedStyleName) {
    return '请先填写云栖法号'
  }

  if (!/^[云栖]/.test(normalizedStyleName)) {
    return '云栖法号必须以“云”或“栖”开头'
  }

  if (Array.from(normalizedStyleName).length !== 2) {
    return '云栖法号固定为两个汉字'
  }

  if (!isValidRosterStyleName(normalizedStyleName)) {
    return '云栖法号只能使用常见汉字，格式示例为“云川”“栖月”'
  }

  return ''
}

/**
 * 获取堂口中文名
 * 用途：公开名录、详情页和审核台统一显示堂口文案
 * 入参：hallKey 为堂口键名
 * 返回值：返回中文堂口名
 */
export function getRosterHallLabel(hallKey: RosterHallKey): string {
  return rosterHallLabelMap[hallKey] || '其他'
}

/**
 * 获取状态标签
 * 用途：公开详情、名帖和审核台统一显示中文状态
 * 入参：status 为状态键名
 * 返回值：返回中文状态名
 */
export function getRosterStatusLabel(status: RosterEntryStatus): string {
  return rosterStatusLabelMap[status]
}

/**
 * 获取状态说明
 * 用途：详情页按状态展示对应说明
 * 入参：status 为状态键名
 * 返回值：返回说明文案
 */
export function getRosterStatusDescription(status: RosterEntryStatus): string {
  return rosterStatusDescriptionMap[status]
}

/**
 * 格式化正式牒号
 * 用途：把数字编号统一渲染成“云栖-第0001号”样式
 * 入参：entryNo 为数字编号
 * 返回值：返回格式化后的牒号
 */
export function formatRosterEntryNo(entryNo: number | string | null | undefined): string {
  if (typeof entryNo === 'string' && entryNo.trim()) {
    return entryNo
  }

  if (typeof entryNo !== 'number' || !Number.isFinite(entryNo) || entryNo <= 0) {
    return ''
  }

  return `云栖-第${String(entryNo).padStart(4, '0')}号`
}

/**
 * 格式化公开日期
 * 用途：把数据库时间统一转成中文年月日，避免页面自己重复处理
 * 入参：value 为日期字符串
 * 返回值：返回格式化后的日期文本
 */
export function formatRosterDate(value: string): string {
  if (!value) {
    return ''
  }

  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return publicDateFormatter.format(parsedDate)
}

/**
 * 格式化日期时间
 * 用途：审核台查看详情时展示更完整的时间
 * 入参：value 为日期字符串
 * 返回值：返回格式化后的日期时间文本
 */
export function formatRosterDateTime(value: string): string {
  if (!value) {
    return ''
  }

  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return publicDateTimeFormatter.format(parsedDate)
}

/**
 * 把表单值转成提交载荷
 * 用途：统一把前端字段名转换成数据库 RPC 需要的字段名
 * 入参：form 为已经清洗过的表单
 * 返回值：返回提交载荷
 */
export function mapRosterFormToSubmitPayload(form: RosterRegistrationFormValue): SubmitRosterEntryPayload {
  return {
    jianghu_name: form.jianghuName,
    secular_name: form.secularName,
    current_city: form.currentCity,
    birth_year: form.birthYear || null,
    profession: form.profession,
    requested_style_name: form.requestedStyleName,
    referrer_name: form.referrerName || '自行登门',
    hall_key: form.hallKey as RosterHallKey,
    hall_other_text: form.otherHallText,
    entry_intent: form.entryIntent,
    wechat_id: form.wechatId,
    social_xiaohongshu_douyin: form.socialXiaohongshuDouyin,
    social_qq: form.socialQq,
    social_other: form.socialOther,
    allow_contact_public: form.allowContactPublic,
    strengths: form.strengths,
    hobbies: form.hobbies,
    free_time_slots: form.freeTimeSlots,
    contribution_level: form.contributionLevel as RosterContributionLevel,
    oath_signed_name: form.oathSignedName,
    oath_signed_date: form.oathSignedDate,
  }
}

/**
 * 获取效力意愿文案
 * 用途：审核台和详情区统一显示意愿中文名
 * 入参：value 为意愿键名
 * 返回值：返回中文文案
 */
export function getRosterContributionLabel(value: RosterContributionLevel | ''): string {
  return rosterContributionOptions.find((item) => item.key === value)?.label || '未填写'
}

/**
 * 获取空闲时段文案列表
 * 用途：审核台把多选时段更直观地展示出来
 * 入参：value 为时段键名数组
 * 返回值：返回中文列表
 */
export function getRosterFreeTimeLabels(value: RosterFreeTimeSlot[]): string[] {
  const optionMap: Record<RosterFreeTimeSlot, string> = {
    weekday_evening: '平日晚间',
    weekend_all_day: '周末全天',
    holiday: '法定假日',
    other: '其他时段',
  }

  return value.map((item) => optionMap[item] || item)
}

/**
 * 生成公开详情链接
 * 用途：名帖二维码、复制链接和分享都共用同一份详情地址
 * 入参：publicSlug 为详情 slug
 * 返回值：返回完整公开链接
 */
export function resolveRosterEntryUrl(publicSlug: string): string {
  if (typeof window === 'undefined') {
    return ''
  }

  const siteBaseUrl = new URL(import.meta.env.BASE_URL || '/', window.location.origin)
  return new URL(`roster/entry/${publicSlug}`, siteBaseUrl).href
}

/**
 * 生成公开名帖文字版
 * 用途：详情页复制链接或后续分享时可复用一份简洁文本
 * 入参：entry 为公开记录
 * 返回值：返回文字版内容
 */
export function buildRosterPublicText(entry: PublicRosterEntry): string {
  const numberLabel = entry.status === 'approved'
    ? `牒号：${entry.entryNo}`
    : `回执号：${entry.receiptCode}`

  const dateLabel = entry.status === 'approved'
    ? `入册日期：${entry.effectiveDate || entry.reviewedAt}`
    : `提交日期：${entry.createdAt}`

  return [
    '云栖名册 · 公开名帖',
    `江湖名号：${entry.jianghuName}`,
    `云栖法号：${entry.styleName}`,
    `归属堂口：${entry.hallLabel}`,
    `入派本心：${entry.entryIntent}`,
    `身怀所长：${entry.strengths}`,
    `所好雅事：${entry.hobbies}`,
    `当前状态：${entry.statusLabel}`,
    numberLabel,
    dateLabel,
    entry.reviewComment ? `执事批语：${entry.reviewComment}` : '',
  ].filter(Boolean).join('\n')
}

/**
 * 校验登记表单必填项
 * 用途：提交前统一检查，避免页面各处写一堆零散判断
 * 入参：form 为已经清洗过的表单
 * 返回值：返回首个错误提示，没有错误时返回空字符串
 */
export function validateRosterRegistrationForm(form: RosterRegistrationFormValue): string {
  if (!form.jianghuName) {
    return '请先填写江湖名号'
  }

  if (!form.currentCity) {
    return '请填写现居洞府，至少精确到市'
  }

  if (!form.requestedStyleName) {
    return '请填写云栖法号'
  }

  const styleNameError = getRosterStyleNameError(form.requestedStyleName)

  if (styleNameError) {
    return styleNameError
  }

  if (!form.hallKey) {
    return '请选择归属堂口'
  }

  if (form.hallKey === 'other' && !form.otherHallText) {
    return '选择“其他”堂口时，请补充堂口说明'
  }

  if (!form.entryIntent) {
    return '请填写入派本心'
  }

  if (!form.wechatId) {
    return '请填写核心传讯微信号'
  }

  if (!form.oathSignedName) {
    return '请填写弟子签押'
  }

  if (!form.oathSignedDate) {
    return '请填写立誓日期'
  }

  if (!form.agreedToOath) {
    return '请先勾选“已通读门规并同意誓约”'
  }

  return ''
}

/**
 * 映射公开记录
 * 用途：把后端脱敏数据整理成前端统一结构
 * 入参：record 为后端返回记录
 * 返回值：返回前端使用的公开记录
 */
export function mapPublicRosterEntry(record: Record<string, unknown>): PublicRosterEntry {
  const status = (record.status as RosterEntryStatus) || 'pending'
  const createdAt = String(record.created_at || '')
  const reviewedAt = String(record.reviewed_at || '')
  const effectiveDate = String(record.effective_date || '')

  return {
    publicSlug: String(record.public_slug || ''),
    status,
    receiptCode: String(record.receipt_code || ''),
    entryNo: formatRosterEntryNo(
      typeof record.entry_no_text === 'string' && record.entry_no_text
        ? record.entry_no_text
        : (record.entry_no as number | null | undefined),
    ),
    jianghuName: String(record.jianghu_name || ''),
    styleName: String(record.style_name || ''),
    hallKey: (record.hall_key as RosterHallKey) || 'other',
    hallLabel: getRosterHallLabel((record.hall_key as RosterHallKey) || 'other'),
    entryIntent: String(record.entry_intent || ''),
    strengths: String(record.strengths || ''),
    hobbies: String(record.hobbies || ''),
    reviewComment: String(record.review_comment || ''),
    statusLabel: getRosterStatusLabel(status),
    createdAt: formatRosterDate(createdAt),
    reviewedAt: formatRosterDate(reviewedAt),
    effectiveDate: formatRosterDate(effectiveDate),
    posterEnabled: status === 'pending' || status === 'approved',
  }
}

/**
 * 映射审核台详情记录
 * 用途：把数据库原始字段整理成更顺手的前端结构
 * 入参：record 为数据库返回记录
 * 返回值：返回审核台详情记录
 */
export function mapAdminRosterEntry(record: Record<string, unknown>): AdminRosterEntryRecord {
  return {
    id: String(record.id || ''),
    publicSlug: String(record.public_slug || ''),
    receiptCode: String(record.receipt_code || ''),
    status: (record.status as RosterEntryStatus) || 'pending',
    entryNo: typeof record.entry_no === 'number' ? record.entry_no : null,
    jianghuName: String(record.jianghu_name || ''),
    secularName: String(record.secular_name || ''),
    currentCity: String(record.current_city || ''),
    birthYear: String(record.birth_year || ''),
    profession: String(record.profession || ''),
    requestedStyleName: String(record.requested_style_name || ''),
    effectiveStyleName: String(record.effective_style_name || ''),
    referrerName: String(record.referrer_name || ''),
    hallKey: (record.hall_key as RosterHallKey) || 'other',
    hallOtherText: String(record.hall_other_text || ''),
    entryIntent: String(record.entry_intent || ''),
    wechatId: String(record.wechat_id || ''),
    socialXiaohongshuDouyin: String(record.social_xiaohongshu_douyin || ''),
    socialQq: String(record.social_qq || ''),
    socialOther: String(record.social_other || ''),
    allowContactPublic: Boolean(record.allow_contact_public),
    strengths: String(record.strengths || ''),
    hobbies: String(record.hobbies || ''),
    freeTimeSlots: Array.isArray(record.free_time_slots) ? (record.free_time_slots as RosterFreeTimeSlot[]) : [],
    contributionLevel: (record.contribution_level as RosterContributionLevel) || 'focus_on_learning',
    oathSignedName: String(record.oath_signed_name || ''),
    oathSignedDate: String(record.oath_signed_date || ''),
    reviewComment: String(record.review_comment || ''),
    reviewedByUserId: String(record.reviewed_by_user_id || ''),
    reviewedByName: String(record.reviewed_by_name || ''),
    reviewedAt: String(record.reviewed_at || ''),
    createdAt: String(record.created_at || ''),
    updatedAt: String(record.updated_at || ''),
  }
}

/**
 * 生成审核动作摘要
 * 用途：审核台提交前给用户或日志留下一句清晰摘要
 * 入参：payload 为审核动作
 * 返回值：返回中文摘要
 */
export function buildReviewActionSummary(payload: ReviewRosterEntryPayload): string {
  const statusLabel = getRosterStatusLabel(payload.nextStatus)
  const styleLine = payload.nextStatus === 'approved' ? `，最终法号定为 ${payload.effectiveStyleName}` : ''
  return `本次审核动作为“${statusLabel}”${styleLine}`
}
