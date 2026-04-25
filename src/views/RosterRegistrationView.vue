<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useRevealMotion } from '@/composables/useRevealMotion'
import {
  createEmptyRosterCardForm,
  rosterBondOptions,
  rosterContent,
  rosterCoverOptions,
  rosterIdentityOptions,
  rosterRegistrationSteps,
  rosterSkillPresets,
} from '@/data/rosterContent'
import { getSupabaseConfigErrorText, isSupabaseConfigured } from '@/lib/supabase'
import { checkRosterNameAvailable, submitRosterEntry } from '@/services/roster'
import type { RosterBondKey, RosterCardFormValue, RosterCoverKey, RosterIdentityKey, RosterRegistrationStepKey } from '@/types/roster'
import {
  clearRosterCardDraft,
  getRosterCoverGradient,
  loadRosterCardDraft,
  normalizeRosterCardForm,
  saveRosterCardDraft,
  validateRosterCardForm,
} from '@/utils/roster'

// 这里保存页面根节点，用于统一显现动效。
const pageRef = ref<HTMLElement | null>(null)

// 这里启用页面显现动效，让手机卷轴进入时更顺滑。
useRevealMotion({ rootRef: pageRef })

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

// 这里记录成功弹窗提示，提交完成后提醒用户等待审核。
const successMessage = ref<string>('')

// 这里记录成功回执号，方便弹窗里展示登记已经成功。
const successReceiptCode = ref<string>('')

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

// 这里在页面打开时恢复本地草稿。
onMounted(() => {
  formValue.value = loadRosterCardDraft(createEmptyRosterCardForm())
})

// 这里监听表单变化自动保存草稿，避免误刷新丢失。
watch(formValue, (nextValue) => {
  saveRosterCardDraft(nextValue)
}, { deep: true })

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

  if (!isSupabaseConfigured()) {
    errorList.value = [getSupabaseConfigErrorText()]
    return
  }

  const errors = validateRosterCardForm(formValue.value)
  if (errors.length > 0) {
    errorList.value = errors
    activeStepKey.value = 'basic'
    return
  }

  isSubmitting.value = true

  try {
    const result = await submitRosterEntry({ form: normalizedForm.value })
    clearRosterCardDraft()
    formValue.value = createEmptyRosterCardForm()
    activeStepKey.value = 'basic'
    successMessage.value = `名帖已递入云栖案头，回执号：${result.publicSlug}。执事审核后即可公开入册。`
  } catch (error) {
    errorList.value = [error instanceof Error ? error.message : '提交名帖失败，请稍后重试。']
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <main ref="pageRef" class="roster-mobile-page roster-registration-page">
    <section class="roster-phone-shell reveal-on-scroll">
      <div class="roster-hero-card">
        <p>{{ rosterContent.registration.eyebrow }}</p>
        <h1>{{ rosterContent.registration.title }}</h1>
        <span>{{ rosterContent.registration.lead }}</span>
        <RouterLink class="roster-ghost-link" to="/roster/list">先去翻看名册</RouterLink>
      </div>

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
            <span>称号</span>
            <input v-model="formValue.titleName" maxlength="14" placeholder="例如：月下执剑人" type="text" />
          </label>
          <label class="roster-field">
            <span>所在地域</span>
            <input v-model="formValue.regionText" maxlength="18" placeholder="例如：江南一带 / 云深不知处" type="text" />
          </label>
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
    </section>

    <div v-if="successMessage" class="roster-success-dialog" role="dialog" aria-modal="true" aria-label="??????">
      <div class="roster-success-dialog__card">
        <span>?????</span>
        <h2>???????</h2>
        <p>{{ successMessage }}</p>
        <small v-if="successReceiptCode">?????{{ successReceiptCode }}</small>
        <button type="button" class="roster-button" @click="successMessage = ''">????</button>
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
  width: min(100%, 390px);
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
</style>


