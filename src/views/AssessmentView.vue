<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import AssessmentQuestionCard from '@/components/assessment/AssessmentQuestionCard.vue'
import AssessmentResultPosterStudio from '@/components/assessment/AssessmentResultPosterStudio.vue'
import PageBanner from '@/components/common/PageBanner.vue'
import { useAssessmentExam } from '@/composables/useAssessmentExam'
import { useRevealMotion } from '@/composables/useRevealMotion'
import { siteContent } from '@/data/siteContent'

// 这里拿到页面根节点，供静态区块做统一显现动效。
const pageRef = ref<HTMLElement | null>(null)

const resultSummaryRef = ref<HTMLElement | null>(null)

// 这里拿到题目列表节点，方便开考后自动滚到真正的作答区域。
const examQuestionListRef = ref<HTMLElement | null>(null)

// 这里启用页面滚动显现动效，让开考前的规则介绍更有层次感。
useRevealMotion({
  rootRef: pageRef,
})

// 这里接入考核主逻辑，统一管理答题、计时、评分、本地草稿和最近一次结果。
const {
  answeredCount,
  currentSection,
  currentSectionAnsweredCount,
  currentSectionIndex,
  currentSectionQuestions,
  formatDuration,
  getSelectedOptionIds,
  goToNextSection,
  goToPreviousSection,
  initializeAssessment,
  isSubmitting,
  latestResult,
  participantTitle,
  phase,
  remainingTimeText,
  restartExam,
  resultLead,
  sectionBundles,
  setSingleAnswer,
  startExam,
  storageModeText,
  submitExam,
  toggleMultipleAnswer,
  totalQuestions,
  unansweredCount,
} = useAssessmentExam({
  paper: siteContent.assessment.paper,
  questions: siteContent.assessment.questions,
  sections: siteContent.assessment.sections,
})

/**
 * 是否已经到了最后一章
 * 用途：控制底部按钮文案和是否显示“前往下一章”
 */
const isLastSection = computed<boolean>(() => currentSectionIndex.value >= sectionBundles.value.length - 1)

/**
 * 章节进度列表
 * 用途：答题页顶部展示每一章的完成情况，让用户知道当前进行到了哪里
 */
const sectionProgressList = computed(() => sectionBundles.value.map((section, index) => {
  const answeredInSection = section.questions.filter((question) => getSelectedOptionIds(question.id).length > 0).length

  return {
    id: section.id,
    title: section.title,
    index,
    answeredCount: answeredInSection,
    questionCount: section.questions.length,
    isActive: index === currentSectionIndex.value,
    isCompleted: answeredInSection === section.questions.length,
  }
}))

/**
 * 最近一次交卷时间文本
 * 用途：结果页和结果海报都要展示本次完成时间
 */
const completedAtText = computed<string>(() => {
  if (!latestResult.value) {
    return ''
  }

  return formatDateTime(latestResult.value.submitTimestamp)
})

/**
 * 最近一次用时文本
 * 用途：结果页和结果海报都要展示本次答题用时
 */
const durationText = computed<string>(() => {
  if (!latestResult.value) {
    return ''
  }

  return formatDuration(latestResult.value.durationSeconds)
})

/**
 * 结果状态标题
 * 用途：结果页顶区和结果海报都使用这份状态抬头
 */
const resultHeadline = computed<string>(() => {
  if (!latestResult.value) {
    return ''
  }

  return latestResult.value.passed ? '考核已过' : '考核未过'
})

/**
 * 是否显示补考提示
 * 用途：首版只在未合格时展示“三日后补考”建议，不做本地强锁
 */
const shouldShowRetakeNotice = computed<boolean>(() => Boolean(latestResult.value && !latestResult.value.passed))

/**
 * 是否正在显示考核弹窗
 * 用途：给页面根节点统一加锁，避免答题时背景还能点到和滚动到
 */
const isExamDialogOpen = computed<boolean>(() => phase.value === 'exam')

/**
 * 格式化交卷时间
 * 用途：把时间戳转成中文日期时间，便于结果页与海报展示
 * 入参：timestamp 为时间戳
 * 返回值：返回格式化后的中文日期时间文本
 */
function formatDateTime(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)
}

/** 用途：给考核弹窗开关统一加一个页面锁，避免底下正文跟着滚动。 */
const EXAM_DIALOG_LOCK_CLASS = 'assessment-exam-open'

/**
 * 滚动到指定区域
 * 用途：交卷后把页面带到结果摘要，方便直接查看成绩
 * 入参：target 为要滚动到的元素，顶部偏移量用于避开固定页头
 * 返回值：无返回值
 */
