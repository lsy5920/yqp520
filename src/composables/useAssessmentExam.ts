import { computed, onBeforeUnmount, readonly, ref } from 'vue'
import {
  ASSESSMENT_DRAFT_STORAGE_KEY,
  ASSESSMENT_RESULT_STORAGE_KEY,
  useAssessmentStorage,
} from '@/composables/useAssessmentStorage'
import type {
  AssessmentAnswerMap,
  AssessmentDraft,
  AssessmentPaperConfig,
  AssessmentPhase,
  AssessmentQuestion,
  AssessmentResult,
  AssessmentSection,
  AssessmentSectionResult,
  AssessmentWrongQuestionResult,
} from '@/types/assessment'

// 这里定义同门称呼最大长度，避免结果页和结果海报排版被撑坏。
const PARTICIPANT_TITLE_MAX_LENGTH = 12

/**
 * 组合式函数入参类型
 * 用途：把题库、章节和整套考核规则统一注入到答题逻辑中
 */
interface UseAssessmentExamOptions {
  paper: AssessmentPaperConfig
  questions: readonly AssessmentQuestion[]
  sections: readonly AssessmentSection[]
}

/**
 * 规范化同门称呼
 * 用途：统一清理空值和特殊字符，保证结果页与海报里的称呼安全可展示
 * 入参：rawValue 为用户输入的原始称呼，fallback 为兜底称呼
 * 返回值：返回清理后的称呼文本
 */
