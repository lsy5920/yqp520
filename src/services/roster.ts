import type { Session } from '@supabase/supabase-js'
import { getRosterBondOption, getRosterGenderOption, getRosterIdentityOption } from '@/data/rosterContent'
import { getSupabaseClient } from '@/lib/supabase'
import type {
  AdminRosterCardRecord,
  AdminRosterCardSavePayload,
  PublicRosterCard,
  RosterAdminProfile,
  RosterCardStatus,
  RosterNameAvailabilityResult,
  RosterReviewLogRecord,
  SubmitRosterCardPayload,
  SubmitRosterCardResult,
} from '@/types/roster'
import { createRosterPublicSlug, hydratePublicRosterCard, normalizeRosterCardForm, normalizeRosterGenderKey } from '@/utils/roster'

// 这里定义请求超时时间，避免网络异常时页面一直转圈。
const ROSTER_REQUEST_TIMEOUT_MS = 20000

// 这里定义数据库原始名帖行类型，只在服务层内部使用，页面不直接接触数据库字段。
interface RosterCardRow {
  id: string
  public_slug: string
  jianghu_name: string
  title_name: string
  identity_key: string
  gender_key: string
  region_text: string
  motto: string
  story_text: string
  skill_tags: string[] | null
  bond_key: string
  bond_text: string
  cover_key: string
  status: RosterCardStatus
  entry_no: number | null
  is_public: boolean
  is_region_public: boolean
  is_story_public: boolean
  contact_text: string
  heat_value: number
  featured_level: number
  review_note: string
  internal_note: string
  approved_at: string | null
  created_at: string
  updated_at: string
}

// 这里定义后台资料数据库行类型，服务层会转换成前端驼峰结构。
interface RosterAdminProfileRow {
  id?: string
  user_id: string
  email: string
  display_name: string
  role: string
  is_active: boolean
}

// 这里定义审核日志数据库行类型，服务层会转换成前端驼峰结构。
interface RosterReviewLogRow {
  id: string
  card_id: string
  action_type: string
  previous_status: RosterCardStatus | null
  next_status: RosterCardStatus
  review_note: string
  reviewed_by_name: string
  created_at: string
}

// 这里定义公开列表筛选参数。
export interface ListPublicRosterEntriesOptions {
  /** 用途：搜索关键字；入参含义：按江湖名、编号、地域、宣言和标签检索；返回值含义：无 */
  keyword?: string
  /** 用途：身份筛选；入参含义：为空时查全部；返回值含义：无 */
  identityKey?: string
}

// 这里定义后台列表筛选参数。
export interface ListAdminRosterEntriesOptions {
  /** 用途：状态筛选；入参含义：为空时查全部；返回值含义：无 */
  status?: RosterCardStatus | ''
  /** 用途：搜索关键字；入参含义：按核心字段检索；返回值含义：无 */
  keyword?: string
}

/**
 * 提取错误文字
 * 用途：把各种异常统一变成中文错误提示
 * 入参：error 为未知错误
 * 返回值：返回中文错误文案
 */
function resolveRosterErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message?: unknown }).message || '名册请求失败，请稍后再试')
  }

  return '名册请求失败，请稍后再试'
}

/**
 * 包裹超时请求
 * 用途：给 Supabase 请求加上超时兜底
 * 入参：task 为真实请求，timeoutMessage 为超时提示
 * 返回值：返回真实请求结果
 */
async function withRosterTimeout<T>(task: PromiseLike<T>, timeoutMessage: string): Promise<T> {
  let timer: number | undefined

  try {
    return await Promise.race([
      Promise.resolve(task),
      new Promise<T>((_resolve, reject) => {
        timer = window.setTimeout(() => reject(new Error(timeoutMessage)), ROSTER_REQUEST_TIMEOUT_MS)
      }),
    ])
  } finally {
    if (timer) {
      window.clearTimeout(timer)
    }
  }
}

/**
 * 转换管理员资料
 * 用途：把数据库下划线字段变成前端驼峰字段
 * 入参：row 为数据库管理员行
 * 返回值：返回前端管理员资料
 */
function mapAdminProfile(row: RosterAdminProfileRow): RosterAdminProfile {
  return {
    id: row.id || row.user_id,
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    isActive: row.is_active,
  }
}

