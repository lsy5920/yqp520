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
 * 章节切换来源
 * 用途：区分手动切章、题号或下一题跨章，以及弹窗打开时的回位方式
 */
type ExamSectionSwitchSource = 'manual' | 'question-nav' | 'dialog-open'

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

// 这里记录当前章节切换是由什么动作触发的，避免“下一题跨章”时误把弹窗滚回章节开头。
const examSectionSwitchSource = ref<ExamSectionSwitchSource>('dialog-open')

// 这里记录当前是否处于手机端答题布局，方便只在小屏启用折叠交互。
const isExamMobileLayout = ref<boolean>(false)

// 这里记录当前章作答情况卡片在手机端是否收起，默认进入答题时先收起。
const isExamChapterCollapsed = ref<boolean>(false)

// 这里记录题号速切区在手机端是否收起，默认进入答题时先收起。
const isExamOrderCollapsed = ref<boolean>(false)

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
  remainingSeconds,
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
 * 当前章节收起摘要
 * 用途：手机端收起本章作答情况卡片时，仍保留一行关键进度信息
 */
const examChapterCollapsedSummaryText = computed<string>(() => {
  if (!currentSection.value) {
    return ''
  }

  const summaryParts = [
    `本章已答 ${currentSectionAnsweredCount.value} / ${currentSection.value.questions.length} 题`,
  ]

  if (activeExamQuestionSectionProgressText.value) {
    summaryParts.push(activeExamQuestionSectionProgressText.value)
  }

  return summaryParts.join(' · ')
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
 * 题号速切区收起摘要
 * 用途：手机端默认收起题号区时，仍用一行摘要提示当前题号与整卷进度
 */
const examOrderCollapsedSummaryText = computed<string>(() => {
  const summaryParts = [`已答 ${answeredCount.value} / ${totalQuestions.value} 题`]

  if (activeExamQuestion.value) {
    summaryParts.unshift(`当前第 ${activeExamQuestion.value.order} 题`)
  }

  return summaryParts.join(' · ')
})

/**
 * 当前章作答情况区是否应显示完整内容
 * 用途：电脑端始终展开，手机端按折叠开关决定显示详情还是摘要
 */
const shouldShowExamChapterDetails = computed<boolean>(() => (
  !isExamMobileLayout.value || !isExamChapterCollapsed.value
))

/**
 * 题号速切区是否应显示完整内容
 * 用途：电脑端始终展开，手机端按折叠开关决定显示题号网格还是摘要
 */
const shouldShowExamOrderDetails = computed<boolean>(() => (
  !isExamMobileLayout.value || !isExamOrderCollapsed.value
))

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
 * 倒计时是否进入提醒状态。
 * 用途：剩余时间较少时给手机端时间玉牌增加暖色提示；入参无；返回值为是否需要提醒。
 */
const isAssessmentTimeRunningLow = computed<boolean>(() => remainingSeconds.value > 0 && remainingSeconds.value <= 300)

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
 * 入参：sectionIndex 为目标题章节下标，preferredQuestionId 为切换后优先展示的题目 id，switchSource 为本次切章来源
 * 返回值：无返回值
 */
function handleSelectExamSection(
  sectionIndex: number,
  preferredQuestionId = '',
  switchSource: ExamSectionSwitchSource = 'manual',
): void {
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
  examSectionSwitchSource.value = switchSource
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
    handleSelectExamSection(matchedQuestion.sectionIndex, matchedQuestion.id, 'question-nav')
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
 * 同步答题弹窗是否处于手机端布局
 * 用途：根据当前窗口宽度决定是否启用手机端折叠交互，并在回到大屏时恢复完整展开
 * 入参：无
 * 返回值：无返回值
 */
function syncExamMobileLayout(): void {
  if (typeof window === 'undefined') {
    isExamMobileLayout.value = false
    return
  }

  // 这里先记住调整前是否已经处于手机端，便于在桌面端切回手机端时补做默认收起。
  const wasExamMobileLayout = isExamMobileLayout.value
  isExamMobileLayout.value = window.innerWidth <= 720

  if (!isExamMobileLayout.value) {
    isExamChapterCollapsed.value = false
    isExamOrderCollapsed.value = false
    return
  }

  // 这里兼容旋转屏幕或浏览器改宽度的场景，只要从大屏切到手机端且正在答题，就恢复默认收起状态。
  if (!wasExamMobileLayout && phase.value === 'exam') {
    resetExamMobilePanels()
  }
}

/**
 * 重置手机端折叠面板
 * 用途：每次正式进入答题阶段时，让手机端的章节区和题号区回到默认收起状态
 * 入参：无
 * 返回值：无返回值
 */
function resetExamMobilePanels(): void {
  if (!isExamMobileLayout.value) {
    isExamChapterCollapsed.value = false
    isExamOrderCollapsed.value = false
    return
  }

  isExamChapterCollapsed.value = true
  isExamOrderCollapsed.value = true
}

/**
 * 切换当前章作答情况区
 * 用途：手机端点击后展开或收起当前章节说明与作答信息，桌面端保持始终展开
 * 入参：无
 * 返回值：无返回值
 */
function toggleExamChapterCollapsed(): void {
  if (!isExamMobileLayout.value) {
    return
  }

  isExamChapterCollapsed.value = !isExamChapterCollapsed.value
}

/**
 * 切换题号速切区
 * 用途：手机端点击后展开或收起整卷题号网格，减少答题时的垂直占用
 * 入参：无
 * 返回值：无返回值
 */
function toggleExamOrderCollapsed(): void {
  if (!isExamMobileLayout.value) {
    return
  }

  isExamOrderCollapsed.value = !isExamOrderCollapsed.value
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

  examSectionSwitchSource.value = 'dialog-open'
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
      syncExamMobileLayout()
      resetExamMobilePanels()
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

// 这里监听章节切换，只在手动切章节时把弹窗滚回章节开头，避免“下一题跨章”突然跳动。
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

    const currentSwitchSource = examSectionSwitchSource.value
    examSectionSwitchSource.value = 'manual'

    if (currentSwitchSource !== 'manual') {
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

onMounted(() => {
  syncExamMobileLayout()

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', syncExamMobileLayout, { passive: true })
  }

  initializeAssessment()
})

onBeforeUnmount(() => {
  syncExamDialogLock(false)

  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', syncExamMobileLayout)
  }
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
        <article class="assessment-ready__main content-card content-card--soft assessment-ready__trial-card">
          <div class="assessment-ready__seal" aria-hidden="true">问</div>
          <p class="eyebrow">问心考核</p>
          <h2>{{ siteContent.assessment.paper.title }}</h2>
          <p class="assessment-ready__lead">{{ siteContent.assessment.paper.lead }}</p>

          <div class="assessment-ready__quick-stats" aria-label="考核关键信息">
            <span>{{ siteContent.assessment.paper.totalQuestions }} 题</span>
            <span>{{ siteContent.assessment.paper.durationMinutes }} 分钟</span>
            <span>{{ siteContent.assessment.paper.passScore }} 分合格</span>
          </div>

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

        <article class="content-card assessment-ready__rule-card">
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
                        <div
                          class="assessment-exam__time-card"
                          :class="{ 'assessment-exam__time-card--warning': isAssessmentTimeRunningLow }"
                        >
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

                    <div class="assessment-exam__progress-ribbon" aria-hidden="true">
                      <span :style="{ width: `${Math.max(4, Math.round((answeredCount / Math.max(totalQuestions, 1)) * 100))}%` }"></span>
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
                  <div class="assessment-exam__chapter-head">
                    <div class="assessment-exam__chapter-title">
                      <p class="eyebrow">{{ currentSection.eyebrow }}</p>
                      <h2>{{ currentSection.title }}</h2>
                    </div>

                    <button
                      v-if="isExamMobileLayout"
                      type="button"
                      class="assessment-exam__compact-toggle"
                      :aria-expanded="shouldShowExamChapterDetails ? 'true' : 'false'"
                      @click="toggleExamChapterCollapsed"
                    >
                      {{ shouldShowExamChapterDetails ? '收起本章' : '展开本章' }}
                    </button>
                  </div>

                  <p v-if="isExamMobileLayout && !shouldShowExamChapterDetails" class="assessment-exam__compact-summary">
                    {{ examChapterCollapsedSummaryText }}
                  </p>

                  <template v-if="shouldShowExamChapterDetails">
                    <p>{{ currentSection.description }}</p>
                    <div class="assessment-exam__chapter-meta">
                      <span>本章题数：{{ currentSection.questions.length }}</span>
                      <span>本章已答：{{ currentSectionAnsweredCount }}</span>
                      <span v-if="activeExamQuestion">当前题号：第 {{ activeExamQuestion.order }} 题</span>
                      <span v-if="activeExamQuestionSectionProgressText">{{ activeExamQuestionSectionProgressText }}</span>
                    </div>
                  </template>
                </article>

                <div ref="examQuestionListRef" class="assessment-exam__question-workspace">
                  <article class="content-card content-card--soft assessment-exam__order-card">
                    <div class="assessment-exam__order-head">
                      <div>
                        <p class="eyebrow">题号速切</p>
                        <h3>按题号直接切换，整卷三十题一眼可见</h3>
                      </div>

                      <div class="assessment-exam__order-side">
                        <div v-if="shouldShowExamOrderDetails" class="assessment-exam__order-legend">
                          <span class="assessment-exam__legend-chip assessment-exam__legend-chip--active">当前题</span>
                          <span class="assessment-exam__legend-chip assessment-exam__legend-chip--answered">已作答</span>
                          <span class="assessment-exam__legend-chip assessment-exam__legend-chip--pending">未作答</span>
                        </div>

                        <button
                          v-if="isExamMobileLayout"
                          type="button"
                          class="assessment-exam__compact-toggle"
                          :aria-expanded="shouldShowExamOrderDetails ? 'true' : 'false'"
                          @click="toggleExamOrderCollapsed"
                        >
                          {{ shouldShowExamOrderDetails ? '收起题卷目录' : '打开题卷目录' }}
                        </button>
                      </div>
                    </div>

                    <button
                      v-if="isExamMobileLayout && !shouldShowExamOrderDetails"
                      type="button"
                      class="assessment-exam__catalog-entry"
                      @click="toggleExamOrderCollapsed"
                    >
                      <span>题卷目录</span>
                      <strong>{{ examOrderCollapsedSummaryText }}</strong>
                    </button>

                    <p v-if="!isExamMobileLayout && !shouldShowExamOrderDetails" class="assessment-exam__compact-summary">
                      {{ examOrderCollapsedSummaryText }}
                    </p>

                    <div v-if="shouldShowExamOrderDetails" class="assessment-exam__order-grid">
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
            建议三日后补考。首版暂不做本地强锁，你可以先阅立派全典，再决定何时重考。
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
              class="ink-button ink-button--secondary"
              @click="restartExam"
            >
              重新考核
            </button>
            <RouterLink
              to="/canon"
              class="ink-button"
              :class="latestResult.passed ? 'ink-button--ghost' : 'ink-button--primary'"
            >
              去看立派全典
            </RouterLink>
          </div>
        </article>

        <section class="content-section">
          <div class="section-heading">
            <p class="eyebrow">结果海报</p>
            <h2>把这张成绩帖留下来，也可直接分享出去</h2>
            <p>结果海报会自动带上入派考核页二维码，别人扫码后可直接进入问心考核区。</p>
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
  color: rgba(35, 83, 86, 0.74);
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
  color: rgba(35, 83, 86, 0.76);
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
  color: rgba(35, 83, 86, 0.72);
}

.assessment-ready__input {
  width: 100%;
  min-height: 48px;
  padding: 0 14px;
  border: 1px solid rgba(216, 185, 114, 0.18);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
  color: #173d42;
}

.assessment-ready__helper,
.assessment-ready__notice {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.8;
  color: rgba(35, 83, 86, 0.66);
}

.assessment-ready__intro-list,
.assessment-ready__score-grid,
.assessment-ready__chapter-list {
  display: grid;
  gap: 16px;
}

.assessment-exam__chapter-card {
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

.assessment-exam__chapter-head {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
}

.assessment-exam__chapter-title {
  display: grid;
  gap: 6px;
}

.assessment-exam__chapter-title .eyebrow,
.assessment-exam__chapter-title h2 {
  margin: 0;
}

.assessment-exam__order-head h3,
.assessment-result__wrong-nav-head h3 {
  margin: 6px 0 0;
  font-size: clamp(1.1rem, 2vw, 1.36rem);
  line-height: 1.5;
}

.assessment-exam__order-side {
  display: grid;
  gap: 10px;
  justify-items: end;
}

.assessment-exam__order-legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.assessment-exam__compact-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid rgba(216, 185, 114, 0.18);
  border-radius: 999px;
  background: rgba(5, 19, 28, 0.48);
  color: rgba(241, 217, 160, 0.94);
  cursor: pointer;
  transition:
    border-color 0.28s ease,
    background-color 0.28s ease,
    color 0.28s ease,
    box-shadow 0.28s ease;
}

.assessment-exam__compact-toggle:hover {
  border-color: rgba(216, 185, 114, 0.3);
  background: rgba(10, 31, 42, 0.72);
}

.assessment-exam__compact-toggle:focus-visible {
  outline: 2px solid rgba(241, 217, 160, 0.72);
  outline-offset: 2px;
}

.assessment-exam__compact-summary {
  margin: 0;
  padding: 12px 14px;
  border: 1px solid rgba(216, 185, 114, 0.12);
  border-radius: 18px;
  background: rgba(5, 19, 28, 0.4);
  color: rgba(35, 83, 86, 0.74);
  font-size: 0.92rem;
  line-height: 1.74;
  overflow-wrap: anywhere;
  word-break: break-word;
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
  color: rgba(35, 83, 86, 0.72);
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
  color: rgba(35, 83, 86, 0.78);
}

.assessment-ready__score-card small {
  color: rgba(35, 83, 86, 0.6);
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
  color: rgba(35, 83, 86, 0.68);
  font-size: 0.88rem;
}

.assessment-exam__section-pill--active {
  border-color: rgba(216, 185, 114, 0.34);
  background:
    linear-gradient(135deg, rgba(216, 185, 114, 0.12), rgba(9, 34, 46, 0.86)),
    rgba(239, 249, 246, 0.78);
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
  color: rgba(35, 83, 86, 0.76);
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
  background: rgba(239, 249, 246, 0.72);
  color: rgba(35, 83, 86, 0.76);
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
    linear-gradient(180deg, rgba(216, 185, 114, 0.18), rgba(238, 225, 184, 0.78)),
    rgba(247, 241, 219, 0.88);
  color: rgba(248, 237, 204, 0.98);
  box-shadow: 0 14px 26px rgba(216, 185, 114, 0.14);
}

.assessment-exam__order-button--answered {
  border-color: rgba(139, 208, 203, 0.28);
  background:
    linear-gradient(180deg, rgba(139, 208, 203, 0.16), rgba(210, 238, 233, 0.86)),
    rgba(224, 243, 237, 0.88);
  color: rgba(209, 241, 238, 0.96);
}

.assessment-exam__order-button--pending {
  border-color: rgba(255, 255, 255, 0.08);
  background: rgba(239, 249, 246, 0.72);
  color: rgba(35, 83, 86, 0.72);
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
  color: rgba(35, 83, 86, 0.76);
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
    rgba(239, 249, 246, 0.9);
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
  color: rgba(35, 83, 86, 0.74);
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
  color: rgba(35, 83, 86, 0.72);
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
  color: rgba(35, 83, 86, 0.72);
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
  color: rgba(35, 83, 86, 0.68);
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
  color: rgba(35, 83, 86, 0.64);
}

.assessment-result__answer-box strong {
  color: rgba(35, 83, 86, 0.94);
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
  background: rgba(239, 249, 246, 0.72);
}

.assessment-result__source p {
  color: rgba(139, 208, 203, 0.88);
  font-size: 0.92rem;
  letter-spacing: 0.08em;
}

.assessment-result__source blockquote {
  padding-left: 16px;
  border-left: 2px solid rgba(216, 185, 114, 0.3);
  color: rgba(35, 83, 86, 0.78);
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
  .assessment-exam__chapter-head,
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

  .assessment-exam__order-side {
    justify-items: start;
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

  .assessment-exam__chapter-head,
  .assessment-exam__order-head {
    gap: 12px;
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

  /* 这里把结果统计和章节成绩收回双列，主标题区与总分牌仍保持单列，避免手机端层级失衡。 */
  .assessment-result__stats,
  .assessment-result__section-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  /* 这里让奇数结尾的章节成绩卡独占一整行，避免最后一张卡片半宽悬空。 */
  .assessment-result__section-summary .assessment-result__section-card:last-child:nth-child(odd) {
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

  .assessment-result__stat-card {
    gap: 6px;
  }

  .assessment-result__stat-card strong {
    font-size: clamp(1.24rem, 5vw, 1.5rem);
  }

  .assessment-result__section-card strong {
    font-size: 0.94rem;
    line-height: 1.52;
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

  .assessment-exam__compact-toggle {
    width: 100%;
    min-height: 38px;
    padding: 0 12px;
    font-size: 0.82rem;
  }

  .assessment-exam__compact-summary {
    padding: 10px 12px;
    border-radius: 16px;
    font-size: 0.84rem;
    line-height: 1.68;
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
.assessment-ready__trial-card,
.assessment-ready__rule-card,
.assessment-exam__overview,
.assessment-exam__chapter-card,
.assessment-exam__order-card,
.assessment-result__summary {
  position: relative;
  overflow: hidden;
  border-color: rgba(83, 145, 138, 0.2);
  background:
    radial-gradient(circle at 16% 0%, rgba(255, 255, 255, 0.82), transparent 34%),
    radial-gradient(circle at 88% 16%, rgba(152, 211, 202, 0.2), transparent 34%),
    linear-gradient(145deg, rgba(250, 255, 252, 0.94), rgba(222, 242, 236, 0.8));
  box-shadow: 0 24px 56px rgba(54, 106, 105, 0.16);
}

.assessment-ready__trial-card::before,
.assessment-ready__rule-card::before,
.assessment-result__summary::before {
  position: absolute;
  inset: 12px;
  pointer-events: none;
  content: '';
  border: 1px solid rgba(186, 151, 76, 0.2);
  border-radius: 24px;
  background:
    linear-gradient(120deg, transparent 0 45%, rgba(255, 255, 255, 0.5) 50%, transparent 56% 100%),
    repeating-linear-gradient(115deg, rgba(49, 121, 105, 0.04) 0 1px, transparent 1px 26px);
  background-size: 240% 100%, auto;
  animation: assessment-paper-shine 7s ease-in-out infinite;
}

.assessment-ready__seal {
  position: absolute;
  top: 22px;
  right: 24px;
  display: grid;
  width: 58px;
  height: 58px;
  place-items: center;
  border: 1px solid rgba(186, 151, 76, 0.36);
  border-radius: 20px;
  background: linear-gradient(145deg, rgba(229, 247, 242, 0.92), rgba(142, 199, 190, 0.7));
  color: #1f5b58;
  font-size: 1.5rem;
  font-weight: 800;
  box-shadow: 0 14px 28px rgba(67, 128, 123, 0.18);
  transform: rotate(8deg);
}

.assessment-ready__quick-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 22px;
}

.assessment-ready__quick-stats span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0 10px;
  border: 1px solid rgba(83, 145, 138, 0.18);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.55);
  color: #1d5659;
  font-size: 0.88rem;
  font-weight: 700;
}

.assessment-ready__input,
.assessment-ready__intro-card,
.assessment-ready__score-card,
.assessment-ready__chapter-card,
.assessment-result__stat-card,
.assessment-result__section-card {
  border-color: rgba(83, 145, 138, 0.2);
  background: rgba(250, 255, 252, 0.68);
  color: #173d42;
}

.assessment-exam-dialog__backdrop {
  background:
    radial-gradient(circle at 24% 14%, rgba(214, 244, 237, 0.58), transparent 34%),
    linear-gradient(180deg, rgba(242, 252, 249, 0.72), rgba(191, 222, 216, 0.82));
  backdrop-filter: blur(14px);
}

.assessment-exam-dialog__panel {
  border-color: rgba(83, 145, 138, 0.24);
  background:
    radial-gradient(circle at 10% 0%, rgba(255, 255, 255, 0.9), transparent 34%),
    linear-gradient(180deg, rgba(245, 255, 251, 0.94), rgba(220, 241, 236, 0.9));
}

.assessment-exam__overview-head h2,
.assessment-result__summary-head h2,
.assessment-ready h2,
.assessment-ready h3,
.assessment-exam__chapter-title h2,
.assessment-exam__order-head h3 {
  color: #173d42;
}

.assessment-exam__time-card {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(83, 145, 138, 0.24);
  background:
    radial-gradient(circle at 30% 0%, rgba(255, 255, 255, 0.75), transparent 45%),
    linear-gradient(145deg, rgba(231, 250, 245, 0.94), rgba(163, 211, 201, 0.72));
  color: #173d42;
  box-shadow: 0 16px 30px rgba(65, 130, 122, 0.16);
}

.assessment-exam__time-card--warning {
  border-color: rgba(183, 119, 52, 0.38);
  background: linear-gradient(145deg, rgba(255, 246, 226, 0.96), rgba(232, 200, 139, 0.76));
  animation: assessment-time-pulse 1.6s ease-in-out infinite;
}

.assessment-exam__time-card span,
.assessment-exam__time-card strong,
.assessment-exam__progress-meta span,
.assessment-exam__chapter-meta span,
.assessment-ready__notice,
.assessment-ready__helper,
.assessment-result__footer-meta span,
.assessment-result__retake-note {
  color: rgba(23, 61, 66, 0.78);
}

.assessment-exam__time-card strong {
  color: #173d42;
}

.assessment-exam__progress-ribbon {
  position: relative;
  height: 10px;
  margin-top: 18px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(83, 145, 138, 0.14);
}

.assessment-exam__progress-ribbon span {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: inherit;
  background: linear-gradient(90deg, rgba(73, 151, 138, 0.78), rgba(211, 188, 112, 0.88), rgba(115, 190, 178, 0.82));
  box-shadow: 0 0 18px rgba(83, 145, 138, 0.32);
  transition: width 0.36s ease;
}

.assessment-exam__section-pill {
  position: relative;
  overflow: hidden;
  border-color: rgba(83, 145, 138, 0.18);
  background: rgba(250, 255, 252, 0.66);
  color: #173d42;
  box-shadow: 0 12px 26px rgba(58, 116, 112, 0.1);
  transition: transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease;
}

.assessment-exam__section-pill:hover,
.assessment-exam__section-pill--active {
  transform: translateY(-3px) rotate(-0.4deg);
  border-color: rgba(186, 151, 76, 0.42);
  background: linear-gradient(145deg, rgba(234, 250, 244, 0.96), rgba(197, 230, 222, 0.8));
  box-shadow: 0 18px 34px rgba(58, 116, 112, 0.16);
}

.assessment-exam__catalog-entry {
  display: grid;
  width: 100%;
  gap: 4px;
  min-height: 58px;
  padding: 12px 14px;
  border: 1px solid rgba(83, 145, 138, 0.24);
  border-radius: 18px;
  background:
    radial-gradient(circle at 10% 0%, rgba(255, 255, 255, 0.72), transparent 40%),
    linear-gradient(145deg, rgba(235, 250, 245, 0.9), rgba(202, 232, 224, 0.78));
  color: #173d42;
  text-align: left;
  box-shadow: 0 12px 24px rgba(60, 118, 114, 0.12);
}

.assessment-exam__catalog-entry span {
  font-size: 0.78rem;
  color: rgba(35, 83, 86, 0.64);
}

.assessment-exam__catalog-entry strong {
  font-size: 0.92rem;
  color: #173d42;
}

.assessment-exam__order-button,
.assessment-result__order-button {
  border-color: rgba(83, 145, 138, 0.2);
  background: rgba(255, 255, 255, 0.62);
  color: #1d5659;
}

.assessment-exam__order-button--active,
.assessment-result__order-button--active {
  border-color: rgba(186, 151, 76, 0.52);
  background: linear-gradient(145deg, rgba(212, 236, 229, 0.96), rgba(179, 218, 209, 0.86));
  color: #173d42;
}

.assessment-exam__order-button--answered,
.assessment-result__order-button--answered {
  background: rgba(222, 244, 238, 0.86);
}

.assessment-result__summary {
  border-radius: 34px;
}

.assessment-result__score-badge {
  border-color: rgba(83, 145, 138, 0.22);
  background: linear-gradient(145deg, rgba(234, 250, 244, 0.98), rgba(178, 218, 209, 0.8));
  color: #173d42;
  box-shadow: 0 18px 36px rgba(58, 116, 112, 0.16);
}

.assessment-result__score-badge--passed {
  border-color: rgba(186, 151, 76, 0.44);
  background: radial-gradient(circle at 28% 0%, rgba(255, 255, 255, 0.8), transparent 42%), linear-gradient(145deg, rgba(232, 247, 241, 0.98), rgba(209, 188, 113, 0.34));
}

@keyframes assessment-paper-shine {
  0%, 100% { background-position: 170% 0, 0 0; }
  50% { background-position: -90% 0, 0 0; }
}

@keyframes assessment-time-pulse {
  0%, 100% { box-shadow: 0 16px 30px rgba(183, 119, 52, 0.12); }
  50% { box-shadow: 0 16px 34px rgba(183, 119, 52, 0.28); }
}

@media (max-width: 720px) {
  .page--assessment { gap: 22px; }

  .assessment-ready__trial-card,
  .assessment-ready__rule-card { border-radius: 26px; }

  .assessment-ready__seal {
    width: 46px;
    height: 46px;
    border-radius: 16px;
    font-size: 1.18rem;
  }

  .assessment-ready__quick-stats {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .assessment-ready__quick-stats span { justify-content: flex-start; }

  .assessment-exam-dialog__panel {
    overflow: hidden;
    padding: 10px 8px;
  }

  .assessment-exam--dialog {
    display: grid;
    height: 100%;
    grid-template-rows: auto minmax(0, 1fr) auto;
    gap: 10px;
  }

  .assessment-exam__sticky {
    position: relative;
    top: auto;
  }

  .assessment-exam__overview {
    padding: 14px 12px;
    border-radius: 22px;
  }

  .assessment-exam__overview-head { align-items: stretch; }
  .assessment-exam__overview-head h2 { font-size: 1.08rem; }

  .assessment-exam__overview-side {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: stretch;
    gap: 8px;
  }

  .assessment-exam__time-card {
    min-height: 54px;
    padding: 8px 12px;
    border-radius: 18px;
  }

  .assessment-exam__temporary-exit {
    min-width: 76px;
    min-height: 54px;
    padding: 0 10px;
  }

  .assessment-exam__progress-meta {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .assessment-exam__progress-meta span:last-child { grid-column: 1 / -1; }
  .assessment-exam__section-track { grid-auto-columns: minmax(126px, 46vw); }

  .assessment-exam__body {
    min-height: 0;
    overflow-y: auto;
    padding: 0 2px 8px;
  }

  .assessment-exam__chapter-card,
  .assessment-exam__order-card {
    padding: 12px;
    border-radius: 22px;
  }

  .assessment-exam__question-workspace { gap: 10px; }

  .assessment-exam__order-card:has(.assessment-exam__order-grid) {
    position: fixed;
    right: 10px;
    bottom: calc(78px + env(safe-area-inset-bottom));
    left: 10px;
    z-index: 22;
    max-height: min(62vh, 460px);
    overflow: auto;
    border-radius: 24px;
    box-shadow: 0 24px 60px rgba(34, 82, 82, 0.28);
    animation: assessment-catalog-rise 0.28s ease both;
  }

  .assessment-exam__order-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); }

  .assessment-exam__actions--dialog {
    position: relative;
    z-index: 25;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr);
    gap: 8px;
    padding: 10px 8px calc(10px + env(safe-area-inset-bottom));
    border: 1px solid rgba(83, 145, 138, 0.2);
    background: rgba(245, 255, 251, 0.9);
    backdrop-filter: blur(18px);
  }

  .assessment-exam__actions--dialog .ink-button { min-height: 48px; }
  .assessment-result__summary { border-radius: 26px; }
}

@keyframes assessment-catalog-rise {
  from { opacity: 0; transform: translateY(18px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .assessment-ready__trial-card::before,
  .assessment-ready__rule-card::before,
  .assessment-result__summary::before,
  .assessment-exam__time-card--warning,
  .assessment-exam__order-card:has(.assessment-exam__order-grid) {
    animation: none;
  }

  .assessment-exam__section-pill,
  .assessment-exam__progress-ribbon span {
    transition: none;
  }
}
</style>
