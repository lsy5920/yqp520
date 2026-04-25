<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useRevealMotion } from '@/composables/useRevealMotion'
import { rosterBondOptions, rosterContent, rosterCoverOptions, rosterIdentityOptions } from '@/data/rosterContent'
import { getSupabaseConfigErrorText, isSupabaseConfigured } from '@/lib/supabase'
import { deleteAdminRosterEntry, listAdminRosterEntries, listRosterReviewLogs, saveAdminRosterEntry } from '@/services/roster'
import type { AdminRosterCardRecord, AdminRosterCardSavePayload, RosterCardStatus, RosterReviewLogRecord } from '@/types/roster'
import { formatRosterDate, getRosterCoverGradient, normalizeRosterSkillTags } from '@/utils/roster'
import { useRosterAuth } from '@/composables/useRosterAuth'

// 这里保存页面根节点，供后台卡片显现动效使用。
const pageRef = ref<HTMLElement | null>(null)

// 这里启用统一显现动效。
useRevealMotion({ rootRef: pageRef })

// 这里接入名册登录状态，显示当前执事和退出按钮。
const { adminProfile, logoutRosterAdmin } = useRosterAuth()

// 这里保存后台名帖列表。
const entryList = ref<AdminRosterCardRecord[]>([])

// 这里保存当前选中的名帖。
const selectedEntry = ref<AdminRosterCardRecord | null>(null)

// 这里保存可编辑表单。
const editForm = ref<AdminRosterCardSavePayload | null>(null)

// 这里保存审核日志。
const logList = ref<RosterReviewLogRecord[]>([])

// 这里保存状态筛选。
const selectedStatus = ref<RosterCardStatus | ''>('pending')

// 这里保存搜索词。
const keyword = ref<string>('')

// 这里保存加载状态。
const isLoading = ref<boolean>(false)

// 这里保存保存状态。
const isSaving = ref<boolean>(false)

// 这里保存错误提示。
const errorMessage = ref<string>('')

// 这里保存成功提示。
const successMessage = ref<string>('')

// 这里定义审核状态选项。
const statusOptions: Array<{ key: RosterCardStatus | ''; label: string }> = [
  { key: '', label: '全部' },
  { key: 'pending', label: '待审' },
  { key: 'approved', label: '已入册' },
  { key: 'deferred', label: '暂缓' },
  { key: 'rejected', label: '退回' },
]

// 这里计算当前选中名帖的预览背景。
const previewStyle = computed<Record<string, string>>(() => ({
  '--roster-card-gradient': getRosterCoverGradient((editForm.value?.coverKey || selectedEntry.value?.coverKey || 'mist') as never),
}))

// 这里页面进入时加载审核列表。
onMounted(() => {
  void loadEntryList()
})

/**
 * 加载后台列表
 * 用途：按状态和关键词查询新名帖表
 * 入参：无
 * 返回值：无返回值
 */
