<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PageBanner from '@/components/common/PageBanner.vue'
import { useRevealMotion } from '@/composables/useRevealMotion'
import { useRosterAuth } from '@/composables/useRosterAuth'
import { rosterContent, rosterHallOptions, rosterStatusLabelMap } from '@/data/rosterContent'
import { listAdminRosterEntries, listRosterReviewLogs, reviewRosterEntry } from '@/services/roster'
import type { AdminRosterEntryRecord, ReviewRosterEntryPayload, RosterEntryStatus, RosterHallKey } from '@/types/roster'
import {
  buildReviewActionSummary,
  formatRosterDateTime,
  getRosterContributionLabel,
  getRosterFreeTimeLabels,
  getRosterHallLabel,
  getRosterStyleNameError,
} from '@/utils/roster'

// 这里保存页面根节点，供审核台静态区块使用统一显现动效。
const pageRef = ref<HTMLElement | null>(null)

// 这里启用页面显现动效，让审核台整体更有层次感。
useRevealMotion({
  rootRef: pageRef,
})

// 这里拿到路由实例，退出或失去权限时要跳回登录页。
const router = useRouter()

// 这里接入名册鉴权状态，审核台靠它读取执事资料和退出登录。
const {
  adminProfile,
  initializeRosterAuth,
  isAdmin,
  logoutRosterAdmin,
} = useRosterAuth()

// 这里保存审核台所有记录。
const entryList = ref<AdminRosterEntryRecord[]>([])

// 这里保存当前搜索关键字。
const keyword = ref<string>('')

// 这里保存堂口筛选值。
const selectedHallKey = ref<RosterHallKey | ''>('')

// 这里记录列表是否正在加载。
const isLoading = ref<boolean>(false)

// 这里记录当前动作提示，用来给执事明确反馈。
const actionMessage = ref<string>('待审核、已通过、暂缓与不予收录四栏都会显示在下方。')

// 这里记录当前错误提示。
const errorMessage = ref<string>('')

// 这里记录当前正在查看的记录 id。
const activeEntryId = ref<string>('')

// 这里保存当前记录的审核日志。
const reviewLogs = ref<Array<Record<string, unknown>>>([])

// 这里记录日志加载状态，方便抽屉里展示提示。
const isLoadingLogs = ref<boolean>(false)

// 这里记录是否正在提交审核动作，避免重复点击。
const isSubmittingReview = ref<boolean>(false)

// 这里保存抽屉里选中的目标状态。
const reviewStatus = ref<Extract<RosterEntryStatus, 'approved' | 'deferred' | 'rejected'>>('approved')

// 这里保存抽屉里的最终法号。
const reviewStyleName = ref<string>('')

// 这里保存抽屉里的公开批语。
const reviewComment = ref<string>('')

// 这里保存搜索防抖定时器，避免输入时疯狂请求。
let searchTimer: number | null = null

/**
 * 当前抽屉记录
 * 用途：从列表中实时找到当前被查看的那一条记录
 */
const activeEntry = computed<AdminRosterEntryRecord | null>(() => (
  entryList.value.find((item) => item.id === activeEntryId.value) ?? null
))

/**
 * 按状态分组后的记录
 * 用途：审核台固定按四栏展示
 */
const groupedEntryMap = computed<Record<RosterEntryStatus, AdminRosterEntryRecord[]>>(() => ({
  pending: entryList.value.filter((item) => item.status === 'pending'),
  approved: entryList.value.filter((item) => item.status === 'approved'),
  deferred: entryList.value.filter((item) => item.status === 'deferred'),
  rejected: entryList.value.filter((item) => item.status === 'rejected'),
}))

/**
 * 审核栏配置
 * 用途：模板里统一循环四个状态栏
 */
const columnList = computed<Array<{ status: RosterEntryStatus; title: string }>>(() => ([
  { status: 'pending', title: rosterStatusLabelMap.pending },
  { status: 'approved', title: rosterStatusLabelMap.approved },
  { status: 'deferred', title: rosterStatusLabelMap.deferred },
  { status: 'rejected', title: rosterStatusLabelMap.rejected },
]))

/**
 * 同步抽屉表单
 * 用途：切换不同记录时，把审核动作默认值一起切过去
 * 入参：entry 为当前记录
 * 返回值：无返回值
 */
