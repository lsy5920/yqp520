import {
  rosterContributionOptions,
  rosterGenderOptions,
  rosterHallLabelMap,
  rosterPositionOptions,
  rosterStatusDescriptionMap,
  rosterStatusLabelMap,
} from '@/data/rosterContent'
import type {
  AdminRosterEntryRecord,
  AdminRosterEntrySavePayload,
  PublicRosterEntry,
  RosterContributionLevel,
  RosterEntryStatus,
  RosterFreeTimeSlot,
  RosterGender,
  RosterHallKey,
  RosterPositionKey,
  RosterRegistrationFormValue,
  RosterReviewLogRecord,
  SubmitRosterEntryPayload,
} from '@/types/roster'

// 这里定义公开日期格式化器，统一把数据库时间转成中文日期。
const publicDateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

// 这里定义公开日期时间格式化器，后台会用到更完整的时间。
const publicDateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

/**
 * 从记录里提取兼容后的道号
 * 用途：兼容旧库里还没迁移到 daohao 字段的情况，优先回落到旧的几套名称字段
 * 入参：record 为数据库或 RPC 返回记录
 * 返回值：返回统一后的道号文本
 */
function resolveRosterDaohaoFromRecord(record: Record<string, unknown>): string {
  const candidateValue = [
    record.daohao,
    record.effective_style_name,
    record.requested_style_name,
    record.jianghu_name,
  ].find((item) => typeof item === 'string' && item.trim())

  return normalizeRosterDaohao(typeof candidateValue === 'string' ? candidateValue : '')
}

/**
 * 从记录里提取兼容后的门中分工
 * 用途：新库优先读取 position_key，旧库没有该字段时退回为默认“同门”
 * 入参：record 为数据库或 RPC 返回记录
 * 返回值：返回统一后的职位键名
 */
function resolveRosterPositionKeyFromRecord(record: Record<string, unknown>): RosterPositionKey {
  const rawPositionKey = String(record.position_key || '').trim() as RosterPositionKey

  if (['tongmen', 'zongzhu', 'yunsi_wen', 'yunsi_shi', 'yunsi_cai'].includes(rawPositionKey)) {
    return rawPositionKey
  }

  return 'tongmen'
}

/**
 * 清洗单行文本
 * 用途：统一去掉首尾空格，并把连续空白压成一个空格
 * 入参：value 为原始文本，fallback 为兜底文本
 * 返回值：返回清洗后的文本
 */
export function normalizeRosterShortText(value: string, fallback = ''): string {
  const normalizedValue = value.replace(/\s+/g, ' ').trim()
  return normalizedValue || fallback
}

/**
 * 清洗多行文本
 * 用途：保留换行，但去掉无意义空白行
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
 * 清洗道号文本
 * 用途：统一处理道号输入口径，方便前后端保持同一套规则
 * 入参：value 为原始道号
 * 返回值：返回清洗后的道号
 */
export function normalizeRosterDaohao(value: string): string {
  return normalizeRosterShortText(value)
}

/**
 * 校验道号格式
 * 用途：前台失焦校验、提交前校验和后台编辑校验共用
 * 入参：daohao 为道号
 * 返回值：符合规则返回 true，否则返回 false
 */
export function isValidRosterDaohao(daohao: string): boolean {
  const normalizedDaohao = normalizeRosterDaohao(daohao)

  if (!normalizedDaohao) {
    return false
  }

  return Array.from(normalizedDaohao).length <= 12
}

/**
 * 获取道号错误提示
 * 用途：把道号校验失败原因用中文讲清楚
 * 入参：daohao 为道号
 * 返回值：没有错误返回空字符串
 */
export function getRosterDaohaoError(daohao: string): string {
  const normalizedDaohao = normalizeRosterDaohao(daohao)

  if (!normalizedDaohao) {
    return '请先填写道号'
  }

  if (Array.from(normalizedDaohao).length > 12) {
    return '道号最多支持 12 个字，请再精简一些'
  }

  return ''
}

/**
 * 校验俗家姓名
 * 用途：登记页和后台编辑页统一拦截明显无效的姓名输入
 * 入参：value 为原始姓名
 * 返回值：没有错误时返回空字符串
 */