async function loadEntryList(): Promise<void> {
  errorMessage.value = ''
  successMessage.value = ''

  if (!isSupabaseConfigured()) {
    errorMessage.value = getSupabaseConfigErrorText()
    return
  }

  isLoading.value = true

  try {
    entryList.value = await listAdminRosterEntries({ status: selectedStatus.value, keyword: keyword.value })
    if (!selectedEntry.value && entryList.value.length > 0) {
      await selectEntry(entryList.value[0]!)
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载审核台失败，请稍后重试。'
  } finally {
    isLoading.value = false
  }
}

/**
 * 选择名帖
 * 用途：后台点击列表项后打开编辑表单和审核日志
 * 入参：entry 为后台名帖记录
 * 返回值：无返回值
 */
async function selectEntry(entry: AdminRosterCardRecord): Promise<void> {
  selectedEntry.value = entry
  editForm.value = buildEditForm(entry)
  logList.value = []

  try {
    logList.value = await listRosterReviewLogs(entry.id)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '审核日志加载失败。'
  }
}

/**
 * 构建编辑表单
 * 用途：把后台记录转换成保存载荷
 * 入参：entry 为后台名帖记录
 * 返回值：返回可编辑载荷
 */
function buildEditForm(entry: AdminRosterCardRecord): AdminRosterCardSavePayload {
  return {
    id: entry.id,
    jianghuName: entry.jianghuName,
    titleName: entry.titleName,
    identityKey: entry.identityKey,
    regionText: entry.regionText,
    motto: entry.motto,
    storyText: entry.storyText,
    skillTags: [...entry.skillTags],
    bondKey: entry.bondKey,
    bondText: entry.bondText,
    coverKey: entry.coverKey,
    status: entry.status,
    entryNo: entry.entryNo,
    isPublic: entry.isPublic,
    isRegionPublic: entry.isRegionPublic,
    isStoryPublic: entry.isStoryPublic,
    contactText: entry.contactText,
    heatValue: entry.heatValue,
    featuredLevel: entry.featuredLevel,
    reviewNote: entry.reviewNote,
    internalNote: entry.internalNote,
  }
}

/**
 * 保存标签文本
 * 用途：后台把逗号分隔标签转换为数组
 * 入参：value 为标签文本
 * 返回值：无返回值
 */
function updateSkillTags(value: string): void {
  if (!editForm.value) {
    return
  }

  editForm.value.skillTags = normalizeRosterSkillTags(value.split(/[，,\s]+/))
}

/**
 * 保存名帖
 * 用途：后台提交审核状态、公开配置和展示内容
 * 入参：无
 * 返回值：无返回值
 */
async function handleSave(): Promise<void> {
  if (!editForm.value) {
    return
  }

  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const result = await saveAdminRosterEntry(editForm.value)
    const index = entryList.value.findIndex((item) => item.id === result.entry.id)
    if (index >= 0) {
      entryList.value[index] = result.entry
    }
    await selectEntry(result.entry)
    successMessage.value = `名帖已保存，日志编号：${result.logId}`
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '保存名帖失败，请稍后重试。'
  } finally {
    isSaving.value = false
  }
}

/**
 * 删除名帖
 * 用途：移除无效测试登记
 * 入参：无
 * 返回值：无返回值
 */
async function handleDelete(): Promise<void> {
  if (!selectedEntry.value) {
    return
  }

  const confirmed = window.confirm(`确认删除「${selectedEntry.value.jianghuName}」这张名帖吗？此操作不可恢复。`)
  if (!confirmed) {
    return
  }

  try {
    await deleteAdminRosterEntry(selectedEntry.value.id)
    entryList.value = entryList.value.filter((item) => item.id !== selectedEntry.value?.id)
    selectedEntry.value = null
    editForm.value = null
    logList.value = []
    successMessage.value = '名帖已删除。'
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '删除名帖失败，请稍后重试。'
  }
}

/**
 * 退出审核台
 * 用途：点击退出后清理登录状态
 * 入参：无
 * 返回值：无返回值
 */
async function handleLogout(): Promise<void> {
  await logoutRosterAdmin()
}
</script>