function sanitizeParticipantTitle(rawValue: string, fallback: string): string {
  const safeValue = rawValue
    .replace(/[<>{}\[\]`'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, PARTICIPANT_TITLE_MAX_LENGTH)

  return safeValue || fallback
}

/**
 * 格式化倒计时文本
 * 用途：把秒数转换成“分:秒”格式，方便答题头部直接展示
 * 入参：rawSeconds 为剩余秒数
 * 返回值：返回格式化后的时间文本
 */
function formatCountdown(rawSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(rawSeconds))
  const minuteText = String(Math.floor(safeSeconds / 60)).padStart(2, '0')
  const secondText = String(safeSeconds % 60).padStart(2, '0')
  return `${minuteText}:${secondText}`
}

/**
 * 格式化用时文本
 * 用途：把总秒数转换成更易读的中文时长，供结果页和结果海报展示
 * 入参：rawSeconds 为总秒数
 * 返回值：返回格式化后的中文时长
 */
function formatDuration(rawSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(rawSeconds))
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${minutes}分${String(seconds).padStart(2, '0')}秒`
}

// 这里导出入派考核主逻辑，统一管理答题、计时、评分、本地草稿和最新结果。
export function useAssessmentExam(options: UseAssessmentExamOptions) {
  // 这里接入考核专用本地存储工具，统一兜底浏览器存储不可用的情况。
  const { safeReadJson, safeRemove, safeWriteJson, storageMode } = useAssessmentStorage()

  // 这里保存页面当前阶段，控制开考前、答题中和结果页三种状态切换。
  const phase = ref<AssessmentPhase>('ready')

  // 这里保存同门称呼，开考前、结果页和结果海报都会共用这份数据。
  const participantTitle = ref<string>(options.paper.defaultParticipantTitle)

  // 这里保存当前已作答内容，键为题目 id，值为当前已选选项编号数组。
  const answerMap = ref<AssessmentAnswerMap>({})

  // 这里记录当前进行到第几章，答题页会按七章分步前进。
  const currentSectionIndex = ref<number>(0)

  // 这里保存最近一次正式交卷结果，用于结果页展示和本地持久记录。
  const latestResult = ref<AssessmentResult | null>(null)

  // 这里记录本轮考试开始时间，用于计算结果页的答题用时。
  const startTimestamp = ref<number>(0)

  // 这里记录本轮考试的绝对截止时间，刷新页面后也能连续计时。
  const deadlineTimestamp = ref<number>(0)

  // 这里保存当前剩余秒数，供答题头部显示倒计时和超时自动交卷使用。
  const remainingSeconds = ref<number>(options.paper.durationMinutes * 60)

  // 这里标记当前是否正在交卷，避免手动交卷和超时交卷同时触发。
  const isSubmitting = ref<boolean>(false)

  // 这里建立题目索引，方便后续按 id 快速找到对应题目。
  const questionMap = new Map(options.questions.map((question) => [question.id, question]))

  // 这里保存倒计时定时器编号，组件离开时会统一清理。
  let countdownTimerId: number | null = null

  /**
   * 按章节整理题目
   * 用途：让页面能够按七个章节逐步答题，同时跳过没有题目的空章节
   */
  const sectionBundles = computed(() => options.sections
    .map((section) => ({
      ...section,
      questions: options.questions.filter((question) => question.sectionId === section.id),
    }))
    .filter((section) => section.questions.length > 0))

  /**
   * 当前章节数据
   * 用途：答题页根据当前章节显示对应标题、说明和题目列表
   */
  const currentSection = computed(() => sectionBundles.value[currentSectionIndex.value] ?? null)

  /**
   * 当前章节的题目列表
   * 用途：让答题页只渲染当前步骤需要作答的题目
   */
  const currentSectionQuestions = computed(() => currentSection.value?.questions ?? [])

  /**
   * 已回答题数
   * 用途：顶部总进度会显示当前已经完成了多少题
   */
  const answeredCount = computed(() => options.questions.filter((question) => {
    const selectedOptionIds = answerMap.value[question.id] ?? []
    return selectedOptionIds.length > 0
  }).length)

  /**
   * 未回答题数
   * 用途：交卷前用于提醒用户是否还有题目未作答
   */
  const unansweredCount = computed(() => options.questions.length - answeredCount.value)

  /**
   * 当前章节已答题数
   * 用途：章节导航区域显示本章进度是否完成
   */
  const currentSectionAnsweredCount = computed(() => currentSectionQuestions.value.filter((question) => {
    const selectedOptionIds = answerMap.value[question.id] ?? []
    return selectedOptionIds.length > 0
  }).length)

  /**
   * 倒计时文本
   * 用途：答题页顶部直接展示可读的剩余时间
   */
  const remainingTimeText = computed(() => formatCountdown(remainingSeconds.value))

  /**
   * 存储模式提示
   * 用途：页面提醒当前是本地持久模式还是仅当前会话模式
   */
  const storageModeText = computed(() => (storageMode.value === 'local' ? '本地记录模式' : '当前会话模式'))

  /**
   * 结果页引导文案
   * 用途：根据是否合格切换不同的说明文本
   */
  const resultLead = computed(() => {
    if (!latestResult.value) {
      return ''
    }

    return latestResult.value.passed ? options.paper.passResultLead : options.paper.failResultLead
  })

  /**
   * 获取题目当前已选项
   * 用途：统一从答案表里取值，没有答案时返回空数组
   * 入参：questionId 为题目 id
   * 返回值：返回当前题目的已选选项编号数组
   */
  function getSelectedOptionIds(questionId: string): string[] {
    return answerMap.value[questionId] ?? []
  }

  /**
   * 规范化题目答案
   * 用途：过滤非法选项、去重并保持选项顺序，避免评分和回显出现脏数据
   * 入参：question 为题目对象，rawOptionIds 为原始选项编号数组
   * 返回值：返回整理后的选项编号数组
   */
  function normalizeOptionIds(question: AssessmentQuestion, rawOptionIds: string[]): string[] {
    const allowedOptionIdSet = new Set(question.options.map((option) => option.id))
    const uniqueOptionIdSet = new Set(rawOptionIds.filter((optionId) => allowedOptionIdSet.has(optionId)))

    return question.options
      .map((option) => option.id)
      .filter((optionId) => uniqueOptionIdSet.has(optionId))
  }

  /**
   * 规范化整张答题记录
   * 用途：恢复草稿或正式交卷前把所有答案整理成统一结构
   * 入参：rawAnswerMap 为原始答案表
   * 返回值：返回清理后的标准答案表
   */
  function normalizeAnswerMap(rawAnswerMap: AssessmentAnswerMap): AssessmentAnswerMap {
    const normalizedAnswerMap: AssessmentAnswerMap = {}

    options.questions.forEach((question) => {
      const rawQuestionAnswer = rawAnswerMap[question.id]
      const currentOptionIds = Array.isArray(rawQuestionAnswer) ? rawQuestionAnswer : []
      const normalizedOptionIds = normalizeOptionIds(question, currentOptionIds)

      if (normalizedOptionIds.length > 0) {
        normalizedAnswerMap[question.id] = normalizedOptionIds
      }
    })

    return normalizedAnswerMap
  }

  /**
   * 判断题目是否答对
   * 用途：正式交卷时统一按同一套规则计算得分
   * 入参：question 为题目对象，selectedOptionIds 为当前作答的选项编号数组
   * 返回值：答对返回 true，否则返回 false
   */
  function isQuestionCorrect(question: AssessmentQuestion, selectedOptionIds: string[]): boolean {
    const normalizedSelectedOptionIds = normalizeOptionIds(question, selectedOptionIds)
    const normalizedCorrectOptionIds = normalizeOptionIds(question, question.correctOptionIds)

    if (normalizedSelectedOptionIds.length !== normalizedCorrectOptionIds.length) {
      return false
    }

    return normalizedCorrectOptionIds.every((correctOptionId) => normalizedSelectedOptionIds.includes(correctOptionId))
  }

  /**
   * 把答案编号转成可阅读文字
   * 用途：结果页展示“你的答案”和“正确答案”时更易读
   * 入参：question 为题目对象，optionIds 为要展示的选项编号数组
   * 返回值：返回中文答案文本，没有答案时返回“未作答”
   */
  function formatAnswerText(question: AssessmentQuestion, optionIds: string[]): string {
    const normalizedOptionIds = normalizeOptionIds(question, optionIds)

    if (normalizedOptionIds.length === 0) {
      return '未作答'
    }

    return normalizedOptionIds
      .map((optionId) => {
        const matchedOption = question.options.find((option) => option.id === optionId)
        return matchedOption ? `${matchedOption.label}. ${matchedOption.text}` : optionId
      })
      .join('；')
  }

  /**
   * 清理倒计时定时器
   * 用途：避免页面切换或重新开考时出现多个定时器并行运行
   * 入参：无
   * 返回值：无返回值
   */
  function clearCountdownTimer(): void {
    if (countdownTimerId === null || typeof window === 'undefined') {
      return
    }

    window.clearInterval(countdownTimerId)
    countdownTimerId = null
  }

  /**
   * 同步剩余时间
   * 用途：根据绝对截止时间重新计算剩余秒数，保证刷新后倒计时不中断
   * 入参：无
   * 返回值：无返回值
   */
  function syncRemainingSeconds(): void {
    if (!deadlineTimestamp.value) {
      remainingSeconds.value = options.paper.durationMinutes * 60
      return
    }

    const nextRemainingSeconds = Math.max(0, Math.ceil((deadlineTimestamp.value - Date.now()) / 1000))
    remainingSeconds.value = nextRemainingSeconds

    // 这里处理用户切到别页后再回来已经超时的情况，超时后立刻自动交卷。
    if (nextRemainingSeconds <= 0 && phase.value === 'exam') {
      finalizeExam(true)
    }
  }

  /**
   * 启动倒计时
   * 用途：正式开考或恢复草稿后持续更新剩余时间
   * 入参：无
   * 返回值：无返回值
   */
  function startCountdownTimer(): void {
    clearCountdownTimer()
    syncRemainingSeconds()

    if (typeof window === 'undefined') {
      return
    }

    countdownTimerId = window.setInterval(() => {
      syncRemainingSeconds()
    }, 1000)
  }

  /**
   * 持久化草稿
   * 用途：答题过程中把当前进度保存到本地，刷新页面也能继续答
   * 入参：无
   * 返回值：无返回值
   */
  function persistDraft(): void {
    if (phase.value !== 'exam' || !startTimestamp.value || !deadlineTimestamp.value) {
      return
    }

    const draft: AssessmentDraft = {
      paperVersion: options.paper.version,
      participantTitle: participantTitle.value,
      currentSectionIndex: currentSectionIndex.value,
      answerMap: normalizeAnswerMap(answerMap.value),
      startTimestamp: startTimestamp.value,
      deadlineTimestamp: deadlineTimestamp.value,
    }

    safeWriteJson(ASSESSMENT_DRAFT_STORAGE_KEY, draft)
  }

  /**
   * 清理草稿
   * 用途：重新开考或正式交卷后移除旧进度，避免恢复到过期状态
   * 入参：无
   * 返回值：无返回值
   */
  function clearDraft(): void {
    safeRemove(ASSESSMENT_DRAFT_STORAGE_KEY)
  }

  /**
   * 保存最近一次结果
   * 用途：让用户刷新页面后仍能看到最近一次正式交卷成绩
   * 入参：result 为正式交卷结果
   * 返回值：无返回值
   */
  function persistResult(result: AssessmentResult): void {
    safeWriteJson(ASSESSMENT_RESULT_STORAGE_KEY, result)
  }

  /**
   * 生成章节成绩摘要
   * 用途：结果页按章节回顾用户答题正确情况
   * 入参：correctQuestionIdSet 为本次答对的题目 id 集合
   * 返回值：返回各章节的正确题数与总题数
   */
  function buildSectionResults(correctQuestionIdSet: Set<string>): AssessmentSectionResult[] {
    return sectionBundles.value.map((section) => ({
      sectionId: section.id,
      sectionTitle: section.title,
      correctCount: section.questions.filter((question) => correctQuestionIdSet.has(question.id)).length,
      questionCount: section.questions.length,
    }))
  }

  /**
   * 生成正式结果
   * 用途：统一计算总分、正确数、错题快照和章节结果
   * 入参：submitTimestampValue 为正式交卷时间戳
   * 返回值：返回一份完整的正式结果对象
   */
  function buildResult(submitTimestampValue: number): AssessmentResult {
    const normalizedAnswerMap = normalizeAnswerMap(answerMap.value)
    const correctQuestionIdSet = new Set<string>()
    const wrongQuestions: AssessmentWrongQuestionResult[] = []
    let totalScore = 0
    let correctCount = 0
    let singleCorrectCount = 0
    let multipleCorrectCount = 0

    options.questions.forEach((question) => {
      const selectedOptionIds = normalizedAnswerMap[question.id] ?? []
      const questionIsCorrect = isQuestionCorrect(question, selectedOptionIds)

      if (questionIsCorrect) {
        correctQuestionIdSet.add(question.id)
        correctCount += 1
        totalScore += question.score

        if (question.type === 'single') {
          singleCorrectCount += 1
        } else {
          multipleCorrectCount += 1
        }

        return
      }

      const sectionTitle = sectionBundles.value.find((section) => section.id === question.sectionId)?.title ?? '未分组章节'

      wrongQuestions.push({
        questionId: question.id,
        order: question.order,
        sectionId: question.sectionId,
        sectionTitle,
        type: question.type,
        stem: question.stem,
        options: question.options,
        userOptionIds: selectedOptionIds,
        correctOptionIds: question.correctOptionIds,
        userAnswerText: formatAnswerText(question, selectedOptionIds),
        correctAnswerText: formatAnswerText(question, question.correctOptionIds),
        sourceTitle: question.sourceTitle,
        sourceExcerpt: question.sourceExcerpt,
      })
    })

    const durationSeconds = startTimestamp.value
      ? Math.max(1, Math.min(options.paper.durationMinutes * 60, Math.round((submitTimestampValue - startTimestamp.value) / 1000)))
      : options.paper.durationMinutes * 60

    return {
      paperVersion: options.paper.version,
      participantTitle: participantTitle.value,
      score: totalScore,
      totalScore: options.paper.totalScore,
      passScore: options.paper.passScore,
      passed: totalScore >= options.paper.passScore,
      questionCount: options.questions.length,
      correctCount,
      singleCorrectCount,
      multipleCorrectCount,
      startTimestamp: startTimestamp.value,
      submitTimestamp: submitTimestampValue,
      durationSeconds,
      answerMap: normalizedAnswerMap,
      wrongQuestions,
      sectionResults: buildSectionResults(correctQuestionIdSet),
    }
  }

  /**
   * 正式交卷
   * 用途：在手动交卷或倒计时结束时统一生成正式结果并切到结果页
   * 入参：isTimeoutSubmit 为是否由倒计时结束触发的自动交卷
   * 返回值：无返回值
   */
  function finalizeExam(isTimeoutSubmit = false): void {
    if (isSubmitting.value) {
      return
    }

    isSubmitting.value = true
    clearCountdownTimer()
    participantTitle.value = sanitizeParticipantTitle(participantTitle.value, options.paper.defaultParticipantTitle)
    answerMap.value = normalizeAnswerMap(answerMap.value)
    const submitTimestampValue = Date.now()
    const result = buildResult(submitTimestampValue)

    latestResult.value = result
    phase.value = 'result'
    remainingSeconds.value = isTimeoutSubmit ? 0 : remainingSeconds.value
    persistResult(result)
    clearDraft()
    isSubmitting.value = false
  }

  /**
   * 读取最近一次结果
   * 用途：页面进入时优先恢复最近一次正式交卷成绩
   * 入参：无
   * 返回值：无返回值
   */
  function restoreLatestResult(): void {
    const storedResult = safeReadJson<AssessmentResult>(ASSESSMENT_RESULT_STORAGE_KEY)

    if (!storedResult || storedResult.paperVersion !== options.paper.version) {
      latestResult.value = null
      return
    }

    latestResult.value = storedResult
    participantTitle.value = sanitizeParticipantTitle(storedResult.participantTitle, options.paper.defaultParticipantTitle)
  }

  /**
   * 恢复草稿
   * 用途：刷新页面后继续上次未完成的考试，并让倒计时按原时间续接
   * 入参：draft 为读取到的草稿对象
   * 返回值：无返回值
   */
  function restoreDraft(draft: AssessmentDraft): void {
    participantTitle.value = sanitizeParticipantTitle(draft.participantTitle, options.paper.defaultParticipantTitle)
    answerMap.value = normalizeAnswerMap(draft.answerMap)
    currentSectionIndex.value = Math.min(
      Math.max(0, draft.currentSectionIndex),
      Math.max(0, sectionBundles.value.length - 1),
    )
    startTimestamp.value = draft.startTimestamp
    deadlineTimestamp.value = draft.deadlineTimestamp
    phase.value = 'exam'
    startCountdownTimer()
  }

  /**
   * 初始化考核页面
   * 用途：页面进入时按“草稿优先、结果次之、再回到开考前”恢复状态
   * 入参：无
   * 返回值：无返回值
   */
  function initializeAssessment(): void {
    restoreLatestResult()

    const storedDraft = safeReadJson<AssessmentDraft>(ASSESSMENT_DRAFT_STORAGE_KEY)

    if (storedDraft && storedDraft.paperVersion === options.paper.version) {
      restoreDraft(storedDraft)
      return
    }

    clearDraft()
    phase.value = latestResult.value ? 'result' : 'ready'
    remainingSeconds.value = options.paper.durationMinutes * 60
    currentSectionIndex.value = 0
  }

  /**
   * 开始新一轮考试
   * 用途：从开考前或结果页进入正式答题状态，并重置本轮草稿
   * 入参：无
   * 返回值：无返回值
   */
  function startExam(): void {
    clearCountdownTimer()
    clearDraft()
    participantTitle.value = sanitizeParticipantTitle(participantTitle.value, options.paper.defaultParticipantTitle)
    answerMap.value = {}
    currentSectionIndex.value = 0
    startTimestamp.value = Date.now()
    deadlineTimestamp.value = startTimestamp.value + options.paper.durationMinutes * 60 * 1000
    remainingSeconds.value = options.paper.durationMinutes * 60
    phase.value = 'exam'
    persistDraft()
    startCountdownTimer()
  }

  /**
   * 重新考核
   * 用途：结果页点击“重新考核”时直接开启新一轮考试
   * 入参：无
   * 返回值：无返回值
   */
  function restartExam(): void {
    startExam()
  }

  /**
   * 选择单选题答案
   * 用途：用户点击单选题选项时更新答案并立刻保存草稿
   * 入参：questionId 为题目 id，optionId 为选中的选项编号
   * 返回值：无返回值
   */
  function setSingleAnswer(questionId: string, optionId: string): void {
    const matchedQuestion = questionMap.get(questionId)

    if (!matchedQuestion) {
      return
    }

    answerMap.value = {
      ...answerMap.value,
      [questionId]: normalizeOptionIds(matchedQuestion, [optionId]),
    }
    persistDraft()
  }

  /**
   * 切换多选题答案
   * 用途：用户点按多选题选项时增删对应选项并立刻保存草稿
   * 入参：questionId 为题目 id，optionId 为当前点击的选项编号
   * 返回值：无返回值
   */
  function toggleMultipleAnswer(questionId: string, optionId: string): void {
    const matchedQuestion = questionMap.get(questionId)

    if (!matchedQuestion) {
      return
    }

    const currentOptionIds = getSelectedOptionIds(questionId)
    const nextOptionIds = currentOptionIds.includes(optionId)
      ? currentOptionIds.filter((currentOptionId) => currentOptionId !== optionId)
      : [...currentOptionIds, optionId]

    answerMap.value = {
      ...answerMap.value,
      [questionId]: normalizeOptionIds(matchedQuestion, nextOptionIds),
    }
    persistDraft()
  }

  /**
   * 跳到上一章节
   * 用途：答题页允许用户回看前一章，检查是否有漏题或错选
   * 入参：无
   * 返回值：无返回值
   */
  function goToPreviousSection(): void {
    currentSectionIndex.value = Math.max(0, currentSectionIndex.value - 1)
    persistDraft()
  }

  /**
   * 直接切换到指定章节
   * 用途：支持答题页点击章节卡片后直接跳到对应章节，而不必只能按上一章下一章顺序切换
   * 入参：nextSectionIndex 为目标章节下标
   * 返回值：无返回值
   */
  function setCurrentSectionIndex(nextSectionIndex: number): void {
    const safeSectionIndex = Math.min(
      Math.max(0, nextSectionIndex),
      Math.max(0, sectionBundles.value.length - 1),
    )

    if (safeSectionIndex === currentSectionIndex.value) {
      return
    }

    currentSectionIndex.value = safeSectionIndex
    persistDraft()
  }

  /**
   * 跳到下一章节
   * 用途：答题页逐章前进，直到最后一章准备交卷
   * 入参：无
   * 返回值：无返回值
   */
  function goToNextSection(): void {
    currentSectionIndex.value = Math.min(sectionBundles.value.length - 1, currentSectionIndex.value + 1)
    persistDraft()
  }

  /**
   * 手动交卷
   * 用途：用户点击交卷按钮时进行最终确认并生成结果
   * 入参：无
   * 返回值：无返回值
   */
  function submitExam(): void {
    if (phase.value !== 'exam') {
      return
    }

    if (typeof window !== 'undefined' && unansweredCount.value > 0) {
      const shouldSubmit = window.confirm(`当前还有 ${unansweredCount.value} 题未作答，确定现在交卷吗？`)

      if (!shouldSubmit) {
        return
      }
    }

    finalizeExam(false)
  }

  onBeforeUnmount(() => {
    // 这里在页面离开时清理定时器，避免回到页面后出现多个倒计时同时运行。
    clearCountdownTimer()
  })

  return {
    phase: readonly(phase),
    participantTitle,
    answerMap: readonly(answerMap),
    answeredCount,
    currentSection,
    currentSectionAnsweredCount,
    currentSectionIndex,
    currentSectionQuestions,
    initializeAssessment,
    isSubmitting: readonly(isSubmitting),
    latestResult: readonly(latestResult),
    remainingSeconds: readonly(remainingSeconds),
    remainingTimeText,
    resultLead,
    restartExam,
    sectionBundles,
    setSingleAnswer,
    setCurrentSectionIndex,
    startExam,
    storageMode: readonly(storageMode),
    storageModeText,
    submitExam,
    toggleMultipleAnswer,
    totalQuestions: computed(() => options.questions.length),
    unansweredCount,
    formatDuration,
    getSelectedOptionIds,
    goToNextSection,
    goToPreviousSection,
  }
}
