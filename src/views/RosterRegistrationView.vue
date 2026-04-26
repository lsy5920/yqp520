<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import RosterPosterStudio from '@/components/roster/RosterPosterStudio.vue'
import { ASSESSMENT_RESULT_STORAGE_KEY, useAssessmentStorage } from '@/composables/useAssessmentStorage'
import { useRevealMotion } from '@/composables/useRevealMotion'
import { assessmentPaperConfig } from '@/data/assessmentContent'
import {
  createEmptyRosterCardForm,
  getRosterBondOption,
  getRosterIdentityOption,
  rosterBondOptions,
  rosterContent,
  rosterCoverOptions,
  rosterGenderOptions,
  rosterRegistrationGenderOptions,
  rosterIdentityOptions,
  rosterRegistrationSteps,
  rosterSkillPresets,
} from '@/data/rosterContent'
import { getSupabaseConfigErrorText, isSupabaseConfigured } from '@/lib/supabase'
import { checkRosterNameAvailable, submitRosterEntry } from '@/services/roster'
import type { AssessmentResult } from '@/types/assessment'
import type { PublicRosterCard, RosterBondKey, RosterCardFormValue, RosterCoverKey, RosterGenderKey, RosterIdentityKey, RosterRegistrationStepKey } from '@/types/roster'
import {
  clearRosterCardDraft,
  getRosterCoverGradient,
  loadRosterCardDraft,
  normalizeRosterCardForm,
  saveRosterCardDraft,
  validateRosterCardForm,
} from '@/utils/roster'

// 这里定义登记资格提示结构，方便模板统一展示未考核、未达标和已合格状态。
interface RosterAssessmentGateView {
  /** 用途：是否允许进入登记；入参含义：无；返回值含义：无 */
  allowed: boolean
  /** 用途：提示标题；入参含义：无；返回值含义：无 */
  title: string
  /** 用途：提示正文；入参含义：无；返回值含义：无 */
  description: string
  /** 用途：成绩说明；入参含义：无；返回值含义：无 */
  scoreText: string
}

// 这里保存页面根节点，用于统一显现动效。
const pageRef = ref<HTMLElement | null>(null)

// 这里启用页面显现动效，让手机卷轴进入时更顺滑。
useRevealMotion({ rootRef: pageRef })

// 这里拿到考核本地存储读取工具，登记资格只做本机拦截。
const { safeReadJson } = useAssessmentStorage()

// 这里保存当前步骤，手机端一次只聚焦一段内容。
const activeStepKey = ref<RosterRegistrationStepKey>('basic')

// 这里保存登记表单，初始化时先使用空表单，挂载后恢复草稿。
const formValue = ref<RosterCardFormValue>(createEmptyRosterCardForm())

// 这里保存自定义标签输入框内容。
const customSkillText = ref<string>('')

// 这里记录江湖名可用性提示。
const nameCheckMessage = ref<string>('')

// 这里记录提交过程状态，避免重复点击。
const isSubmitting = ref<boolean>(false)

// 这里记录校验和提交错误，方便用户按提示修改。
const errorList = ref<string[]>([])

// 这里记录最近一次问心榜考核结果，登记页会据此决定是否放行。
const latestAssessmentResult = ref<AssessmentResult | null>(null)

// 这里记录成功弹窗提示，提交完成后提醒用户保存待审玉佩帖。
const successMessage = ref<string>('')

// 这里记录成功回执号，方便弹窗里展示登记已经成功。
const successReceiptCode = ref<string>('')

// 这里记录登记成功后用于生成待审海报的公开安全数据。
const successPosterEntry = ref<PublicRosterCard | null>(null)

// 这里计算当前步骤序号，供下一步和上一步使用。
const activeStepIndex = computed<number>(() => rosterRegistrationSteps.findIndex((step) => step.key === activeStepKey.value))

// 这里计算当前步骤文案，模板里直接展示。
const activeStep = computed(() => rosterRegistrationSteps[activeStepIndex.value] || rosterRegistrationSteps[0]!)

// 这里计算清洗后的表单，预览卡片使用它避免展示脏空格。
const normalizedForm = computed<RosterCardFormValue>(() => normalizeRosterCardForm(formValue.value))

// 这里计算手机预览卡片背景，和用户选择的封面保持一致。
const previewCardStyle = computed<Record<string, string>>(() => ({
  '--roster-card-gradient': getRosterCoverGradient(normalizedForm.value.coverKey),
}))

// 这里计算已完成步骤数量，用于顶部进度条。
const finishedStepPercent = computed<string>(() => `${((activeStepIndex.value + 1) / rosterRegistrationSteps.length) * 100}%`)

// 这里计算当前考核是否达到登记门槛，题卷版本、合格标记和分数都必须满足。
const canRegisterRoster = computed<boolean>(() => isAssessmentResultQualified(latestAssessmentResult.value))

// 这里计算登记资格提示内容，模板按它显示引导卡或合格提示。
const assessmentGateView = computed<RosterAssessmentGateView>(() => {
  const result = latestAssessmentResult.value

  if (!result) {
    return {
      allowed: false,
      title: '先过问心榜，再递玉佩名帖',
      description: '本机还没有找到最近一次入派考核结果。请先完成问心考核，达到八十分合格后再回来登记。',
      scoreText: `当前题卷：${assessmentPaperConfig.version} · 合格线 ${assessmentPaperConfig.passScore} 分`,
    }
  }

  if (result.paperVersion !== assessmentPaperConfig.version) {
    return {
      allowed: false,
      title: '题卷已经更新，请重新考核',
      description: '你本机保存的是旧版问心榜结果。为保证入册口径一致，请按当前题卷重新完成考核。',
      scoreText: `旧题卷：${result.paperVersion || '未知'} · 当前题卷：${assessmentPaperConfig.version}`,
    }
  }

  if (!isAssessmentResultQualified(result)) {
    return {
      allowed: false,
      title: '问心榜尚未达标',
      description: '登记需要当前题卷考核合格，且分数不低于八十分。先温一遍立派典章，再回来会稳很多。',
      scoreText: `最近成绩：${Number(result.score || 0)} / ${Number(result.totalScore || assessmentPaperConfig.totalScore)} 分 · 合格线 ${assessmentPaperConfig.passScore} 分`,
    }
  }

  return {
    allowed: true,
    title: '问心榜已合格',
    description: '本机最近一次考核已经达到登记门槛，可以继续递交云栖玉佩名帖。',
    scoreText: `最近成绩：${result.score} / ${result.totalScore} 分 · 已通过`,
  }
})