function syncReviewForm(entry: AdminRosterEntryRecord | null): void {
  if (!entry) {
    reviewStatus.value = 'approved'
    reviewStyleName.value = ''
    reviewComment.value = ''
    return
  }

  reviewStatus.value = entry.status === 'approved' ? 'approved' : 'approved'
  reviewStyleName.value = entry.effectiveStyleName || entry.requestedStyleName
  reviewComment.value = entry.reviewComment
}

/**
 * 拉取审核台列表
 * 用途：首屏加载和搜索筛选变更时刷新全部记录
 * 入参：无
 * 返回值：无返回值
 */
async function loadEntryList(): Promise<void> {
  isLoading.value = true
  errorMessage.value = ''

  try {
    entryList.value = await listAdminRosterEntries({
      keyword: keyword.value,
      hallKey: selectedHallKey.value,
    })

    if (activeEntryId.value) {
      const stillExists = entryList.value.some((item) => item.id === activeEntryId.value)

      if (!stillExists) {
        activeEntryId.value = ''
      }
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '审核台记录加载失败，请稍后再试'
    entryList.value = []
  } finally {
    isLoading.value = false
  }
}

/**
 * 拉取审核日志
 * 用途：抽屉打开后查看该记录的审批历史
 * 入参：entryId 为记录 id
 * 返回值：无返回值
 */
async function loadReviewLogs(entryId: string): Promise<void> {
  if (!entryId) {
    reviewLogs.value = []
    return
  }

  isLoadingLogs.value = true

  try {
    reviewLogs.value = await listRosterReviewLogs(entryId)
  } catch (error) {
    console.warn('读取审核日志失败：', error)
    reviewLogs.value = []
  } finally {
    isLoadingLogs.value = false
  }
}

/**
 * 打开详情抽屉
 * 用途：执事点击某条记录时查看完整原始字段
 * 入参：entry 为当前记录
 * 返回值：无返回值
 */
function openEntryDrawer(entry: AdminRosterEntryRecord): void {
  activeEntryId.value = entry.id
  syncReviewForm(entry)
  void loadReviewLogs(entry.id)
}

/**
 * 关闭详情抽屉
 * 用途：让执事退出当前记录详情
 * 入参：无
 * 返回值：无返回值
 */
function closeEntryDrawer(): void {
  activeEntryId.value = ''
  reviewLogs.value = []
}

/**
 * 退出审核台
 * 用途：执事退出按钮统一走这里
 * 入参：无
 * 返回值：无返回值
 */
async function handleLogout(): Promise<void> {
  try {
    await logoutRosterAdmin()
    await router.replace('/roster/admin/login')
  } catch (error) {
    actionMessage.value = error instanceof Error ? error.message : '退出失败，请稍后再试'
  }
}

/**
 * 提交审核动作
 * 用途：抽屉里的审核按钮统一走这里
 * 入参：无
 * 返回值：无返回值
 */
async function handleSubmitReview(): Promise<void> {
  if (!activeEntry.value) {
    actionMessage.value = '请先选择一条记录再提交审核'
    return
  }

  if (reviewStatus.value === 'approved') {
    const styleNameError = getRosterStyleNameError(reviewStyleName.value)

    if (styleNameError) {
      actionMessage.value = styleNameError
      return
    }
  }

  const payload: ReviewRosterEntryPayload = {
    entryId: activeEntry.value.id,
    nextStatus: reviewStatus.value,
    effectiveStyleName: reviewStyleName.value,
    reviewComment: reviewComment.value,
  }

  isSubmittingReview.value = true
  actionMessage.value = buildReviewActionSummary(payload)

  try {
    await reviewRosterEntry(payload)
    actionMessage.value = '审核动作已提交，当前列表与抽屉信息正在刷新。'
    await loadEntryList()

    if (activeEntry.value) {
      const refreshedEntry = entryList.value.find((item) => item.id === payload.entryId) ?? null
      syncReviewForm(refreshedEntry)
      await loadReviewLogs(payload.entryId)
    }
  } catch (error) {
    actionMessage.value = error instanceof Error ? error.message : '审核提交失败，请稍后再试'
  } finally {
    isSubmittingReview.value = false
  }
}

watch(
  () => [keyword.value, selectedHallKey.value],
  () => {
    if (typeof window === 'undefined') {
      return
    }

    if (searchTimer) {
      window.clearTimeout(searchTimer)
    }

    searchTimer = window.setTimeout(() => {
      void loadEntryList()
    }, 220)
  },
)

watch(
  activeEntry,
  (entry) => {
    syncReviewForm(entry)
  },
)

onMounted(async () => {
  await initializeRosterAuth()

  if (!isAdmin.value) {
    await router.replace('/roster/admin/login')
    return
  }

  await loadEntryList()
})
</script>

<template>
  <div ref="pageRef" class="page roster-admin-page">
    <PageBanner
      eyebrow="云栖名册"
      title="执事审核台"
      :lead="`当前登录执事：${adminProfile?.displayName || '未识别'}。公开前台与审核台共用同一套名册数据，这里可查看全部原始字段并执行审核。`"
      :note="actionMessage"
    />

    <section class="roster-admin-toolbar content-card" data-reveal>
      <div class="roster-admin-toolbar__head">
        <div>
          <p class="content-card__eyebrow">筛选与检索</p>
          <h2>按关键词、堂口和状态快速翻卷</h2>
          <p>{{ errorMessage || '点击任意记录可打开详情抽屉，查看完整原始字段与审核历史。' }}</p>
        </div>

        <button type="button" class="ink-button ink-button--ghost" @click="handleLogout">
          {{ rosterContent.admin.logoutButton }}
        </button>
      </div>

      <div class="roster-admin-toolbar__controls">
        <label class="roster-admin-toolbar__search">
          <span>关键词</span>
          <input
            v-model="keyword"
            class="roster-admin-toolbar__input"
            :placeholder="rosterContent.admin.searchPlaceholder"
            type="text"
          />
        </label>

        <div class="roster-admin-toolbar__hall-filter">
          <span>堂口</span>
          <div class="roster-admin-toolbar__chips">
            <button
              type="button"
              class="roster-admin-toolbar__chip"
              :class="{ 'roster-admin-toolbar__chip--active': selectedHallKey === '' }"
              @click="selectedHallKey = ''"
            >
              全部堂口
            </button>
            <button
              v-for="hall in rosterHallOptions"
              :key="hall.key"
              type="button"
              class="roster-admin-toolbar__chip"
              :class="{ 'roster-admin-toolbar__chip--active': selectedHallKey === hall.key }"
              @click="selectedHallKey = hall.key"
            >
              {{ hall.label }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <section v-if="isLoading" class="content-card roster-admin-state" data-reveal>
      <p class="content-card__eyebrow">加载中</p>
      <h3>审核台记录正在整理，请稍候</h3>
      <p>档案司正在翻阅名册文牒。</p>
    </section>

    <section v-else class="roster-admin-columns" data-reveal>
      <article
        v-for="column in columnList"
        :key="column.status"
        class="roster-admin-column"
      >
        <div class="roster-admin-column__head">
          <strong>{{ column.title }}</strong>
          <span>{{ groupedEntryMap[column.status].length }} 条</span>
        </div>

        <div class="roster-admin-column__list">
          <button
            v-for="entry in groupedEntryMap[column.status]"
            :key="entry.id"
            type="button"
            class="roster-admin-entry"
            :class="{ 'roster-admin-entry--active': activeEntryId === entry.id }"
            @click="openEntryDrawer(entry)"
          >
            <div class="roster-admin-entry__head">
              <strong>{{ entry.jianghuName }}</strong>
              <span>{{ entry.status === 'approved' ? entry.effectiveStyleName || entry.requestedStyleName : entry.requestedStyleName }}</span>
            </div>
            <p>{{ getRosterHallLabel(entry.hallKey) }} · {{ entry.receiptCode }}</p>
            <small>{{ formatRosterDateTime(entry.createdAt) }}</small>
          </button>

          <div v-if="groupedEntryMap[column.status].length === 0" class="roster-admin-column__empty">
            此栏暂无记录
          </div>
        </div>
      </article>
    </section>

    <Transition name="drawer-fade">
      <div v-if="activeEntry" class="roster-admin-drawer">
        <div class="roster-admin-drawer__backdrop" @click="closeEntryDrawer"></div>

        <aside class="roster-admin-drawer__panel">
          <div class="roster-admin-drawer__head">
            <div>
              <p class="eyebrow">文牒详情</p>
              <h2>{{ activeEntry.jianghuName }} · {{ activeEntry.effectiveStyleName || activeEntry.requestedStyleName }}</h2>
              <p>{{ getRosterHallLabel(activeEntry.hallKey) }} · {{ activeEntry.receiptCode }} · {{ rosterStatusLabelMap[activeEntry.status] }}</p>
            </div>

            <button type="button" class="roster-admin-drawer__close" @click="closeEntryDrawer">
              收起
            </button>
          </div>

          <div class="roster-admin-drawer__body">
            <section class="roster-admin-detail-card">
              <p class="roster-admin-detail-card__eyebrow">弟子名籍</p>
              <div class="roster-admin-detail-card__grid">
                <div><span>江湖名号</span><strong>{{ activeEntry.jianghuName }}</strong></div>
                <div><span>俗家姓名</span><strong>{{ activeEntry.secularName || '未填' }}</strong></div>
                <div><span>现居洞府</span><strong>{{ activeEntry.currentCity }}</strong></div>
                <div><span>生年</span><strong>{{ activeEntry.birthYear || '未填' }}</strong></div>
                <div><span>俗务</span><strong>{{ activeEntry.profession || '未填' }}</strong></div>
                <div><span>引荐人</span><strong>{{ activeEntry.referrerName || '自行登门' }}</strong></div>
              </div>
            </section>

            <section class="roster-admin-detail-card">
              <p class="roster-admin-detail-card__eyebrow">门派司职</p>
              <div class="roster-admin-detail-card__grid">
                <div><span>申请法号</span><strong>{{ activeEntry.requestedStyleName }}</strong></div>
                <div><span>最终法号</span><strong>{{ activeEntry.effectiveStyleName || activeEntry.requestedStyleName }}</strong></div>
                <div><span>归属堂口</span><strong>{{ getRosterHallLabel(activeEntry.hallKey) }}</strong></div>
                <div><span>其他堂口说明</span><strong>{{ activeEntry.hallOtherText || '无' }}</strong></div>
              </div>
              <div class="roster-admin-detail-card__text-block">
                <span>入派本心</span>
                <p>{{ activeEntry.entryIntent }}</p>
              </div>
            </section>

            <section class="roster-admin-detail-card">
              <p class="roster-admin-detail-card__eyebrow">传讯方式</p>
              <div class="roster-admin-detail-card__grid">
                <div><span>微信号</span><strong>{{ activeEntry.wechatId }}</strong></div>
                <div><span>小红书 / 抖音</span><strong>{{ activeEntry.socialXiaohongshuDouyin || '未填' }}</strong></div>
                <div><span>QQ</span><strong>{{ activeEntry.socialQq || '未填' }}</strong></div>
                <div><span>其他</span><strong>{{ activeEntry.socialOther || '未填' }}</strong></div>
                <div><span>是否公开传讯</span><strong>{{ activeEntry.allowContactPublic ? '同意' : '不同意' }}</strong></div>
              </div>
            </section>

            <section class="roster-admin-detail-card">
              <p class="roster-admin-detail-card__eyebrow">所长与愿</p>
              <div class="roster-admin-detail-card__text-block">
                <span>身怀所长</span>
                <p>{{ activeEntry.strengths || '未填' }}</p>
              </div>
              <div class="roster-admin-detail-card__text-block">
                <span>所好雅事</span>
                <p>{{ activeEntry.hobbies || '未填' }}</p>
              </div>
              <div class="roster-admin-detail-card__grid">
                <div><span>闲暇时辰</span><strong>{{ getRosterFreeTimeLabels(activeEntry.freeTimeSlots).join('、') || '未填' }}</strong></div>
                <div><span>效力意愿</span><strong>{{ getRosterContributionLabel(activeEntry.contributionLevel) }}</strong></div>
              </div>
            </section>

            <section class="roster-admin-detail-card">
              <p class="roster-admin-detail-card__eyebrow">誓约与时间</p>
              <div class="roster-admin-detail-card__grid">
                <div><span>弟子签押</span><strong>{{ activeEntry.oathSignedName }}</strong></div>
                <div><span>立誓日期</span><strong>{{ activeEntry.oathSignedDate }}</strong></div>
                <div><span>创建时间</span><strong>{{ formatRosterDateTime(activeEntry.createdAt) }}</strong></div>
                <div><span>最近更新</span><strong>{{ formatRosterDateTime(activeEntry.updatedAt) }}</strong></div>
                <div><span>审核执事</span><strong>{{ activeEntry.reviewedByName || '未审核' }}</strong></div>
                <div><span>审核时间</span><strong>{{ activeEntry.reviewedAt ? formatRosterDateTime(activeEntry.reviewedAt) : '未审核' }}</strong></div>
              </div>
            </section>

            <section class="roster-admin-detail-card roster-admin-detail-card--action">
              <p class="roster-admin-detail-card__eyebrow">审核动作</p>

              <div class="roster-admin-review-status">
                <button
                  type="button"
                  class="roster-admin-review-status__button"
                  :class="{ 'roster-admin-review-status__button--active': reviewStatus === 'approved' }"
                  @click="reviewStatus = 'approved'"
                >
                  准予入册
                </button>
                <button
                  type="button"
                  class="roster-admin-review-status__button"
                  :class="{ 'roster-admin-review-status__button--active': reviewStatus === 'deferred' }"
                  @click="reviewStatus = 'deferred'"
                >
                  暂缓入册
                </button>
                <button
                  type="button"
                  class="roster-admin-review-status__button"
                  :class="{ 'roster-admin-review-status__button--active': reviewStatus === 'rejected' }"
                  @click="reviewStatus = 'rejected'"
                >
                  不予收录
                </button>
              </div>

              <label class="roster-admin-review-field">
                <span>最终法号</span>
                <input
                  v-model="reviewStyleName"
                  class="roster-admin-review-input"
                  :disabled="reviewStatus !== 'approved'"
                  placeholder="准予入册时可确认或修改最终法号"
                  type="text"
                />
              </label>

              <label class="roster-admin-review-field">
                <span>公开批语</span>
                <textarea
                  v-model="reviewComment"
                  class="roster-admin-review-input roster-admin-review-input--textarea"
                  maxlength="220"
                  placeholder="这段文字会出现在公开详情页状态区，请按公开口径填写"
                  rows="4"
                ></textarea>
              </label>

              <div class="roster-admin-review-actions">
                <button
                  type="button"
                  class="ink-button ink-button--primary"
                  :disabled="isSubmittingReview"
                  @click="handleSubmitReview"
                >
                  {{ isSubmittingReview ? '提交中...' : rosterContent.admin.reviewButton }}
                </button>
                <span>{{ buildReviewActionSummary({ entryId: activeEntry.id, nextStatus: reviewStatus, effectiveStyleName: reviewStyleName, reviewComment }) }}</span>
              </div>
            </section>

            <section class="roster-admin-detail-card">
              <p class="roster-admin-detail-card__eyebrow">审核日志</p>
              <div v-if="isLoadingLogs" class="roster-admin-log-list">
                <span>审核日志加载中...</span>
              </div>
              <div v-else-if="reviewLogs.length === 0" class="roster-admin-log-list">
                <span>当前还没有审核日志</span>
              </div>
              <div v-else class="roster-admin-log-list">
                <article
                  v-for="log in reviewLogs"
                  :key="String(log.id)"
                  class="roster-admin-log-item"
                >
                  <strong>{{ String(log.reviewed_by_name || '执事') }} · {{ formatRosterDateTime(String(log.created_at || '')) }}</strong>
                  <p>
                    状态：
                    {{ log.previous_status ? rosterStatusLabelMap[String(log.previous_status) as RosterEntryStatus] : '首次' }}
                    →
                    {{ rosterStatusLabelMap[String(log.next_status || 'pending') as RosterEntryStatus] }}
                  </p>
                  <p>法号：{{ String(log.previous_style_name || '未定') }} → {{ String(log.next_style_name || '未定') }}</p>
                  <small>{{ String(log.review_comment || '未留批语') }}</small>
                </article>
              </div>
            </section>
          </div>
        </aside>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.roster-admin-page {
  gap: 30px;
}

.roster-admin-toolbar,
.roster-admin-columns {
  display: grid;
  gap: 18px;
}

.roster-admin-toolbar__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.roster-admin-toolbar__head h2 {
  margin: 0 0 12px;
  font-size: clamp(1.5rem, 3vw, 2.2rem);
  line-height: 1.24;
}

.roster-admin-toolbar__head p:last-child {
  margin: 0;
  color: var(--color-text-soft);
  line-height: 1.78;
}

.roster-admin-toolbar__controls {
  display: grid;
  gap: 16px;
}

.roster-admin-toolbar__search,
.roster-admin-toolbar__hall-filter {
  display: grid;
  gap: 10px;
}

.roster-admin-toolbar__search span,
.roster-admin-toolbar__hall-filter span {
  color: var(--color-cyan);
  font-size: 0.84rem;
  letter-spacing: 0.16em;
}

.roster-admin-toolbar__input,
.roster-admin-review-input {
  width: 100%;
  min-height: 48px;
  padding: 12px 14px;
  border: 1px solid rgba(216, 185, 114, 0.18);
  border-radius: 16px;
  background: rgba(5, 19, 28, 0.62);
  color: var(--color-text);
  outline: none;
}

.roster-admin-toolbar__input:focus,
.roster-admin-review-input:focus {
  border-color: rgba(216, 185, 114, 0.34);
  box-shadow: 0 0 0 3px rgba(216, 185, 114, 0.1);
}

.roster-admin-toolbar__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.roster-admin-toolbar__chip,
.roster-admin-review-status__button,
.roster-admin-entry {
  cursor: pointer;
}

.roster-admin-toolbar__chip {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(216, 185, 114, 0.14);
  background: rgba(5, 19, 28, 0.52);
  color: var(--color-text-soft);
}

.roster-admin-toolbar__chip--active {
  border-color: rgba(216, 185, 114, 0.32);
  background:
    linear-gradient(180deg, rgba(216, 185, 114, 0.14), rgba(35, 25, 9, 0.76)),
    rgba(23, 17, 8, 0.88);
  color: rgba(248, 237, 204, 0.98);
}

.roster-admin-columns {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.roster-admin-column {
  display: grid;
  gap: 14px;
  min-height: 420px;
  padding: 18px;
  border-radius: 28px;
  border: 1px solid rgba(216, 185, 114, 0.16);
  background:
    linear-gradient(180deg, rgba(8, 30, 42, 0.92), rgba(5, 18, 28, 0.96)),
    rgba(5, 18, 28, 0.94);
  box-shadow: var(--shadow-soft);
}

.roster-admin-column__head,
.roster-admin-entry__head,
.roster-admin-review-actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.roster-admin-column__head strong {
  font-size: 1.1rem;
}

.roster-admin-column__head span {
  color: var(--color-gold-strong);
}

.roster-admin-column__list {
  display: grid;
  gap: 12px;
  align-content: start;
}

.roster-admin-entry {
  display: grid;
  gap: 8px;
  padding: 16px;
  border-radius: 22px;
  border: 1px solid rgba(147, 203, 198, 0.14);
  background: rgba(7, 27, 37, 0.44);
  text-align: left;
  transition:
    transform var(--transition-base),
    border-color var(--transition-base),
    background-color var(--transition-base);
}

.roster-admin-entry:hover {
  transform: translateY(-2px);
}

.roster-admin-entry--active {
  border-color: rgba(216, 185, 114, 0.32);
  background:
    linear-gradient(135deg, rgba(216, 185, 114, 0.12), rgba(9, 34, 46, 0.88)),
    rgba(8, 25, 35, 0.86);
}

.roster-admin-entry strong,
.roster-admin-entry span,
.roster-admin-entry p,
.roster-admin-entry small {
  margin: 0;
}

.roster-admin-entry__head span {
  color: var(--color-gold-strong);
}

.roster-admin-entry p,
.roster-admin-entry small {
  color: var(--color-text-soft);
  line-height: 1.7;
}

.roster-admin-column__empty {
  padding: 14px;
  border-radius: 18px;
  background: rgba(7, 27, 37, 0.34);
  color: var(--color-text-faint);
}

.roster-admin-drawer {
  position: fixed;
  inset: 0;
  z-index: 40;
}

.roster-admin-drawer__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(2, 12, 17, 0.7);
  backdrop-filter: blur(10px);
}

.roster-admin-drawer__panel {
  position: absolute;
  top: 0;
  right: 0;
  width: min(820px, 100%);
  height: 100%;
  display: grid;
  grid-template-rows: auto 1fr;
  padding: 22px 20px;
  border-left: 1px solid rgba(216, 185, 114, 0.16);
  background:
    linear-gradient(180deg, rgba(8, 30, 42, 0.98), rgba(5, 18, 28, 0.99)),
    rgba(5, 18, 28, 0.98);
  box-shadow: -24px 0 64px rgba(0, 0, 0, 0.28);
}

.roster-admin-drawer__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 16px;
}

.roster-admin-drawer__head h2 {
  margin: 0 0 10px;
  font-size: clamp(1.45rem, 3vw, 2rem);
  line-height: 1.26;
}

.roster-admin-drawer__head p:last-child {
  margin: 0;
  color: var(--color-text-soft);
  line-height: 1.72;
}

.roster-admin-drawer__close {
  min-height: 42px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(216, 185, 114, 0.2);
  background: rgba(7, 27, 37, 0.44);
  color: var(--color-text);
}

.roster-admin-drawer__body {
  display: grid;
  gap: 16px;
  overflow-y: auto;
  padding-right: 4px;
}

.roster-admin-detail-card {
  display: grid;
  gap: 14px;
  padding: 18px;
  border-radius: 24px;
  border: 1px solid rgba(147, 203, 198, 0.14);
  background: rgba(7, 27, 37, 0.48);
}

.roster-admin-detail-card__eyebrow {
  margin: 0;
  color: var(--color-cyan);
  letter-spacing: 0.16em;
  font-size: 0.82rem;
}

.roster-admin-detail-card__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.roster-admin-detail-card__grid div,
.roster-admin-detail-card__text-block,
.roster-admin-review-field {
  display: grid;
  gap: 8px;
}

.roster-admin-detail-card__grid span,
.roster-admin-detail-card__text-block span,
.roster-admin-review-field span {
  color: var(--color-cyan);
  font-size: 0.82rem;
  letter-spacing: 0.14em;
}

.roster-admin-detail-card__grid strong,
.roster-admin-detail-card__text-block p {
  margin: 0;
  color: var(--color-text-soft);
  line-height: 1.76;
  overflow-wrap: anywhere;
}

.roster-admin-review-status {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.roster-admin-review-status__button {
  min-height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(216, 185, 114, 0.14);
  background: rgba(5, 19, 28, 0.52);
  color: var(--color-text-soft);
}

.roster-admin-review-status__button--active {
  border-color: rgba(216, 185, 114, 0.32);
  background:
    linear-gradient(180deg, rgba(216, 185, 114, 0.14), rgba(35, 25, 9, 0.76)),
    rgba(23, 17, 8, 0.88);
  color: rgba(248, 237, 204, 0.98);
}

.roster-admin-review-input--textarea {
  min-height: 108px;
  resize: vertical;
  line-height: 1.78;
}

.roster-admin-review-actions {
  align-items: center;
}

.roster-admin-review-actions span {
  color: var(--color-text-faint);
  line-height: 1.72;
}

.roster-admin-log-list {
  display: grid;
  gap: 12px;
}

.roster-admin-log-item {
  display: grid;
  gap: 6px;
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid rgba(216, 185, 114, 0.14);
  background: rgba(5, 19, 28, 0.44);
}

.roster-admin-log-item strong,
.roster-admin-log-item p,
.roster-admin-log-item small {
  margin: 0;
}

.roster-admin-log-item p,
.roster-admin-log-item small {
  color: var(--color-text-soft);
  line-height: 1.7;
}

@media (max-width: 1180px) {
  .roster-admin-columns {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 920px) {
  .roster-admin-toolbar__head,
  .roster-admin-review-actions,
  .roster-admin-drawer__head {
    flex-direction: column;
  }

  .roster-admin-detail-card__grid {
    grid-template-columns: 1fr;
  }

  .roster-admin-drawer__panel {
    width: 100%;
    padding: 18px 14px;
  }
}

@media (max-width: 720px) {
  .roster-admin-columns {
    grid-template-columns: 1fr;
  }

  .roster-admin-column,
  .roster-admin-detail-card {
    padding: 16px 14px;
    border-radius: 22px;
  }

  .roster-admin-toolbar__chips,
  .roster-admin-review-status {
    gap: 8px;
  }

  .roster-admin-toolbar__chip,
  .roster-admin-review-status__button {
    min-height: 36px;
    padding: 0 12px;
    font-size: 0.86rem;
  }
}
</style>
