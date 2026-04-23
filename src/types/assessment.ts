// 这里定义题目类型，方便区分单选题和多选题。
export type AssessmentQuestionType = 'single' | 'multiple'

// 这里定义考核页面阶段，方便页面切换不同展示状态。
export type AssessmentPhase = 'ready' | 'exam' | 'result'

// 这里定义题目选项类型，用于统一描述每个选项的编号和内容。
export interface AssessmentOption {
  id: string
  label: string
  text: string
}

// 这里定义单道题目的完整结构，供答题页和评分逻辑统一使用。
export interface AssessmentQuestion {
  id: string
  order: number
  sectionId: string
  type: AssessmentQuestionType
  score: number
  stem: string
  options: AssessmentOption[]
  correctOptionIds: string[]
  sourceTitle: string
  sourceExcerpt: string
}

// 这里定义章节结构，方便按七大章节分步答题。
export interface AssessmentSection {
  id: string
  title: string
  eyebrow: string
  description: string
}

// 这里定义题型分值说明，方便开考前展示规则总览。
export interface AssessmentScoreRule {
  type: AssessmentQuestionType
  label: string
  count: number
  scorePerQuestion: number
  totalScore: number
  summary: string
}

// 这里定义结果海报配置，方便结果海报模板统一读取内容。
export interface AssessmentResultPosterConfig {
  title: string
  subtitle: string
  signature: string
  qrLabel: string
  exportWidth: number
  exportHeight: number
  passHeadline: string
  failHeadline: string
  passCopy: string
  failCopy: string
}

// 这里定义整套考核配置，供页面展示规则、结果文案和题库说明。
export interface AssessmentPaperConfig {
  version: string
  title: string
  lead: string
  note: string
  durationMinutes: number
  totalQuestions: number
  totalScore: number
  passScore: number
  defaultParticipantTitle: string
  scoreRules: AssessmentScoreRule[]
  introLines: string[]
  retakeNotice: string
  passResultLead: string
  failResultLead: string
  resultPoster: AssessmentResultPosterConfig
}

// 这里定义答题记录结构，用来保存每道题当前已选的选项。
export interface AssessmentAnswerMap {
  [questionId: string]: string[]
}

// 这里定义章节结果结构，方便结果页按章节回顾答题情况。
export interface AssessmentSectionResult {
  sectionId: string
  sectionTitle: string
  correctCount: number
  questionCount: number
}

// 这里定义错题快照结构，当前主要用于保留正式交卷后的错题记录，便于后续扩展。
export interface AssessmentWrongQuestionResult {
  questionId: string
  order: number
  sectionId: string
  sectionTitle: string
  type: AssessmentQuestionType
  stem: string
  options: AssessmentOption[]
  userOptionIds: string[]
  correctOptionIds: string[]
  userAnswerText: string
  correctAnswerText: string
  sourceTitle: string
  sourceExcerpt: string
}

// 这里定义正式交卷后的结果结构，用于本地保存最近一次成绩。
export interface AssessmentResult {
  paperVersion: string
  participantTitle: string
  score: number
  totalScore: number
  passScore: number
  passed: boolean
  questionCount: number
  correctCount: number
  singleCorrectCount: number
  multipleCorrectCount: number
  startTimestamp: number
  submitTimestamp: number
  durationSeconds: number
  answerMap: AssessmentAnswerMap
  wrongQuestions: AssessmentWrongQuestionResult[]
  sectionResults: AssessmentSectionResult[]
}

// 这里定义草稿结构，用来保存答题中的本地进度和倒计时信息。
export interface AssessmentDraft {
  paperVersion: string
  participantTitle: string
  currentSectionIndex: number
  answerMap: AssessmentAnswerMap
  startTimestamp: number
  deadlineTimestamp: number
}