// 这里在页面打开时恢复本地草稿。
onMounted(() => {
  formValue.value = loadRosterCardDraft(createEmptyRosterCardForm())
  refreshAssessmentResult()
  window.addEventListener('focus', refreshAssessmentResult)
  document.addEventListener('visibilitychange', refreshAssessmentResult)
})

// 这里在页面离开时清理监听，避免重复进入登记页后多次读取本地记录。
onUnmounted(() => {
  window.removeEventListener('focus', refreshAssessmentResult)
  document.removeEventListener('visibilitychange', refreshAssessmentResult)
})

// 这里监听表单变化自动保存草稿，避免误刷新丢失。
watch(formValue, (nextValue) => {
  saveRosterCardDraft(nextValue)
}, { deep: true })

/**
 * 刷新考核结果
 * 用途：从浏览器本地读取最近一次问心榜成绩
 * 入参：无
 * 返回值：无返回值
 */
function refreshAssessmentResult(): void {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    return
  }

  latestAssessmentResult.value = safeReadJson<AssessmentResult>(ASSESSMENT_RESULT_STORAGE_KEY)
}

/**
 * 判断考核结果是否合格
 * 用途：登记页展示和提交前二次拦截共用同一套门槛
 * 入参：result 为本机保存的最近一次考核结果
 * 返回值：合格返回 true，否则返回 false
 */
function isAssessmentResultQualified(result: AssessmentResult | null): boolean {
  if (!result) {
    return false
  }

  const score = Number(result.score)
  return result.paperVersion === assessmentPaperConfig.version
    && result.passed === true
    && Number.isFinite(score)
    && score >= assessmentPaperConfig.passScore
}

/**
 * 构造待审海报数据
 * 用途：登记成功后只用公开安全字段生成待云司审核海报
 * 入参：form 为已清洗表单，publicSlug 为提交成功后的公开标识
 * 返回值：返回可供海报组件使用的名帖数据
 */
function buildPendingPosterEntry(form: RosterCardFormValue, publicSlug: string): PublicRosterCard {
  const identityKey = (form.identityKey || 'wanderer') as RosterIdentityKey
  const bondKey = (form.bondKey || 'quiet') as RosterBondKey
  const identity = getRosterIdentityOption(identityKey)
  const bond = getRosterBondOption(bondKey)
  const createdAt = new Date().toISOString()

  return {
    id: publicSlug,
    publicSlug,
    jianghuName: form.jianghuName,
    displayTitle: '待云司审核',
    entryNo: null,
    identityKey: identity.key,
    identityLabel: identity.label,
    genderKey: form.genderKey,
    genderLabel: rosterGenderOptions.find((item) => item.key === form.genderKey)?.label || '未选择',
    regionText: form.isRegionPublic ? form.regionText : '云深不知处',
    motto: form.motto,
    storyText: form.isStoryPublic ? form.storyText : '此位同门选择把故事藏进云雾里。',
    skillTags: [...form.skillTags],
    bondKey: bond.key,
    bondLabel: bond.label,
    bondText: form.bondText || bond.description,
    coverKey: form.coverKey,
    heatValue: 0,
    featuredLevel: 0,
    approvedAt: '',
    createdAt,
  }
}

/**
 * 关闭成功弹窗
 * 用途：用户保存或复制后关闭待审海报弹窗
 * 入参：无
 * 返回值：无返回值
 */
function closeSuccessDialog(): void {
  successMessage.value = ''
  successReceiptCode.value = ''
  successPosterEntry.value = null
}

/**
 * 切换步骤
 * 用途：顶部步骤条和底部按钮统一调用
 * 入参：stepKey 为目标步骤键名
 * 返回值：无返回值
 */
function setActiveStep(stepKey: RosterRegistrationStepKey): void {
  activeStepKey.value = stepKey
}

/**
 * 前往下一步
 * 用途：手机端底部操作按钮推进表单
 * 入参：无
 * 返回值：无返回值
 */
function goNextStep(): void {
  const nextStep = rosterRegistrationSteps[activeStepIndex.value + 1]
  if (nextStep) {
    activeStepKey.value = nextStep.key
  }
}

/**
 * 返回上一步
 * 用途：手机端底部操作按钮回看表单
 * 入参：无
 * 返回值：无返回值
 */
function goPreviousStep(): void {
  const previousStep = rosterRegistrationSteps[activeStepIndex.value - 1]
  if (previousStep) {
    activeStepKey.value = previousStep.key
  }
}

/**
 * 选择身份
 * 用途：登记页身份卡片点击后写入表单
 * 入参：key 为身份键名
 * 返回值：无返回值
 */
function selectIdentity(key: RosterIdentityKey): void {
  formValue.value.identityKey = key
}

/**
 * 选择性别
 * 用途：登记页性别卡片点击后写入表单，后续用于玉佩光效
 * 入参：key 为性别键名
 * 返回值：无返回值
 */
function selectGender(key: RosterGenderKey): void {
  formValue.value.genderKey = key
}

/**
 * 选择羁绊
 * 用途：登记页羁绊卡片点击后写入表单
 * 入参：key 为羁绊键名
 * 返回值：无返回值
 */
function selectBond(key: RosterBondKey): void {
  formValue.value.bondKey = key
}

/**
 * 选择封面
 * 用途：登记页封面卡片点击后写入表单
 * 入参：key 为封面键名
 * 返回值：无返回值
 */