function scrollToTarget(target: HTMLElement | null, offset = 104): void {
  if (!target || typeof window === 'undefined') {
    return
  }

  const targetTop = target.getBoundingClientRect().top + window.scrollY - offset

  window.scrollTo({
    top: Math.max(0, targetTop),
    behavior: 'smooth',
  })
}

/**
 * 滚到考题区域
 * 用途：弹窗打开后直接让用户看到题目和选项，而不是停在上方说明区
 * 入参：target 为题目列表节点
 * 返回值：无返回值
 */
function scrollToExamQuestions(target: HTMLElement | null): void {
  if (!target) {
    return
  }

  target.scrollIntoView({
    block: 'start',
    behavior: 'smooth',
  })
}

/**
 * 同步考核弹窗锁
 * 用途：进入答题时锁住页面滚动，退出答题后恢复页面滚动
 * 入参：isLocked 为是否要锁住页面
 * 返回值：无返回值
 */
function syncExamDialogLock(isLocked: boolean): void {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.classList.toggle(EXAM_DIALOG_LOCK_CLASS, isLocked)
  document.body.classList.toggle(EXAM_DIALOG_LOCK_CLASS, isLocked)
}

// 这里监听考核阶段变化，答题时打开弹窗锁，交卷后滚回结果摘要。
watch(
  phase,
  async (nextPhase) => {
    syncExamDialogLock(nextPhase === 'exam')
    await nextTick()

    if (nextPhase === 'exam') {
      scrollToExamQuestions(examQuestionListRef.value)
    }

    if (nextPhase === 'result') {
      scrollToTarget(resultSummaryRef.value)
    }
  },
)

onMounted(() => {
  initializeAssessment()
})

onBeforeUnmount(() => {
  syncExamDialogLock(false)
})
</script>

