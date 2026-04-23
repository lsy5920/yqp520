import type { Session } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase'
import type {
  AdminRosterEntryRecord,
  PublicRosterEntry,
  ReviewRosterEntryPayload,
  RosterAdminProfile,
  RosterHallKey,
  StyleNameAvailabilityResult,
  SubmitRosterEntryPayload,
  SubmitRosterEntryResult,
} from '@/types/roster'
import {
  mapAdminRosterEntry,
  mapPublicRosterEntry,
  normalizeRosterShortText,
} from '@/utils/roster'

// 这里定义公开名录查询条件，方便列表页传参更清晰。
export interface ListPublicRosterEntriesOptions {
  /** 用途：搜索关键字 */
  keyword?: string
  /** 用途：堂口筛选 */
  hallKey?: RosterHallKey | ''
  /** 用途：分页大小 */
  pageSize?: number
  /** 用途：分页偏移 */
  pageOffset?: number
}

// 这里定义审核台查询条件，方便管理员列表筛选复用。
export interface ListAdminRosterEntriesOptions {
  /** 用途：搜索关键字 */
  keyword?: string
  /** 用途：堂口筛选 */
  hallKey?: RosterHallKey | ''
}

/**
 * 提取 Supabase 错误文案
 * 用途：统一把后端错误转成更容易展示的中文文本
 * 入参：error 为未知错误对象
 * 返回值：返回可展示文本
 */
function resolveRosterErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
    return error.message
  }

  return '当前请求失败，请稍后再试'
}

/**
 * 读取当前登录会话
 * 用途：审核台入口和路由守卫都需要先判断会话状态
 * 入参：无
 * 返回值：返回当前会话，没有登录时返回 null
 */
export async function getRosterSession(): Promise<Session | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    throw new Error(resolveRosterErrorMessage(error))
  }

  return data.session
}

/**
 * 读取当前管理员资料
 * 用途：登录成功后确认当前账号是否在执事白名单里
 * 入参：无
 * 返回值：返回管理员资料，没有资料时返回 null
 */
export async function getCurrentRosterAdminProfile(): Promise<RosterAdminProfile | null> {
  const supabase = getSupabaseClient()
  const session = await getRosterSession()

  if (!session?.user) {
    return null
  }

  const { data, error } = await supabase
    .from('yunqi_roster_admin_profiles')
    .select('user_id, email, display_name, role, is_active')
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (error) {
    throw new Error(resolveRosterErrorMessage(error))
  }

  if (!data) {
    return null
  }

  return {
    userId: String(data.user_id || ''),
    email: String(data.email || ''),
    displayName: String(data.display_name || ''),
    role: String(data.role || ''),
    isActive: Boolean(data.is_active),
  }
}

/**
 * 确认当前账号具备执事权限
 * 用途：路由守卫和审核页进入前统一做白名单检查
 * 入参：无
 * 返回值：有权限返回管理员资料，无权限时抛出错误
 */
export async function requireRosterAdminProfile(): Promise<RosterAdminProfile> {
  const profile = await getCurrentRosterAdminProfile()

  if (!profile || !profile.isActive) {
    throw new Error('当前账号不在执事白名单中，暂不可进入审核台')
  }

  return profile
}

/**
 * 执事邮箱密码登录
 * 用途：审核台登录页提交账号密码后调用
 * 入参：email 为邮箱，password 为密码
 * 返回值：返回管理员资料
 */
export async function signInRosterAdmin(email: string, password: string): Promise<RosterAdminProfile> {
  const supabase = getSupabaseClient()
  const normalizedEmail = normalizeRosterShortText(email)

  if (!normalizedEmail || !password.trim()) {
    throw new Error('请填写完整的邮箱与密码')
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  })

  if (error) {
    throw new Error(resolveRosterErrorMessage(error))
  }

  const profile = await getCurrentRosterAdminProfile()

  if (!profile || !profile.isActive) {
    await supabase.auth.signOut()
    throw new Error('当前账号未被加入执事白名单，请先在 Supabase 后台补充管理员资料')
  }

  return profile
}

/**
 * 退出执事登录
 * 用途：审核台退出按钮统一调用
 * 入参：无
 * 返回值：无返回值
 */
export async function signOutRosterAdmin(): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw new Error(resolveRosterErrorMessage(error))
  }
}

/**
 * 检查法号可用性
 * 用途：登记页失焦校验和提交前校验共用
 * 入参：styleName 为法号
 * 返回值：返回可用性结果
 */
export async function checkRosterStyleNameAvailable(styleName: string): Promise<StyleNameAvailabilityResult> {
  const supabase = getSupabaseClient()
  const normalizedStyleName = normalizeRosterShortText(styleName)

  const { data, error } = await supabase.rpc('check_roster_style_name_available', {
    input_style_name: normalizedStyleName,
  })

  if (error) {
    throw new Error(resolveRosterErrorMessage(error))
  }

  const firstRecord = Array.isArray(data) ? data[0] : data

  return {
    available: Boolean(firstRecord?.available),
    styleName: String(firstRecord?.style_name || normalizedStyleName),
    suggestions: Array.isArray(firstRecord?.suggestions) ? firstRecord.suggestions.map(String) : [],
    message: String(firstRecord?.message || ''),
  }
}