function selectCover(key: RosterCoverKey): void {
  formValue.value.coverKey = key
}

/**
 * 切换专长标签
 * 用途：预设标签点选时添加或移除
 * 入参：tag 为标签文字
 * 返回值：无返回值
 */
function toggleSkillTag(tag: string): void {
  const normalizedTag = tag.trim()
  if (!normalizedTag) {
    return
  }

  if (formValue.value.skillTags.includes(normalizedTag)) {
    formValue.value.skillTags = formValue.value.skillTags.filter((item) => item !== normalizedTag)
    return
  }

  if (formValue.value.skillTags.length >= 6) {
    errorList.value = ['专长标签最多选择 6 个']
    return
  }

  formValue.value.skillTags = [...formValue.value.skillTags, normalizedTag]
}

/**
 * 添加自定义标签
 * 用途：把用户输入的专长加入标签列表
 * 入参：无
 * 返回值：无返回值
 */
function addCustomSkillTag(): void {
  const nextTag = customSkillText.value.trim().replace(/^#/, '')
  if (!nextTag) {
    return
  }

  toggleSkillTag(nextTag)
  customSkillText.value = ''
}

/**
 * 检查江湖名
 * 用途：失焦时提示是否重名
 * 入参：无
 * 返回值：无返回值
 */
async function checkName(): Promise<void> {
  nameCheckMessage.value = ''

  if (!isSupabaseConfigured() || !normalizedForm.value.jianghuName) {
    return
  }

  try {
    const result = await checkRosterNameAvailable(normalizedForm.value.jianghuName)
    nameCheckMessage.value = result.message
  } catch (error) {
    nameCheckMessage.value = error instanceof Error ? error.message : '江湖名检查失败，可稍后提交时再试。'
  }
}

/**
 * 提交名帖
 * 用途：完成本地校验后写入 Supabase 新名帖表
 * 入参：无
 * 返回值：无返回值
 */
async function handleSubmit(): Promise<void> {
  errorList.value = []
  successMessage.value = ''
  successReceiptCode.value = ''
  successPosterEntry.value = null

  refreshAssessmentResult()
  if (!canRegisterRoster.value) {
    errorList.value = [assessmentGateView.value.description]
    return
  }

  if (!isSupabaseConfigured()) {
    errorList.value = [getSupabaseConfigErrorText()]
    return
  }

  const errors = validateRosterCardForm(formValue.value)
  if (errors.length > 0) {
    errorList.value = errors
    return
  }

  isSubmitting.value = true

  try {
    const submittedForm = {
      ...normalizedForm.value,
      skillTags: [...normalizedForm.value.skillTags],
    }
    const result = await submitRosterEntry({ form: submittedForm })
    clearRosterCardDraft()
    formValue.value = createEmptyRosterCardForm()
    activeStepKey.value = 'basic'
    successReceiptCode.value = result.publicSlug
    successPosterEntry.value = buildPendingPosterEntry(submittedForm, result.publicSlug)
    successMessage.value = `名帖已递入云栖案头，回执号：${result.publicSlug}。请保存待审玉佩帖，分享给云司扫码审核。`
  } catch (error) {
    errorList.value = [error instanceof Error ? error.message : '提交名帖失败，请稍后重试。']
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <main ref="pageRef" class="cloud-roster-page cloud-roster-registration">
    <div class="cloud-registration-sky" aria-hidden="true">
      <span class="cloud-registration-sky__cloud cloud-registration-sky__cloud--one"></span>
      <span class="cloud-registration-sky__cloud cloud-registration-sky__cloud--two"></span>
      <span class="cloud-registration-sky__stairs"></span>
    </div>

    <section class="cloud-registration-shell reveal-on-scroll">
      <div class="roster-hero-card">
        <p>{{ rosterContent.registration.eyebrow }}</p>
        <h1>{{ rosterContent.registration.title }}</h1>
        <span>{{ rosterContent.registration.lead }}</span>
        <RouterLink class="roster-ghost-link" to="/roster/list">先去翻看名册</RouterLink>
      </div>

      <section v-if="!canRegisterRoster" class="roster-assessment-gate reveal-on-scroll">
        <div class="roster-assessment-gate__cloud" aria-hidden="true"></div>
        <span>{{ assessmentGateView.scoreText }}</span>
        <h2>{{ assessmentGateView.title }}</h2>
        <p>{{ assessmentGateView.description }}</p>
        <div class="roster-assessment-gate__actions">
          <RouterLink class="roster-button" to="/join#exam">去入派考核</RouterLink>
          <button type="button" class="roster-button roster-button--ghost" @click="refreshAssessmentResult">我已考完，重新检查</button>
        </div>
      </section>

      <template v-else>
      <div class="roster-step-track" aria-label="登记步骤">
        <button
          v-for="step in rosterRegistrationSteps"
          :key="step.key"
          type="button"
          class="roster-step-pill"
          :class="{ 'roster-step-pill--active': activeStepKey === step.key }"
          @click="setActiveStep(step.key)"
        >
          <span>{{ step.indexText }}</span>
          <small>{{ step.title }}</small>
        </button>
      </div>

      <div class="roster-progress"><i :style="{ width: finishedStepPercent }"></i></div>

      <section class="roster-scroll-card reveal-on-scroll">
        <div class="roster-scroll-card__head">
          <span>第{{ activeStep.indexText }}步</span>
          <h2>{{ activeStep.title }}</h2>
          <p>{{ activeStep.description }}</p>
        </div>

        <div v-if="activeStepKey === 'basic'" class="roster-form-grid">
          <label class="roster-field">
            <span>江湖名</span>
            <input v-model="formValue.jianghuName" maxlength="12" placeholder="例如：听雪客" type="text" @blur="checkName" />
            <small>{{ nameCheckMessage || '最多 12 个字，审核通过后会公开展示。' }}</small>
          </label>
          <label class="roster-field">
            <span>真实姓名</span>
            <input v-model="formValue.titleName" maxlength="14" placeholder="例如：李小云" type="text" />
          </label>
          <label class="roster-field">
            <span>所在地域</span>
            <input v-model="formValue.regionText" maxlength="18" placeholder="例如：江南一带 / 云深不知处" type="text" />
          </label>
          <div class="roster-gender-panel">
            <span>性别光效</span>
            <div class="roster-gender-options">
              <button
                v-for="item in rosterRegistrationGenderOptions"
                :key="item.key"
                type="button"
                class="roster-gender-card"
                :class="[`roster-gender-card--${item.key}`, { 'roster-gender-card--active': formValue.genderKey === item.key }]"
                @click="selectGender(item.key)"
              >
                <strong>{{ item.label }}</strong>
                <small>{{ item.description }}</small>
                <em>{{ item.glowLabel }}</em>
              </button>
            </div>
          </div>
          <div class="roster-choice-grid">
            <button
              v-for="item in rosterIdentityOptions"
              :key="item.key"
              type="button"
              class="roster-choice-card"
              :class="{ 'roster-choice-card--active': formValue.identityKey === item.key }"
              @click="selectIdentity(item.key)"
            >
              <b>{{ item.icon }}</b>
              <span>{{ item.label }}</span>
              <small>{{ item.description }}</small>
            </button>
          </div>
        </div>

        <div v-if="activeStepKey === 'spirit'" class="roster-form-grid">
          <label class="roster-field">
            <span>江湖宣言</span>
            <input v-model="formValue.motto" maxlength="36" placeholder="一句话让同门记住你" type="text" />
          </label>
          <label class="roster-field">
            <span>个人故事</span>
            <textarea v-model="formValue.storyText" maxlength="240" placeholder="写写你的性格、来意、想在云栖留下什么故事。"></textarea>
          </label>
          <div class="roster-tag-panel">
            <span>专长标签</span>
            <div class="roster-tag-list">
              <button
                v-for="tag in rosterSkillPresets"
                :key="tag"
                type="button"
                :class="{ 'roster-tag--active': formValue.skillTags.includes(tag) }"
                @click="toggleSkillTag(tag)"
              >#{{ tag }}</button>
            </div>
            <div class="roster-tag-input">
              <input v-model="customSkillText" maxlength="8" placeholder="自定义标签" type="text" @keyup.enter="addCustomSkillTag" />
              <button type="button" @click="addCustomSkillTag">加入</button>
            </div>
          </div>
        </div>

        <div v-if="activeStepKey === 'bond'" class="roster-form-grid">
          <div class="roster-choice-grid roster-choice-grid--single">
            <button
              v-for="item in rosterBondOptions"
              :key="item.key"
              type="button"
              class="roster-choice-card"
              :class="{ 'roster-choice-card--active': formValue.bondKey === item.key }"
              @click="selectBond(item.key)"
            >
              <span>{{ item.label }}</span>
              <small>{{ item.description }}</small>
            </button>
          </div>
          <label class="roster-field">
            <span>同行期待</span>
            <textarea v-model="formValue.bondText" maxlength="180" placeholder="说说你希望遇见怎样的同门，或愿意提供怎样的陪伴。"></textarea>
          </label>
        </div>

        <div v-if="activeStepKey === 'display'" class="roster-form-grid">
          <div class="roster-cover-grid">
            <button
              v-for="item in rosterCoverOptions"
              :key="item.key"
              type="button"
              class="roster-cover-card"
              :class="{ 'roster-cover-card--active': formValue.coverKey === item.key }"
              :style="{ background: item.gradient }"
              @click="selectCover(item.key)"
            >{{ item.label }}</button>
          </div>
          <label class="roster-switch"><input v-model="formValue.isRegionPublic" type="checkbox" />公开展示所在地域</label>
          <label class="roster-switch"><input v-model="formValue.isStoryPublic" type="checkbox" />公开展示个人故事</label>
          <div class="roster-preview-card" :style="previewCardStyle">
            <span>{{ normalizedForm.titleName }}</span>
            <strong>{{ normalizedForm.jianghuName || '你的江湖名' }}</strong>
            <em>{{ rosterGenderOptions.find((item) => item.key === normalizedForm.genderKey)?.label || '未选择' }}</em>
            <p>{{ normalizedForm.motto || '你的江湖宣言会出现在这里。' }}</p>
          </div>
        </div>

        <div v-if="activeStepKey === 'pledge'" class="roster-form-grid">
          <label class="roster-field">
            <span>执事可见联系方式</span>
            <input v-model="formValue.contactText" maxlength="80" placeholder="微信 / QQ / 其他稳定联系方式" type="text" />
            <small>只给审核执事查看，不会出现在公开卡册里。</small>
          </label>
          <label class="roster-pledge-box">
            <input v-model="formValue.agreedToPledge" type="checkbox" />
            <span>{{ rosterContent.registration.pledge }}</span>
          </label>
          <div v-if="errorList.length" class="roster-message roster-message--error">
            <p v-for="error in errorList" :key="error">{{ error }}</p>
          </div>
        </div>

        <div class="roster-form-actions">
          <button type="button" class="roster-button roster-button--ghost" :disabled="activeStepIndex === 0" @click="goPreviousStep">上一步</button>
          <button v-if="activeStepKey !== 'pledge'" type="button" class="roster-button" @click="goNextStep">下一步</button>
          <button v-else type="button" class="roster-button" :disabled="isSubmitting" @click="handleSubmit">
            {{ isSubmitting ? '递交中……' : '按印递交名帖' }}
          </button>
        </div>
      </section>
      </template>
    </section>

    <div v-if="successMessage" class="roster-success-dialog" role="dialog" aria-modal="true" aria-label="名帖递交成功">
      <div class="roster-success-dialog__card">
        <span>已登记</span>
        <h2>名帖已递交，待审核</h2>
        <p>{{ successMessage }}</p>
        <small v-if="successReceiptCode">回执号：{{ successReceiptCode }}</small>
        <RosterPosterStudio
          v-if="successPosterEntry"
          :entry="successPosterEntry"
          status="pending"
          :allow-poster-actions="true"
        />
        <button type="button" class="roster-button roster-success-dialog__close" @click="closeSuccessDialog">关闭弹窗</button>
      </div>
    </div>
  </main>
</template>

<style scoped>
.roster-mobile-page {
  min-height: 100vh;
  padding: 108px 14px 96px;
  background:
    radial-gradient(circle at 50% 0%, rgba(218, 176, 88, 0.28), transparent 30%),
    radial-gradient(circle at 10% 22%, rgba(84, 143, 161, 0.24), transparent 28%),
    linear-gradient(180deg, #070b12 0%, #101724 48%, #090b10 100%);
}

.roster-phone-shell {
  position: relative;
  width: min(100%, 430px);
  margin: 0 auto;
  color: #f8efd8;
}

.roster-hero-card,
.roster-scroll-card {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(231, 190, 107, 0.28);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.03)),
    rgba(11, 16, 28, 0.92);
  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.38);
  backdrop-filter: blur(18px);
}

.roster-hero-card {
  display: grid;
  gap: 12px;
  padding: 28px 22px;
  border-radius: 32px;
  animation: rosterMistIn 0.8s ease both;
}

.roster-hero-card::before,
.roster-scroll-card::before {
  position: absolute;
  inset: -40% -20% auto;
  height: 180px;
  background: radial-gradient(circle, rgba(255, 232, 170, 0.24), transparent 62%);
  content: '';
  filter: blur(8px);
  pointer-events: none;
}

.roster-hero-card p,
.roster-hero-card h1,
.roster-hero-card span {
  position: relative;
  margin: 0;
}

.roster-hero-card p,
.roster-scroll-card__head span {
  color: #e8bd68;
  font-size: 0.78rem;
  letter-spacing: 0.18em;
}

.roster-hero-card h1 {
  font-size: clamp(2rem, 9vw, 3.2rem);
  line-height: 1.1;
}

.roster-hero-card span,
.roster-scroll-card__head p,
.roster-field small,
.roster-choice-card small {
  color: rgba(248, 239, 216, 0.72);
  line-height: 1.75;
}

.roster-ghost-link {
  position: relative;
  justify-self: start;
  color: #ffe1a3;
  text-decoration: none;
}

.roster-step-track {
  display: flex;
  gap: 10px;
  margin: 16px -14px 10px;
  padding: 0 14px 4px;
  overflow-x: auto;
}

.roster-step-pill {
  display: grid;
  flex: 0 0 auto;
  gap: 4px;
  min-width: 82px;
  padding: 11px 12px;
  border: 1px solid rgba(231, 190, 107, 0.2);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(248, 239, 216, 0.68);
}

.roster-step-pill--active {
  background: linear-gradient(135deg, rgba(231, 190, 107, 0.95), rgba(255, 239, 190, 0.9));
  color: #1b1307;
  transform: translateY(-2px);
}

.roster-step-pill span {
  font-size: 1rem;
  font-weight: 800;
}

.roster-step-pill small {
  font-size: 0.76rem;
}

.roster-progress {
  height: 5px;
  margin-bottom: 16px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
}

.roster-progress i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #dfad55, #fff2ba);
  transition: width 0.35s ease;
}

