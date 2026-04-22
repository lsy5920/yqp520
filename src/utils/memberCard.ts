import type {
  MemberCardFormValue,
  MemberCardLegacyFormValue,
  MemberCardTemplateKey,
} from '@/types/memberCard'

// 这里定义容易影响排版的特殊字符过滤规则，防止名帖里混进奇怪字符。
const memberCardTextFilter = /[<>{}\[\]`'"]/g

// 这里定义短签拆分时可识别的分隔符，方便把一长句拆成几枚短签。
const memberCardTagSplitPattern = /[、，,。；;\n·•|/]+/

// 这里定义格式化日期时间时要用的中文样式。
const memberCardDateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

/**
 * 清洗短文本
 * 用途：把容易破坏排版的特殊字符和多余空格去掉
 * 入参：rawValue 为原始文本
 * 返回值：返回清洗后的短文本
 */
export function sanitizeMemberCardShortText(rawValue: string): string {
  return rawValue
    .replace(memberCardTextFilter, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * 规范化短文本
 * 用途：清洗短文本，并在没有内容时使用兜底文案
 * 入参：rawValue 为原始文本，fallback 为兜底文案
 * 返回值：返回可直接展示的短文本
 */
export function normalizeMemberCardShortText(rawValue: string, fallback: string): string {
  const safeValue = sanitizeMemberCardShortText(rawValue)
  return safeValue || fallback
}

/**
 * 规范化长文本
 * 用途：保留换行和句意，但去掉多余空白与危险字符
 * 入参：rawValue 为原始文本，fallback 为兜底文案
 * 返回值：返回可直接展示的长文本
 */
export function normalizeMemberCardLongText(rawValue: string, fallback: string): string {
  const safeValue = rawValue
    .replace(memberCardTextFilter, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return safeValue || fallback
}

/**
 * 规范化模板编号
 * 用途：把旧模板编号和异常值统一收口到新模板编号上
 * 入参：rawValue 为原始模板编号，fallback 为兜底模板编号
 * 返回值：返回可直接使用的模板编号
 */
export function normalizeMemberCardTemplateKey(
  rawValue: string | undefined | null,
  fallback: MemberCardTemplateKey = 'qingya',
): MemberCardTemplateKey {
  if (rawValue === 'qingya' || rawValue === 'zhuyin') {
    return rawValue
  }

  if (rawValue === 'simple') {
    return 'qingya'
  }

  if (rawValue === 'ornate') {
    return 'zhuyin'
  }

  return fallback
}

/**
 * 拆分短签
 * 用途：把门中所好拆成几枚短签，减少空白并增强门派味道
 * 入参：rawValue 为原始文本，fallback 为兜底文本
 * 返回值：返回适合以标签形式展示的短句数组
 */
export function splitMemberCardTags(rawValue: string, fallback: string): string[] {
  const normalizedValue = normalizeMemberCardLongText(rawValue, fallback)
  const tagList = normalizedValue
    .split(memberCardTagSplitPattern)
    .map((item) => item.trim())
    .filter(Boolean)

  return (tagList.length ? tagList : [fallback]).slice(0, 8)
}

/**
 * 规范化整份表单
 * 用途：把用户填写的内容统一清洗成稳定可存储的版本
 * 入参：rawForm 为原始表单
 * 返回值：返回清洗后的表单对象
 */
export function normalizeMemberCardFormValue(rawForm: MemberCardFormValue): MemberCardFormValue {
  return {
    daoName: normalizeMemberCardShortText(rawForm.daoName, ''),
    worldName: normalizeMemberCardShortText(rawForm.worldName, ''),
    residence: normalizeMemberCardShortText(rawForm.residence, ''),
    shortTags: normalizeMemberCardLongText(rawForm.shortTags, ''),
    origin: normalizeMemberCardLongText(rawForm.origin, ''),
    motto: normalizeMemberCardLongText(rawForm.motto, ''),
    avatarDataUrl: rawForm.avatarDataUrl.trim(),
    templateKey: normalizeMemberCardTemplateKey(rawForm.templateKey, 'qingya'),
  }
}

/**
 * 格式化名帖编号
 * 用途：把数字转成更像门派名帖的编号文本
 * 入参：number 为顺延编号
 * 返回值：返回可直接展示的编号文本
 */
export function formatMemberCardNumber(number: number): string {
  return `第 ${String(number).padStart(2, '0')} 位同门`
}

/**
 * 格式化名帖时间
 * 用途：把时间戳转成适合名帖落款的中文时间
 * 入参：timestamp 为时间戳
 * 返回值：返回中文日期时间文本
 */
export function formatMemberCardDateTime(timestamp: number): string {
  return memberCardDateTimeFormatter.format(timestamp)
}

/**
 * 迁移旧版名帖表单
 * 用途：把旧字段自动映射到新字段，避免旧草稿和旧同门录丢失
 * 入参：legacyForm 为旧版表单，fallbackTemplateKey 为兜底模板编号
 * 返回值：返回可直接使用的新版本表单
 */
export function migrateLegacyMemberCardForm(
  legacyForm: MemberCardLegacyFormValue,
  fallbackTemplateKey: MemberCardTemplateKey = 'qingya',
): MemberCardFormValue {
  return normalizeMemberCardFormValue({
    daoName: typeof legacyForm.title === 'string' ? legacyForm.title : '',
    worldName: typeof legacyForm.secularName === 'string' ? legacyForm.secularName : '',
    residence: typeof legacyForm.region === 'string' ? legacyForm.region : '',
    shortTags: typeof legacyForm.hobbies === 'string' ? legacyForm.hobbies : '',
    origin: typeof legacyForm.origin === 'string' ? legacyForm.origin : '',
    motto: typeof legacyForm.motto === 'string' ? legacyForm.motto : '',
    avatarDataUrl: typeof legacyForm.avatarDataUrl === 'string' ? legacyForm.avatarDataUrl : '',
    templateKey: normalizeMemberCardTemplateKey(legacyForm.templateKey, fallbackTemplateKey),
  })
}
