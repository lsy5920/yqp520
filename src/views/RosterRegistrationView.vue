<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import PageBanner from '@/components/common/PageBanner.vue'
import {
  createDefaultRosterRegistrationForm,
  rosterContent,
  rosterContributionOptions,
  rosterFreeTimeOptions,
  rosterHallOptions,
  rosterRegistrationSections,
} from '@/data/rosterContent'
import { getSupabaseConfigErrorText, isSupabaseConfigured } from '@/lib/supabase'
import { checkRosterDaohaoAvailable, submitRosterEntry } from '@/services/roster'
import type { RosterContributionLevel, RosterFreeTimeSlot, RosterHallKey, RosterRegistrationFormValue } from '@/types/roster'
import {
  getRosterDaohaoError,
  mapRosterFormToSubmitPayload,
  normalizeRosterFormValue,
  validateRosterRegistrationForm,
} from '@/utils/roster'

// 这里保存页面根节点，供整页做统一显现动效。
const pageRef = ref<HTMLElement | null>(null)

// 这里拿到路由实例，提交成功后要跳到公开详情页。
const router = useRouter()

// 这里保存登记表单的当前内容。
const formValue = ref<RosterRegistrationFormValue>(createDefaultRosterRegistrationForm())

// 这里记录是否正在检查道号，避免用户不清楚当前状态。
const isCheckingDaohao = ref<boolean>(false)

// 这里记录是否正在提交文牒，防止重复提交。
const isSubmitting = ref<boolean>(false)

// 这里保存当前动作提示，给用户更明确的反馈。
const actionMessage = ref<string>(rosterContent.registration.formLead)

// 这里保存道号校验提示，失焦校验和提交前校验都写到这里。
const daohaoMessage = ref<string>(rosterContent.registration.guardTip)

/**
 * 当前是否缺少 Supabase 配置
 * 用途：部署前没配环境变量时，在页面里直接给出中文提示
 */
const hasSupabaseError = computed<boolean>(() => !isSupabaseConfigured())

/**
 * Supabase 配置提示
 * 用途：缺少环境变量时直接给用户和维护者明确说明
 */
const supabaseErrorText = computed<string>(() => getSupabaseConfigErrorText())

/**
 * 当前是否选中了“其他堂口”
 * 用途：选中后才显示补充说明输入框
 */
const isOtherHallSelected = computed<boolean>(() => formValue.value.hallKey === 'other')

/**
 * 已清洗表单
 * 用途：校验和提交前统一复用同一份干净数据
 */
const normalizedForm = computed<RosterRegistrationFormValue>(() => normalizeRosterFormValue(formValue.value))

/**
 * 切换空闲时段多选
 * 用途：登记页多选勾选时统一走这里，避免重复逻辑
 * 入参：slot 为时段键名
 * 返回值：无返回值
 */
function toggleFreeTimeSlot(slot: RosterFreeTimeSlot): void {
  const currentList = new Set(formValue.value.freeTimeSlots)

  if (currentList.has(slot)) {
    currentList.delete(slot)
  } else {
    currentList.add(slot)
  }

  formValue.value.freeTimeSlots = Array.from(currentList)
}

/**
 * 校验道号
 * 用途：失焦时先做格式校验，再调用后端做重名检查
 * 入参：showSuccessMessage 表示可用时是否显示成功提示
 * 返回值：可用返回 true，否则返回 false
 */
async function validateDaohao(showSuccessMessage = false): Promise<boolean> {
  const localError = getRosterDaohaoError(formValue.value.daohao)

  if (localError) {
    daohaoMessage.value = localError
    return false
  }

  if (hasSupabaseError.value) {
    daohaoMessage.value = supabaseErrorText.value
    return false
  }

  isCheckingDaohao.value = true

  try {
    const result = await checkRosterDaohaoAvailable(formValue.value.daohao)
    daohaoMessage.value = result.message || rosterContent.registration.guardTip

    if (result.available && showSuccessMessage) {
      daohaoMessage.value = '此道号当前可用，可继续递交文牒'
    }

    return result.available
  } catch (error) {
    daohaoMessage.value = error instanceof Error ? error.message : '道号校验失败，请稍后再试'
    return false
  } finally {
    isCheckingDaohao.value = false
  }
}