.roster-scroll-card {
  display: grid;
  gap: 22px;
  padding: 22px 18px;
  border-radius: 28px;
}

.roster-scroll-card__head {
  position: relative;
  display: grid;
  gap: 8px;
}

.roster-scroll-card__head h2,
.roster-scroll-card__head p {
  margin: 0;
}

.roster-scroll-card__head h2 {
  font-size: 1.55rem;
}

.roster-form-grid,
.roster-field {
  display: grid;
  gap: 14px;
}

.roster-field span,
.roster-tag-panel > span {
  color: #ffe1a3;
  font-weight: 700;
}

.roster-field input,
.roster-field textarea,
.roster-tag-input input {
  width: 100%;
  border: 1px solid rgba(231, 190, 107, 0.2);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff8e7;
  font: inherit;
  outline: none;
}

.roster-field input,
.roster-tag-input input {
  min-height: 50px;
  padding: 0 16px;
}

.roster-field textarea {
  min-height: 128px;
  padding: 14px 16px;
  resize: vertical;
}

.roster-choice-grid,
.roster-cover-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.roster-gender-panel,
.roster-gender-options {
  display: grid;
  gap: 10px;
}

.roster-gender-panel {
  grid-column: 1 / -1;
}

.roster-gender-panel > span {
  color: #ffe1a3;
  font-weight: 700;
}

