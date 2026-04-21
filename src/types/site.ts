// 这里定义导航项类型，方便统一管理导航与页脚链接。
export interface NavItem {
  label: string
  path: string
  hint: string
}

// 这里定义首页快捷入口类型，用于首屏操作按钮。
export interface QuickAction {
  label: string
  path: string
  style: 'primary' | 'secondary' | 'ghost'
}

// 这里定义首页亮点卡片类型，用于展示门派核心气质。
export interface HighlightItem {
  title: string
  lead: string
  description: string
}

// 这里定义立派正文分章类型，方便全典页面按章节渲染。
export interface CanonSection {
  id: string
  title: string
  subtitle: string
  paragraphs: string[]
}

// 这里定义门规条目类型，用于四条底线与禁律展示。
export interface RuleItem {
  title: string
  summary: string
  details: string[]
}

// 这里定义宗门角色类型，用于展示职责分工。
export interface RoleItem {
  title: string
  duty: string
  details: string[]
}

// 这里定义宗门日常条目类型，用于日常活动模块。
export interface RoutineItem {
  title: string
  description: string
}

// 这里定义流程步骤类型，用于入派与退派说明。
export interface FlowStep {
  title: string
  description: string
}

// 这里定义问答类型，用于常见问题区域。
export interface FaqItem {
  question: string
  answer: string
}

// 这里定义海报模板类型，用于控制分享图尺寸与文案。
export interface PosterTemplate {
  id: string
  name: string
  title: string
  phrase: string
  defaultBlessing: string
  stampText: string
  qrLabel: string
  exportWidth: number
  exportHeight: number
}

// 这里定义背景音乐条目类型，用于控制音频播放器行为。
export interface MusicTrack {
  id: string
  name: string
  filePath: string
  coverText: string
  enabled: boolean
  defaultVolume: number
  onboarding: boolean
}