/**
 * 提交登记表单
 * 用途：递交文牒前统一做格式校验、重名校验和跳转
 * 入参：无
 * 返回值：无返回值
 */
async function handleSubmit(): Promise<void> {
  const safeForm = normalizedForm.value
  const validationMessage = validateRosterRegistrationForm(safeForm)

  if (validationMessage) {
    actionMessage.value = validationMessage
    return
  }

  if (hasSupabaseError.value) {
    actionMessage.value = supabaseErrorText.value
    return
  }

  isSubmitting.value = true
  actionMessage.value = '正在递交文牒并生成待审核名帖，请稍候...'

  try {
    const isDaohaoAvailable = await validateDaohao()

    if (!isDaohaoAvailable) {
      actionMessage.value = '当前道号无法递交，请先改用可用道号'
      return
    }

    const result = await submitRosterEntry(mapRosterFormToSubmitPayload(safeForm))

    actionMessage.value = rosterContent.registration.successDescription
    await router.push(`/roster/entry/${result.publicSlug}`)
  } catch (error) {
    actionMessage.value = error instanceof Error ? error.message : '递交文牒失败，请稍后再试'
  } finally {
    isSubmitting.value = false
  }
}

/**
 * 设置堂口
 * 用途：切换堂口时顺手处理“其他堂口”的说明字段
 * 入参：hallKey 为目标堂口
 * 返回值：无返回值
 */
function handleSelectHall(hallKey: RosterHallKey): void {
  formValue.value.hallKey = hallKey

  if (hallKey !== 'other') {
    formValue.value.otherHallText = ''
  }
}

/**
 * 设置效力意愿
 * 用途：单选组统一走这里，保持代码更清楚
 * 入参：value 为意愿键名
 * 返回值：无返回值
 */
function handleSelectContribution(value: RosterContributionLevel): void {
  formValue.value.contributionLevel = value
}
</script>