<template>
  <div
    ref="pageRef"
    class="page page--assessment"
    :class="{ 'page--assessment-exam': isExamDialogOpen }"
    :inert="isExamDialogOpen"
    :aria-hidden="isExamDialogOpen ? 'true' : undefined"
  >
    <PageBanner
      eyebrow="入派考核"
      title="问心而入，先明云栖门风"
      lead="此卷不为难人，只为让新同门先把门风、门规、禁律与来去之义读明白，再从容入门。"
      :note="siteContent.assessment.paper.note"
    >
      <template #actions>
        <button
          v-if="phase === 'ready'"
          type="button"
          class="ink-button ink-button--primary"
          @click="startExam"
        >
          开始考核
        </button>
        <button
          v-else-if="phase === 'exam'"
          type="button"
          class="ink-button ink-button--primary"
          :disabled="isSubmitting"
          @click="submitExam"
        >
          {{ isSubmitting ? '正在交卷...' : '立即交卷' }}
        </button>
        <button
          v-else
          type="button"
          class="ink-button ink-button--primary"
          @click="restartExam"
        >
          重新考核
        </button>
      </template>
    </PageBanner>

    <section v-if="phase === 'ready'" class="content-section" data-reveal>
      <div class="assessment-ready">
        <article class="assessment-ready__main content-card content-card--soft">
          <p class="eyebrow">开考前说明</p>
          <h2>{{ siteContent.assessment.paper.title }}</h2>
          <p class="assessment-ready__lead">{{ siteContent.assessment.paper.lead }}</p>

          <div class="assessment-ready__field">
            <label class="assessment-ready__label" for="assessment-participant-title">同门称呼</label>
            <input
              id="assessment-participant-title"
              v-model="participantTitle"
              class="assessment-ready__input"
              type="text"
              maxlength="24"
              placeholder="例如：云中同门"
            />
            <p class="assessment-ready__helper">可选填写，用于成绩展示与结果海报。留空时会自动使用“云中同门”。</p>
          </div>

          <div class="assessment-ready__intro-list">
            <article
              v-for="line in siteContent.assessment.paper.introLines"
              :key="line"
              class="assessment-ready__intro-card"
            >
              <p>{{ line }}</p>
            </article>
          </div>

          <div class="assessment-ready__actions">
            <button type="button" class="ink-button ink-button--primary" @click="startExam">
              正式开考
            </button>
            <RouterLink to="/join" class="ink-button ink-button--ghost">
              回入派指引
            </RouterLink>
          </div>
        </article>

        <article class="content-card">
          <p class="eyebrow">考核规则</p>
          <h3>固定三十题，分七章作答</h3>

          <div class="assessment-ready__score-grid">
            <article
              v-for="rule in siteContent.assessment.paper.scoreRules"
              :key="rule.label"
              class="assessment-ready__score-card"
            >
              <strong>{{ rule.label }}</strong>
              <span>{{ rule.count }} 题 · 每题 {{ rule.scorePerQuestion }} 分</span>
              <span>共 {{ rule.totalScore }} 分</span>
              <small>{{ rule.summary }}</small>
            </article>
          </div>

          <div class="assessment-ready__stats">
            <span>总题量 {{ siteContent.assessment.paper.totalQuestions }} 题</span>
            <span>总分 {{ siteContent.assessment.paper.totalScore }} 分</span>
            <span>合格线 {{ siteContent.assessment.paper.passScore }} 分</span>
            <span>限时 {{ siteContent.assessment.paper.durationMinutes }} 分钟</span>
          </div>

          <div class="assessment-ready__chapter-list">
            <article
              v-for="section in sectionBundles"
              :key="section.id"
              class="assessment-ready__chapter-card"
            >
              <p>{{ section.eyebrow }}</p>
              <strong>{{ section.title }}</strong>
              <span>{{ section.questions.length }} 题</span>
            </article>
          </div>

          <p class="assessment-ready__notice">{{ siteContent.assessment.paper.retakeNotice }}</p>
          <p class="assessment-ready__notice">当前记录方式：{{ storageModeText }}</p>
        </article>
      </div>
    </section>

    <Teleport to="body">
      <Transition name="exam-dialog-fade">
        <div v-if="phase === 'exam'" class="assessment-exam-dialog" role="dialog" aria-modal="true" :aria-labelledby="'assessment-exam-dialog-title'">
          <div class="assessment-exam-dialog__backdrop" aria-hidden="true"></div>

          <div class="assessment-exam-dialog__panel">
            <section class="assessment-exam assessment-exam--dialog">
              <div class="assessment-exam__sticky">
                <article class="assessment-exam__overview content-card content-card--soft">
                  <div class="assessment-exam__overview-head">
                    <div>
                      <p class="eyebrow">答题进行中</p>
                      <h2 :id="'assessment-exam-dialog-title'">{{ participantTitle }} · 正在问心</h2>
                    </div>
                    <div class="assessment-exam__time-card">
                      <span>剩余时间</span>
                      <strong>{{ remainingTimeText }}</strong>
                    </div>
                  </div>

                  <div class="assessment-exam__progress-meta">
                    <span>当前章节：第 {{ currentSectionIndex + 1 }} / {{ sectionBundles.length }} 章</span>
                    <span>已答题数：{{ answeredCount }} / {{ totalQuestions }}</span>
                    <span>未答题数：{{ unansweredCount }}</span>
                    <span>记录方式：{{ storageModeText }}</span>
                  </div>

                  <div class="assessment-exam__section-track">
                    <article
                      v-for="section in sectionProgressList"
                      :key="section.id"
                      class="assessment-exam__section-pill"
                      :class="{
                        'assessment-exam__section-pill--active': section.isActive,
                        'assessment-exam__section-pill--completed': section.isCompleted,
                      }"
                    >
                      <strong>{{ section.title }}</strong>
                      <span>{{ section.answeredCount }} / {{ section.questionCount }} 题</span>
                    </article>
                  </div>
                </article>
              </div>

              <div class="assessment-exam__body">
                <article v-if="currentSection" class="content-card assessment-exam__chapter-card">
                  <p class="eyebrow">{{ currentSection.eyebrow }}</p>
                  <h2>{{ currentSection.title }}</h2>
                  <p>{{ currentSection.description }}</p>
                  <div class="assessment-exam__chapter-meta">
                    <span>本章题数：{{ currentSection.questions.length }}</span>
                    <span>本章已答：{{ currentSectionAnsweredCount }}</span>
                  </div>
                </article>

                <div ref="examQuestionListRef" class="assessment-exam__question-list">
                  <AssessmentQuestionCard
                    v-for="question in currentSectionQuestions"
                    :key="question.id"
                    :question="question"
                    :selected-option-ids="getSelectedOptionIds(question.id)"
                    @toggle-multiple="toggleMultipleAnswer($event.questionId, $event.optionId)"
                    @update-single="setSingleAnswer($event.questionId, $event.optionId)"
                  />
                </div>
              </div>

              <div class="assessment-exam__actions assessment-exam__actions--dialog">
                <button
                  type="button"
                  class="ink-button ink-button--ghost"
                  :disabled="currentSectionIndex <= 0"
                  @click="goToPreviousSection"
                >
                  上一章
                </button>

                <button
                  v-if="!isLastSection"
                  type="button"
                  class="ink-button ink-button--secondary"
                  @click="goToNextSection"
                >
                  下一章
                </button>

                <button
                  v-else
                  type="button"
                  class="ink-button ink-button--secondary"
                  :disabled="isSubmitting"
                  @click="submitExam"
                >
                  {{ isSubmitting ? '正在交卷...' : '完成本卷并交卷' }}
                </button>
              </div>
            </section>
          </div>
        </div>
      </Transition>
    </Teleport>

    <section v-if="phase === 'result'" class="assessment-result">
      <template v-if="latestResult">
        <article ref="resultSummaryRef" class="assessment-result__summary content-card content-card--soft">
          <div class="assessment-result__summary-head">
            <div>
              <p class="eyebrow">考核结果</p>
              <h2>{{ participantTitle }} · {{ resultHeadline }}</h2>
              <p class="assessment-result__lead">{{ resultLead }}</p>
            </div>
            <div
              class="assessment-result__score-badge"
              :class="{ 'assessment-result__score-badge--passed': latestResult.passed }"
            >
              <span>总分</span>
              <strong>{{ latestResult.score }}</strong>
              <small>/ {{ latestResult.totalScore }}</small>
            </div>
          </div>

          <div class="assessment-result__stats">
            <article class="assessment-result__stat-card">
              <strong>{{ latestResult.correctCount }}</strong>
              <span>总答对题数</span>
            </article>
            <article class="assessment-result__stat-card">
              <strong>{{ latestResult.singleCorrectCount }}</strong>
              <span>单选答对</span>
            </article>
            <article class="assessment-result__stat-card">
              <strong>{{ latestResult.multipleCorrectCount }}</strong>
              <span>多选答对</span>
            </article>
            <article class="assessment-result__stat-card">
              <strong>{{ durationText }}</strong>
              <span>本次用时</span>
            </article>
          </div>

          <div class="assessment-result__section-summary">
            <article
              v-for="section in latestResult.sectionResults"
              :key="section.sectionId"
              class="assessment-result__section-card"
            >
              <strong>{{ section.sectionTitle }}</strong>
              <span>{{ section.correctCount }} / {{ section.questionCount }} 题</span>
            </article>
          </div>

          <div class="assessment-result__footer-meta">
            <span>最近交卷时间：{{ completedAtText }}</span>
            <span>合格线：{{ latestResult.passScore }} 分</span>
            <span>记录方式：{{ storageModeText }}</span>
          </div>

          <p v-if="shouldShowRetakeNotice" class="assessment-result__retake-note">
            建议三日后补考。首版暂不做本地强锁，你可以先看完错题解析与原文出处，再决定何时重考。
          </p>

          <div class="assessment-result__actions">
            <button type="button" class="ink-button ink-button--primary" @click="restartExam">
              重新考核
            </button>
            <RouterLink to="/canon" class="ink-button ink-button--ghost">
              去看立派全典
            </RouterLink>
          </div>
        </article>

        <section class="content-section">
          <div class="section-heading">
            <p class="eyebrow">错题解析</p>
            <h2>交卷后自动回看，错在何处，一眼看清</h2>
            <p>每道错题都会直接展示你的答案、正确答案以及《立派全典》对应原文，方便立刻复盘。</p>
          </div>

          <div v-if="latestResult.wrongQuestions.length > 0" class="assessment-result__wrong-list">
            <article
              v-for="question in latestResult.wrongQuestions"
              :key="question.questionId"
              class="assessment-result__wrong-card content-card"
            >
              <div class="assessment-result__wrong-head">
                <span class="assessment-result__wrong-index">第 {{ question.order }} 题</span>
                <span class="assessment-result__wrong-type">{{ question.type === 'single' ? '单选题' : '多选题' }}</span>
                <span class="assessment-result__wrong-section">{{ question.sectionTitle }}</span>
              </div>

              <h3>{{ question.stem }}</h3>

              <div class="assessment-result__wrong-answer-grid">
                <article class="assessment-result__answer-box assessment-result__answer-box--user">
                  <p>你的答案</p>
                  <strong>{{ question.userAnswerText }}</strong>
                </article>
                <article class="assessment-result__answer-box assessment-result__answer-box--correct">
                  <p>正确答案</p>
                  <strong>{{ question.correctAnswerText }}</strong>
                </article>
              </div>

              <div class="assessment-result__source">
                <p>{{ question.sourceTitle }}</p>
                <blockquote>{{ question.sourceExcerpt }}</blockquote>
              </div>
            </article>
          </div>

          <article v-else class="content-card content-card--soft">
            <p class="eyebrow">满卷通明</p>
            <h3>本次没有错题</h3>
            <p>这一卷答得很稳。门风、门规与禁律都已记清，不必再走回头路。</p>
          </article>
        </section>

        <section class="content-section">
          <div class="section-heading">
            <p class="eyebrow">结果海报</p>
            <h2>把这张成绩帖留下来，也可直接分享出去</h2>
            <p>结果海报会自动带上入派考核页二维码，别人扫码后可直接进入同一套考核。</p>
          </div>

          <AssessmentResultPosterStudio
            :participant-title="latestResult.participantTitle"
            :score="latestResult.score"
            :total-score="latestResult.totalScore"
            :passed="latestResult.passed"
            :correct-count="latestResult.correctCount"
            :question-count="latestResult.questionCount"
            :pass-score="latestResult.passScore"
            :completed-at-text="completedAtText"
            :duration-text="durationText"
            :title="siteContent.assessment.paper.resultPoster.title"
            :subtitle="siteContent.assessment.paper.resultPoster.subtitle"
            :signature="siteContent.assessment.paper.resultPoster.signature"
            :pass-headline="siteContent.assessment.paper.resultPoster.passHeadline"
            :fail-headline="siteContent.assessment.paper.resultPoster.failHeadline"
            :pass-copy="siteContent.assessment.paper.resultPoster.passCopy"
            :fail-copy="siteContent.assessment.paper.resultPoster.failCopy"
            :qr-label="siteContent.assessment.paper.resultPoster.qrLabel"
            :export-width="siteContent.assessment.paper.resultPoster.exportWidth"
            :export-height="siteContent.assessment.paper.resultPoster.exportHeight"
          />
        </section>
      </template>
    </section>
  </div>