/**
 * 提交入册登记
 * 用途：登记页点击递交文牒时调用
 * 入参：payload 为已经按数据库字段名整理好的载荷
 * 返回值：返回公开 slug、回执号与状态
 */
export async function submitRosterEntry(payload: SubmitRosterEntryPayload): Promise<SubmitRosterEntryResult> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.rpc('submit_roster_entry', {
    entry_payload: payload,
  })

  if (error) {
    throw new Error(resolveRosterErrorMessage(error))
  }

  const firstRecord = Array.isArray(data) ? data[0] : data

  return {
    publicSlug: String(firstRecord?.public_slug || ''),
    receiptCode: String(firstRecord?.receipt_code || ''),
    status: String(firstRecord?.status || 'pending') as SubmitRosterEntryResult['status'],
  }
}

/**
 * 读取公开名录
 * 用途：名录页按关键字和堂口筛选公开条目
 * 入参：options 为查询条件
 * 返回值：返回脱敏后的公开条目列表
 */
export async function listPublicRosterEntries(options: ListPublicRosterEntriesOptions = {}): Promise<PublicRosterEntry[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.rpc('list_public_roster_entries', {
    search_keyword: normalizeRosterShortText(options.keyword || ''),
    hall_filter: options.hallKey || '',
    page_size: options.pageSize || 24,
    page_offset: options.pageOffset || 0,
  })

  if (error) {
    throw new Error(resolveRosterErrorMessage(error))
  }

  return (Array.isArray(data) ? data : []).map((item) => mapPublicRosterEntry(item as Record<string, unknown>))
}

/**
 * 读取单条公开详情
 * 用途：公开详情页根据 slug 获取当前名帖信息
 * 入参：publicSlug 为详情 slug
 * 返回值：返回脱敏后的公开记录，不存在时返回 null
 */
export async function getPublicRosterEntryBySlug(publicSlug: string): Promise<PublicRosterEntry | null> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.rpc('get_public_roster_entry_by_slug', {
    target_slug: normalizeRosterShortText(publicSlug),
  })

  if (error) {
    throw new Error(resolveRosterErrorMessage(error))
  }

  const firstRecord = Array.isArray(data) ? data[0] : data

  if (!firstRecord) {
    return null
  }

  return mapPublicRosterEntry(firstRecord as Record<string, unknown>)
}

/**
 * 读取审核台全部记录
 * 用途：审核台按关键字和堂口筛选所有状态记录
 * 入参：options 为查询条件
 * 返回值：返回管理员可见的原始记录
 */
export async function listAdminRosterEntries(options: ListAdminRosterEntriesOptions = {}): Promise<AdminRosterEntryRecord[]> {
  await requireRosterAdminProfile()

  const supabase = getSupabaseClient()
  let query = supabase
    .from('yunqi_roster_entries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300)

  const normalizedKeyword = normalizeRosterShortText(options.keyword || '')

  if (options.hallKey) {
    query = query.eq('hall_key', options.hallKey)
  }

  if (normalizedKeyword) {
    const safeKeyword = normalizedKeyword.replace(/,/g, ' ')
    query = query.or(
      [
        `jianghu_name.ilike.%${safeKeyword}%`,
        `requested_style_name.ilike.%${safeKeyword}%`,
        `effective_style_name.ilike.%${safeKeyword}%`,
        `receipt_code.ilike.%${safeKeyword}%`,
        `wechat_id.ilike.%${safeKeyword}%`,
      ].join(','),
    )
  }

  const { data, error } = await query

  if (error) {
    throw new Error(resolveRosterErrorMessage(error))
  }

  return (data || []).map((item) => mapAdminRosterEntry(item as Record<string, unknown>))
}

/**
 * 读取审核日志
 * 用途：审核台详情抽屉里展示审批历史
 * 入参：entryId 为记录 id
 * 返回值：返回日志原始列表
 */
export async function listRosterReviewLogs(entryId: string): Promise<Array<Record<string, unknown>>> {
  await requireRosterAdminProfile()

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('yunqi_roster_review_logs')
    .select('*')
    .eq('entry_id', entryId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(resolveRosterErrorMessage(error))
  }

  return (data || []) as Array<Record<string, unknown>>
}

/**
 * 提交审核动作
 * 用途：审核台点击准予、暂缓或不予收录时调用
 * 入参：payload 为审核动作载荷
 * 返回值：返回审核结果简要信息
 */
export async function reviewRosterEntry(payload: ReviewRosterEntryPayload): Promise<{
  entryId: string
  status: string
  entryNoText: string
  reviewedAt: string
}> {
  await requireRosterAdminProfile()

  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('review_roster_entry', {
    target_entry_id: payload.entryId,
    target_status: payload.nextStatus,
    target_effective_style_name: payload.effectiveStyleName,
    target_review_comment: payload.reviewComment,
  })

  if (error) {
    throw new Error(resolveRosterErrorMessage(error))
  }

  const firstRecord = Array.isArray(data) ? data[0] : data

  return {
    entryId: String(firstRecord?.entry_id || payload.entryId),
    status: String(firstRecord?.status || payload.nextStatus),
    entryNoText: String(firstRecord?.entry_no_text || ''),
    reviewedAt: String(firstRecord?.reviewed_at || ''),
  }
}