.roster-gender-options {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.roster-gender-card {
  position: relative;
  display: grid;
  gap: 7px;
  min-height: 118px;
  overflow: hidden;
  padding: 14px;
  border: 1px solid rgba(231, 190, 107, 0.18);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.06);
  color: #f8efd8;
  text-align: left;
}

.roster-gender-card::before {
  position: absolute;
  inset: -45% -20% auto;
  height: 96px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0);
  content: '';
  filter: blur(16px);
  pointer-events: none;
}

.roster-gender-card--male::before {
  background: rgba(88, 210, 255, 0.42);
}

.roster-gender-card--female::before {
  background: rgba(255, 151, 205, 0.42);
}

.roster-gender-card strong,
.roster-gender-card small,
.roster-gender-card em {
  position: relative;
  z-index: 1;
}

.roster-gender-card em {
  color: rgba(248, 239, 216, 0.72);
  font-style: normal;
}

.roster-gender-card--active {
  border-color: rgba(255, 225, 163, 0.95);
  box-shadow: 0 0 0 2px rgba(231, 190, 107, 0.16), 0 16px 36px rgba(0, 0, 0, 0.28);
  transform: translateY(-2px);
}

.roster-choice-grid--single {
  grid-template-columns: 1fr;
}

.roster-choice-card,
.roster-cover-card {
  min-height: 108px;
  padding: 14px;
  border: 1px solid rgba(231, 190, 107, 0.18);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.06);
  color: #f8efd8;
  text-align: left;
  transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
}