/**
 * 转换公开名帖
 * 用途：把数据库行转换成公开页面安全可用的数据
 * 入参：row 为数据库名帖行
 * 返回值：返回公开名帖
 */
function mapPublicRosterCard(row: RosterCardRow): PublicRosterCard {
  const identity = getRosterIdentityOption(row.identity_key as never)
  const bond = getRosterBondOption(row.bond_key as never)

  return hydratePublicRosterCard({
    id: row.id,
    publicSlug: row.public_slug,
    jianghuName: row.jianghu_name,
    displayTitle: row.entry_no ? `云栖第 ${row.entry_no} 号` : '待授编号',
    entryNo: row.entry_no,
    identityKey: identity.key,
    identityLabel: identity.label,
    genderKey: normalizeRosterGenderKey(row.gender_key),
    genderLabel: '',
    regionText: row.is_region_public ? row.region_text : '云深不知处',
    motto: row.motto,
    storyText: row.is_story_public ? row.story_text : '此位同门选择把故事藏进云雾里。',
    skillTags: Array.isArray(row.skill_tags) ? row.skill_tags : [],
    bondKey: bond.key,
    bondLabel: bond.label,
    bondText: row.bond_text || bond.description,
    coverKey: row.cover_key as never,
    heatValue: row.heat_value || 0,
    featuredLevel: row.featured_level || 0,
    approvedAt: row.approved_at || '',
    createdAt: row.created_at,
  })
}

/**
 * 转换后台名帖
 * 用途：把数据库行转换成后台可编辑记录
 * 入参：row 为数据库名帖行
 * 返回值：返回后台名帖记录
 */
function mapAdminRosterCard(row: RosterCardRow): AdminRosterCardRecord {
  return {
    ...mapPublicRosterCard({ ...row, is_region_public: true, is_story_public: true }),
    status: row.status,
    titleName: row.title_name,
    entryNo: row.entry_no,
    isPublic: row.is_public,
    isRegionPublic: row.is_region_public,
    isStoryPublic: row.is_story_public,
    contactText: row.contact_text,
    reviewNote: row.review_note,
    internalNote: row.internal_note,
    updatedAt: row.updated_at,
  }
}

/**
 * 转换审核日志
 * 用途：把数据库日志转换成前端可读结构
 * 入参：row 为数据库日志行
 * 返回值：返回审核日志
 */
function mapReviewLog(row: RosterReviewLogRow): RosterReviewLogRecord {
  return {
    id: row.id,
    cardId: row.card_id,
    actionType: row.action_type,
    previousStatus: row.previous_status,
    nextStatus: row.next_status,
    reviewNote: row.review_note,
    reviewedByName: row.reviewed_by_name,
    createdAt: row.created_at,
  }
}

/**
 * 获取当前登录会话
 * 用途：路由守卫和审核台启动时恢复登录状态
 * 入参：无
 * 返回值：返回会话，未登录返回 null
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
 * 获取当前管理员资料
 * 用途：判断当前用户是否有审核台权限
 * 入参：无
 * 返回值：返回管理员资料，无权限时返回 null
 */
export async function getCurrentRosterAdminProfile(): Promise<RosterAdminProfile | null> {
  const supabase = getSupabaseClient()
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id

  if (!userId) {
    return null
  }

  const { data, error } = await supabase
    .from('yunqi_roster_admin_profiles')
    .select('user_id,email,display_name,role,is_active')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    throw new Error(resolveRosterErrorMessage(error))
  }

  return data ? mapAdminProfile(data as RosterAdminProfileRow) : null
}

/**
 * 要求当前用户必须是管理员
 * 用途：后台敏感操作前统一检查权限
 * 入参：无
 * 返回值：返回管理员资料
 */
export async function requireRosterAdminProfile(): Promise<RosterAdminProfile> {
  const supabase = getSupabaseClient()
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id || ''
  const email = sessionData.session?.user.email || ''
  const profile = await getCurrentRosterAdminProfile()

  if (!profile) {
    const sqlHint = userId
      ? `请先在 Supabase SQL Editor 执行：insert into public.yunqi_roster_admin_profiles (user_id, email, display_name, role, is_active) values ('${userId}', '${email}', '云栖执事', '名册执事', true) on conflict (user_id) do update set email = excluded.email, display_name = excluded.display_name, role = excluded.role, is_active = true;`
      : '请先确认已经用 Supabase Auth 邮箱密码登录。'
    throw new Error(`当前账号没有名册审核权限。${sqlHint}`)
  }

  return profile
}

