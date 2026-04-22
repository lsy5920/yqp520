import type {
  MemberCardFormValue,
  MemberCardLegacyCurrentFormValue,
  MemberCardLegacyFormValue,
} from '@/types/memberCard'

// 这里定义容易影响排版的特殊字符过滤规则，防止名帖里混进破坏布局的内容。
const memberCardTextFilter = /[<>{}\[\]`'"]/g

// 这里定义江湖短签可识别的分隔符，方便把一长句拆成几枚短签。
const memberCardTagSplitPattern = /[、，,。；;\n·•|/]+/

// 这里定义江湖名帖时间格式，方便统一显示立帖时记。
const memberCardDateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

/**
 * 清洗短文本
 * 用途：把危险字符和多余空格去掉，方便短文本稳定展示
 * 入参：rawValue 为原始短文本
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
 * 返回值：返回可以直接展示的短文本
 */
export function normalizeMemberCardShortText(rawValue: string, fallback: string): string {
  const safeValue = sanitizeMemberCardShortText(rawValue)
  return safeValue || fallback
}

/**
 * 规范化长文本
 * 用途：保留换行和句意，但去掉危险字符和过多空行
 * 入参：rawValue 为原始长文本，fallback 为兜底文案
 * 返回值：返回适合直接展示的长文本
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
 * 拆分江湖短签
 * 用途：把一长串短签拆成多枚小签，方便成品帖排版
 * 入参：rawValue 为原始短签文本，fallback 为兜底文本
 * 返回值：返回适合标签展示的短句数组
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
 * 规范化整份江湖名帖表单
 * 用途：把用户填写内容统一清洗成稳定可存储的版本
 * 入参：rawForm 为原始表单对象
 * 返回值：返回清洗后的表单对象
 */
export function normalizeMemberCardFormValue(rawForm: MemberCardFormValue): MemberCardFormValue {
  return {
    jianghuName: normalizeMemberCardShortText(rawForm.jianghuName, ''),
    formerName: normalizeMemberCardShortText(rawForm.formerName, ''),
    fromPlace: normalizeMemberCardShortText(rawForm.fromPlace, ''),
    identityLine: normalizeMemberCardShortText(rawForm.identityLine, ''),
    skillTags: normalizeMemberCardLongText(rawForm.skillTags, ''),
    entryStory: normalizeMemberCardLongText(rawForm.entryStory, ''),
    signatureLine: normalizeMemberCardLongText(rawForm.signatureLine, ''),
    portraitDataUrl: rawForm.portraitDataUrl.trim(),
  }
}

/**
 * 格式化名帖编号
 * 用途：把数字整理成更像正式门籍的帖号文本
 * 入参：number 为帖号数字
 * 返回值：返回适合直接展示的帖号文本
 */
export function formatMemberCardNumber(number: number): string {
  const safeNumber = Number.isFinite(number) && number > 0 ? Math.floor(number) : 1
  return `第 ${String(safeNumber).padStart(2, '0')} 帖`
}

/**
 * 格式化名帖时间
 * 用途：把时间戳整理成统一中文时间，方便落款和提示
 * 入参：timestamp 为原始时间戳
 * 返回值：返回中文时间文本
 */
export function formatMemberCardDateTime(timestamp: number): string {
  return memberCardDateTimeFormatter.format(timestamp)
}

/**
 * 迁移旧版第一阶段表单
 * 用途：把更早的旧字段自动映射到新版江湖名帖字段
 * 入参：legacyForm 为旧版表单对象
 * 返回值：返回新版江湖名帖表单
 */
export function migrateLegacyMemberCardForm(legacyForm: MemberCardLegacyFormValue): MemberCardFormValue {
  return normalizeMemberCardFormValue({
    jianghuName: typeof legacyForm.title === 'string' ? legacyForm.title : '',
    formerName: typeof legacyForm.secularName === 'string' ? legacyForm.secularName : '',
    fromPlace: typeof legacyForm.region === 'string' ? legacyForm.region : '',
    identityLine: '',
    skillTags: typeof legacyForm.hobbies === 'string' ? legacyForm.hobbies : '',
    entryStory: typeof legacyForm.origin === 'string' ? legacyForm.origin : '',
    signatureLine: typeof legacyForm.motto === 'string' ? legacyForm.motto : '',
    portraitDataUrl: typeof legacyForm.avatarDataUrl === 'string' ? legacyForm.avatarDataUrl : '',
  })
}

/**
 * 迁移旧版第二阶段表单
 * 用途：把当前旧名帖字段映射到新版江湖名帖字段
 * 入参：legacyForm 为旧版第二阶段表单对象
 * 返回值：返回新版江湖名帖表单
 */
export function migrateCurrentMemberCardForm(legacyForm: MemberCardLegacyCurrentFormValue): MemberCardFormValue {
  return normalizeMemberCardFormValue({
    jianghuName: typeof legacyForm.daoName === 'string' ? legacyForm.daoName : '',
    formerName: typeof legacyForm.worldName === 'string' ? legacyForm.worldName : '',
    fromPlace: typeof legacyForm.residence === 'string' ? legacyForm.residence : '',
    identityLine: '',
    skillTags: typeof legacyForm.shortTags === 'string' ? legacyForm.shortTags : '',
    entryStory: typeof legacyForm.origin === 'string' ? legacyForm.origin : '',
    signatureLine: typeof legacyForm.motto === 'string' ? legacyForm.motto : '',
    portraitDataUrl: typeof legacyForm.avatarDataUrl === 'string' ? legacyForm.avatarDataUrl : '',
  })
}