.roster-choice-card {
  display: grid;
  gap: 8px;
}

.roster-choice-card b {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 12px;
  background: rgba(231, 190, 107, 0.18);
}

.roster-choice-card--active,
.roster-cover-card--active {
  border-color: rgba(255, 225, 163, 0.95);
  box-shadow: 0 0 0 2px rgba(231, 190, 107, 0.16), 0 16px 36px rgba(0, 0, 0, 0.28);
  transform: translateY(-2px);
}

.roster-tag-panel,
.roster-tag-list,
.roster-tag-input {
  display: grid;
  gap: 10px;
}

.roster-tag-list {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.roster-tag-list button,
.roster-tag-input button {
  min-height: 40px;
  border: 1px solid rgba(231, 190, 107, 0.18);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: #f8efd8;
}

.roster-tag-list .roster-tag--active,
.roster-tag-input button {
  background: rgba(231, 190, 107, 0.92);
  color: #170f06;
}

.roster-tag-input {
  grid-template-columns: 1fr auto;
}

.roster-cover-card {
  display: grid;
  align-items: end;
  color: #fff8e7;
  font-weight: 800;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
}

.roster-switch,
.roster-pledge-box {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 14px;
  border: 1px solid rgba(231, 190, 107, 0.18);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.06);
  line-height: 1.7;
}

.roster-preview-card {
  display: grid;
  gap: 10px;
  min-height: 220px;
  padding: 24px;
  border-radius: 28px;
  background: var(--roster-card-gradient);
  box-shadow: inset 0 0 0 1px rgba(255, 238, 190, 0.24);
}

.roster-preview-card span,
.roster-preview-card strong,
.roster-preview-card p {
  margin: 0;
}

.roster-preview-card strong {
  font-size: 2.2rem;
}

.roster-message {
  padding: 14px;
  border-radius: 18px;
  line-height: 1.7;
}

.roster-message p {
  margin: 0;
}

.roster-message--error {
  border: 1px solid rgba(248, 113, 113, 0.36);
  background: rgba(127, 29, 29, 0.22);
}

.roster-assessment-gate {
  position: relative;
  display: grid;
  gap: 14px;
  overflow: hidden;
  padding: clamp(24px, 5vw, 42px);
  border: 1px solid rgba(96, 170, 184, 0.24);
  border-radius: 36px;
  background: rgba(255, 255, 255, 0.78);
  color: #103f4a;
  box-shadow: 0 28px 70px rgba(55, 143, 158, 0.18);
  backdrop-filter: blur(24px);
}

.roster-assessment-gate__cloud {
  position: absolute;
  right: -58px;
  bottom: -56px;
  width: 250px;
  height: 170px;
  border-radius: 999px;
  background:
    radial-gradient(circle at 28% 44%, rgba(255, 255, 255, 0.98), transparent 34%),
    radial-gradient(circle at 62% 48%, rgba(175, 231, 236, 0.42), transparent 42%);
  pointer-events: none;
  animation: registrationCloudDrift 12s ease-in-out infinite alternate;
}

.roster-assessment-gate > *:not(.roster-assessment-gate__cloud) {
  position: relative;
  z-index: 1;
}

.roster-assessment-gate span {
  color: #0d7c8a;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.roster-assessment-gate h2,
.roster-assessment-gate p {
  margin: 0;
}

.roster-assessment-gate h2 {
  color: #103f4a;
  font-size: clamp(1.8rem, 6vw, 3.4rem);
  line-height: 1.08;
}

.roster-assessment-gate p {
  max-width: 42em;
  color: rgba(16, 63, 74, 0.72);
  line-height: 1.8;
}

.roster-assessment-gate__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 6px;
}

.roster-assessment-gate__actions .roster-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
}

.roster-success-dialog {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 22px;
  background: rgba(12, 48, 50, 0.28);
  backdrop-filter: blur(10px);
}

.roster-success-dialog__card {
  display: grid;
  gap: 12px;
  width: min(100%, 880px);
  max-height: calc(100dvh - 44px);
  overflow: auto;
  padding: 28px 22px;
  border: 1px solid rgba(47, 155, 145, 0.28);
  border-radius: 28px;
  background:
    radial-gradient(circle at top, rgba(191, 232, 223, 0.62), transparent 42%),
    rgba(255, 255, 250, 0.96);
  color: #123a3c;
  text-align: center;
  box-shadow: 0 28px 70px rgba(28, 74, 75, 0.22);
}

.roster-success-dialog__close {
  justify-self: center;
  min-width: 180px;
}

.roster-success-dialog__card span {
  color: #1f817a;
  font-size: 0.82rem;
  letter-spacing: 0.18em;
}

.roster-success-dialog__card h2,
.roster-success-dialog__card p {
  margin: 0;
}

.roster-success-dialog__card h2 {
  font-size: 2rem;
  color: #123a3c;
}

.roster-success-dialog__card p,
.roster-success-dialog__card small {
  color: rgba(18, 58, 60, 0.72);
  line-height: 1.75;
}

.roster-form-actions {
  position: sticky;
  bottom: 12px;
  display: grid;
  grid-template-columns: 0.8fr 1.2fr;
  gap: 10px;
  z-index: 2;
}

.roster-button {
  min-height: 50px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, #dfad55, #fff0b8);
  color: #160f07;
  font-weight: 800;
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.3);
}

.roster-button--ghost {
  border: 1px solid rgba(231, 190, 107, 0.2);
  background: rgba(255, 255, 255, 0.08);
  color: #f8efd8;
}

.roster-button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