/**
 * 登录名册审核台
 * 用途：登录页提交邮箱和密码后调用
 * 入参：email 为邮箱，password 为密码
 * 返回值：返回会话和管理员资料
 */
export async function signInRosterAdmin(email: string, password: string): Promise<{ session: Session; profile: RosterAdminProfile }> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.session) {
    throw new Error(resolveRosterErrorMessage(error) || '登录失败，请检查邮箱和密码。')
  }

  const profile = await requireRosterAdminProfile()
  return { session: data.session, profile }
}

/**
 * 退出名册审核台
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
 * 检查江湖名是否可用
 * 用途：登记页失焦和提交前提示重名
 * 入参：jianghuName 为江湖名
 * 返回值：返回是否可用和提示文案
 */
export async function checkRosterNameAvailable(jianghuName: string): Promise<RosterNameAvailabilityResult> {
  const normalizedName = jianghuName.trim()

  if (!normalizedName) {
    return { available: false, message: '请先填写江湖名。' }
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('yunqi_roster_cards')
    .select('id')
    .eq('jianghu_name', normalizedName)
    .limit(1)

  if (error) {
    throw new Error(resolveRosterErrorMessage(error))
  }

  return data && data.length > 0
    ? { available: false, message: '这个江湖名已被登记，请换一个更独特的名号。' }
    : { available: true, message: '这个江湖名可以登记。' }
}

/**
 * 提交名帖登记
 * 用途：登记页把新结构写入新名帖表
 * 入参：payload 为提交载荷
 * 返回值：返回提交结果
 */
export async function submitRosterEntry(payload: SubmitRosterCardPayload): Promise<SubmitRosterCardResult> {
  const form = normalizeRosterCardForm(payload.form)
  const supabase = getSupabaseClient()

  const publicSlug = createRosterPublicSlug(form.jianghuName)

  const insertPayload = {
    public_slug: publicSlug,
    jianghu_name: form.jianghuName,
    title_name: form.titleName,
    identity_key: form.identityKey,
    gender_key: form.genderKey,
    region_text: form.regionText,
    motto: form.motto,
    story_text: form.storyText,
    skill_tags: form.skillTags,
    bond_key: form.bondKey,
    bond_text: form.bondText,
    cover_key: form.coverKey,
    is_region_public: form.isRegionPublic,
    is_story_public: form.isStoryPublic,
    contact_text: form.contactText,
    status: 'pending' satisfies RosterCardStatus,
    is_public: false,
  }

  const { error } = await withRosterTimeout(
    supabase.from('yunqi_roster_cards').insert(insertPayload),
    '提交名帖超时，请检查网络后重试。',
  )

  if (error) {
    throw new Error(resolveRosterErrorMessage(error))
  }

  return {
    id: publicSlug,
    publicSlug,
    status: 'pending',
  }
}

/**
 * 获取公开名帖列表
 * 用途：公开卡册页加载已入册且公开的名帖
 * 入参：options 为搜索和筛选参数
 * 返回值：返回公开名帖列表
 */
export async function listPublicRosterEntries(options: ListPublicRosterEntriesOptions = {}): Promise<PublicRosterCard[]> {
  const supabase = getSupabaseClient()
  let query = supabase
    .from('yunqi_roster_cards')
    .select('*')
    .eq('status', 'approved')
    .eq('is_public', true)
    .order('featured_level', { ascending: false })
    .order('approved_at', { ascending: false })

  if (options.identityKey) {
    query = query.eq('identity_key', options.identityKey)
  }

  const keyword = options.keyword?.trim()

  const { data, error } = await withRosterTimeout(query, '加载云栖名册超时，请稍后重试。')

  if (error) {
    throw new Error(resolveRosterErrorMessage(error))
  }

  const rows = (data || []) as RosterCardRow[]
  const filteredRows = keyword
    ? rows.filter((row) => {
      const genderLabel = getRosterGenderOption(normalizeRosterGenderKey(row.gender_key)).label
      return [row.jianghu_name, String(row.entry_no || ''), row.region_text, row.motto, genderLabel, ...(row.skill_tags || [])].some((item) => item.includes(keyword))
    })
    : rows

  return filteredRows.map(mapPublicRosterCard)
}

/**
 * 根据公开标识获取名帖详情
 * 用途：详情页打开分享链接时加载单张名帖
 * 入参：publicSlug 为公开链接标识
 * 返回值：返回公开名帖，不存在时返回 null
 */
export async function getPublicRosterEntryBySlug(publicSlug: string): Promise<PublicRosterCard | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await withRosterTimeout(
    supabase
      .from('yunqi_roster_cards')
      .select('*')
      .eq('public_slug', publicSlug)
      .eq('status', 'approved')
      .eq('is_public', true)
      .maybeSingle(),
    '加载名帖详情超时，请稍后重试。',
  )

  if (error) {
    throw new Error(resolveRosterErrorMessage(error))
  }

  return data ? mapPublicRosterCard(data as RosterCardRow) : null
}

