import type { RosterCardFormValue, RosterCoverKey } from '@/types/roster'
import { getRosterBondOption, getRosterCoverOption, getRosterIdentityOption } from '@/data/rosterContent'

// 这里定义名帖草稿本地存储键名，避免和旧名册草稿混用。
const ROSTER_CARD_DRAFT_KEY = 'yunqi-roster-card-draft-v1'

/**
 * 清洗短文本
 * 用途：去掉前后空格并压缩多余空白，避免保存脏数据
 * 入参：value 为原始文本，fallback 为兜底文本
 * 返回值：返回清洗后的短文本
 */
export function normalizeRosterShortText(value: string, fallback = ''): string {
  return value.replace(/\s+/g, ' ').trim() || fallback
}

/**
 * 清洗长文本
 * 用途：保留换行但移除空白行，让故事和宣言更整洁
 * 入参：value 为原始文本，fallback 为兜底文本
 * 返回值：返回清洗后的长文本
 */
export function normalizeRosterLongText(value: string, fallback = ''): string {
  const nextValue = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')

  return nextValue || fallback
}

/**
 * 清洗标签列表
 * 用途：去重、去空、限制数量，避免标签撑破手机卡片
 * 入参：tags 为原始标签列表
 * 返回值：返回最多六个干净标签
 */
