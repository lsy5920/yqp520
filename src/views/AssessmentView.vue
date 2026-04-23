<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import AssessmentQuestionCard from '@/components/assessment/AssessmentQuestionCard.vue'
import AssessmentResultPosterStudio from '@/components/assessment/AssessmentResultPosterStudio.vue'
import PageBanner from '@/components/common/PageBanner.vue'
import { useAssessmentExam } from '@/composables/useAssessmentExam'
import { useRevealMotion } from '@/composables/useRevealMotion'
import { siteContent } from '@/data/siteContent'
import type { AssessmentQuestion } from '@/types/assessment'

/**
 * 扁平化题目结构
 * 用途：把分章节题目整理成一条连续题目序列，方便按题号快速切换
 */
interface FlattenedAssessmentQuestion extends AssessmentQuestion {
  /** 用途：题目所属章节下标，便于从题号直接切换到对应章节 */
  sectionIndex: number
}

/**
 * 错题章节导航项
 * 用途：让错题解析区也能按章节快速切换到对应错题
 */
interface WrongQuestionSectionNavItem {
  /** 用途：章节唯一标识 */
  sectionId: string
  /** 用途：章节标题 */
  title: string
  /** 用途：章节眉题 */
  eyebrow: string
  /** 用途：该章节下首道错题 id */
  firstQuestionId: string
  /** 用途：该章节下错题数量 */
  wrongCount: number
}

// 这里拿到页面根节点，供静态区块做统一显现动效。
const pageRef = ref<HTMLElement | null>(null)

const resultSummaryRef = ref<HTMLElement | null>(null)

// 这里拿到题目列表节点，方便开考后自动滚到真正的作答区域。
const examQuestionListRef = ref<HTMLElement | null>(null)

// 这里拿到答题弹窗滚动面板，方便章节切换时只滚动弹窗内部，不误伤外层页面。
const examDialogPanelRef = ref<HTMLElement | null>(null)

// 这里拿到答题正文起点，方便切换章节后稳定回到当前章节的起始位置。
const examBodyRef = ref<HTMLElement | null>(null)

// 这里记录答题弹窗当前是否可见，支持临时退出后继续作答。
const isExamDialogVisible = ref<boolean>(false)

// 这里保存临时退出前的弹窗滚动位置，方便恢复时回到刚才看到的地方。
const lastExamDialogScrollTop = ref<number>(0)

// 这里记录当前答题弹窗正在看的题目 id，保证答题区改成单题展示后仍能稳定切换。
const activeExamQuestionId = ref<string>('')

// 这里临时记住跨章节点击的目标题目 id，等章节切过去后再把那一题激活。
const pendingExamQuestionId = ref<string>('')

// 这里记录错题解析当前正在看的那一道错题 id，方便结果页按题号逐题切换。
const activeWrongQuestionId = ref<string>('')

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
  setCurrentSectionIndex,
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
 * 章节进度列表
 * 用途：答题页顶部展示每一章的完成情况，让用户知道当前进行到了哪里
 */
const sectionProgressList = computed(() => sectionBundles.value.map((section, index) => {
  const answeredInSection = section.questions.filter((question) => getSelectedOptionIds(question.id).length > 0).length

  return {
    id: section.id,
    eyebrow: section.eyebrow,
    title: section.title,
    index,
    answeredCount: answeredInSection,
    questionCount: section.questions.length,
    isActive: index === currentSectionIndex.value,
    isStarted: answeredInSection > 0,
    isCompleted: answeredInSection === section.questions.length,
  }
}))

/**
 * 扁平化后的整卷题目列表
 * 用途：把所有章节题目拉平成一条连续题号序列，方便“按题号快速切换”
 */
const flatExamQuestions = computed<FlattenedAssessmentQuestion[]>(() => sectionBundles.value.flatMap((section, sectionIndex) => (
  section.questions.map((question) => ({
    ...question,
    sectionIndex,
  }))
)))

/**
 * 当前正在展示的答题题目
 * 用途：答题弹窗只渲染这一题，实现一题一题切换
 */
const activeExamQuestion = computed<AssessmentQuestion | null>(() => (
  currentSectionQuestions.value.find((question) => question.id === activeExamQuestionId.value) ?? null
))

/**
 * 当前题目在整卷中的下标
 * 用途：实现跨章节的上一题、下一题连续切换
 */
const activeExamQuestionFlatIndex = computed<number>(() => (
  flatExamQuestions.value.findIndex((question) => question.id === activeExamQuestionId.value)
))

/**
 * 当前题目在本章节内的位置
 * 用途：答题区展示“本章第几题”，让用户更容易判断当前进度
 */
const activeExamQuestionIndexInSection = computed<number>(() => (
  currentSectionQuestions.value.findIndex((question) => question.id === activeExamQuestionId.value)
))

/**
 * 当前题目章节内位置文本
 * 用途：答题头部直接显示本题处于当前章节的第几题
 */
const activeExamQuestionSectionProgressText = computed<string>(() => {
  if (!activeExamQuestion.value || activeExamQuestionIndexInSection.value < 0) {
    return ''
  }

  return `本章第 ${activeExamQuestionIndexInSection.value + 1} / ${currentSectionQuestions.value.length} 题`
})

/**
 * 当前是否已到整卷第一题
 * 用途：控制答题底部“上一题”按钮是否禁用
 */
const isFirstExamQuestion = computed<boolean>(() => activeExamQuestionFlatIndex.value <= 0)

/**
 * 当前是否已到整卷最后一题
 * 用途：控制答题底部“下一题”按钮是否切换成下一章或交卷
 */
const isLastExamQuestion = computed<boolean>(() => {
  if (activeExamQuestionFlatIndex.value < 0) {
    return false
  }

  return activeExamQuestionFlatIndex.value >= flatExamQuestions.value.length - 1
})