/**
 * 获取后台名帖列表
 * 用途：审核台加载全部状态名帖
 * 入参：options 为状态和关键词筛选
 * 返回值：返回后台名帖记录列表
 */
export async function listAdminRosterEntries(options: ListAdminRosterEntriesOptions = {}): Promise<AdminRosterCardRecord[]> {
  await requireRosterAdminProfile()
  const supabase = getSupabaseClient()
  let query = supabase.from('yunqi_roster_cards').select('*').order('created_at', { ascending: false })

  if (options.status) {
    query = query.eq('status', options.status)
  }

  const keyword = options.keyword?.trim()
  if (keyword) {
    query = query.or(`jianghu_name.ilike.%${keyword}%,title_name.ilike.%${keyword}%,region_text.ilike.%${keyword}%,contact_text.ilike.%${keyword}%`)
  }

  const { data, error } = await withRosterTimeout(query, '加载审核台名帖超时，请稍后重试。')

  if (error) {
    throw new Error(resolveRosterErrorMessage(error))
  }

  return ((data || []) as RosterCardRow[]).map(mapAdminRosterCard)
}

/**
 * 按公开标识获取后台名帖
 * 用途：云司扫码进入审核台时直接打开对应待审名帖
 * 入参：publicSlug 为二维码里的公开链接标识
 * 返回值：找到时返回后台名帖记录，找不到时返回 null
 */
export async function getAdminRosterEntryBySlug(publicSlug: string): Promise<AdminRosterCardRecord | null> {
  await requireRosterAdminProfile()
  const normalizedSlug = publicSlug.trim()

  if (!normalizedSlug) {
    return null
  }

  const supabase = getSupabaseClient()
  const { data, error } = await withRosterTimeout(
    supabase
      .from('yunqi_roster_cards')
      .select('*')
      .eq('public_slug', normalizedSlug)
      .maybeSingle(),
    '加载指定名帖超时，请稍后重试。',
  )

  if (error) {
    throw new Error(resolveRosterErrorMessage(error))
  }

  return data ? mapAdminRosterCard(data as RosterCardRow) : null
}

/**
 * 获取审核日志
 * 用途：后台选择名帖后查看最近处理记录
 * 入参：cardId 为名帖编号
 * 返回值：返回审核日志列表
 */
export async function listRosterReviewLogs(cardId: string): Promise<RosterReviewLogRecord[]> {
  await requireRosterAdminProfile()
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('yunqi_roster_card_review_logs')
    .select('id,card_id,action_type,previous_status,next_status,review_note,reviewed_by_name,created_at')
    .eq('card_id', cardId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    throw new Error(resolveRosterErrorMessage(error))
  }

  return ((data || []) as RosterReviewLogRow[]).map(mapReviewLog)
}

/**
 * 校验入册编号
 * 用途：确认后台手动填写的编号符合规则
 * 入参：entryNo 为后台填写的编号
 * 返回值：编号为正整数且不包含数字 4 时返回 true
 */
function isValidRosterEntryNo(entryNo: number): boolean {
  return Number.isInteger(entryNo) && entryNo > 0 && !String(entryNo).includes('4')
}

/**
 * 获取下一个可用编号
 * 用途：审核通过时自动按最大编号顺延生成新编号
 * 入参：无
 * 返回值：返回不包含数字 4 的下一个编号
 */