@keyframes rosterMistIn {
  from {
    opacity: 0;
    transform: translateY(18px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (min-width: 760px) {
  .roster-mobile-page {
    padding-top: 128px;
  }
}

/* 仙气云海重设计：登记页外层改为五重云阶，不再沿用深色金墨底。 */
.cloud-roster-registration {
  position: relative;
  min-height: 100dvh;
  padding: 18px 0 calc(118px + env(safe-area-inset-bottom));
  overflow: hidden;
  color: #103f4a;
  isolation: isolate;
}

.cloud-registration-sky {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
  background:
    radial-gradient(circle at 18% 10%, rgba(255, 255, 255, 0.96), transparent 24%),
    radial-gradient(circle at 82% 18%, rgba(160, 225, 235, 0.44), transparent 30%),
    linear-gradient(180deg, #eefcff 0%, #dff8f8 48%, #f7fbef 100%);
}

.cloud-registration-sky__cloud,
.cloud-registration-sky__stairs {
  position: absolute;
  pointer-events: none;
}

.cloud-registration-sky__cloud {
  border-radius: 999px;
  background:
    radial-gradient(circle at 30% 40%, rgba(255, 255, 255, 0.96), transparent 34%),
    radial-gradient(circle at 62% 44%, rgba(255, 255, 255, 0.82), transparent 38%),
    radial-gradient(circle at 50% 70%, rgba(152, 222, 228, 0.34), transparent 44%);
  filter: blur(4px);
  opacity: 0.76;
  animation: registrationCloudDrift 16s ease-in-out infinite alternate;
}

.cloud-registration-sky__cloud--one {
  left: -10%;
  top: 10%;
  width: 340px;
  height: 260px;
}

.cloud-registration-sky__cloud--two {
  right: -12%;
  bottom: 16%;
  width: 390px;
  height: 280px;
  animation-delay: 1.6s;
}

.cloud-registration-sky__stairs {
  inset: 20% -8% auto;
  height: 260px;
  background:
    linear-gradient(115deg, transparent 0 18%, rgba(255, 255, 255, 0.46) 18% 26%, transparent 26% 38%, rgba(255, 255, 255, 0.34) 38% 45%, transparent 45%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.18), transparent);
  transform: rotate(-6deg);
}

.cloud-registration-shell {
  display: grid;
  gap: 18px;
  width: min(1080px, calc(100vw - 28px));
  margin: 0 auto;
}

/* 仙气云海重设计：首屏说明卡变成明亮云门。 */
.cloud-roster-registration .roster-hero-card {
  display: grid !important;
  gap: 14px !important;
  padding: clamp(24px, 5vw, 48px) !important;
  border: 1px solid rgba(96, 170, 184, 0.24) !important;
  border-radius: 42px !important;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.86), rgba(230, 250, 250, 0.58)),
    rgba(255, 255, 255, 0.62) !important;
  color: #103f4a !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.88),
    0 34px 88px rgba(55, 143, 158, 0.18) !important;
  backdrop-filter: blur(24px) !important;
}

.cloud-roster-registration .roster-hero-card::after {
  position: absolute;
  right: -36px;
  bottom: -54px;
  width: 210px;
  height: 150px;
  border-radius: 999px;
  background:
    radial-gradient(circle at 28% 44%, rgba(255, 255, 255, 0.98), transparent 34%),
    radial-gradient(circle at 62% 48%, rgba(175, 231, 236, 0.42), transparent 42%);
  content: '';
  pointer-events: none;
}

.cloud-roster-registration .roster-hero-card p,
.cloud-roster-registration .roster-scroll-card__head span,
.cloud-roster-registration .roster-field span,
.cloud-roster-registration .roster-tag-panel > span {
  color: #0d7c8a !important;
  font-weight: 900 !important;
}

.cloud-roster-registration .roster-hero-card h1,
.cloud-roster-registration .roster-scroll-card__head h2 {
  color: #103f4a !important;
  text-shadow: none !important;
}

.cloud-roster-registration .roster-hero-card h1 {
  max-width: 11em;
  font-size: clamp(2.3rem, 7vw, 5rem) !important;
  line-height: 1 !important;
}

.cloud-roster-registration .roster-hero-card span,
.cloud-roster-registration .roster-scroll-card__head p,
.cloud-roster-registration .roster-field small,
.cloud-roster-registration .roster-choice-card small {
  color: rgba(16, 63, 74, 0.72) !important;
}

.cloud-roster-registration .roster-ghost-link {
  justify-self: start;
  min-height: 46px;
  padding: 0 18px;
  display: inline-flex;
  align-items: center;
  border: 1px solid rgba(46, 143, 158, 0.24);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.68);
  color: #0d7c8a;
  font-weight: 900;
}

/* 仙气云海重设计：步骤条改为云阶，当前步骤像升起的云签。 */
.cloud-roster-registration .roster-step-track {
  display: flex !important;
  gap: 10px !important;
  margin: 0 -14px !important;
  padding: 6px 14px 8px !important;
  overflow-x: auto !important;
  overscroll-behavior-x: contain;
}

.cloud-roster-registration .roster-step-pill {
  flex: 0 0 auto;
  min-width: 104px;
  min-height: 62px;
  padding: 12px 14px !important;
  border: 1px solid rgba(96, 170, 184, 0.22) !important;
  border-radius: 24px 24px 24px 10px !important;
  background: rgba(255, 255, 255, 0.7) !important;
  color: rgba(16, 63, 74, 0.72) !important;
  box-shadow: 0 14px 30px rgba(55, 143, 158, 0.12);
}

.cloud-roster-registration .roster-step-pill--active {
  background: linear-gradient(135deg, #79d6dc, #fff5bf) !important;
  color: #103f4a !important;
  transform: translateY(-3px);
  box-shadow: 0 20px 44px rgba(55, 143, 158, 0.2);
}

.cloud-roster-registration .roster-progress {
  height: 7px;
  margin: 0 0 2px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.52);
}