function getRosterRealNameError(value: string): string {
  const normalizedValue = normalizeRosterShortText(value)

  if (!normalizedValue) {
    return '请填写俗家姓名'
  }

  if (!/[A-Za-z\u4e00-\u9fa5]/.test(normalizedValue) || /^[0-9]+$/.test(normalizedValue)) {
    return '俗家姓名需填写真实姓名，不能只写数字或无效符号'
  }

  return ''
}

/**
 * 校验生年
 * 用途：统一限制生年必须是合理范围内的四位数字
 * 入参：value 为原始生年
 * 返回值：没有错误时返回空字符串
 */
function getRosterBirthYearError(value: string): string {
  const normalizedValue = normalizeRosterShortText(value)

  if (!normalizedValue) {
    return '请填写生年'
  }

  if (!/^\d{4}$/.test(normalizedValue)) {
    return '生年需填写四位数字，例如 1998'
  }

  const birthYear = Number.parseInt(normalizedValue, 10)
  const currentYear = new Date().getFullYear()

  if (birthYear < 1900 || birthYear > currentYear) {
    return `生年需填写 1900 至 ${currentYear} 之间的四位数字`
  }

  return ''
}

/**
 * 校验核心联系方式
 * 用途：统一要求正式联络方式必须填写，避免审核后仍无法联系
 * 入参：value 为原始联系方式
 * 返回值：没有错误时返回空字符串
 */
function getRosterWechatIdError(value: string): string {
  if (!normalizeRosterShortText(value)) {
    return '请填写核心传讯微信号'
  }

  return ''
}

/**
 * 清洗登记表单
 * 用途：提交、预览和草稿回显前统一清洗表单值
 * 入参：form 为原始表单
 * 返回值：返回清洗后的表单
 */
export function normalizeRosterFormValue(form: RosterRegistrationFormValue): RosterRegistrationFormValue {
  return {
    daohao: normalizeRosterDaohao(form.daohao),
    secularName: normalizeRosterShortText(form.secularName),
    gender: form.gender,
    currentCity: normalizeRosterShortText(form.currentCity),
    birthYear: normalizeRosterShortText(form.birthYear),
    profession: normalizeRosterShortText(form.profession),
    referrerName: normalizeRosterShortText(form.referrerName),
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
    confirmedTruthfulInfo: Boolean(form.confirmedTruthfulInfo),
  }
}

/**
 * 获取堂口中文名
 * 用途：公开名录、详情页和后台统一显示堂口文案
 * 入参：hallKey 为堂口键名
 * 返回值：返回堂口中文名
 */
export function getRosterHallLabel(hallKey: RosterHallKey): string {
  return rosterHallLabelMap[hallKey] || '其他'
}

/**
 * 获取状态标签
 * 用途：公开详情、名帖和后台统一显示状态中文名
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
 * 用途：把数字牒号统一渲染成“云栖-第0001号”
 * 入参：entryNo 为原始数字或已格式化文本
 * 返回值：返回格式化后的牒号
 */
export function formatRosterEntryNo(entryNo: number | string | null | undefined): string {
  if (typeof entryNo === 'string' && entryNo.trim()) {
    const parsedEntryNo = extractRosterEntryNo(entryNo)

    if (parsedEntryNo === null) {
      return entryNo.trim()
    }

    return `云栖-第${String(parsedEntryNo).padStart(4, '0')}号`
  }

  if (typeof entryNo !== 'number' || !Number.isFinite(entryNo) || entryNo <= 0) {
    return ''
  }

  return `云栖-第${String(entryNo).padStart(4, '0')}号`
}

/**
 * 提取正式牒号数字
 * 用途：把“12”“0012”“云栖-第0012号”都统一识别成数字 12
 * 入参：value 为搜索词或输入文本
 * 返回值：成功返回数字，否则返回 null
 */
export function extractRosterEntryNo(value: string): number | null {
  const normalizedValue = normalizeRosterShortText(value)

  if (!normalizedValue) {
    return null
  }

  const matchedDigits = normalizedValue.replace(/[^\d]/g, '')

  if (!matchedDigits) {
    return null
  }

  const parsedValue = Number.parseInt(matchedDigits, 10)

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return null
  }

  return parsedValue
}