</template>

<style scoped>
.page--assessment {
  gap: 36px;
}

.assessment-ready,
.assessment-result__stats,
.assessment-result__section-summary {
  display: grid;
  gap: 20px;
}

.assessment-ready {
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
  align-items: start;
}

.assessment-ready__lead {
  margin: 0;
  color: rgba(244, 239, 226, 0.76);
  line-height: 1.85;
}

.assessment-ready__main,
.assessment-exam__overview,
.assessment-result__summary {
  min-width: 0;
}

.assessment-ready__field {
  display: grid;
  gap: 8px;
  margin-top: 26px;
}

.assessment-ready__label,
.assessment-ready__helper {
  color: rgba(244, 239, 226, 0.72);
}

.assessment-ready__input {
  width: 100%;
  min-height: 48px;
  padding: 0 14px;
  border: 1px solid rgba(216, 185, 114, 0.18);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
  color: #f4efe2;
}

.assessment-ready__helper,
.assessment-ready__notice {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.8;
  color: rgba(244, 239, 226, 0.66);
}

.assessment-ready__intro-list,
.assessment-ready__score-grid,
.assessment-ready__chapter-list,
.assessment-result__wrong-list {
  display: grid;
  gap: 16px;
}

.assessment-ready__intro-list {
  margin-top: 26px;
}