<template>
  <main ref="pageRef" class="cloud-roster-admin-page">
    <div class="cloud-admin-sky" aria-hidden="true">
      <span class="cloud-admin-sky__cloud cloud-admin-sky__cloud--one"></span>
      <span class="cloud-admin-sky__cloud cloud-admin-sky__cloud--two"></span>
    </div>

    <section class="roster-admin-shell">
      <header class="roster-admin-hero reveal-on-scroll">
        <p>{{ rosterContent.admin.eyebrow }}</p>
        <h1>{{ rosterContent.admin.title }}</h1>
        <span>{{ rosterContent.admin.lead }}</span>
        <div class="roster-admin-hero__actions">
          <small>当前执事：{{ adminProfile?.displayName || '未识别' }}</small>
          <RouterLink to="/roster/list">查看前台</RouterLink>
          <button type="button" @click="handleLogout">退出</button>
        </div>
      </header>

      <section class="roster-admin-toolbar reveal-on-scroll">
        <input v-model="keyword" placeholder="搜索江湖名、真实姓名、地域或联系方式" type="search" @keyup.enter="loadEntryList" />
        <select v-model="selectedStatus" @change="loadEntryList">
          <option v-for="item in statusOptions" :key="item.key || 'all'" :value="item.key">{{ item.label }}</option>
        </select>
        <button type="button" @click="loadEntryList">刷新</button>
      </section>

      <div v-if="errorMessage" class="roster-admin-message roster-admin-message--error">{{ errorMessage }}</div>
      <div v-if="successMessage" class="roster-admin-message roster-admin-message--success">{{ successMessage }}</div>

      <section class="roster-admin-layout">
        <aside class="roster-admin-list reveal-on-scroll">
          <p v-if="isLoading">正在翻阅名帖……</p>
          <button
            v-for="entry in entryList"
            :key="entry.id"
            type="button"
            :class="{ active: selectedEntry?.id === entry.id }"
            @click="selectEntry(entry)"
          >
            <strong>{{ entry.jianghuName }}</strong>
            <span>{{ entry.titleName }} · {{ entry.status }} · {{ entry.entryNo ? `编号 ${entry.entryNo}` : '待授编号' }}</span>
            <small>{{ formatRosterDate(entry.createdAt) }}</small>
          </button>
          <p v-if="!isLoading && entryList.length === 0">暂无符合条件的名帖。</p>
        </aside>

        <section v-if="editForm" class="roster-admin-editor reveal-on-scroll">
          <article class="roster-admin-preview" :style="previewStyle">
            <span>{{ editForm.identityKey }}</span>
            <strong>{{ editForm.jianghuName }}</strong>
            <em>{{ editForm.entryNo ? `编号 ${editForm.entryNo}` : '待授编号' }}</em>
            <p>{{ editForm.motto }}</p>
          </article>

          <div class="roster-admin-form">
            <label><span>江湖名</span><input v-model="editForm.jianghuName" type="text" /></label>
            <label><span>真实姓名</span><input v-model="editForm.titleName" type="text" /></label>
            <label><span>入册编号</span><input v-model.number="editForm.entryNo" min="1" type="number" placeholder="已入册时自动生成，可手动修改" /></label>
            <label><span>身份</span><select v-model="editForm.identityKey"><option v-for="item in rosterIdentityOptions" :key="item.key" :value="item.key">{{ item.label }}</option></select></label>
            <label><span>地域</span><input v-model="editForm.regionText" type="text" /></label>
            <label><span>宣言</span><input v-model="editForm.motto" type="text" /></label>
            <label class="wide"><span>故事</span><textarea v-model="editForm.storyText"></textarea></label>
            <label><span>标签</span><input :value="editForm.skillTags.join('，')" type="text" @input="updateSkillTags(($event.target as HTMLInputElement).value)" /></label>
            <label><span>羁绊</span><select v-model="editForm.bondKey"><option v-for="item in rosterBondOptions" :key="item.key" :value="item.key">{{ item.label }}</option></select></label>
            <label class="wide"><span>同行期待</span><textarea v-model="editForm.bondText"></textarea></label>
            <label><span>封面</span><select v-model="editForm.coverKey"><option v-for="item in rosterCoverOptions" :key="item.key" :value="item.key">{{ item.label }}</option></select></label>
            <label><span>状态</span><select v-model="editForm.status"><option value="pending">待审</option><option value="approved">已入册</option><option value="deferred">暂缓</option><option value="rejected">退回</option></select></label>
            <label><span>热度</span><input v-model.number="editForm.heatValue" min="0" type="number" /></label>
            <label><span>推荐等级</span><input v-model.number="editForm.featuredLevel" min="0" max="9" type="number" /></label>
            <label class="check"><input v-model="editForm.isPublic" type="checkbox" />公开展示</label>
            <label class="check"><input v-model="editForm.isRegionPublic" type="checkbox" />公开地域</label>
            <label class="check"><input v-model="editForm.isStoryPublic" type="checkbox" />公开故事</label>
            <label class="wide"><span>联系方式</span><input v-model="editForm.contactText" type="text" /></label>
            <label class="wide"><span>审核备注</span><textarea v-model="editForm.reviewNote"></textarea></label>
            <label class="wide"><span>内部备注</span><textarea v-model="editForm.internalNote"></textarea></label>
          </div>

          <div class="roster-admin-actions">
            <button type="button" :disabled="isSaving" @click="handleSave">{{ isSaving ? '保存中……' : '保存审核' }}</button>
            <button type="button" class="danger" @click="handleDelete">删除名帖</button>
          </div>

          <div class="roster-admin-logs">
            <h2>审核记录</h2>
            <p v-if="logList.length === 0">暂无审核记录。</p>
            <article v-for="log in logList" :key="log.id">
              <strong>{{ log.reviewedByName }} · {{ log.nextStatus }}</strong>
              <span>{{ formatRosterDate(log.createdAt) }}</span>
              <p>{{ log.reviewNote || '未填写备注' }}</p>
            </article>
          </div>
        </section>

        <section v-else class="roster-admin-editor roster-admin-editor--empty reveal-on-scroll">请选择一张名帖开始审核。</section>
      </section>
    </section>
  </main>