<template>
  <div ref="pageRef" class="page roster-registration-page">
    <PageBanner
      eyebrow="云栖名册"
      title="云栖派入门弟子录 · 入册文牒"
      :lead="rosterContent.page.lead"
      :note="rosterContent.page.note"
    />

    <section class="roster-registration-outline content-card">
      <div class="roster-registration-outline__head">
        <div>
          <p class="content-card__eyebrow">登记分段</p>
          <h2>长表单按六段展开，便于逐步立名、立身、立誓</h2>
        </div>
        <RouterLink class="ink-button ink-button--ghost" to="/roster/list">
          去看公开名录
        </RouterLink>
      </div>

      <div class="roster-registration-outline__grid">
        <article
          v-for="section in rosterRegistrationSections"
          :key="section.key"
          class="roster-registration-outline__item"
        >
          <p>{{ section.eyebrow }}</p>
          <strong>{{ section.title }}</strong>
          <span>{{ section.description }}</span>
        </article>
      </div>
    </section>

    <section class="roster-registration-shell">
      <aside class="roster-registration-side">
        <article class="content-card content-card--soft">
          <p class="content-card__eyebrow">填写说明</p>
          <h3>公开展示只取最克制字段</h3>
          <ul class="list-column">
            <li v-for="line in rosterContent.privacyNotes" :key="line">{{ line }}</li>
          </ul>
        </article>

        <article class="content-card content-card--serif">
          <p class="content-card__eyebrow">道号提示</p>
          <h3>道号会成为公开页与名帖的唯一称呼</h3>
          <ul class="list-column">
            <li v-for="line in rosterContent.daohaoTips" :key="line">{{ line }}</li>
          </ul>
        </article>

        <article class="content-card">
          <p class="content-card__eyebrow">当前提示</p>
          <h3>{{ hasSupabaseError ? '尚未连上名册数据库' : '文牒可随时递交' }}</h3>
          <p>{{ hasSupabaseError ? supabaseErrorText : actionMessage }}</p>
        </article>
      </aside>

      <article class="roster-registration-form">
        <section class="roster-registration-card">
          <div class="roster-registration-card__head">
            <p class="eyebrow">弟子名籍</p>
            <h2>先把道号与来处写清</h2>
            <p>道号为必填项，会成为公开详情页与分享名帖的唯一称呼。俗家姓名仅用于线下大型活动实名备案，不会进入公开名帖。</p>
          </div>

          <div class="roster-registration-grid">
            <label class="roster-registration-field">
              <span>道号 *</span>
              <input
                v-model="formValue.daohao"
                class="roster-registration-input"
                maxlength="12"
                placeholder="例如：闻溪、松照、栖月行者"
                type="text"
                @blur="validateDaohao(true)"
              />
              <small>{{ isCheckingDaohao ? '正在校验道号...' : daohaoMessage }}</small>
            </label>

            <label class="roster-registration-field">
              <span>俗家姓名</span>
              <input v-model="formValue.secularName" class="roster-registration-input" maxlength="24" placeholder="线下实名备案才会用到" type="text" />
            </label>

            <label class="roster-registration-field">
              <span>现居洞府 *</span>
              <input v-model="formValue.currentCity" class="roster-registration-input" maxlength="32" placeholder="精确到市，例如：杭州、苏州、成都" type="text" />
            </label>

            <label class="roster-registration-field">
              <span>生年</span>
              <input v-model="formValue.birthYear" class="roster-registration-input" maxlength="8" placeholder="例如：1998" type="text" />
            </label>

            <label class="roster-registration-field roster-registration-field--full">
              <span>俗务</span>
              <input v-model="formValue.profession" class="roster-registration-input" maxlength="40" placeholder="例如：学生、设计师、工程师" type="text" />
            </label>
          </div>
        </section>

        <section class="roster-registration-card">
          <div class="roster-registration-card__head">
            <p class="eyebrow">门派司职</p>
            <h2>再把堂口与来意定下来</h2>
            <p>道号不再强制以“云”或“栖”开头。堂口只做归类和同好联络，不分高低。</p>
          </div>

          <div class="roster-registration-grid">
            <label class="roster-registration-field">
              <span>引荐人</span>
              <input v-model="formValue.referrerName" class="roster-registration-input" maxlength="32" placeholder="默认：自行登门" type="text" />
            </label>
          </div>

          <div class="roster-registration-field roster-registration-field--full">
            <span>归属堂口 *</span>
            <div class="roster-registration-option-grid">
              <button
                v-for="hall in rosterHallOptions"
                :key="hall.key"
                type="button"
                class="roster-registration-option"
                :class="{ 'roster-registration-option--active': formValue.hallKey === hall.key }"
                @click="handleSelectHall(hall.key)"
              >
                <strong>{{ hall.label }}</strong>
                <span>{{ hall.description }}</span>
              </button>
            </div>
          </div>

          <label v-if="isOtherHallSelected" class="roster-registration-field roster-registration-field--full">
            <span>其他堂口说明 *</span>
            <input v-model="formValue.otherHallText" class="roster-registration-input" maxlength="32" placeholder="请补充你希望归属的堂口方向" type="text" />
          </label>

          <label class="roster-registration-field roster-registration-field--full">
            <span>入派本心 *</span>
            <textarea
              v-model="formValue.entryIntent"
              class="roster-registration-input roster-registration-input--textarea"
              maxlength="220"
              rows="4"
              placeholder="三两言即可，说清你为何想入云栖、愿与怎样的同门共处"
            ></textarea>
          </label>
        </section>

        <section class="roster-registration-card">
          <div class="roster-registration-card__head">
            <p class="eyebrow">传讯方式</p>
            <h2>留下正式联络方式</h2>
            <p>微信号为门派唯一正式联络渠道。其他社交号都只存库备用，不会进入公开页面与分享名帖。</p>
          </div>

          <div class="roster-registration-grid">
            <label class="roster-registration-field">
              <span>核心传讯 *</span>
              <input v-model="formValue.wechatId" class="roster-registration-input" maxlength="48" placeholder="请填写微信号" type="text" />
            </label>

            <label class="roster-registration-field">
              <span>小红书 / 抖音</span>
              <input v-model="formValue.socialXiaohongshuDouyin" class="roster-registration-input" maxlength="48" placeholder="选填" type="text" />
            </label>

            <label class="roster-registration-field">
              <span>QQ</span>
              <input v-model="formValue.socialQq" class="roster-registration-input" maxlength="48" placeholder="选填" type="text" />
            </label>

            <label class="roster-registration-field">
              <span>其他传讯</span>
              <input v-model="formValue.socialOther" class="roster-registration-input" maxlength="48" placeholder="选填" type="text" />
            </label>
          </div>

          <label class="roster-registration-check">
            <input v-model="formValue.allowContactPublic" type="checkbox" />
            <span>同意核心传讯号在同门间公开，用于活动联络</span>
          </label>
        </section>

        <section class="roster-registration-card">
          <div class="roster-registration-card__head">
            <p class="eyebrow">所长与愿</p>
            <h2>让同门知道你擅长什么、喜欢什么</h2>
            <p>这些内容会在通过审核后进入公开名帖，建议写你愿意公开分享的能力与雅事，不要写隐私信息。</p>
          </div>

          <div class="roster-registration-grid">
            <label class="roster-registration-field roster-registration-field--full">
              <span>身怀所长</span>
              <textarea
                v-model="formValue.strengths"
                class="roster-registration-input roster-registration-input--textarea"
                maxlength="160"
                rows="3"
                placeholder="例如：妆造、摄影、书法、古琴、文案、驾车、场地协调"
              ></textarea>
            </label>

            <label class="roster-registration-field roster-registration-field--full">
              <span>所好雅事</span>
              <textarea
                v-model="formValue.hobbies"
                class="roster-registration-input roster-registration-input--textarea"
                maxlength="160"
                rows="3"
                placeholder="例如：汉服出行、诗词唱和、茶会雅集、非遗体验"
              ></textarea>
            </label>
          </div>

          <div class="roster-registration-field roster-registration-field--full">
            <span>闲暇时辰</span>
            <div class="roster-registration-choice-row">
              <button
                v-for="option in rosterFreeTimeOptions"
                :key="option.key"
                type="button"
                class="roster-registration-choice"
                :class="{ 'roster-registration-choice--active': formValue.freeTimeSlots.includes(option.key) }"
                @click="toggleFreeTimeSlot(option.key)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>

          <div class="roster-registration-field roster-registration-field--full">
            <span>愿为门派效力</span>
            <div class="roster-registration-option-grid roster-registration-option-grid--single">
              <button
                v-for="option in rosterContributionOptions"
                :key="option.key"
                type="button"
                class="roster-registration-option"
                :class="{ 'roster-registration-option--active': formValue.contributionLevel === option.key }"
                @click="handleSelectContribution(option.key)"
              >
                <strong>{{ option.label }}</strong>
                <span>{{ option.description }}</span>
              </button>
            </div>
          </div>
        </section>

        <section class="roster-registration-card">
          <div class="roster-registration-card__head">
            <p class="eyebrow">入派誓约</p>
            <h2>立誓之后，再请执事批阅</h2>
            <p>线上入册仍保留正式文牒气质。请通读誓约后签押递交。</p>
          </div>

          <article class="roster-oath-panel">
            <p>今自愿投身云栖派门下，已通读《云栖派门规》，立誓：</p>
            <p>恪守国法，谨遵门规；敬重先贤，友爱同门；传承雅韵，不负初心；共护门派清誉，不做有损门楣之事。若违此誓，愿自请出派。</p>
          </article>

          <div class="roster-registration-grid">
            <label class="roster-registration-field">
              <span>弟子签押 *</span>
              <input v-model="formValue.oathSignedName" class="roster-registration-input" maxlength="32" placeholder="可签道号或名号" type="text" />
            </label>

            <label class="roster-registration-field">
              <span>立誓之日 *</span>
              <input v-model="formValue.oathSignedDate" class="roster-registration-input" type="date" />
            </label>
          </div>

          <label class="roster-registration-check">
            <input v-model="formValue.agreedToOath" type="checkbox" />
            <span>我已通读门规，并同意以上入派誓约 *</span>
          </label>
        </section>

        <section class="roster-registration-card roster-registration-card--submit">
          <div class="roster-registration-card__head">
            <p class="eyebrow">提交确认</p>
            <h2>递上文牒，系统会立刻生成待审核名帖</h2>
            <p>提交成功后会跳转到公开详情页。待审核状态可以先分享与保存；审核通过后自动切换为正式入册名帖。</p>
          </div>

          <div class="roster-registration-submit">
            <div class="roster-registration-submit__message">
              <p>{{ hasSupabaseError ? supabaseErrorText : actionMessage }}</p>
              <small>{{ rosterContent.registration.successDescription }}</small>
            </div>

            <div class="roster-registration-submit__actions">
              <button
                type="button"
                class="ink-button ink-button--primary"
                :disabled="isSubmitting || hasSupabaseError"
                @click="handleSubmit"
              >
                {{ isSubmitting ? rosterContent.registration.submittingButton : rosterContent.registration.submitButton }}
              </button>
              <RouterLink class="ink-button ink-button--ghost" to="/roster/list">
                先看公开名录
              </RouterLink>
            </div>
          </div>
        </section>
      </article>
    </section>
  </div>