.assessment-ready__intro-card,
.assessment-ready__score-card,
.assessment-ready__chapter-card,
.assessment-result__section-card,
.assessment-result__stat-card {
  padding: 18px 20px;
  border: 1px solid rgba(216, 185, 114, 0.12);
  border-radius: 22px;
  background: rgba(5, 19, 28, 0.42);
}

.assessment-ready__intro-card p,
.assessment-ready__chapter-card p,
.assessment-ready__chapter-card strong,
.assessment-ready__chapter-card span,
.assessment-result__section-card strong,
.assessment-result__section-card span,
.assessment-result__stat-card strong,
.assessment-result__stat-card span {
  margin: 0;
}

.assessment-ready__actions,
.assessment-exam__actions,
.assessment-result__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 26px;
}

.assessment-ready__score-grid,
.assessment-ready__chapter-list {
  margin-top: 22px;
}

.assessment-ready__score-card,
.assessment-ready__chapter-card {
  display: grid;
  gap: 8px;
}

.assessment-ready__score-card strong,
.assessment-ready__chapter-card strong {
  font-size: 1.06rem;
}

.assessment-ready__score-card span,
.assessment-ready__chapter-card span {
  color: rgba(244, 239, 226, 0.78);
}

.assessment-ready__score-card small {
  color: rgba(244, 239, 226, 0.6);
  line-height: 1.7;
}

.assessment-ready__stats,
.assessment-exam__progress-meta,
.assessment-exam__chapter-meta,
.assessment-result__footer-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 20px;
}