</template>

<style scoped>
.roster-admin-page {
  min-height: 100vh;
  padding: 112px 16px 80px;
  background: linear-gradient(180deg, #070b12, #111827 48%, #07090d);
  color: #f8efd8;
}

.roster-admin-shell {
  display: grid;
  gap: 18px;
  width: min(1180px, 100%);
  margin: 0 auto;
}

.roster-admin-hero,
.roster-admin-toolbar,
.roster-admin-list,
.roster-admin-editor,
.roster-admin-message {
  border: 1px solid rgba(231, 190, 107, 0.24);
  border-radius: 28px;
  background: rgba(10, 15, 26, 0.9);
  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.34);
  backdrop-filter: blur(18px);
}

.roster-admin-hero {
  display: grid;
  gap: 10px;
  padding: 28px;
}

.roster-admin-hero p,
.roster-admin-hero h1,
.roster-admin-hero span {
  margin: 0;
}

.roster-admin-hero p {
  color: #e8bd68;
  letter-spacing: 0.18em;
}

.roster-admin-hero h1 {
  font-size: clamp(2rem, 6vw, 4rem);
}

.roster-admin-hero span,
.roster-admin-list p,
.roster-admin-logs p {
  color: rgba(248, 239, 216, 0.72);
  line-height: 1.75;
}

.roster-admin-hero__actions,
.roster-admin-toolbar,
.roster-admin-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.roster-admin-hero__actions a,
.roster-admin-hero__actions button,
.roster-admin-toolbar button,
.roster-admin-actions button {
  min-height: 42px;
  padding: 0 16px;
  border: 1px solid rgba(231, 190, 107, 0.24);
  border-radius: 999px;
  background: rgba(231, 190, 107, 0.16);
  color: #f8efd8;
  text-decoration: none;
}

.roster-admin-toolbar {
  padding: 14px;
}

.roster-admin-toolbar input,
.roster-admin-toolbar select,
.roster-admin-form input,
.roster-admin-form select,
.roster-admin-form textarea {
  border: 1px solid rgba(231, 190, 107, 0.18);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff8e7;
  font: inherit;
  outline: none;
}

.roster-admin-toolbar input {
  flex: 1 1 260px;
  min-height: 44px;
  padding: 0 14px;
}

.roster-admin-toolbar select {
  min-height: 44px;
  padding: 0 14px;
}

.roster-admin-layout {
  display: grid;
  grid-template-columns: 330px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.roster-admin-list {
  display: grid;
  gap: 10px;
  padding: 14px;
  max-height: calc(100vh - 180px);
  overflow: auto;
}

.roster-admin-list button {
  display: grid;
  gap: 6px;
  padding: 14px;
  border: 1px solid rgba(231, 190, 107, 0.16);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.06);
  color: #f8efd8;
  text-align: left;
}

.roster-admin-list button.active {
  border-color: rgba(255, 225, 163, 0.82);
  background: rgba(231, 190, 107, 0.16);
}

.roster-admin-list span,
.roster-admin-list small {
  color: rgba(248, 239, 216, 0.66);
}

.roster-admin-editor {
  display: grid;
  gap: 18px;
  padding: 18px;
}

.roster-admin-preview {
  display: grid;
  gap: 10px;
  min-height: 210px;
  padding: 22px;
  border-radius: 24px;
  background: var(--roster-card-gradient);
}

.roster-admin-preview span,
.roster-admin-preview strong,
.roster-admin-preview p {
  margin: 0;
}

.roster-admin-preview strong {
  margin-top: auto;
  font-size: 2.5rem;
}

.roster-admin-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.roster-admin-form label {
  display: grid;
  gap: 8px;
}