</template>

<style scoped>
.roster-registration-page {
  gap: 30px;
}

.roster-registration-outline,
.roster-registration-shell {
  display: grid;
  gap: 20px;
}

.roster-registration-outline__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.roster-registration-outline__head h2 {
  margin: 0;
  font-size: clamp(1.5rem, 3vw, 2.2rem);
  line-height: 1.24;
}

.roster-registration-outline__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.roster-registration-outline__item {
  display: grid;
  gap: 8px;
  padding: 18px;
  border-radius: 22px;
  border: 1px solid rgba(216, 185, 114, 0.14);
  background: rgba(7, 27, 37, 0.46);
}

.roster-registration-outline__item p,
.roster-registration-outline__item strong,
.roster-registration-outline__item span {
  margin: 0;
}

.roster-registration-outline__item p {
  color: var(--color-cyan);
  letter-spacing: 0.14em;
  font-size: 0.82rem;
}

.roster-registration-outline__item strong {
  font-size: 1rem;
  line-height: 1.6;
}

.roster-registration-outline__item span {
  color: var(--color-text-soft);
  font-size: 0.9rem;
  line-height: 1.72;
}

.roster-registration-shell {
  grid-template-columns: minmax(280px, 0.76fr) minmax(0, 1.24fr);
  align-items: start;
}