/**
 * 答题题号导航列表
 * 用途：顶部直接显示整卷 30 题的题号，并用颜色区分当前题、已答题和未答题
 */
const examQuestionOrderList = computed(() => flatExamQuestions.value.map((question) => {
  const isAnswered = getSelectedOptionIds(question.id).length > 0

  return {
    id: question.id,
    order: question.order,
    sectionIndex: question.sectionIndex,
    isActive: question.id === activeExamQuestionId.value,
    isAnswered,
  }
}))

/**
 * 是否存在错题
 * 用途：结果页决定展示逐题错题解析工作台，还是显示“本次没有错题”
 */
const hasWrongQuestions = computed<boolean>(() => Boolean(latestResult.value && latestResult.value.wrongQuestions.length > 0))

/**
 * 当前正在看的错题
 * 用途：错题解析区只展示这一题，实现一题一题回看
 */
const activeWrongQuestion = computed(() => {
  if (!latestResult.value) {
    return null
  }

  return latestResult.value.wrongQuestions.find((question) => question.questionId === activeWrongQuestionId.value) ?? null
})

/**
 * 当前错题在错题列表中的下标
 * 用途：控制错题解析区的上一题、下一题切换
 */
const activeWrongQuestionIndex = computed<number>(() => {
  if (!latestResult.value) {
    return -1
  }

  return latestResult.value.wrongQuestions.findIndex((question) => question.questionId === activeWrongQuestionId.value)
})

/**
 * 错题题号导航列表
 * 用途：结果页按错题题号快速切换，方便直接跳到某一道错题
 */
const wrongQuestionOrderList = computed(() => {
  if (!latestResult.value) {
    return []
  }

  return latestResult.value.wrongQuestions.map((question) => ({
    id: question.questionId,
    order: question.order,
    sectionId: question.sectionId,
    isActive: question.questionId === activeWrongQuestionId.value,
  }))
})

/**
 * 错题章节导航列表
 * 用途：错题解析区支持按章节跳转到本章第一道错题
 */
const wrongQuestionSectionList = computed<WrongQuestionSectionNavItem[]>(() => {
  if (!latestResult.value) {
    return []
  }

  return sectionBundles.value.flatMap((section) => {
    const wrongQuestions = latestResult.value?.wrongQuestions.filter((question) => question.sectionId === section.id) ?? []

    if (wrongQuestions.length === 0) {
      return []
    }

    const firstWrongQuestion = wrongQuestions[0]

    if (!firstWrongQuestion) {
      return []
    }

    return [{
      sectionId: section.id,
      title: section.title,
      eyebrow: section.eyebrow,
      firstQuestionId: firstWrongQuestion.questionId,
      wrongCount: wrongQuestions.length,
    }]
  })
})

/**
 * 当前错题是否已经到第一题
 * 用途：控制错题解析上一题按钮是否禁用
 */
const isFirstWrongQuestion = computed<boolean>(() => activeWrongQuestionIndex.value <= 0)

/**
 * 当前错题是否已经到最后一题
 * 用途：控制错题解析下一题按钮是否禁用
 */
const isLastWrongQuestion = computed<boolean>(() => {
  if (!latestResult.value || activeWrongQuestionIndex.value < 0) {
    return false
  }

  return activeWrongQuestionIndex.value >= latestResult.value.wrongQuestions.length - 1
})

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
const isExamDialogOpen = computed<boolean>(() => phase.value === 'exam' && isExamDialogVisible.value)

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

/**
 * 计算指定题目数组里的默认激活题目
 * 用途：切章节、恢复答题或跨章节跳题时，优先落到目标题，其次落到本章第一道未答题
 * 入参：questions 为当前可用题目列表，preferredQuestionId 为优先想展示的题目 id
 * 返回值：返回最适合激活的题目 id，没有题目时返回空字符串
 */
function resolvePreferredExamQuestionId(
  questions: AssessmentQuestion[],
  preferredQuestionId = '',
): string {
  if (questions.length === 0) {
    return ''
  }

  if (preferredQuestionId && questions.some((question) => question.id === preferredQuestionId)) {
    return preferredQuestionId
  }

  const firstUnansweredQuestion = questions.find((question) => getSelectedOptionIds(question.id).length === 0)
  return firstUnansweredQuestion?.id ?? questions[0]?.id ?? ''
}

/**
 * 同步当前章节的激活题目
 * 用途：当章节变化或跨章节跳题时，确保单题展示区始终有且只有一题可看
 * 入参：preferredQuestionId 为优先想展示的题目 id
 * 返回值：无返回值
 */
function syncActiveExamQuestion(preferredQuestionId = ''): void {
  activeExamQuestionId.value = resolvePreferredExamQuestionId(currentSectionQuestions.value, preferredQuestionId)
}

/**
 * 点击章节时切换章节
 * 用途：支持用户直接点章节选择，不必只能顺着上一章和下一章慢慢切
 * 入参：sectionIndex 为目标题章节下标，preferredQuestionId 为切换后优先展示的题目 id
 * 返回值：无返回值
 */
function handleSelectExamSection(sectionIndex: number, preferredQuestionId = ''): void {
  if (sectionIndex === currentSectionIndex.value) {
    if (preferredQuestionId) {
      syncActiveExamQuestion(preferredQuestionId)
      return
    }

    if (!activeExamQuestion.value) {
      syncActiveExamQuestion()
    }

    return
  }

  pendingExamQuestionId.value = preferredQuestionId
  setCurrentSectionIndex(sectionIndex)
}

/**
 * 点击题号时切换到指定题目
 * 用途：支持整卷按题号快速跳转，跨章节题目也能直接切过去
 * 入参：questionId 为目标题目 id
 * 返回值：无返回值
 */