.roster-admin-form label.wide {
  grid-column: 1 / -1;
}

.roster-admin-form label.check {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid rgba(231, 190, 107, 0.16);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.06);
}

.roster-admin-form input,
.roster-admin-form select {
  min-height: 44px;
  padding: 0 12px;
}

.roster-admin-form textarea {
  min-height: 100px;
  padding: 12px;
  resize: vertical;
}

.roster-admin-actions button:first-child {
  background: linear-gradient(135deg, #dfad55, #fff0b8);
  color: #160f07;
  font-weight: 800;
}

.roster-admin-actions button.danger {
  border-color: rgba(248, 113, 113, 0.38);
  background: rgba(127, 29, 29, 0.24);
}

.roster-admin-logs {
  display: grid;
  gap: 10px;
}

.roster-admin-logs h2 {
  margin: 0;
}

.roster-admin-logs article {
  display: grid;
  gap: 6px;
  padding: 12px;
  border: 1px solid rgba(231, 190, 107, 0.14);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.05);
}

.roster-admin-logs span {
  color: rgba(248, 239, 216, 0.6);
}

.roster-admin-message {
  padding: 14px 18px;
}

.roster-admin-message--error {
  border-color: rgba(248, 113, 113, 0.34);
}

.roster-admin-message--success {
  border-color: rgba(74, 222, 128, 0.34);
}

@media (max-width: 900px) {
  .roster-admin-layout,
  .roster-admin-form {
    grid-template-columns: 1fr;
  }

  .roster-admin-list {
    max-height: none;
  }
}

/* 仙气云海重设计：审核台使用克制云端视觉，优先保证信息密度和可读性。 */
.cloud-roster-admin-page {
  position: relative;
  min-height: 100dvh;
  padding: 18px 0 80px;
  color: #103f4a;
  isolation: isolate;
}

.cloud-admin-sky {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
  background:
    radial-gradient(circle at 18% 8%, rgba(255, 255, 255, 0.94), transparent 24%),
    radial-gradient(circle at 82% 14%, rgba(158, 224, 235, 0.38), transparent 30%),
    linear-gradient(180deg, #eefcff 0%, #e3f8f7 48%, #f8fbef 100%);
}

.cloud-admin-sky__cloud {
  position: absolute;
  border-radius: 999px;
  background:
    radial-gradient(circle at 30% 40%, rgba(255, 255, 255, 0.96), transparent 34%),
    radial-gradient(circle at 62% 44%, rgba(255, 255, 255, 0.82), transparent 38%),
    radial-gradient(circle at 50% 70%, rgba(152, 222, 228, 0.34), transparent 44%);
  filter: blur(4px);
  opacity: 0.62;
  animation: adminCloudDrift 20s ease-in-out infinite alternate;
}

.cloud-admin-sky__cloud--one {
  left: -10%;
  top: 10%;
  width: 340px;
  height: 260px;
}

.cloud-admin-sky__cloud--two {
  right: -12%;
  bottom: 12%;
  width: 380px;
  height: 280px;
  animation-delay: 1.4s;
}

.cloud-roster-admin-page .roster-admin-shell {
  width: min(1240px, calc(100vw - 28px)) !important;
}

.cloud-roster-admin-page .roster-admin-hero,
.cloud-roster-admin-page .roster-admin-toolbar,
.cloud-roster-admin-page .roster-admin-list,
.cloud-roster-admin-page .roster-admin-editor,
.cloud-roster-admin-page .roster-admin-message {
  border-color: rgba(96, 170, 184, 0.22) !important;
  background: rgba(255, 255, 255, 0.8) !important;
  color: #103f4a !important;
  box-shadow: 0 24px 58px rgba(55, 143, 158, 0.16) !important;
  backdrop-filter: blur(22px) !important;
}

.cloud-roster-admin-page .roster-admin-hero p,
.cloud-roster-admin-page .roster-admin-form span,
.cloud-roster-admin-page .roster-admin-preview span {
  color: #0d7c8a !important;
  font-weight: 900;
}

.cloud-roster-admin-page .roster-admin-hero h1,
.cloud-roster-admin-page .roster-admin-logs h2,
.cloud-roster-admin-page .roster-admin-preview strong {
  color: #103f4a !important;
}

.cloud-roster-admin-page .roster-admin-hero span,
.cloud-roster-admin-page .roster-admin-list p,
.cloud-roster-admin-page .roster-admin-list span,
.cloud-roster-admin-page .roster-admin-list small,
.cloud-roster-admin-page .roster-admin-logs p,
.cloud-roster-admin-page .roster-admin-logs span {
  color: rgba(16, 63, 74, 0.68) !important;
}

.cloud-roster-admin-page .roster-admin-hero__actions a,
.cloud-roster-admin-page .roster-admin-hero__actions button,
.cloud-roster-admin-page .roster-admin-toolbar button,
.cloud-roster-admin-page .roster-admin-actions button {
  border-color: rgba(46, 143, 158, 0.24) !important;
  background: rgba(255, 255, 255, 0.74) !important;
  color: #103f4a !important;
  font-weight: 800;
}

.cloud-roster-admin-page .roster-admin-toolbar input,
.cloud-roster-admin-page .roster-admin-toolbar select,
.cloud-roster-admin-page .roster-admin-form input,
.cloud-roster-admin-page .roster-admin-form select,
.cloud-roster-admin-page .roster-admin-form textarea {
  border-color: rgba(46, 143, 158, 0.24) !important;
  background: rgba(255, 255, 255, 0.86) !important;
  color: #103f4a !important;
}

.cloud-roster-admin-page .roster-admin-list button,
.cloud-roster-admin-page .roster-admin-form label.check,
.cloud-roster-admin-page .roster-admin-logs article {
  border-color: rgba(96, 170, 184, 0.18) !important;
  background: rgba(255, 255, 255, 0.64) !important;
  color: #103f4a !important;
}

.cloud-roster-admin-page .roster-admin-list button.active {
  border-color: rgba(16, 126, 146, 0.42) !important;
  background: linear-gradient(135deg, rgba(121, 214, 220, 0.34), rgba(255, 245, 191, 0.42)) !important;
  box-shadow: 0 14px 30px rgba(55, 143, 158, 0.14);
}

.cloud-roster-admin-page .roster-admin-preview {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.72);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.86), rgba(255, 255, 255, 0.42)),
    var(--roster-card-gradient) !important;
  color: #103f4a !important;
  box-shadow: 0 20px 46px rgba(55, 143, 158, 0.14);
}