.roster-registration-side,
.roster-registration-form {
  display: grid;
  gap: 18px;
}

.roster-registration-form {
  min-width: 0;
}

.roster-registration-card {
  display: grid;
  gap: 18px;
  padding: 22px;
  border-radius: 28px;
  border: 1px solid rgba(216, 185, 114, 0.16);
  background:
    linear-gradient(180deg, rgba(8, 30, 42, 0.9), rgba(5, 18, 28, 0.96)),
    rgba(5, 18, 28, 0.94);
  box-shadow: var(--shadow-soft);
}

.roster-registration-card__head {
  display: grid;
  gap: 8px;
}

.roster-registration-card__head h2 {
  margin: 0;
  font-size: clamp(1.34rem, 2.8vw, 1.9rem);
  line-height: 1.28;
}

.roster-registration-card__head p:last-child,
.roster-registration-submit__message small {
  color: var(--color-text-soft);
  line-height: 1.76;
}

.roster-registration-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.roster-registration-field {
  display: grid;
  gap: 10px;
}

.roster-registration-field--full {
  grid-column: 1 / -1;
}

.roster-registration-field span {
  color: var(--color-cyan);
  font-size: 0.84rem;
  letter-spacing: 0.16em;
}

.roster-registration-field small {
  color: var(--color-text-faint);
  line-height: 1.7;
}