.assessment-ready__stats span,
.assessment-exam__progress-meta span,
.assessment-exam__chapter-meta span,
.assessment-result__footer-meta span,
.assessment-result__wrong-head span {
  display: inline-flex;
  align-items: center;
  min-height: 38px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(216, 185, 114, 0.1);
  color: rgba(241, 217, 160, 0.94);
  font-size: 0.88rem;
}

.assessment-exam {
  display: grid;
  gap: 22px;
}

.assessment-exam__sticky {
  position: sticky;
  top: 108px;
  z-index: 4;
}

.assessment-exam__overview-head,
.assessment-result__summary-head,
.assessment-result__wrong-answer-grid {
  display: grid;
  gap: 20px;
}

.assessment-exam__overview-head,
.assessment-result__summary-head {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
}

.assessment-exam__overview-head h2,
.assessment-result__summary-head h2 {
  margin: 0;
  font-size: clamp(1.8rem, 3vw, 2.8rem);
  line-height: 1.2;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.assessment-exam__time-card,
.assessment-result__score-badge {
  display: grid;
  justify-items: center;
  gap: 6px;
  min-width: 170px;
  padding: 18px 24px;
  border-radius: 26px;
  border: 1px solid rgba(216, 185, 114, 0.2);
  background:
    linear-gradient(180deg, rgba(247, 239, 219, 0.96), rgba(229, 212, 176, 0.94)),
    rgba(247, 239, 219, 0.94);
  color: #173241;
}

.assessment-exam__time-card strong,
.assessment-result__score-badge strong {
  font-size: 2.5rem;
  line-height: 1;
}

.assessment-result__score-badge small {
  color: rgba(23, 50, 65, 0.72);
}

.assessment-result__score-badge--passed {
  background:
    linear-gradient(180deg, rgba(239, 245, 233, 0.96), rgba(214, 233, 205, 0.94)),
    rgba(239, 245, 233, 0.96);
}

.assessment-exam__section-track {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 12px;
  margin-top: 20px;
  scrollbar-width: thin;
  scrollbar-color: rgba(216, 185, 114, 0.28) transparent;
}

.assessment-exam__section-pill {
  display: grid;
  gap: 6px;
  min-height: 94px;
  align-content: center;
  padding: 14px 16px;
  border: 1px solid rgba(216, 185, 114, 0.12);
  border-radius: 22px;
  background: rgba(5, 19, 28, 0.42);
}

.assessment-exam__section-pill strong {
  font-size: 0.98rem;
  line-height: 1.5;
}

.assessment-exam__section-pill span {
  color: rgba(244, 239, 226, 0.68);
  font-size: 0.88rem;
}

.assessment-exam__section-pill--active {
  border-color: rgba(216, 185, 114, 0.34);
  background:
    linear-gradient(135deg, rgba(216, 185, 114, 0.12), rgba(9, 34, 46, 0.86)),
    rgba(8, 25, 35, 0.86);
}

.assessment-exam__section-pill--completed {
  border-color: rgba(139, 208, 203, 0.24);
}

.assessment-exam__chapter-card h2,
.assessment-result__wrong-card h3 {
  margin: 0 0 10px;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.assessment-exam__chapter-card p {
  margin: 0;
  color: rgba(244, 239, 226, 0.76);
  line-height: 1.82;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.assessment-exam__question-list {
  display: grid;
  gap: 18px;
}

.assessment-exam-dialog {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  align-items: start;
  justify-items: center;
  padding: 18px 16px calc(18px + env(safe-area-inset-bottom));
  overflow-y: auto;
  overscroll-behavior: contain;
  isolation: isolate;
}

.assessment-exam-dialog__backdrop {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at top, rgba(139, 208, 203, 0.12), transparent 30%),
    rgba(2, 12, 17, 0.78);
  backdrop-filter: blur(14px);
}

.assessment-exam-dialog__panel {
  position: relative;
  z-index: 1;
  width: min(1120px, 100%);
  height: calc(100vh - 36px - env(safe-area-inset-bottom));
  max-height: calc(100vh - 36px - env(safe-area-inset-bottom));
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  padding: 18px;
  border: 1px solid rgba(147, 203, 198, 0.22);
  border-radius: 32px;
  background:
    linear-gradient(180deg, rgba(9, 34, 44, 0.96), rgba(5, 19, 28, 0.98)),
    rgba(8, 25, 35, 0.94);
  box-shadow: var(--shadow-strong);
}

.assessment-exam--dialog {
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: 18px;
}

.assessment-exam--dialog .assessment-exam__sticky {
  flex: 0 0 auto;
  position: static;
  top: auto;
}

.assessment-exam__body {
  display: grid;
  gap: 14px;
  min-height: 0;
}

.assessment-exam__actions--dialog {
  flex: 0 0 auto;
  margin-top: 0;
  padding: 14px 16px calc(14px + env(safe-area-inset-bottom));
  border: 1px solid rgba(147, 203, 198, 0.18);
  border-radius: 26px;
  background:
    linear-gradient(180deg, rgba(6, 22, 31, 0.94), rgba(5, 19, 28, 0.98)),
    rgba(5, 19, 28, 0.96);
  box-shadow: 0 -16px 32px rgba(0, 0, 0, 0.24);
  backdrop-filter: blur(18px);
}

.exam-dialog-fade-enter-active .assessment-exam-dialog__backdrop,
.exam-dialog-fade-leave-active .assessment-exam-dialog__backdrop {
  transition: opacity 280ms ease;
}

.exam-dialog-fade-enter-active .assessment-exam-dialog__panel,
.exam-dialog-fade-leave-active .assessment-exam-dialog__panel {
  transition:
    opacity 280ms ease,
    transform 280ms ease;
}

.exam-dialog-fade-enter-from .assessment-exam-dialog__backdrop,
.exam-dialog-fade-leave-to .assessment-exam-dialog__backdrop {
  opacity: 0;
}

.exam-dialog-fade-enter-from .assessment-exam-dialog__panel,
.exam-dialog-fade-leave-to .assessment-exam-dialog__panel {
  opacity: 0;
  transform: translateY(18px) scale(0.985);
}

.assessment-result {
  display: grid;
  gap: 30px;
}

.assessment-result__lead,
.assessment-result__retake-note {
  margin: 12px 0 0;
  color: rgba(244, 239, 226, 0.74);
  line-height: 1.82;
}

.assessment-result__stats {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 24px;
}

.assessment-result__stat-card,
.assessment-result__section-card {
  display: grid;
  gap: 8px;
  min-height: 122px;
  align-content: center;
}

.assessment-result__stat-card strong {
  font-size: 1.56rem;
  line-height: 1.2;
}

.assessment-result__stat-card span,
.assessment-result__section-card span {
  color: rgba(244, 239, 226, 0.72);
}

.assessment-result__section-summary {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 22px;
}

.assessment-result__wrong-card {
  display: grid;
  gap: 18px;
}

.assessment-result__wrong-head {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.assessment-result__wrong-answer-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.assessment-result__answer-box {
  display: grid;
  gap: 10px;
  padding: 18px 20px;
  border-radius: 24px;
  border: 1px solid rgba(216, 185, 114, 0.12);
  background: rgba(5, 19, 28, 0.42);
}

.assessment-result__answer-box p,
.assessment-result__source p,
.assessment-result__source blockquote {
  margin: 0;
}

.assessment-result__answer-box p {
  color: rgba(244, 239, 226, 0.64);
}

.assessment-result__answer-box strong {
  color: rgba(244, 239, 226, 0.94);
  line-height: 1.8;
}

.assessment-result__answer-box--correct {
  border-color: rgba(139, 208, 203, 0.18);
}

.assessment-result__answer-box--user {
  border-color: rgba(212, 154, 114, 0.18);
}

.assessment-result__source {
  display: grid;
  gap: 10px;
  padding: 18px 20px;
  border-radius: 24px;
  border: 1px solid rgba(139, 208, 203, 0.14);
  background: rgba(7, 27, 37, 0.46);
}

.assessment-result__source p {
  color: rgba(139, 208, 203, 0.88);
  font-size: 0.92rem;
  letter-spacing: 0.08em;
}

.assessment-result__source blockquote {
  padding-left: 16px;
  border-left: 2px solid rgba(216, 185, 114, 0.3);
  color: rgba(244, 239, 226, 0.78);
  line-height: 1.9;
}

@media (max-width: 1180px) {
  .assessment-ready,
  .assessment-result__stats,
  .assessment-result__section-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  /* 这里把章节进度改成横向滑动条，避免中小屏幕把七个章节硬堆成高面板。 */
  .assessment-exam__section-track {
    grid-template-columns: none;
    grid-auto-flow: column;
    grid-auto-columns: minmax(180px, 1fr);
    overflow-x: auto;
    overflow-y: hidden;
    padding-bottom: 6px;
    scroll-snap-type: x proximity;
  }

  .assessment-exam__section-pill {
    min-height: auto;
    scroll-snap-align: start;
  }

  .assessment-exam__section-track::-webkit-scrollbar {
    height: 6px;
  }

  .assessment-exam__section-track::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: rgba(216, 185, 114, 0.26);
  }
}

@media (max-width: 920px) {
  .assessment-ready,
  .assessment-exam__overview-head,
  .assessment-result__summary-head,
  .assessment-result__stats,
  .assessment-result__section-summary,
  .assessment-result__wrong-answer-grid {
    grid-template-columns: 1fr;
  }

  .assessment-exam__sticky {
    top: 92px;
  }

  .assessment-exam-dialog {
    padding: 14px 12px calc(14px + env(safe-area-inset-bottom));
  }

  .assessment-exam-dialog__panel {
    width: min(100%, 980px);
    padding: 16px;
    border-radius: 28px;
    max-height: calc(100dvh - 28px - env(safe-area-inset-bottom));
  }

  /* 这里进一步压缩平板和大屏手机的答题头部，减少题目前方占用高度。 */
  .assessment-exam__overview {
    padding: 20px 18px;
  }

  .assessment-exam__time-card {
    min-width: 0;
    width: 100%;
    justify-items: start;
    padding: 16px 18px;
  }

  .assessment-result__score-badge {
    min-width: 0;
    width: 100%;
    justify-items: start;
    padding: 16px 18px;
  }

  .assessment-exam__time-card strong,
  .assessment-result__score-badge strong {
    font-size: 2rem;
  }

  .assessment-exam__progress-meta span {
    flex: 1 1 calc(50% - 12px);
    justify-content: center;
    min-width: 0;
    text-align: center;
  }
}

@media (max-width: 720px) {
  /* 这里在手机端取消考核概览的吸顶，彻底避免滚动时压住题目内容。 */
  .assessment-exam__sticky {
    position: static;
    top: auto;
  }

  .assessment-exam__overview,
  .assessment-exam__chapter-card {
    padding: 14px 12px;
  }

  .assessment-exam__overview-head h2 {
    font-size: clamp(1.35rem, 5.5vw, 1.7rem);
    line-height: 1.16;
  }

  .assessment-exam__time-card {
    padding: 12px 14px;
  }

  .assessment-exam__time-card span {
    font-size: 0.8rem;
  }

  .assessment-exam__time-card strong {
    font-size: 1.7rem;
  }

  .assessment-exam__chapter-card p {
    line-height: 1.7;
    font-size: 0.92rem;
  }

  .assessment-ready__intro-card,
  .assessment-ready__score-card,
  .assessment-ready__chapter-card,
  .assessment-result__section-card,
  .assessment-result__stat-card,
  .assessment-result__answer-box,
  .assessment-result__source {
    padding: 16px 14px;
    border-radius: 20px;
  }

  .assessment-ready__actions,
  .assessment-exam__actions,
  .assessment-result__actions {
    flex-direction: column;
    align-items: stretch;
  }

  .assessment-ready__actions .ink-button,
  .assessment-exam__actions .ink-button,
  .assessment-result__actions .ink-button {
    width: 100%;
  }

  .assessment-exam__section-track {
    grid-auto-columns: minmax(140px, 78vw);
    gap: 8px;
    margin-top: 14px;
  }

  .assessment-exam__progress-meta {
    gap: 8px;
    margin-top: 14px;
  }

  .assessment-exam__progress-meta span,
  .assessment-exam__chapter-meta span {
    flex: 1 1 100%;
    justify-content: center;
    min-height: 34px;
    padding: 0 10px;
    font-size: 0.8rem;
  }

  .assessment-result__summary-head {
    gap: 16px;
  }

  .assessment-exam__overview-head {
    gap: 16px;
  }

  .assessment-exam__actions .ink-button {
    flex: 1 1 100%;
  }

  .assessment-result__stat-card,
  .assessment-result__section-card,
  .assessment-exam__section-pill {
    min-height: auto;
  }

  .assessment-exam__section-pill {
    padding: 12px 12px;
    min-height: 74px;
  }

  .assessment-exam__section-pill strong {
    font-size: 0.92rem;
  }

  .assessment-exam__section-pill span {
    font-size: 0.8rem;
  }

  .assessment-exam-dialog {
    padding: 8px 8px calc(8px + env(safe-area-inset-bottom));
  }

  .assessment-exam-dialog__panel {
    width: 100%;
    height: calc(100dvh - 16px - env(safe-area-inset-bottom));
    max-height: calc(100dvh - 16px - env(safe-area-inset-bottom));
    padding: 12px 10px;
    border-radius: 22px;
  }

  .assessment-exam__actions--dialog {
    padding: 10px 10px calc(10px + env(safe-area-inset-bottom));
    border-radius: 20px;
  }

  .assessment-exam__question-list {
    gap: 12px;
  }
}
</style>