.cloud-roster-admin-page .roster-admin-preview::before {
  position: absolute;
  inset: auto -28px -40px -28px;
  height: 120px;
  border-radius: 999px;
  background:
    radial-gradient(circle at 22% 42%, rgba(255, 255, 255, 0.92), transparent 34%),
    radial-gradient(circle at 62% 48%, rgba(175, 231, 236, 0.42), transparent 42%);
  content: '';
  pointer-events: none;
}

.cloud-roster-admin-page .roster-admin-preview > * {
  position: relative;
  z-index: 1;
}

.cloud-roster-admin-page .roster-admin-actions button:first-child {
  background: linear-gradient(135deg, #79d6dc, #fff5bf) !important;
  color: #103f4a !important;
}

.cloud-roster-admin-page .roster-admin-actions button.danger {
  border-color: rgba(188, 92, 74, 0.28) !important;
  background: rgba(255, 255, 255, 0.72) !important;
  color: #8f3d32 !important;
}

@media (max-width: 900px) {
  .cloud-roster-admin-page {
    padding-bottom: calc(112px + env(safe-area-inset-bottom));
  }

  .cloud-roster-admin-page .roster-admin-shell {
    width: min(100vw - 20px, 720px) !important;
  }

  .cloud-roster-admin-page .roster-admin-toolbar {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cloud-roster-admin-page .roster-admin-toolbar input {
    grid-column: 1 / -1;
    min-width: 0;
  }

  .cloud-roster-admin-page .roster-admin-form {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cloud-roster-admin-page .roster-admin-form label.wide {
    grid-column: 1 / -1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cloud-admin-sky__cloud {
    animation: none !important;
  }
}

@keyframes adminCloudDrift {
  from {
    transform: translate3d(-14px, 0, 0) scale(1);
  }

  to {
    transform: translate3d(22px, -10px, 0) scale(1.06);
  }
}
</style>