.roster-registration-input {
  width: 100%;
  min-height: 48px;
  padding: 12px 14px;
  border: 1px solid rgba(216, 185, 114, 0.18);
  border-radius: 16px;
  background: rgba(5, 19, 28, 0.62);
  color: var(--color-text);
  outline: none;
}

.roster-registration-input::placeholder {
  color: rgba(244, 239, 226, 0.42);
}

.roster-registration-input:focus {
  border-color: rgba(216, 185, 114, 0.34);
  box-shadow: 0 0 0 3px rgba(216, 185, 114, 0.1);
}

.roster-registration-input--textarea {
  min-height: 112px;
  resize: vertical;
  line-height: 1.82;
}

.roster-registration-option-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.roster-registration-option-grid--single {
  grid-template-columns: 1fr;
}

.roster-registration-option,
.roster-registration-choice {
  border: 1px solid rgba(216, 185, 114, 0.14);
  cursor: pointer;
}

.roster-registration-option {
  display: grid;
  gap: 8px;
  padding: 16px 18px;
  border-radius: 20px;
  background: rgba(7, 27, 37, 0.44);
  text-align: left;
  transition:
    transform var(--transition-base),
    border-color var(--transition-base),
    background-color var(--transition-base);
}

.roster-registration-option strong,
.roster-registration-option span {
  margin: 0;
}

.roster-registration-option strong {
  font-size: 1rem;
  color: var(--color-text);
}

.roster-registration-option span {
  color: var(--color-text-soft);
  font-size: 0.9rem;
  line-height: 1.7;
}

.roster-registration-option:hover,
.roster-registration-choice:hover {
  transform: translateY(-2px);
}

.roster-registration-option--active,
.roster-registration-choice--active {
  border-color: rgba(216, 185, 114, 0.34);
  background:
    linear-gradient(135deg, rgba(216, 185, 114, 0.14), rgba(9, 34, 46, 0.88)),
    rgba(8, 25, 35, 0.86);
}

.roster-registration-choice-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.roster-registration-choice {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(5, 19, 28, 0.52);
  color: var(--color-text-soft);
  transition:
    transform var(--transition-base),
    border-color var(--transition-base),
    background-color var(--transition-base),
    color var(--transition-base);
}

.roster-registration-check {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  color: var(--color-text-soft);
  line-height: 1.72;
}

.roster-registration-check input {
  margin-top: 4px;
}

.roster-oath-panel {
  display: grid;
  gap: 12px;
  padding: 18px 20px;
  border-radius: 22px;
  border: 1px solid rgba(216, 185, 114, 0.16);
  background:
    linear-gradient(180deg, rgba(39, 26, 15, 0.22), rgba(7, 20, 30, 0.94)),
    rgba(8, 25, 35, 0.88);
}

.roster-oath-panel p {
  margin: 0;
  color: var(--color-text-soft);
  line-height: 1.86;
}

.roster-registration-card--submit {
  gap: 20px;
}

.roster-registration-submit {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px;
  align-items: center;
}

.roster-registration-submit__message {
  display: grid;
  gap: 8px;
}

.roster-registration-submit__message p {
  margin: 0;
  color: var(--color-text);
  line-height: 1.76;
}

.roster-registration-submit__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

@media (max-width: 1180px) {
  .roster-registration-outline__grid,
  .roster-registration-shell {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 920px) {
  .roster-registration-grid,
  .roster-registration-option-grid,
  .roster-registration-submit {
    grid-template-columns: 1fr;
  }

  .roster-registration-outline__head {
    flex-direction: column;
  }
}

@media (max-width: 720px) {
  .roster-registration-card,
  .roster-oath-panel {
    padding: 16px 14px;
    border-radius: 22px;
  }

  .roster-registration-submit__actions,
  .roster-registration-choice-row {
    flex-direction: column;
  }

  .roster-registration-submit__actions .ink-button,
  .roster-registration-choice {
    width: 100%;
  }
}
</style>