function handleSelectExamQuestion(questionId: string): void {
  const matchedQuestion = flatExamQuestions.value.find((question) => question.id === questionId)

  if (!matchedQuestion) {
    return
  }

  if (matchedQuestion.sectionIndex !== currentSectionIndex.value) {
    handleSelectExamSection(matchedQuestion.sectionIndex, matchedQuestion.id)
    return
  }

  pendingExamQuestionId.value = ''
  activeExamQuestionId.value = matchedQuestion.id
}

/**
 * 切到整卷上一题
 * 用途：让单题答题模式仍然可以保持连续翻题体验
 * 入参：无
 * 返回值：无返回值
 */
function goToPreviousExamQuestion(): void {
  if (activeExamQuestionFlatIndex.value <= 0) {
    return
  }

  const previousQuestion = flatExamQuestions.value[activeExamQuestionFlatIndex.value - 1]

  if (!previousQuestion) {
    return
  }

  handleSelectExamQuestion(previousQuestion.id)
}

/**
 * 切到整卷下一题
 * 用途：让单题答题模式可以连续前进，遇到跨章节时自动切章
 * 入参：无
 * 返回值：无返回值
 */
function goToNextExamQuestion(): void {
  if (activeExamQuestionFlatIndex.value < 0 || activeExamQuestionFlatIndex.value >= flatExamQuestions.value.length - 1) {
    return
  }

  const nextQuestion = flatExamQuestions.value[activeExamQuestionFlatIndex.value + 1]

  if (!nextQuestion) {
    return
  }

  handleSelectExamQuestion(nextQuestion.id)
}

/**
 * 点击错题题号时切换到指定错题
 * 用途：错题解析区可以像答题区一样，快速跳到某一道具体错题
 * 入参：questionId 为目标错题 id
 * 返回值：无返回值
 */
function handleSelectWrongQuestion(questionId: string): void {
  if (!latestResult.value || !latestResult.value.wrongQuestions.some((question) => question.questionId === questionId)) {
    return
  }

  activeWrongQuestionId.value = questionId
}

/**
 * 点击错题章节时切换到本章第一道错题
 * 用途：结果页支持按章节复盘，不必一题题顺着翻找
 * 入参：sectionId 为目标章节 id
 * 返回值：无返回值
 */
function handleSelectWrongSection(sectionId: string): void {
  const matchedSection = wrongQuestionSectionList.value.find((section) => section.sectionId === sectionId)

  if (!matchedSection) {
    return
  }

  activeWrongQuestionId.value = matchedSection.firstQuestionId
}

/**
 * 切到上一道错题
 * 用途：错题解析区提供连续翻题操作，方便顺着复盘
 * 入参：无
 * 返回值：无返回值
 */
function goToPreviousWrongQuestion(): void {
  if (!latestResult.value || activeWrongQuestionIndex.value <= 0) {
    return
  }

  const previousQuestion = latestResult.value.wrongQuestions[activeWrongQuestionIndex.value - 1]

  if (!previousQuestion) {
    return
  }

  activeWrongQuestionId.value = previousQuestion.questionId
}

/**
 * 切到下一道错题
 * 用途：错题解析区提供连续翻题操作，方便快速浏览后续错题
 * 入参：无
 * 返回值：无返回值
 */
