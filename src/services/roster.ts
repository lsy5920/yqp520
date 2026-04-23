import type { Session } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase'
import type {
  AdminRosterEntryRecord,
  AdminRosterEntrySavePayload,
  DaohaoAvailabilityResult,
  PublicRosterEntry,
  RosterAdminProfile,
  RosterHallKey,
  RosterReviewLogRecord,
  SubmitRosterEntryPayload,
  SubmitRosterEntryResult,
} from '@/types/roster'
import {
  extractRosterEntryNo,
  mapAdminRosterEntry,
  mapPublicRosterEntry,
  mapRosterReviewLogRecord,
  normalizeRosterDaohao,
  normalizeRosterSearchKeyword,
  normalizeRosterShortText,
} from '@/utils/roster'

// 这里定义后台鉴权请求超时时间，避免会话卡住时页面一直停在“保存中”。
const ROSTER_ADMIN_REQUEST_TIMEOUT_MS = 20000

// 这里定义登录状态刷新缓冲时间，快过期时会先主动刷新会话再执行后台操作。
const ROSTER_SESSION_REFRESH_BUFFER_MS = 90 * 1000

// 这里定义公开名录查询条件，方便名录页传参更清楚。
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

// 这里定义后台查询条件，方便执事筛选与搜索复用。
export interface ListAdminRosterEntriesOptions {
  /** 用途：搜索关键字 */
  keyword?: string
  /** 用途：堂口筛选 */
  hallKey?: RosterHallKey | ''
}

/**
 * 提取原始错误文案
 * 用途：先拿到 Supabase 返回的原始报错，后面才能做更精确的兼容判断
 * 入参：error 为未知错误对象
 * 返回值：返回原始错误文本
 */
function extractRawRosterErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
    return error.message
  }

  return ''
}

/**
 * 判断是否命中登录状态失效类报错
 * 用途：把会话过期、令牌失效这类错误统一翻译成更容易理解的中文提示
 * 入参：message 为原始错误文本
 * 返回值：命中登录失效时返回 true
 */
function isRosterAuthExpiredErrorMessage(message: string): boolean {
  const normalizedMessage = message.toLowerCase()

  return normalizedMessage.includes('jwt expired')
    || normalizedMessage.includes('invalid jwt')
    || normalizedMessage.includes('refresh token')
    || normalizedMessage.includes('session expired')
    || normalizedMessage.includes('session_not_found')
    || normalizedMessage.includes('auth session missing')
    || normalizedMessage.includes('invalid claim')
    || normalizedMessage.includes('token is expired')
    || normalizedMessage.includes('token has expired')
}

/**
 * 判断是否命中了旧版名册结构报错
 * 用途：当线上数据库还没执行最新版 SQL 时，给用户更清楚的中文提示
 * 入参：message 为原始错误文本
 * 返回值：命中旧结构问题时返回 true
 */
function isLegacyRosterSchemaErrorMessage(message: string): boolean {
  const normalizedMessage = message.toLowerCase()

  return normalizedMessage.includes('column yunqi_roster_entries.daohao does not exist')
    || normalizedMessage.includes('column "daohao" does not exist')
    || normalizedMessage.includes('public.admin_save_roster_entry')
    || normalizedMessage.includes('public.admin_delete_roster_entry')
    || normalizedMessage.includes('public.check_roster_daohao_available')
    || normalizedMessage.includes('public.get_next_roster_entry_no')
    || normalizedMessage.includes('public.list_public_roster_entries')
    || normalizedMessage.includes('public.get_public_roster_entry_by_slug')
}

/**
 * 判断是否缺少新版道号字段
 * 用途：后台搜索时如果仍连着旧表结构，就自动退回旧字段搜索，避免页面直接报错
 * 入参：message 为原始错误文本
 * 返回值：缺少道号列时返回 true
 */