async function getNextAvailableRosterEntryNo(): Promise<number> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('yunqi_roster_cards')
    .select('entry_no')
    .not('entry_no', 'is', null)
    .order('entry_no', { ascending: false })
    .limit(1)

  if (error) {
    throw new Error(resolveRosterErrorMessage(error))
  }

  const maxEntryNo = Number((data?.[0] as { entry_no?: number } | undefined)?.entry_no || 0)
  let nextEntryNo = maxEntryNo + 1

  while (!isValidRosterEntryNo(nextEntryNo)) {
    nextEntryNo += 1
  }

  return nextEntryNo
}

/**
 * 保存后台名帖
 * 用途：审核台编辑展示字段、状态和备注
 * 入参：payload 为后台保存载荷
 * 返回值：返回保存后的名帖和日志编号
 */
export async function saveAdminRosterEntry(payload: AdminRosterCardSavePayload): Promise<{ entry: AdminRosterCardRecord; logId: string }> {
  const adminProfile = await requireRosterAdminProfile()
  const supabase = getSupabaseClient()

  const { data: oldRow, error: oldError } = await supabase
    .from('yunqi_roster_cards')
    .select('*')
    .eq('id', payload.id)
    .single()

  if (oldError || !oldRow) {
    throw new Error(resolveRosterErrorMessage(oldError) || '没有找到要保存的名帖。')
  }

  const oldCard = oldRow as RosterCardRow
  const nextEntryNo = payload.status === 'approved'
    ? (payload.entryNo && isValidRosterEntryNo(payload.entryNo) ? payload.entryNo : await getNextAvailableRosterEntryNo())
    : null

  if (payload.status === 'approved' && payload.entryNo && !isValidRosterEntryNo(payload.entryNo)) {
    throw new Error('入册编号必须是大于 0 的整数，并且不能包含数字 4。')
  }

  const updatePayload = {
    jianghu_name: payload.jianghuName.trim(),
    title_name: payload.titleName.trim(),
    identity_key: payload.identityKey,
    gender_key: payload.genderKey,
    region_text: payload.regionText.trim(),
    motto: payload.motto.trim(),
    story_text: payload.storyText.trim(),
    skill_tags: payload.skillTags,
    bond_key: payload.bondKey,
    bond_text: payload.bondText.trim(),
    cover_key: payload.coverKey,
    status: payload.status,
    entry_no: nextEntryNo,
    is_public: payload.isPublic,
    is_region_public: payload.isRegionPublic,
    is_story_public: payload.isStoryPublic,
    contact_text: payload.contactText.trim(),
    heat_value: payload.heatValue,
    featured_level: payload.featuredLevel,
    review_note: payload.reviewNote.trim(),
    internal_note: payload.internalNote.trim(),
    approved_at: payload.status === 'approved' ? (oldCard.approved_at || new Date().toISOString()) : null,
    reviewed_by_user_id: adminProfile.userId,
    reviewed_by_name: adminProfile.displayName,
  }

  const { data, error } = await supabase
    .from('yunqi_roster_cards')
    .update(updatePayload)
    .eq('id', payload.id)
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(resolveRosterErrorMessage(error))
  }

  const oldStatus = (oldRow as RosterCardRow).status
  const { data: logData, error: logError } = await supabase
    .from('yunqi_roster_card_review_logs')
    .insert({
      card_id: payload.id,
      action_type: oldStatus === payload.status ? 'save' : 'status_change',
      previous_status: oldStatus,
      next_status: payload.status,
      review_note: payload.reviewNote.trim(),
      reviewed_by_user_id: adminProfile.userId,
      reviewed_by_name: adminProfile.displayName,
    })
    .select('id')
    .single()

  if (logError || !logData) {
    throw new Error(resolveRosterErrorMessage(logError))
  }

  return {
    entry: mapAdminRosterCard(data as RosterCardRow),
    logId: logData.id,
  }
}

/**
 * 删除后台名帖
 * 用途：审核台移除明显无效或测试登记
 * 入参：entryId 为名帖编号
 * 返回值：返回被删除的名帖编号
 */
export async function deleteAdminRosterEntry(entryId: string): Promise<string> {
  await requireRosterAdminProfile()
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('yunqi_roster_cards').delete().eq('id', entryId)

  if (error) {
    throw new Error(resolveRosterErrorMessage(error))
  }

  return entryId
}