function goToNextWrongQuestion(): void {
  if (!latestResult.value || activeWrongQuestionIndex.value < 0 || activeWrongQuestionIndex.value >= latestResult.value.wrongQuestions.length - 1) {
    return
  }

  const nextQuestion = latestResult.value.wrongQuestions[activeWrongQuestionIndex.value + 1]

  if (!nextQuestion) {
    return
  }

  activeWrongQuestionId.value = nextQuestion.questionId
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
 * 计算弹窗内目标滚动位置
 * 用途：把目标节点换算成弹窗面板内部的准确滚动高度
 * 入参：target 为要滚动到的节点，offset 为顶部预留距离
 * 返回值：返回弹窗内部应滚动到的高度
 */
function resolveExamDialogScrollTop(target: HTMLElement, offset = 8): number {
  const panel = examDialogPanelRef.value

  if (!panel) {
    return 0
  }

  const panelRect = panel.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()
  return Math.max(0, panel.scrollTop + targetRect.top - panelRect.top - offset)
}

/**
 * 滚到当前章节起始位置
 * 用途：进入答题弹窗或切换章节后，只在弹窗内部回到当前章开头
 * 入参：behavior 为滚动方式
 * 返回值：无返回值
 */
function scrollExamDialogToBodyStart(behavior: ScrollBehavior = 'auto'): void {
  const panel = examDialogPanelRef.value
  const target = examBodyRef.value ?? examQuestionListRef.value

  if (!panel || !target) {
    return
  }

  panel.scrollTo({
    top: resolveExamDialogScrollTop(target),
    behavior,
  })
}

/**
 * 记录弹窗滚动位置
 * 用途：临时退出时记住当前进度位置，方便继续作答时无缝回到原处
 * 入参：无
 * 返回值：无返回值
 */
function captureExamDialogScrollTop(): void {
  if (!examDialogPanelRef.value) {
    return
  }

  lastExamDialogScrollTop.value = examDialogPanelRef.value.scrollTop
}

/**
 * 恢复弹窗滚动位置
 * 用途：继续作答时回到临时退出前看到的位置，不让用户重新寻找题目
 * 入参：无
 * 返回值：无返回值
 */
function restoreExamDialogScrollTop(): void {
  if (!examDialogPanelRef.value) {
    return
  }

  examDialogPanelRef.value.scrollTo({
    top: Math.max(0, lastExamDialogScrollTop.value),
    behavior: 'auto',
  })
}

/**
 * 打开答题弹窗
 * 用途：统一处理首次开考和继续作答两种场景的弹窗恢复逻辑
 * 入参：shouldRestoreScroll 为是否恢复上次退出前的滚动位置
 * 返回值：无返回值
 */
async function openExamDialog(shouldRestoreScroll = false): Promise<void> {
  isExamDialogVisible.value = true
  await nextTick()

  if (shouldRestoreScroll) {
    restoreExamDialogScrollTop()
    return
  }

  scrollExamDialogToBodyStart()
}

/**
 * 临时退出答题弹窗
 * 用途：先收起弹窗看页面其他区域，同时保留答题进度和当前滚动位置
 * 入参：无
 * 返回值：无返回值
 */
function temporarilyExitExamDialog(): void {
  captureExamDialogScrollTop()
  isExamDialogVisible.value = false
}

/**
 * 继续作答
 * 用途：把临时退出的答题弹窗重新打开，并回到刚才看到的位置
 * 入参：无
 * 返回值：无返回值
 */
async function resumeExamDialog(): Promise<void> {
  if (phase.value !== 'exam') {
    return
  }

  await openExamDialog(true)
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

// 这里监听考核弹窗显示状态，只有弹窗真正打开时才锁住背景页面滚动。
watch(
  isExamDialogOpen,
  (isOpen) => {
    syncExamDialogLock(isOpen)
  },
)

// 这里监听考核阶段变化，进入答题时自动打开弹窗，交卷后滚回结果摘要。
watch(
  phase,
  async (nextPhase) => {
    if (nextPhase === 'exam') {
      syncActiveExamQuestion(pendingExamQuestionId.value)
      pendingExamQuestionId.value = ''
      await openExamDialog(false)
      return
    }

    isExamDialogVisible.value = false

    await nextTick()

    if (nextPhase === 'result') {
      scrollToTarget(resultSummaryRef.value)
    }
  },
)

// 这里监听章节切换，确保点击上一章或下一章后回到当前章节开头，而不是停在列表中段。
watch(
  currentSectionIndex,
  async (nextSectionIndex, previousSectionIndex) => {
    if (
      phase.value !== 'exam'
      || !isExamDialogVisible.value
      || nextSectionIndex === previousSectionIndex
    ) {
      return
    }

    await nextTick()
    scrollExamDialogToBodyStart()
  },
)

// 这里监听当前章节题目，保证单题模式切章后总能自动落到目标题或本章第一道未答题。
watch(
  currentSectionQuestions,
  (questions) => {
    if (questions.length === 0) {
      activeExamQuestionId.value = ''
      pendingExamQuestionId.value = ''
      return
    }

    syncActiveExamQuestion(pendingExamQuestionId.value)
    pendingExamQuestionId.value = ''
  },
  {
    immediate: true,
  },
)

// 这里监听最近一次结果，结果页出现后默认先落到第一道错题，方便立即开始复盘。
watch(
  latestResult,
  (result) => {
    activeWrongQuestionId.value = result?.wrongQuestions[0]?.questionId ?? ''
  },
  {
    immediate: true,
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
      eyebrow="入派指引"
      title="先明门风，再答问心卷"
      lead="认同宗旨、愿守门风、能与同门真诚相待，便可循此页看清入门之路，再从容答完这一卷。"
      :note="siteContent.join.note"
    >
      <template #actions>
        <button
          v-if="phase === 'ready'"
          type="button"
          class="ink-button ink-button--primary"
          @click="startExam"
        >
          开始问心考核
        </button>
        <template v-else-if="phase === 'exam'">
          <button
            v-if="!isExamDialogOpen"
            type="button"
            class="ink-button ink-button--primary"
            @click="resumeExamDialog"
          >
            继续作答
          </button>
          <button
            v-if="!isExamDialogOpen"
            type="button"
            class="ink-button ink-button--ghost"
            :disabled="isSubmitting"
            @click="submitExam"
          >
            {{ isSubmitting ? '正在交卷...' : '立即交卷' }}
          </button>
        </template>
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
      <div class="section-heading">
        <p class="eyebrow">入门要点</p>
        <h2>先把真正需要知道的几件事看清</h2>
        <p>这里不设高墙，也不靠繁复流程压人。看明白宗旨、相处底线与来去之义，再答问心卷即可。</p>
      </div>

      <div class="card-grid card-grid--two assessment-guide-grid">
        <article
          v-for="item in siteContent.join.keyPoints"
          :key="item.title"
          class="content-card assessment-guide-card"
          data-reveal
        >
          <p class="content-card__eyebrow">{{ item.eyebrow }}</p>
          <h3>{{ item.title }}</h3>
          <p>{{ item.description }}</p>
        </article>
      </div>
    </section>

    <section
      v-if="phase === 'ready'"
      id="exam"
      class="content-section"
      data-reveal
    >
      <div class="assessment-ready">
        <article class="assessment-ready__main content-card content-card--soft">
          <p class="eyebrow">问心考核</p>
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
              正式答卷
            </button>
            <RouterLink to="/canon" class="ink-button ink-button--ghost">
              先阅立派全典
            </RouterLink>
          </div>
        </article>

        <article class="content-card">
          <p class="eyebrow">答卷规则</p>
          <h3>固定三十题，分七章问心</h3>

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

    <section v-if="phase === 'exam' && !isExamDialogOpen" class="content-section" data-reveal>
      <article class="content-card content-card--soft assessment-exam__resume-card">
        <p class="eyebrow">答题已临时退出</p>
        <h2>{{ participantTitle }} · 本轮考核仍在进行中</h2>
        <p class="assessment-exam__resume-lead">
          你刚刚离开了答题弹窗，当前答题进度已经保留，倒计时也会继续走。准备好了就点“继续作答”回到刚才的位置。
        </p>

        <div class="assessment-exam__resume-meta">
          <span>剩余时间：{{ remainingTimeText }}</span>
          <span>当前章节：第 {{ currentSectionIndex + 1 }} / {{ sectionBundles.length }} 章</span>
          <span>本章：{{ currentSection?.title || '当前章节' }}</span>
          <span>已答题数：{{ answeredCount }} / {{ totalQuestions }}</span>
        </div>

        <div class="assessment-exam__resume-actions">
          <button type="button" class="ink-button ink-button--primary" @click="resumeExamDialog">
            继续作答
          </button>
          <button
            type="button"
            class="ink-button ink-button--ghost"
            :disabled="isSubmitting"
            @click="submitExam"
          >
            {{ isSubmitting ? '正在交卷...' : '立即交卷' }}
          </button>
        </div>
      </article>
    </section>

    <Teleport to="body">
      <Transition name="exam-dialog-fade">
        <div v-if="isExamDialogOpen" class="assessment-exam-dialog" role="dialog" aria-modal="true" :aria-labelledby="'assessment-exam-dialog-title'">
          <div class="assessment-exam-dialog__backdrop" aria-hidden="true"></div>

          <div ref="examDialogPanelRef" class="assessment-exam-dialog__panel">
            <section class="assessment-exam assessment-exam--dialog">
              <div class="assessment-exam__sticky">
                <article class="assessment-exam__overview content-card content-card--soft">
                  <div class="assessment-exam__overview-head">
                    <div>
                      <p class="eyebrow">答题进行中</p>
                      <h2 :id="'assessment-exam-dialog-title'">{{ participantTitle }} · 正在问心</h2>
                    </div>

                    <div class="assessment-exam__overview-side">
                      <div class="assessment-exam__time-card">
                        <span>剩余时间</span>
                        <strong>{{ remainingTimeText }}</strong>
                      </div>

                      <button
                        type="button"
                        class="ink-button ink-button--ghost assessment-exam__temporary-exit"
                        @click="temporarilyExitExamDialog"
                      >
                        临时退出
                      </button>
                    </div>
                  </div>

                  <div class="assessment-exam__progress-meta">
                    <span>当前章节：第 {{ currentSectionIndex + 1 }} / {{ sectionBundles.length }} 章</span>
                    <span>已答题数：{{ answeredCount }} / {{ totalQuestions }}</span>
                    <span>未答题数：{{ unansweredCount }}</span>
                    <span>记录方式：{{ storageModeText }}</span>
                  </div>

                  <div class="assessment-exam__section-track">
                    <button
                      v-for="section in sectionProgressList"
                      :key="section.id"
                      type="button"
                      class="assessment-exam__section-pill"
                      :class="{
                        'assessment-exam__section-pill--active': section.isActive,
                        'assessment-exam__section-pill--started': section.isStarted && !section.isCompleted,
                        'assessment-exam__section-pill--completed': section.isCompleted,
                      }"
                      :aria-pressed="section.isActive ? 'true' : 'false'"
                      @click="handleSelectExamSection(section.index)"
                    >
                      <p>{{ section.eyebrow }}</p>
                      <strong>{{ section.title }}</strong>
                      <span>{{ section.answeredCount }} / {{ section.questionCount }} 题</span>
                    </button>
                  </div>
                </article>
              </div>

              <div ref="examBodyRef" class="assessment-exam__body">
                <article v-if="currentSection" class="content-card assessment-exam__chapter-card">
                  <p class="eyebrow">{{ currentSection.eyebrow }}</p>
                  <h2>{{ currentSection.title }}</h2>
                  <p>{{ currentSection.description }}</p>
                  <div class="assessment-exam__chapter-meta">
                    <span>本章题数：{{ currentSection.questions.length }}</span>
                    <span>本章已答：{{ currentSectionAnsweredCount }}</span>
                    <span v-if="activeExamQuestion">当前题号：第 {{ activeExamQuestion.order }} 题</span>
                    <span v-if="activeExamQuestionSectionProgressText">{{ activeExamQuestionSectionProgressText }}</span>
                  </div>
                </article>

                <div ref="examQuestionListRef" class="assessment-exam__question-workspace">
                  <article class="content-card content-card--soft assessment-exam__order-card">
                    <div class="assessment-exam__order-head">
                      <div>
                        <p class="eyebrow">题号速切</p>
                        <h3>按题号直接切换，整卷三十题一眼可见</h3>
                      </div>

                      <div class="assessment-exam__order-legend">
                        <span class="assessment-exam__legend-chip assessment-exam__legend-chip--active">当前题</span>
                        <span class="assessment-exam__legend-chip assessment-exam__legend-chip--answered">已作答</span>
                        <span class="assessment-exam__legend-chip assessment-exam__legend-chip--pending">未作答</span>
                      </div>
                    </div>

                    <div class="assessment-exam__order-grid">
                      <button
                        v-for="question in examQuestionOrderList"
                        :key="question.id"
                        type="button"
                        class="assessment-exam__order-button"
                        :class="{
                          'assessment-exam__order-button--active': question.isActive,
                          'assessment-exam__order-button--answered': question.isAnswered && !question.isActive,
                          'assessment-exam__order-button--pending': !question.isAnswered && !question.isActive,
                        }"
                        :aria-pressed="question.isActive ? 'true' : 'false'"
                        @click="handleSelectExamQuestion(question.id)"
                      >
                        {{ question.order }}
                      </button>
                    </div>
                  </article>

                  <AssessmentQuestionCard
                    v-if="activeExamQuestion"
                    :key="activeExamQuestion.id"
                    :question="activeExamQuestion"
                    :selected-option-ids="getSelectedOptionIds(activeExamQuestion.id)"
                    @toggle-multiple="toggleMultipleAnswer($event.questionId, $event.optionId)"
                    @update-single="setSingleAnswer($event.questionId, $event.optionId)"
                  />
                </div>
              </div>

              <div class="assessment-exam__actions assessment-exam__actions--dialog">
                <button
                  type="button"
                  class="ink-button ink-button--ghost"
                  :disabled="isFirstExamQuestion"
                  @click="goToPreviousExamQuestion"
                >
                  上一题
                </button>

                <button
                  v-if="!isLastExamQuestion"
                  type="button"
                  class="ink-button ink-button--secondary"
                  @click="goToNextExamQuestion"
                >
                  下一题
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
            <RouterLink
              v-if="latestResult.passed"
              to="/roster"
              class="ink-button ink-button--primary"
            >
              前往云栖名册登记
            </RouterLink>
            <button
              type="button"
              class="ink-button"
              :class="latestResult.passed ? 'ink-button--secondary' : 'ink-button--primary'"
              @click="restartExam"
            >
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
            <h2>交卷后逐题回看，错在何处，一眼看清</h2>
            <p>错题解析现在也改成一题一题展示，可按章节和题号快速切换，复盘时更聚焦。</p>
          </div>

          <div v-if="hasWrongQuestions" class="assessment-result__wrong-workspace">
            <article class="content-card content-card--soft assessment-result__wrong-nav-card">
              <div class="assessment-result__wrong-nav-head">
                <div>
                  <p class="eyebrow">错题定位</p>
                  <h3>先选章节，再按题号直达对应错题</h3>
                </div>

                <div class="assessment-result__wrong-count">
                  <span>错题总数</span>
                  <strong>{{ latestResult.wrongQuestions.length }}</strong>
                </div>
              </div>

              <div class="assessment-result__section-track">
                <button
                  v-for="section in wrongQuestionSectionList"
                  :key="section.sectionId"
                  type="button"
                  class="assessment-result__section-pill"
                  :class="{ 'assessment-result__section-pill--active': activeWrongQuestion?.sectionId === section.sectionId }"
                  :aria-pressed="activeWrongQuestion?.sectionId === section.sectionId ? 'true' : 'false'"
                  @click="handleSelectWrongSection(section.sectionId)"
                >
                  <p>{{ section.eyebrow }}</p>
                  <strong>{{ section.title }}</strong>
                  <span>{{ section.wrongCount }} 道错题</span>
                </button>
              </div>

              <div class="assessment-result__order-grid">
                <button
                  v-for="question in wrongQuestionOrderList"
                  :key="question.id"
                  type="button"
                  class="assessment-result__order-button"
                  :class="{ 'assessment-result__order-button--active': question.isActive }"
                  :aria-pressed="question.isActive ? 'true' : 'false'"
                  @click="handleSelectWrongQuestion(question.id)"
                >
                  {{ question.order }}
                </button>
              </div>
            </article>

            <article v-if="activeWrongQuestion" class="assessment-result__wrong-card content-card">
              <div class="assessment-result__wrong-head">
                <span class="assessment-result__wrong-index">第 {{ activeWrongQuestion.order }} 题</span>
                <span class="assessment-result__wrong-type">{{ activeWrongQuestion.type === 'single' ? '单选题' : '多选题' }}</span>
                <span class="assessment-result__wrong-section">{{ activeWrongQuestion.sectionTitle }}</span>
              </div>

              <h3>{{ activeWrongQuestion.stem }}</h3>

              <div class="assessment-result__wrong-answer-grid">
                <article class="assessment-result__answer-box assessment-result__answer-box--user">
                  <p>你的答案</p>
                  <strong>{{ activeWrongQuestion.userAnswerText }}</strong>
                </article>
                <article class="assessment-result__answer-box assessment-result__answer-box--correct">
                  <p>正确答案</p>
                  <strong>{{ activeWrongQuestion.correctAnswerText }}</strong>
                </article>
              </div>

              <div class="assessment-result__source">
                <p>{{ activeWrongQuestion.sourceTitle }}</p>
                <blockquote>{{ activeWrongQuestion.sourceExcerpt }}</blockquote>
              </div>
            </article>

            <div class="assessment-result__wrong-actions">
              <button
                type="button"
                class="ink-button ink-button--ghost"
                :disabled="isFirstWrongQuestion"
                @click="goToPreviousWrongQuestion"
              >
                上一题
              </button>
              <button
                type="button"
                class="ink-button ink-button--secondary"
                :disabled="isLastWrongQuestion"
                @click="goToNextWrongQuestion"
              >
                下一题
              </button>
            </div>
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
            <p>结果海报会自动带上入派指引页二维码，别人扫码后可直接进入问心考核区。</p>
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

.assessment-guide-grid {
  align-items: stretch;
}

.assessment-guide-card {
  display: grid;
  gap: 10px;
}

.assessment-guide-card h3,
.assessment-guide-card p:last-child {
  margin: 0;
}

.assessment-guide-card p:last-child {
  color: rgba(244, 239, 226, 0.74);
  line-height: 1.84;
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
.assessment-ready__chapter-list {
  display: grid;
  gap: 16px;
}

.assessment-exam__question-workspace,
.assessment-result__wrong-workspace {
  display: grid;
  gap: 18px;
}

.assessment-exam__order-card,
.assessment-result__wrong-nav-card {
  display: grid;
  gap: 18px;
}

.assessment-exam__order-head,
.assessment-result__wrong-nav-head {
  display: grid;
  gap: 20px;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
}

.assessment-exam__order-head h3,
.assessment-result__wrong-nav-head h3 {
  margin: 6px 0 0;
  font-size: clamp(1.1rem, 2vw, 1.36rem);
  line-height: 1.5;
}

.assessment-exam__order-legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.assessment-exam__legend-chip {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 0.82rem;
}

.assessment-exam__legend-chip--active {
  background: rgba(216, 185, 114, 0.16);
  color: rgba(241, 217, 160, 0.98);
}

.assessment-exam__legend-chip--answered {
  background: rgba(139, 208, 203, 0.14);
  color: rgba(139, 208, 203, 0.96);
}

.assessment-exam__legend-chip--pending {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(244, 239, 226, 0.72);
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

.assessment-exam__overview-side {
  display: grid;
  gap: 12px;
  justify-items: end;
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

.assessment-exam__temporary-exit {
  min-width: 170px;
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
  width: 100%;
  min-height: 94px;
  align-content: center;
  padding: 14px 16px;
  border: 1px solid rgba(216, 185, 114, 0.12);
  border-radius: 22px;
  background: rgba(5, 19, 28, 0.42);
  text-align: left;
  cursor: pointer;
  transition:
    transform 0.28s ease,
    border-color 0.28s ease,
    background-color 0.28s ease,
    box-shadow 0.28s ease;
}

.assessment-exam__section-pill p,
.assessment-exam__section-pill strong,
.assessment-exam__section-pill span,
.assessment-result__section-pill p,
.assessment-result__section-pill strong,
.assessment-result__section-pill span {
  margin: 0;
}

.assessment-exam__section-pill p,
.assessment-result__section-pill p {
  color: rgba(139, 208, 203, 0.84);
  font-size: 0.82rem;
  letter-spacing: 0.08em;
}

.assessment-exam__section-pill:hover,
.assessment-result__section-pill:hover,
.assessment-exam__order-button:hover,
.assessment-result__order-button:hover {
  transform: translateY(-2px);
}

.assessment-exam__section-pill:focus-visible,
.assessment-result__section-pill:focus-visible,
.assessment-exam__order-button:focus-visible,
.assessment-result__order-button:focus-visible {
  outline: 2px solid rgba(241, 217, 160, 0.72);
  outline-offset: 2px;
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

.assessment-exam__section-pill--started {
  border-color: rgba(216, 185, 114, 0.24);
  box-shadow: inset 0 0 0 1px rgba(216, 185, 114, 0.08);
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

.assessment-exam__order-grid,
.assessment-result__order-grid {
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: 10px;
}

.assessment-exam__order-button,
.assessment-result__order-button {
  display: grid;
  place-items: center;
  min-height: 48px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  background: rgba(4, 17, 24, 0.6);
  color: rgba(244, 239, 226, 0.76);
  font-size: 0.94rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 0.28s ease,
    border-color 0.28s ease,
    background-color 0.28s ease,
    box-shadow 0.28s ease,
    color 0.28s ease;
}

.assessment-exam__order-button--active {
  border-color: rgba(216, 185, 114, 0.42);
  background:
    linear-gradient(180deg, rgba(216, 185, 114, 0.18), rgba(34, 25, 7, 0.76)),
    rgba(20, 18, 10, 0.88);
  color: rgba(248, 237, 204, 0.98);
  box-shadow: 0 14px 26px rgba(216, 185, 114, 0.14);
}

.assessment-exam__order-button--answered {
  border-color: rgba(139, 208, 203, 0.28);
  background:
    linear-gradient(180deg, rgba(139, 208, 203, 0.16), rgba(7, 31, 36, 0.86)),
    rgba(7, 29, 35, 0.88);
  color: rgba(209, 241, 238, 0.96);
}

.assessment-exam__order-button--pending {
  border-color: rgba(255, 255, 255, 0.08);
  background: rgba(4, 17, 24, 0.6);
  color: rgba(244, 239, 226, 0.7);
}

.assessment-exam__resume-card {
  display: grid;
  gap: 20px;
}

.assessment-exam__resume-card h2,
.assessment-exam__resume-lead {
  margin: 0;
}

.assessment-exam__resume-lead {
  color: rgba(244, 239, 226, 0.76);
  line-height: 1.82;
}

.assessment-exam__resume-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.assessment-exam__resume-meta span {
  display: inline-flex;
  align-items: center;
  min-height: 38px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(216, 185, 114, 0.1);
  color: rgba(241, 217, 160, 0.94);
  font-size: 0.88rem;
}

.assessment-exam__resume-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
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

.assessment-result__section-track {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.assessment-result__section-pill {
  display: grid;
  gap: 6px;
  width: 100%;
  min-height: 92px;
  align-content: center;
  padding: 14px 16px;
  border: 1px solid rgba(212, 154, 114, 0.18);
  border-radius: 22px;
  background:
    linear-gradient(180deg, rgba(36, 17, 17, 0.86), rgba(22, 10, 12, 0.92)),
    rgba(20, 8, 10, 0.9);
  text-align: left;
  cursor: pointer;
  transition:
    transform 0.28s ease,
    border-color 0.28s ease,
    background-color 0.28s ease,
    box-shadow 0.28s ease;
}

.assessment-result__section-pill strong {
  font-size: 0.96rem;
  line-height: 1.5;
}

.assessment-result__section-pill span {
  color: rgba(244, 239, 226, 0.72);
  font-size: 0.86rem;
}

.assessment-result__section-pill--active {
  border-color: rgba(216, 185, 114, 0.32);
  background:
    linear-gradient(135deg, rgba(216, 185, 114, 0.14), rgba(49, 17, 18, 0.88)),
    rgba(34, 12, 14, 0.92);
  box-shadow: 0 16px 30px rgba(212, 154, 114, 0.12);
}

.assessment-result__wrong-count {
  display: grid;
  gap: 4px;
  min-width: 138px;
  padding: 14px 18px;
  border-radius: 20px;
  border: 1px solid rgba(212, 154, 114, 0.18);
  background:
    linear-gradient(180deg, rgba(54, 21, 21, 0.9), rgba(29, 12, 13, 0.94)),
    rgba(28, 10, 12, 0.92);
}

.assessment-result__wrong-count span {
  color: rgba(244, 239, 226, 0.68);
  font-size: 0.84rem;
}

.assessment-result__wrong-count strong {
  font-size: 1.7rem;
  line-height: 1;
  color: rgba(244, 196, 170, 0.98);
}

.assessment-result__wrong-card {
  display: grid;
  gap: 18px;
}

.assessment-result__order-button {
  border-color: rgba(212, 154, 114, 0.14);
  background:
    linear-gradient(180deg, rgba(43, 17, 18, 0.88), rgba(23, 9, 10, 0.94)),
    rgba(20, 8, 10, 0.9);
  color: rgba(244, 208, 193, 0.82);
}

.assessment-result__order-button--active {
  border-color: rgba(216, 185, 114, 0.38);
  background:
    linear-gradient(180deg, rgba(216, 185, 114, 0.18), rgba(52, 22, 14, 0.88)),
    rgba(38, 15, 11, 0.92);
  color: rgba(249, 237, 203, 0.98);
  box-shadow: 0 14px 24px rgba(212, 154, 114, 0.12);
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

.assessment-result__wrong-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
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

  .assessment-result__section-track {
    grid-template-columns: none;
    grid-auto-flow: column;
    grid-auto-columns: minmax(180px, 1fr);
    overflow-x: auto;
    overflow-y: hidden;
    padding-bottom: 6px;
    scroll-snap-type: x proximity;
  }

  .assessment-result__section-pill {
    scroll-snap-align: start;
  }

  .assessment-result__section-track::-webkit-scrollbar {
    height: 6px;
  }

  .assessment-result__section-track::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: rgba(212, 154, 114, 0.28);
  }
}

@media (max-width: 920px) {
  .assessment-ready,
  .assessment-exam__overview-head,
  .assessment-exam__order-head,
  .assessment-result__summary-head,
  .assessment-result__wrong-nav-head,
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

  .assessment-exam__overview-side {
    justify-items: start;
  }

  .assessment-exam__time-card {
    min-width: 0;
    width: 100%;
    justify-items: start;
    padding: 16px 18px;
  }

  .assessment-exam__temporary-exit {
    min-width: 0;
    width: 100%;
  }

  .assessment-result__score-badge {
    min-width: 0;
    width: 100%;
    justify-items: start;
    padding: 16px 18px;
  }

  .assessment-exam__order-legend {
    justify-content: flex-start;
  }

  .assessment-result__wrong-count {
    min-width: 0;
    width: 100%;
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

  .assessment-exam__order-grid,
  .assessment-result__order-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  /* 这里在手机端取消考核概览的吸顶，彻底避免滚动时压住题目内容。 */
  .assessment-exam__sticky {
    position: static;
    top: auto;
  }

  .assessment-exam__overview,
  .assessment-exam__chapter-card,
  .assessment-exam__order-card,
  .assessment-result__wrong-nav-card {
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
  .assessment-result__section-pill,
  .assessment-result__answer-box,
  .assessment-result__source {
    padding: 16px 14px;
    border-radius: 20px;
  }

  .assessment-ready__actions,
  .assessment-exam__actions,
  .assessment-result__actions,
  .assessment-result__wrong-actions,
  .assessment-exam__resume-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: stretch;
  }

  .assessment-ready__actions .ink-button,
  .assessment-exam__actions .ink-button,
  .assessment-result__actions .ink-button,
  .assessment-result__wrong-actions .ink-button,
  .assessment-exam__resume-actions .ink-button {
    width: 100%;
  }

  .assessment-ready__actions .ink-button:last-child:nth-child(odd),
  .assessment-exam__actions .ink-button:last-child:nth-child(odd),
  .assessment-result__actions .ink-button:last-child:nth-child(odd),
  .assessment-result__wrong-actions .ink-button:last-child:nth-child(odd),
  .assessment-exam__resume-actions .ink-button:last-child:nth-child(odd) {
    grid-column: 1 / -1;
  }

  .assessment-exam__section-track {
    grid-auto-columns: minmax(140px, 78vw);
    gap: 8px;
    margin-top: 14px;
  }

  .assessment-result__section-track {
    grid-auto-columns: minmax(160px, 82vw);
    gap: 8px;
  }

  .assessment-exam__progress-meta {
    gap: 8px;
    margin-top: 14px;
  }

  .assessment-exam__progress-meta span,
  .assessment-exam__chapter-meta span,
  .assessment-exam__resume-meta span {
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
    min-width: 0;
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

  .assessment-result__section-pill {
    min-height: 78px;
  }

  .assessment-exam__section-pill strong {
    font-size: 0.92rem;
  }

  .assessment-exam__section-pill span {
    font-size: 0.8rem;
  }

  .assessment-result__section-pill strong {
    font-size: 0.92rem;
  }

  .assessment-result__section-pill span {
    font-size: 0.8rem;
  }

  .assessment-exam__order-head h3,
  .assessment-result__wrong-nav-head h3 {
    font-size: 1rem;
  }

  .assessment-exam__order-legend {
    gap: 8px;
  }

  .assessment-exam__legend-chip {
    min-height: 30px;
    padding: 0 10px;
    font-size: 0.76rem;
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

  .assessment-exam__question-workspace,
  .assessment-result__wrong-workspace {
    gap: 12px;
  }

  .assessment-exam__order-grid,
  .assessment-result__order-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 8px;
  }

  .assessment-exam__order-button,
  .assessment-result__order-button {
    min-height: 42px;
    border-radius: 14px;
    font-size: 0.86rem;
  }
}
</style>