function isMissingRosterDaohaoColumnMessage(message: string): boolean {
  const normalizedMessage = message.toLowerCase()

  return normalizedMessage.includes('column yunqi_roster_entries.daohao does not exist')
    || normalizedMessage.includes('column "daohao" does not exist')
}

/**
 * 给异步请求包一层超时兜底
 * 用途：避免后台会话刷新或 RPC 调用卡住时，页面按钮长时间无法恢复
 * 入参：task 为要执行的异步任务，timeoutMs 为超时毫秒数，timeoutMessage 为超时提示
 * 返回值：返回原任务结果，超时则抛出中文错误
 */
async function withRosterTimeout<T>(
  task: PromiseLike<T>,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<T> {
  let timerId: ReturnType<typeof setTimeout> | null = null

  try {
    return await Promise.race<T>([
      Promise.resolve(task),
      new Promise<T>((_resolve, reject) => {
        timerId = globalThis.setTimeout(() => {
          reject(new Error(timeoutMessage))
        }, timeoutMs)
      }),
    ])
  } finally {
    if (timerId) {
      globalThis.clearTimeout(timerId)
    }
  }
}

/**
 * 构建后台列表查询
 * 用途：让新版道号检索和旧版名称字段检索共用一套查询组装逻辑
 * 入参：supabase 为数据库客户端，options 为列表查询条件，useLegacyNameColumns 控制是否回退旧字段搜索
 * 返回值：返回可继续执行的查询对象
 */
function buildAdminRosterListQuery(
  supabase: ReturnType<typeof getSupabaseClient>,
  options: ListAdminRosterEntriesOptions,
  useLegacyNameColumns = false,
) {
  let query = supabase
    .from('yunqi_roster_entries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300)

  const normalizedKeyword = normalizeRosterSearchKeyword(options.keyword || '')
  const parsedEntryNo = extractRosterEntryNo(normalizedKeyword)

  if (options.hallKey) {
    query = query.eq('hall_key', options.hallKey)
  }

  if (normalizedKeyword) {
    const safeKeyword = normalizedKeyword.replace(/,/g, ' ')
    const orConditions = useLegacyNameColumns
      ? [
        `jianghu_name.ilike.%${safeKeyword}%`,
        `requested_style_name.ilike.%${safeKeyword}%`,
        `effective_style_name.ilike.%${safeKeyword}%`,
        `receipt_code.ilike.%${safeKeyword}%`,
        `wechat_id.ilike.%${safeKeyword}%`,
      ]
      : [
        `daohao.ilike.%${safeKeyword}%`,
        `receipt_code.ilike.%${safeKeyword}%`,
        `wechat_id.ilike.%${safeKeyword}%`,
      ]

    if (parsedEntryNo !== null) {
      orConditions.push(`entry_no.eq.${parsedEntryNo}`)
    }

    query = query.or(orConditions.join(','))
  }

  return query
}

/**
 * 提取 Supabase 错误文案
 * 用途：统一把后端错误转成更容易展示的中文文本
 * 入参：error 为未知错误对象
 * 返回值：返回可展示文本
 */
function resolveRosterErrorMessage(error: unknown): string {
  const rawMessage = extractRawRosterErrorMessage(error)

  if (rawMessage) {
    if (isRosterAuthExpiredErrorMessage(rawMessage)) {
      return '当前执事登录状态已过期，请刷新页面后重新登录审核台，再继续保存或删档。'
    }

    if (isLegacyRosterSchemaErrorMessage(rawMessage)) {
      return '当前 Supabase 仍在使用旧版云栖名册结构，请先到 Supabase SQL Editor 重新执行项目里的 supabase/yunqi_roster.sql，完成“道号字段”和“后台保存 RPC”升级后再重试。'
    }

    return rawMessage
  }

  return '当前请求失败，请稍后再试'
}

/**
 * 等待一小段时间
 * 用途：给移动端登录后的会话和白名单资料同步留一点缓冲时间
 * 入参：ms 为等待毫秒数
 * 返回值：等待结束后返回 Promise
 */
function waitForRosterDelay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

/**
 * 按用户 id 读取管理员资料
 * 用途：登录成功后按当前用户 id 查询白名单资料
 * 入参：userId 为 Supabase 用户 id
 * 返回值：返回管理员资料，没有时返回 null
 */
async function getRosterAdminProfileByUserId(userId: string): Promise<RosterAdminProfile | null> {
  const supabase = getSupabaseClient()

  if (!userId.trim()) {
    return null
  }

  const { data, error } = await withRosterTimeout(
    supabase
      .from('yunqi_roster_admin_profiles')
      .select('user_id, email, display_name, role, is_active')
      .eq('user_id', userId)
      .maybeSingle(),
    ROSTER_ADMIN_REQUEST_TIMEOUT_MS,
    '读取执事资料超时，请刷新页面后重新登录审核台。',
  )

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
 * 读取当前登录会话
 * 用途：审核台入口和页面初始化都需要先判断会话状态
 * 入参：无
 * 返回值：返回当前会话，没有登录时返回 null
 */
export async function getRosterSession(): Promise<Session | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await withRosterTimeout(
    supabase.auth.getSession(),
    ROSTER_ADMIN_REQUEST_TIMEOUT_MS,
    '读取登录状态超时，请刷新页面后重新登录审核台。',
  )

  if (error) {
    throw new Error(resolveRosterErrorMessage(error))
  }

  return data.session
}

/**
 * 确保当前执事会话可用
 * 用途：后台操作前主动检查并刷新临近过期的登录状态，减少长时间停留后的保存卡死
 * 入参：无
 * 返回值：返回确认可用的会话
 */
async function ensureRosterAdminSession(): Promise<Session> {
  const supabase = getSupabaseClient()
  const currentSession = await getRosterSession()

  if (!currentSession?.user) {
    throw new Error('当前执事登录状态已失效，请刷新页面后重新登录审核台。')
  }

  const expiresAtMs = typeof currentSession.expires_at === 'number'
    ? currentSession.expires_at * 1000
    : 0

  if (expiresAtMs && expiresAtMs - Date.now() > ROSTER_SESSION_REFRESH_BUFFER_MS) {
    return currentSession
  }

  const { data, error } = await withRosterTimeout(
    supabase.auth.refreshSession(),
    ROSTER_ADMIN_REQUEST_TIMEOUT_MS,
    '刷新登录状态超时，请刷新页面后重新登录审核台。',
  )

  if (error) {
    throw new Error(resolveRosterErrorMessage(error))
  }

  if (!data.session?.user) {
    throw new Error('当前执事登录状态已过期，请刷新页面后重新登录审核台。')
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
  const session = await ensureRosterAdminSession()

  if (!session?.user) {
    return null
  }

  return getRosterAdminProfileByUserId(session.user.id)
}

/**
 * 确认当前账号具备执事权限
 * 用途：后台页面进入前统一做白名单检查
 * 入参：无
 * 返回值：有权限时返回管理员资料
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
 * 返回值：返回管理员资料与会话
 */
export async function signInRosterAdmin(
  email: string,
  password: string,
): Promise<{ profile: RosterAdminProfile; session: Session }> {
  const supabase = getSupabaseClient()
  const normalizedEmail = normalizeRosterShortText(email)

  if (!normalizedEmail || !password.trim()) {
    throw new Error('请填写完整的邮箱与密码')
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  })

  if (error) {
    throw new Error(resolveRosterErrorMessage(error))
  }

  const currentSession = data.session

  if (!currentSession?.user?.id) {
    throw new Error('执事登录成功，但当前会话尚未就绪，请稍后再试')
  }

  let profile: RosterAdminProfile | null = null

  // 这里给移动端浏览器一点同步时间，避免刚登录就误判成没进白名单。
  for (let attempt = 0; attempt < 3; attempt += 1) {
    profile = await getRosterAdminProfileByUserId(currentSession.user.id)

    if (profile?.isActive) {
      break
    }

    await waitForRosterDelay(180)
  }

  if (!profile || !profile.isActive) {
    await supabase.auth.signOut()
    throw new Error('当前账号未被加入执事白名单，请先在 Supabase 后台补充管理员资料')
  }

  return {
    profile,
    session: currentSession,
  }
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
 * 检查道号可用性
 * 用途：登记页失焦校验和提交前校验共用
 * 入参：daohao 为道号
 * 返回值：返回可用性结果
 */
export async function checkRosterDaohaoAvailable(daohao: string): Promise<DaohaoAvailabilityResult> {
  const supabase = getSupabaseClient()
  const normalizedDaohao = normalizeRosterDaohao(daohao)

  const { data, error } = await supabase.rpc('check_roster_daohao_available', {
    input_daohao: normalizedDaohao,
  })

  if (error) {
    throw new Error(resolveRosterErrorMessage(error))
  }

  const firstRecord = Array.isArray(data) ? data[0] : data

  return {
    available: Boolean(firstRecord?.available),
    daohao: String(firstRecord?.daohao || normalizedDaohao),
    message: String(firstRecord?.message || ''),
  }
}

/**
 * 提交入册登记
 * 用途：登记页点击递交文牒时调用
 * 入参：payload 为已整理好的载荷
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
    search_keyword: normalizeRosterSearchKeyword(options.keyword || ''),
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
 * 读取后台全部记录
 * 用途：审核台按关键字和堂口筛选所有状态的条目
 * 入参：options 为查询条件
 * 返回值：返回管理员可见的原始记录
 */
export async function listAdminRosterEntries(options: ListAdminRosterEntriesOptions = {}): Promise<AdminRosterEntryRecord[]> {
  await requireRosterAdminProfile()

  const supabase = getSupabaseClient()
  let { data, error } = await withRosterTimeout(
    buildAdminRosterListQuery(supabase, options),
    ROSTER_ADMIN_REQUEST_TIMEOUT_MS,
    '读取审核台档案超时，请刷新页面后重新登录审核台。',
  )

  // 这里兼容旧版表结构：如果线上还没有 daohao 列，就回退到旧字段检索。
  if (error && isMissingRosterDaohaoColumnMessage(extractRawRosterErrorMessage(error))) {
    const fallbackResult = await withRosterTimeout(
      buildAdminRosterListQuery(supabase, options, true),
      ROSTER_ADMIN_REQUEST_TIMEOUT_MS,
      '读取审核台档案超时，请刷新页面后重新登录审核台。',
    )
    data = fallbackResult.data
    error = fallbackResult.error
  }

  if (error) {
    throw new Error(resolveRosterErrorMessage(error))
  }

  return (data || []).map((item) => mapAdminRosterEntry(item as Record<string, unknown>))
}

/**
 * 读取审核日志
 * 用途：后台详情抽屉里展示档案历史
 * 入参：entryId 为记录 id
 * 返回值：返回日志列表
 */
export async function listRosterReviewLogs(entryId: string): Promise<RosterReviewLogRecord[]> {
  await requireRosterAdminProfile()

  const supabase = getSupabaseClient()
  const { data, error } = await withRosterTimeout(
    supabase
      .from('yunqi_roster_review_logs')
      .select('*')
      .eq('entry_id', entryId)
      .order('created_at', { ascending: false }),
    ROSTER_ADMIN_REQUEST_TIMEOUT_MS,
    '读取审核日志超时，请刷新页面后重新登录审核台。',
  )

  if (error) {
    throw new Error(resolveRosterErrorMessage(error))
  }

  return (data || []).map((item) => mapRosterReviewLogRecord(item as Record<string, unknown>))
}

/**
 * 获取下一个建议文牒号
 * 用途：后台切到准予入册时，给执事一个默认建议号
 * 入参：无
 * 返回值：返回建议文牒号
 */
export async function getNextRosterEntryNo(): Promise<number> {
  await requireRosterAdminProfile()

  const supabase = getSupabaseClient()
  const { data, error } = await withRosterTimeout(
    supabase.rpc('get_next_roster_entry_no'),
    ROSTER_ADMIN_REQUEST_TIMEOUT_MS,
    '获取默认文牒号超时，请刷新页面后重新登录审核台。',
  )

  if (error) {
    throw new Error(resolveRosterErrorMessage(error))
  }

  const firstRecord = Array.isArray(data) ? data[0] : data
  const nextEntryNo = Number(firstRecord?.next_entry_no || 0)

  if (!Number.isFinite(nextEntryNo) || nextEntryNo <= 0) {
    throw new Error('默认文牒号获取失败，请稍后再试')
  }

  return nextEntryNo
}

/**
 * 保存后台档案
 * 用途：后台统一处理全字段编辑、状态修改与文牒号调整
 * 入参：payload 为后台保存载荷
 * 返回值：返回保存后的关键结果
 */
export async function saveAdminRosterEntry(payload: AdminRosterEntrySavePayload): Promise<{
  entryId: string
  status: string
  entryNoText: string
  reviewedAt: string
}> {
  await requireRosterAdminProfile()

  const supabase = getSupabaseClient()
  const { data, error } = await withRosterTimeout(
    supabase.rpc('admin_save_roster_entry', {
      entry_payload: {
        entry_id: payload.entryId,
        status: payload.status,
        entry_no: payload.entryNo,
        daohao: payload.daohao,
        secular_name: payload.secularName,
        gender: payload.gender,
        position_key: payload.positionKey,
        current_city: payload.currentCity,
        birth_year: payload.birthYear,
        profession: payload.profession,
        referrer_name: payload.referrerName,
        hall_key: payload.hallKey,
        hall_other_text: payload.hallOtherText,
        entry_intent: payload.entryIntent,
        wechat_id: payload.wechatId,
        social_xiaohongshu_douyin: payload.socialXiaohongshuDouyin,
        social_qq: payload.socialQq,
        social_other: payload.socialOther,
        allow_contact_public: payload.allowContactPublic,
        strengths: payload.strengths,
        hobbies: payload.hobbies,
        free_time_slots: payload.freeTimeSlots,
        contribution_level: payload.contributionLevel,
        oath_signed_name: payload.oathSignedName,
        oath_signed_date: payload.oathSignedDate,
        review_comment: payload.reviewComment,
      },
    }),
    ROSTER_ADMIN_REQUEST_TIMEOUT_MS,
    '保存档案超时，请先确认网络与登录状态，再刷新页面重新登录审核台后重试。',
  )

  if (error) {
    throw new Error(resolveRosterErrorMessage(error))
  }

  const firstRecord = Array.isArray(data) ? data[0] : data

  return {
    entryId: String(firstRecord?.entry_id || payload.entryId),
    status: String(firstRecord?.status || payload.status),
    entryNoText: String(firstRecord?.entry_no_text || ''),
    reviewedAt: String(firstRecord?.reviewed_at || ''),
  }
}

/**
 * 删除后台档案
 * 用途：后台删除任意一条记录
 * 入参：entryId 为记录 id
 * 返回值：返回删除后的记录 id
 */
export async function deleteAdminRosterEntry(entryId: string): Promise<string> {
  await requireRosterAdminProfile()

  const supabase = getSupabaseClient()
  const { data, error } = await withRosterTimeout(
    supabase.rpc('admin_delete_roster_entry', {
      target_entry_id: entryId,
    }),
    ROSTER_ADMIN_REQUEST_TIMEOUT_MS,
    '删除档案超时，请先确认网络与登录状态，再刷新页面重新登录审核台后重试。',
  )

  if (error) {
    throw new Error(resolveRosterErrorMessage(error))
  }

  const firstRecord = Array.isArray(data) ? data[0] : data
  return String(firstRecord?.entry_id || entryId)
}
