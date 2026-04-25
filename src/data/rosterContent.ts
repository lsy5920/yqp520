import type {
  PublicRosterCard,
  RosterBondKey,
  RosterBondOption,
  RosterCardFormValue,
  RosterCoverKey,
  RosterCoverOption,
  RosterIdentityKey,
  RosterIdentityOption,
  RosterRegistrationStep,
} from '@/types/roster'

// 这里定义身份选项，所有名册页面统一从这里读取，避免文案分散。
export const rosterIdentityOptions: RosterIdentityOption[] = [
  { key: 'swordsman', label: '执剑游侠', description: '适合外放、果断、愿意冲锋的人。', icon: '剑' },
  { key: 'healer', label: '青囊医者', description: '适合温柔、耐心、擅长照顾同伴的人。', icon: '药' },
  { key: 'strategist', label: '云台谋士', description: '适合冷静、会规划、喜欢出主意的人。', icon: '策' },
  { key: 'artisan', label: '百工匠师', description: '适合会设计、会剪辑、会写作或会整活的人。', icon: '工' },
  { key: 'wanderer', label: '烟雨行客', description: '适合自由、随性、喜欢记录江湖日常的人。', icon: '游' },
  { key: 'guardian', label: '护山执事', description: '适合稳定、可靠、愿意守护秩序的人。', icon: '守' },
]

// 这里定义羁绊选项，表达成员想怎样和大家同行。
export const rosterBondOptions: RosterBondOption[] = [
  { key: 'seeking', label: '寻同路人', description: '想认识更多同门，一起做点有趣的事。' },
  { key: 'companion', label: '已有同行', description: '已有熟人牵引，希望继续在门中发光。' },
  { key: 'mentor', label: '愿做引路', description: '愿意帮助新人熟悉门派节奏。' },
  { key: 'quiet', label: '静修旁观', description: '喜欢低调潜水，但会默默支持大家。' },
]

// 这里定义卡片封面选项，手机端名帖会用它切换高级视觉。
export const rosterCoverOptions: RosterCoverOption[] = [
  { key: 'mist', label: '云雾玄墨', gradient: 'linear-gradient(145deg, #f7fbf5, #d9efea 46%, #2f8f87)' },
  { key: 'sword', label: '剑影鎏金', gradient: 'linear-gradient(145deg, #fff8e8, #e9d7ad 48%, #5f6f5f)' },
  { key: 'bamboo', label: '竹影青玉', gradient: 'linear-gradient(145deg, #f5fbf2, #bfe2d6 52%, #1f6f67)' },
  { key: 'moon', label: '月下霜蓝', gradient: 'linear-gradient(145deg, #f8fbfb, #d7edf0 50%, #527e8b)' },
  { key: 'gold', label: '金榜题名', gradient: 'linear-gradient(145deg, #fff8e9, #ead7a7 50%, #8b6f35)' },
  { key: 'jade', label: '白玉留痕', gradient: 'linear-gradient(145deg, #fbfaf2, #cfe8df 50%, #6e9f92)' },
]

// 这里定义登记步骤，手机端卷轴表单按这个顺序展示。
export const rosterRegistrationSteps: RosterRegistrationStep[] = [
  { key: 'basic', indexText: '一', title: '写下名帖', description: '先留下你的江湖名、称号、身份和所在地域。' },
  { key: 'spirit', indexText: '二', title: '点亮气质', description: '写一句江湖宣言，再补一段让同门记住你的故事。' },
  { key: 'bond', indexText: '三', title: '结下羁绊', description: '选择你的同行状态，写清希望遇见怎样的同门。' },
  { key: 'display', indexText: '四', title: '定制封面', description: '挑选名帖封面，并决定哪些内容公开展示。' },
  { key: 'pledge', indexText: '五', title: '按印入册', description: '确认信息真实友善，交给执事审核入册。' },
]

// 这里定义技能标签候选，用户也可以自己输入后添加。
export const rosterSkillPresets: string[] = ['写文', '剪辑', '绘图', '配音', '策划', '整活', '陪伴', '考据', '摄影', '运营']