export function normalizeRosterSkillTags(tags: string[]): string[] {
  const cleanTags = tags
    .map((tag) => normalizeRosterShortText(tag).replace(/^#/, ''))
    .filter(Boolean)
    .map((tag) => Array.from(tag).slice(0, 8).join(''))

  return [...new Set(cleanTags)].slice(0, 6)
}

/**
 * 清洗登记表单
 * 用途：提交、保存草稿和后台编辑前统一整理数据
 * 入参：form 为原始登记表单
 * 返回值：返回清洗后的登记表单
 */
export function normalizeRosterCardForm(form: RosterCardFormValue): RosterCardFormValue {
  return {
    jianghuName: normalizeRosterShortText(form.jianghuName),
    titleName: normalizeRosterShortText(form.titleName),
    identityKey: form.identityKey,
    regionText: normalizeRosterShortText(form.regionText, '云深不知处'),
    motto: normalizeRosterShortText(form.motto),
    storyText: normalizeRosterLongText(form.storyText),
    skillTags: normalizeRosterSkillTags(form.skillTags),
    bondKey: form.bondKey,
    bondText: normalizeRosterLongText(form.bondText),
    coverKey: form.coverKey,
    isRegionPublic: Boolean(form.isRegionPublic),
    isStoryPublic: Boolean(form.isStoryPublic),
    contactText: normalizeRosterShortText(form.contactText),
    agreedToPledge: Boolean(form.agreedToPledge),
  }
}

/**
 * 校验登记表单
 * 用途：提交前用中文告诉用户哪里还没填好
 * 入参：form 为已清洗或未清洗表单
 * 返回值：返回错误文案列表，空数组表示可以提交
 */
export function validateRosterCardForm(form: RosterCardFormValue): string[] {
  const normalizedForm = normalizeRosterCardForm(form)
  const errors: string[] = []

  // 这里校验江湖名，避免公开名册出现无名卡片。
  if (!normalizedForm.jianghuName) {
    errors.push('请填写江湖名')
  } else if (Array.from(normalizedForm.jianghuName).length > 12) {
    errors.push('江湖名最多 12 个字')
  }

  // 这里校验真实姓名长度，保证手机卡片排版稳定。
  if (Array.from(normalizedForm.titleName).length > 14) {
    errors.push('真实姓名最多 14 个字')
  }

  // 这里校验身份选择，方便后续筛选和展示。
  if (!normalizedForm.identityKey) {
    errors.push('请选择门派身份')
  }

  // 这里校验宣言，避免卡片缺少核心记忆点。
  if (!normalizedForm.motto) {
    errors.push('请填写江湖宣言')
  } else if (Array.from(normalizedForm.motto).length > 36) {
    errors.push('江湖宣言最多 36 个字')
  }

  // 这里校验故事长度，保证详情页内容足够但不过长。
  if (!normalizedForm.storyText) {
    errors.push('请写一段个人故事')
  } else if (Array.from(normalizedForm.storyText).length > 240) {
    errors.push('个人故事最多 240 个字')
  }

  // 这里校验标签数量，保证名帖信息好读。
  if (normalizedForm.skillTags.length === 0) {
    errors.push('请至少添加一个专长标签')
  }

  // 这里校验羁绊状态，方便同门理解互动边界。
  if (!normalizedForm.bondKey) {
    errors.push('请选择羁绊状态')
  }

  // 这里校验联系方式，后台审核需要能联系到申请人。
  if (!normalizedForm.contactText) {
    errors.push('请填写仅执事可见的联系方式')
  }

  // 这里校验盟约确认，避免误提交。
  if (!normalizedForm.agreedToPledge) {
    errors.push('请先确认云栖名册盟约')
  }

  return errors
}

/**
 * 生成公开标识
 * 用途：提交时为新名帖创建不暴露真实信息的短链接标识
 * 入参：name 为江湖名
 * 返回值：返回公开标识
 */
export function createRosterPublicSlug(name: string): string {
  const randomText = Math.random().toString(36).slice(2, 8)
  const timeText = Date.now().toString(36).slice(-6)
  const nameSeed = Array.from(name).reduce((total, char) => total + char.charCodeAt(0), 0).toString(36)
  return `card-${nameSeed}-${timeText}-${randomText}`
}

/**
 * 生成名帖链接
 * 用途：海报和分享按钮统一生成详情页地址
 * 入参：publicSlug 为公开链接标识
 * 返回值：返回完整访问地址
 */
export function resolveRosterEntryUrl(publicSlug: string): string {
  const baseUrl = window.location.origin
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${baseUrl}${basePath}/roster/entry/${publicSlug}`
}

/**
 * 生成名帖动态审核链接
 * 用途：让二维码在待审时进入审核流，入册后自动进入公开详情
 * 入参：publicSlug 为公开链接标识
 * 返回值：返回完整动态审核入口地址
 */
export function resolveRosterReviewUrl(publicSlug: string): string {
  const baseUrl = window.location.origin
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${baseUrl}${basePath}/roster/review/${encodeURIComponent(publicSlug)}`
}

/**
 * 保存名帖草稿
 * 用途：用户填写时自动保存，避免刷新页面丢失
 * 入参：form 为当前表单
 * 返回值：无返回值
 */
export function saveRosterCardDraft(form: RosterCardFormValue): void {
  try {
    localStorage.setItem(ROSTER_CARD_DRAFT_KEY, JSON.stringify(normalizeRosterCardForm(form)))
  } catch (_error) {
    // 这里忽略本地存储异常，因为隐私模式或容量不足时仍应允许继续填写。
  }
}

/**
 * 读取名帖草稿
 * 用途：页面打开时恢复用户上次填写内容
 * 入参：fallback 为默认表单
 * 返回值：返回草稿表单或默认表单
 */
export function loadRosterCardDraft(fallback: RosterCardFormValue): RosterCardFormValue {
  try {
    const rawValue = localStorage.getItem(ROSTER_CARD_DRAFT_KEY)
    if (!rawValue) {
      return fallback
    }

    return normalizeRosterCardForm({ ...fallback, ...JSON.parse(rawValue) })
  } catch (_error) {
    // 这里本地草稿损坏时直接使用默认表单，避免页面打不开。
    return fallback
  }
}

/**
 * 清除名帖草稿
 * 用途：提交成功后移除本机草稿
 * 入参：无
 * 返回值：无返回值
 */
export function clearRosterCardDraft(): void {
  try {
    localStorage.removeItem(ROSTER_CARD_DRAFT_KEY)
  } catch (_error) {
    // 这里忽略清理异常，避免影响提交成功后的页面反馈。
  }
}

/**
 * 获取封面渐变
 * 用途：卡片、详情和海报统一使用同一套封面视觉
 * 入参：coverKey 为封面键名
 * 返回值：返回 CSS 渐变字符串
 */
export function getRosterCoverGradient(coverKey: RosterCoverKey): string {
  return getRosterCoverOption(coverKey).gradient
}

/**
 * 格式化日期
 * 用途：把数据库时间变成用户看得懂的中文日期
 * 入参：value 为数据库时间字符串
 * 返回值：返回日期文案
 */
export function formatRosterDate(value: string): string {
  if (!value) {
    return '待执事落印'
  }

  try {
    return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(value))
  } catch (_error) {
    // 这里日期异常时返回兜底文案，避免详情页显示 Invalid Date。
    return '日期待确认'
  }
}

/**
 * 补齐公开名帖展示文案
 * 用途：把键名转换成中文标签，减少页面重复计算
 * 入参：card 为公开名帖
 * 返回值：返回补齐中文文案后的名帖
 */
export function hydratePublicRosterCard<T extends { identityKey: string; bondKey: string }>(card: T): T & {
  identityLabel: string
  bondLabel: string
} {
  const identity = getRosterIdentityOption(card.identityKey as never)
  const bond = getRosterBondOption(card.bondKey as never)

  return {
    ...card,
    identityLabel: identity.label,
    bondLabel: bond.label,
  }
}

/**
 * 生成名册列表链接
 * 用途：登记招募海报二维码跳转到公开名册页
 * 入参：无
 * 返回值：返回完整公开名册地址
 */
export function resolveRosterListUrl(): string {
  const baseUrl = window.location.origin
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${baseUrl}${basePath}/roster/list`
}
