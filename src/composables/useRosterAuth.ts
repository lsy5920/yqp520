import type { Session } from '@supabase/supabase-js'
import { computed, readonly, ref } from 'vue'
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'
import type { RosterAdminProfile } from '@/types/roster'
import {
  getCurrentRosterAdminProfile,
  getRosterSession,
  signInRosterAdmin,
  signOutRosterAdmin,
} from '@/services/roster'

// 这里保存当前登录会话，供审核台页面和路由守卫共享。
const rosterSession = ref<Session | null>(null)

// 这里保存当前执事资料，供审核台标题和权限判断复用。
const rosterAdminProfile = ref<RosterAdminProfile | null>(null)

// 这里记录鉴权是否已经初始化完成，避免路由守卫重复闪跳。
const rosterAuthReady = ref<boolean>(false)

// 这里记录当前是否正在刷新鉴权状态，方便页面展示加载态。
const rosterAuthLoading = ref<boolean>(false)

// 这里避免重复绑定 Supabase 监听器。
let hasBoundRosterAuthListener = false

/**
 * 刷新当前执事资料
 * 用途：登录后、刷新后和鉴权变化时统一同步管理员资料
 * 入参：无
 * 返回值：返回最新管理员资料
 */
async function refreshRosterAdminProfile(): Promise<RosterAdminProfile | null> {
  if (!isSupabaseConfigured()) {
    rosterAdminProfile.value = null
    return null
  }

  rosterAdminProfile.value = await getCurrentRosterAdminProfile()
  return rosterAdminProfile.value
}

/**
 * 初始化名册鉴权
 * 用途：在应用启动时恢复上次登录状态，并监听后续登录变化
 * 入参：无
 * 返回值：无返回值
 */
async function initializeRosterAuth(): Promise<void> {
  if (rosterAuthReady.value || rosterAuthLoading.value) {
    return
  }

  rosterAuthLoading.value = true

  try {
    if (!isSupabaseConfigured()) {
      rosterSession.value = null
      rosterAdminProfile.value = null
      rosterAuthReady.value = true
      return
    }

    rosterSession.value = await getRosterSession()
    await refreshRosterAdminProfile()

    if (!hasBoundRosterAuthListener) {
      const supabase = getSupabaseClient()

      supabase.auth.onAuthStateChange(async (_event, session) => {
        rosterSession.value = session

        try {
          await refreshRosterAdminProfile()
        } finally {
          rosterAuthReady.value = true
        }
      })

      hasBoundRosterAuthListener = true
    }

    rosterAuthReady.value = true
  } finally {
    rosterAuthLoading.value = false
  }
}

/**
 * 登录执事账号
 * 用途：审核台登录页统一调用
 * 入参：email 为邮箱，password 为密码
 * 返回值：返回管理员资料
 */
async function loginRosterAdmin(email: string, password: string): Promise<RosterAdminProfile> {
  rosterAuthLoading.value = true

  try {
    const profile = await signInRosterAdmin(email, password)
    rosterSession.value = await getRosterSession()
    rosterAdminProfile.value = profile
    rosterAuthReady.value = true
    return profile
  } finally {
    rosterAuthLoading.value = false
  }
}

/**
 * 退出执事账号
 * 用途：审核台退出按钮统一调用
 * 入参：无
 * 返回值：无返回值
 */
async function logoutRosterAdmin(): Promise<void> {
  rosterAuthLoading.value = true

  try {
    await signOutRosterAdmin()
    rosterSession.value = null
    rosterAdminProfile.value = null
    rosterAuthReady.value = true
  } finally {
    rosterAuthLoading.value = false
  }
}

/**
 * 名册鉴权组合式函数
 * 用途：给审核台页面和路由守卫提供同一份响应式登录状态
 * 入参：无
 * 返回值：返回鉴权状态与操作方法
 */
export function useRosterAuth() {
  return {
    session: readonly(rosterSession),
    adminProfile: readonly(rosterAdminProfile),
    isReady: readonly(rosterAuthReady),
    isLoading: readonly(rosterAuthLoading),
    isLoggedIn: computed<boolean>(() => Boolean(rosterSession.value)),
    isAdmin: computed<boolean>(() => Boolean(rosterAdminProfile.value?.isActive)),
    initializeRosterAuth,
    refreshRosterAdminProfile,
    loginRosterAdmin,
    logoutRosterAdmin,
  }
}