// 这里定义名册页面所有固定文案，避免散落在组件里难维护。
export const rosterContent = {
  list: {
    eyebrow: '云栖名册 · 江湖卡册',
    title: '翻开同门名帖，遇见各路云栖侠影',
    lead: '为手机端重新打造的沉浸式名册：每一张卡都是一位同门的江湖印记。',
    searchPlaceholder: '搜索江湖名、称号、地域或专长',
    emptyText: '此处暂未寻到同门踪迹，换个关键词或身份试试看。',
  },
  registration: {
    eyebrow: '云栖名册登记',
    title: '写一封属于你的江湖名帖',
    lead: '五步完成登记，执事审核后即可进入公开卡册。草稿会自动留在本机，误关页面也不怕。',
    pledge: '我确认所填内容真实友善，愿以温和、尊重、长期同行的方式加入云栖名册。',
  },
  detail: {
    loading: '名帖正在云雾中展开……',
    notFound: '没有找到这张名帖，可能尚未公开或链接已经变化。',
  },
  admin: {
    eyebrow: '云栖名册审核台',
    title: '执事掌灯，校阅新名帖',
    lead: '这里用于审核登记、调整展示内容、设置推荐等级和记录处理备注。',
  },
}

/**
 * 查找身份选项
 * 用途：根据身份键名拿到中文文案和图标
 * 入参：key 为身份键名
 * 返回值：返回身份选项，找不到时返回游侠兜底
 */
export function getRosterIdentityOption(key: RosterIdentityKey | ''): RosterIdentityOption {
  return rosterIdentityOptions.find((item) => item.key === key) || rosterIdentityOptions[0]!
}

/**
 * 查找羁绊选项
 * 用途：根据羁绊键名拿到中文文案
 * 入参：key 为羁绊键名
 * 返回值：返回羁绊选项，找不到时返回寻同路人兜底
 */
export function getRosterBondOption(key: RosterBondKey | ''): RosterBondOption {
  return rosterBondOptions.find((item) => item.key === key) || rosterBondOptions[0]!
}

/**
 * 查找封面选项
 * 用途：根据封面键名拿到封面渐变
 * 入参：key 为封面键名
 * 返回值：返回封面选项，找不到时返回云雾玄墨兜底
 */
export function getRosterCoverOption(key: RosterCoverKey): RosterCoverOption {
  return rosterCoverOptions.find((item) => item.key === key) || rosterCoverOptions[0]!
}

/**
 * 创建空登记表单
 * 用途：登记页初始化和提交成功后重置表单
 * 入参：无
 * 返回值：返回完整空表单
 */
export function createEmptyRosterCardForm(): RosterCardFormValue {
  return {
    jianghuName: '',
    titleName: '',
    identityKey: '',
    regionText: '',
    motto: '',
    storyText: '',
    skillTags: [],
    bondKey: '',
    bondText: '',
    coverKey: 'mist',
    isRegionPublic: true,
    isStoryPublic: true,
    contactText: '',
    agreedToPledge: false,
  }
}

/**
 * 创建空公开名帖
 * 用途：详情页加载前提供稳定结构，避免模板空值报错
 * 入参：无
 * 返回值：返回空公开名帖
 */
export function createEmptyPublicRosterCard(): PublicRosterCard {
  const identity = getRosterIdentityOption('swordsman')
  const bond = getRosterBondOption('seeking')

  return {
    id: '',
    publicSlug: '',
    jianghuName: '未署名同门',
    titleName: '云栖新客',
    identityKey: identity.key,
    identityLabel: identity.label,
    regionText: '云深不知处',
    motto: '风起云栖，来日方长。',
    storyText: '这张名帖正在等待主人写下故事。',
    skillTags: [],
    bondKey: bond.key,
    bondLabel: bond.label,
    bondText: bond.description,
    coverKey: 'mist',
    heatValue: 0,
    featuredLevel: 0,
    approvedAt: '',
    createdAt: '',
  }
}