.cloud-roster-registration .roster-progress i {
  background: linear-gradient(90deg, #6dcbd7, #fff1ad) !important;
}

/* 仙气云海重设计：表单主体变成柔光玻璃云窗。 */
.cloud-roster-registration .roster-scroll-card {
  display: grid !important;
  gap: 22px !important;
  padding: clamp(20px, 4vw, 34px) !important;
  border: 1px solid rgba(96, 170, 184, 0.22) !important;
  border-radius: 36px !important;
  background: rgba(255, 255, 255, 0.78) !important;
  color: #103f4a !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.88),
    0 28px 70px rgba(55, 143, 158, 0.18) !important;
  backdrop-filter: blur(24px) !important;
}

.cloud-roster-registration .roster-field input,
.cloud-roster-registration .roster-field textarea,
.cloud-roster-registration .roster-tag-input input {
  border-color: rgba(46, 143, 158, 0.24) !important;
  background: rgba(255, 255, 255, 0.82) !important;
  color: #103f4a !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.86) !important;
}

.cloud-roster-registration .roster-field input::placeholder,
.cloud-roster-registration .roster-field textarea::placeholder,
.cloud-roster-registration .roster-tag-input input::placeholder {
  color: rgba(16, 63, 74, 0.42) !important;
}

.cloud-roster-registration .roster-choice-card,
.cloud-roster-registration .roster-cover-card,
.cloud-roster-registration .roster-gender-card,
.cloud-roster-registration .roster-tag-list button,
.cloud-roster-registration .roster-tag-input button,
.cloud-roster-registration .roster-switch,
.cloud-roster-registration .roster-pledge-box {
  border-color: rgba(96, 170, 184, 0.2) !important;
  background: rgba(255, 255, 255, 0.68) !important;
  color: #103f4a !important;
  box-shadow: 0 14px 30px rgba(55, 143, 158, 0.1);
}

.cloud-roster-registration .roster-choice-card--active,
.cloud-roster-registration .roster-cover-card--active,
.cloud-roster-registration .roster-gender-card--active,
.cloud-roster-registration .roster-tag-list .roster-tag--active {
  border-color: rgba(16, 126, 146, 0.42) !important;
  background: linear-gradient(135deg, rgba(121, 214, 220, 0.9), rgba(255, 245, 191, 0.86)) !important;
  color: #103f4a !important;
}

.cloud-roster-registration .roster-choice-card b {
  background: rgba(121, 214, 220, 0.2);
  color: #0d7c8a;
}

.cloud-roster-registration .roster-cover-card {
  color: #103f4a !important;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.72) !important;
}

.cloud-roster-registration .roster-gender-panel > span,
.cloud-roster-registration .roster-gender-card strong {
  color: #0d7c8a !important;
  font-weight: 900;
}

.cloud-roster-registration .roster-gender-card small,
.cloud-roster-registration .roster-gender-card em {
  color: rgba(16, 63, 74, 0.66) !important;
  line-height: 1.55;
}

.cloud-roster-registration .roster-preview-card {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.72);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.84), rgba(255, 255, 255, 0.38)),
    var(--roster-card-gradient) !important;
  color: #103f4a !important;
  box-shadow: 0 22px 54px rgba(55, 143, 158, 0.16) !important;
}

.cloud-roster-registration .roster-preview-card::before {
  position: absolute;
  inset: auto -24px -34px -24px;
  height: 118px;
  border-radius: 999px;
  background:
    radial-gradient(circle at 22% 42%, rgba(255, 255, 255, 0.92), transparent 34%),
    radial-gradient(circle at 62% 48%, rgba(175, 231, 236, 0.42), transparent 42%);
  content: '';
  pointer-events: none;
}

.cloud-roster-registration .roster-preview-card > * {
  position: relative;
  z-index: 1;
}

.cloud-roster-registration .roster-message--error {
  border-color: rgba(188, 92, 74, 0.28);
  background: rgba(255, 255, 255, 0.72);
  color: #8f3d32;
}

.cloud-roster-registration .roster-button {
  border: 1px solid rgba(46, 143, 158, 0.24) !important;
  background: linear-gradient(135deg, #79d6dc, #fff5bf) !important;
  color: #103f4a !important;
  font-weight: 900 !important;
  box-shadow: 0 18px 36px rgba(55, 143, 158, 0.16) !important;
}

.cloud-roster-registration .roster-button--ghost {
  background: rgba(255, 255, 255, 0.72) !important;
}

.cloud-roster-registration .roster-success-dialog {
  background: rgba(130, 209, 218, 0.26);
}

.cloud-roster-registration .roster-success-dialog__card {
  border-color: rgba(96, 170, 184, 0.22);
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.96), transparent 38%),
    rgba(255, 255, 255, 0.92);
  box-shadow: 0 30px 80px rgba(55, 143, 158, 0.24);
}

@media (min-width: 900px) {
  .cloud-registration-shell {
    grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
    align-items: start;
  }

  .cloud-roster-registration .roster-hero-card {
    position: sticky;
    top: 24px;
  }

  .cloud-roster-registration .roster-step-track,
  .cloud-roster-registration .roster-progress,
  .cloud-roster-registration .roster-scroll-card {
    grid-column: 2;
  }
}

@media (max-width: 720px) {
  .cloud-registration-shell {
    width: min(100vw - 20px, 430px);
  }

  .cloud-roster-registration .roster-form-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cloud-roster-registration .roster-choice-grid,
  .cloud-roster-registration .roster-cover-grid,
  .cloud-roster-registration .roster-gender-options {
    grid-column: 1 / -1;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }

  .cloud-roster-registration .roster-field:has(textarea),
  .cloud-roster-registration .roster-tag-panel,
  .cloud-roster-registration .roster-preview-card,
  .cloud-roster-registration .roster-pledge-box,
  .cloud-roster-registration .roster-message {
    grid-column: 1 / -1;
  }

  .cloud-roster-registration .roster-choice-card,
  .cloud-roster-registration .roster-cover-card {
    min-height: 116px;
    padding: 12px;
  }

  .cloud-roster-registration .roster-tag-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .roster-assessment-gate__actions {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cloud-registration-sky__cloud,
  .roster-assessment-gate__cloud {
    animation: none !important;
  }
}

@keyframes registrationCloudDrift {
  from {
    transform: translate3d(-14px, 0, 0) scale(1);
  }

  to {
    transform: translate3d(22px, -10px, 0) scale(1.06);
  }
}
</style>



