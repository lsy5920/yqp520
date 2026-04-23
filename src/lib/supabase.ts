import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// 这里统一读取 Supabase 环境变量，避免把地址和匿名键硬编码进仓库。
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || ''

/**
 * 判断 Supabase 是否已经完成配置
 * 用途：页面在缺少环境变量时给出清晰提示，而不是直接报错白屏
 * 入参：无
 * 返回值：已配置返回 true，否则返回 false
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey)
}

/**
 * 获取 Supabase 配置错误提示
 * 用途：统一给登记页、名录页和审核台展示中文缺失提示
 * 入参：无
 * 返回值：返回错误提示文本
 */
export function getSupabaseConfigErrorText(): string {
  if (isSupabaseConfigured()) {
    return ''
  }

  return '当前还没有配置 Supabase 环境变量，请先在项目根目录创建 .env.local 并补齐 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY。'
}

// 这里延迟保存客户端实例，确保整个站点只创建一份连接。
let cachedSupabaseClient: SupabaseClient | null = null

/**
 * 获取 Supabase 客户端
 * 用途：公开前台、审核台和鉴权逻辑都从这里拿同一份客户端
 * 入参：无
 * 返回值：返回 Supabase 客户端实例
 */
export function getSupabaseClient(): SupabaseClient {
  if (cachedSupabaseClient) {
    return cachedSupabaseClient
  }

  if (!isSupabaseConfigured()) {
    throw new Error(getSupabaseConfigErrorText())
  }

  cachedSupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })

  return cachedSupabaseClient
}