/**
 * 规范化搜索关键字
 * 用途：统一处理公开页和后台搜索输入
 * 入参：value 为原始关键字
 * 返回值：返回清洗后的关键字
 */
export function normalizeRosterSearchKeyword(value: string): string {
  return normalizeRosterShortText(value)
}

/**
 * 格式化公开日期
 * 用途：把数据库时间统一转成中文年月日
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
 * 用途：后台详情展示更完整的操作时间
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
 * 用途：统一把前端字段名映射成 RPC 需要的数据库字段名
 * 入参：form 为已清洗的表单
 * 返回值：返回提交载荷
 */
export function mapRosterFormToSubmitPayload(form: RosterRegistrationFormValue): SubmitRosterEntryPayload {
  return {
    daohao: form.daohao,
    secular_name: form.secularName,
    gender: form.gender as RosterGender,
    current_city: form.currentCity,
    birth_year: form.birthYear || null,
    profession: form.profession,
    referrer_name: form.referrerName,
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
 * 用途：后台和详情区统一显示意愿中文名
 * 入参：value 为意愿键名
 * 返回值：返回中文文案
 */
export function getRosterContributionLabel(value: RosterContributionLevel | ''): string {
  return rosterContributionOptions.find((item) => item.key === value)?.label || '未填写'
}

/**
 * 获取门中分工文案
 * 用途：后台、公开详情与云名帖统一显示职位中文名
 * 入参：value 为职位键名
 * 返回值：返回中文文案
 */
export function getRosterPositionLabel(value: RosterPositionKey | ''): string {
  return rosterPositionOptions.find((item) => item.key === value)?.label || '同门'
}

/**
 * 获取性别文案
 * 用途：登记页和后台查看时统一显示性别中文名
 * 入参：value 为性别键名
 * 返回值：返回中文文案
 */
export function getRosterGenderLabel(value: RosterGender | ''): string {
  return rosterGenderOptions.find((item) => item.key === value)?.label || '未填写'
}

/**
 * 获取空闲时段文案列表
 * 用途：把多选时段更直观地展示出来
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
 * 获取名册站点基础地址
 * 用途：统一兼容 GitHub Pages 子路径，给公开名录页和公开详情页拼完整链接
 * 入参：无
 * 返回值：浏览器环境返回基础地址，否则返回 null
 */
function resolveRosterSiteBaseUrl(): URL | null {
  if (typeof window === 'undefined') {
    return null
  }

  return new URL(import.meta.env.BASE_URL || '/', window.location.origin)
}

/**
 * 生成公开名录链接
 * 用途：招募海报二维码和后续分享统一落到公开名录页
 * 入参：无
 * 返回值：返回完整公开链接
 */
export function resolveRosterListUrl(): string {
  const siteBaseUrl = resolveRosterSiteBaseUrl()

  if (!siteBaseUrl) {
    return ''
  }

  return new URL('roster/list', siteBaseUrl).href
}

/**
 * 生成公开详情链接
 * 用途：名帖二维码、复制链接和分享都共用同一份地址
 * 入参：publicSlug 为详情 slug
 * 返回值：返回完整公开链接
 */
export function resolveRosterEntryUrl(publicSlug: string): string {
  const siteBaseUrl = resolveRosterSiteBaseUrl()

  if (!siteBaseUrl) {
    return ''
  }

  return new URL(`roster/entry/${publicSlug}`, siteBaseUrl).href
}

/**
 * 生成公开名帖文字版
 * 用途：详情页复制链接或后续分享时复用一份简洁文字
 * 入参：entry 为公开记录
 * 返回值：返回文字版内容
 */
export function buildRosterPublicText(entry: PublicRosterEntry): string {
  const numberLabel = entry.status === 'approved'
    ? `文牒号：${entry.entryNo}`
    : `回执号：${entry.receiptCode}`

  const dateLabel = entry.status === 'approved'
    ? `入册日期：${entry.effectiveDate || entry.reviewedAt}`
    : `提交日期：${entry.createdAt}`

  return [
    '云栖名册 · 公开名帖',
    `道号：${entry.daohao}`,
    `性别：${entry.genderLabel}`,
    `门中分工：${entry.positionLabel}`,
    `归属堂口：${entry.hallLabel}`,
    `入派本心：${entry.entryIntent}`,
    `身怀所长：${entry.strengths || '暂未公开所长'}`,
    `所好雅事：${entry.hobbies || '暂未公开雅事'}`,
    `当前状态：${entry.statusLabel}`,
    numberLabel,
    dateLabel,
    entry.reviewComment ? `执事批语：${entry.reviewComment}` : '',
  ].filter(Boolean).join('\n')
}

/**
 * 校验登记表单必填项
 * 用途：提交前统一检查，避免页面各处重复判断
 * 入参：form 为已清洗表单
 * 返回值：返回首个错误提示，没有错误时返回空字符串
 */
export function validateRosterRegistrationForm(form: RosterRegistrationFormValue): string {
  const daohaoError = getRosterDaohaoError(form.daohao)

  if (daohaoError) {
    return daohaoError
  }

  const realNameError = getRosterRealNameError(form.secularName)

  if (realNameError) {
    return realNameError
  }

  if (!form.gender) {
    return '请选择性别'
  }

  if (!form.currentCity) {
    return '请填写现居洞府，至少精确到市'
  }

  const birthYearError = getRosterBirthYearError(form.birthYear)

  if (birthYearError) {
    return birthYearError
  }

  if (!form.profession) {
    return '请填写俗务'
  }

  if (!form.referrerName) {
    return '请填写引荐人；若无人引荐，请填写“自行登门”'
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

  const wechatIdError = getRosterWechatIdError(form.wechatId)

  if (wechatIdError) {
    return wechatIdError
  }

  if (!form.socialXiaohongshuDouyin) {
    return '请填写小红书或抖音账号'
  }

  if (!form.socialQq) {
    return '请填写 QQ'
  }

  if (!form.socialOther) {
    return '请填写其他传讯方式'
  }

  if (!form.strengths) {
    return '请填写身怀所长'
  }

  if (!form.hobbies) {
    return '请填写所好雅事'
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

  if (!form.confirmedTruthfulInfo) {
    return '请先确认俗家姓名、生年与联系方式均为真实有效信息'
  }

  return ''
}

/**
 * 校验后台保存载荷
 * 用途：后台编辑保存前统一检查必填项、道号和文牒号
 * 入参：payload 为后台保存载荷
 * 返回值：返回首个错误提示，没有错误时返回空字符串
 */
export function validateAdminRosterEntryPayload(payload: AdminRosterEntrySavePayload): string {
  const daohaoError = getRosterDaohaoError(payload.daohao)

  if (daohaoError) {
    return daohaoError
  }

  const realNameError = getRosterRealNameError(payload.secularName)

  if (realNameError) {
    return realNameError
  }

  if (!payload.gender) {
    return '请选择性别'
  }

  if (!payload.positionKey) {
    return '请选择门中分工'
  }

  if (!payload.currentCity) {
    return '请填写现居洞府'
  }

  const birthYearError = getRosterBirthYearError(payload.birthYear)

  if (birthYearError) {
    return birthYearError
  }

  if (!payload.profession) {
    return '请填写俗务'
  }

  if (!payload.referrerName) {
    return '请填写引荐人；若无人引荐，请填写“自行登门”'
  }

  if (!payload.hallKey) {
    return '请选择归属堂口'
  }

  if (payload.hallKey === 'other' && !payload.hallOtherText) {
    return '选择“其他”堂口时，请补充堂口说明'
  }

  if (!payload.entryIntent) {
    return '请填写入派本心'
  }

  if (getRosterWechatIdError(payload.wechatId)) {
    return '请填写核心传讯'
  }

  if (!payload.socialXiaohongshuDouyin) {
    return '请填写小红书或抖音账号'
  }

  if (!payload.socialQq) {
    return '请填写 QQ'
  }

  if (!payload.socialOther) {
    return '请填写其他传讯方式'
  }

  if (!payload.strengths) {
    return '请填写身怀所长'
  }

  if (!payload.hobbies) {
    return '请填写所好雅事'
  }

  if (!payload.oathSignedName) {
    return '请填写弟子签押'
  }

  if (!payload.oathSignedDate) {
    return '请填写立誓日期'
  }

  if (payload.status === 'approved') {
    if (payload.entryNo === null) {
      return '准予入册时需要正式文牒号'
    }

    if (!Number.isInteger(payload.entryNo) || payload.entryNo <= 0) {
      return '文牒号只能填写正整数'
    }
  }

  return ''
}

/**
 * 映射公开记录
 * 用途：把后端脱敏数据整理成前端统一结构
 * 入参：record 为后端返回记录
 * 返回值：返回公开记录
 */
export function mapPublicRosterEntry(record: Record<string, unknown>): PublicRosterEntry {
  const status = (record.status as RosterEntryStatus) || 'pending'
  const createdAt = String(record.created_at || '')
  const reviewedAt = String(record.reviewed_at || '')
  const effectiveDate = String(record.effective_date || '')
  const entryNoValue = typeof record.entry_no === 'number' ? record.entry_no : null

  return {
    publicSlug: String(record.public_slug || ''),
    status,
    receiptCode: String(record.receipt_code || ''),
    entryNo: formatRosterEntryNo(
      typeof record.entry_no_text === 'string' && record.entry_no_text
        ? record.entry_no_text
        : entryNoValue,
    ),
    entryNoValue,
    daohao: resolveRosterDaohaoFromRecord(record),
    gender: (record.gender as RosterGender) || '',
    genderLabel: getRosterGenderLabel((record.gender as RosterGender) || ''),
    positionKey: resolveRosterPositionKeyFromRecord(record),
    positionLabel: getRosterPositionLabel(resolveRosterPositionKeyFromRecord(record)),
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
 * 映射后台详情记录
 * 用途：把数据库原始字段整理成更顺手的前端结构
 * 入参：record 为数据库返回记录
 * 返回值：返回后台详情记录
 */
export function mapAdminRosterEntry(record: Record<string, unknown>): AdminRosterEntryRecord {
  return {
    id: String(record.id || ''),
    publicSlug: String(record.public_slug || ''),
    receiptCode: String(record.receipt_code || ''),
    status: (record.status as RosterEntryStatus) || 'pending',
    entryNo: typeof record.entry_no === 'number' ? record.entry_no : null,
    daohao: resolveRosterDaohaoFromRecord(record),
    secularName: String(record.secular_name || ''),
    gender: (record.gender as RosterGender) || '',
    positionKey: resolveRosterPositionKeyFromRecord(record),
    currentCity: String(record.current_city || ''),
    birthYear: String(record.birth_year || ''),
    profession: String(record.profession || ''),
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
 * 映射后台审核日志
 * 用途：把原始日志字段整理成前端可直接展示的结构
 * 入参：record 为数据库返回记录
 * 返回值：返回日志记录
 */
export function mapRosterReviewLogRecord(record: Record<string, unknown>): RosterReviewLogRecord {
  return {
    id: String(record.id || ''),
    entryId: String(record.entry_id || ''),
    actionType: String(record.action_type || 'save'),
    previousStatus: record.previous_status ? (String(record.previous_status) as RosterEntryStatus) : null,
    nextStatus: String(record.next_status || 'pending') as RosterEntryStatus,
    previousDaohao: normalizeRosterDaohao(String(record.previous_daohao || record.previous_style_name || '')),
    nextDaohao: normalizeRosterDaohao(String(record.next_daohao || record.next_style_name || '')),
    previousEntryNo: typeof record.previous_entry_no === 'number' ? record.previous_entry_no : null,
    nextEntryNo: typeof record.next_entry_no === 'number' ? record.next_entry_no : null,
    reviewComment: String(record.review_comment || ''),
    reviewedByUserId: String(record.reviewed_by_user_id || ''),
    reviewedByName: String(record.reviewed_by_name || ''),
    createdAt: String(record.created_at || ''),
  }
}

/**
 * 构建后台保存摘要
 * 用途：后台保存前给执事一眼看清这次会提交什么
 * 入参：payload 为后台保存载荷
 * 返回值：返回中文摘要
 */
export function buildAdminSaveSummary(payload: AdminRosterEntrySavePayload): string {
  const statusLabel = getRosterStatusLabel(payload.status)
  const entryNoText = payload.status === 'approved'
    ? `，文牒号为 ${formatRosterEntryNo(payload.entryNo)}`
    : '，并清空正式文牒号'

  return `本次保存将把道号定为 ${payload.daohao}，状态设为“${statusLabel}”${entryNoText}`
}
