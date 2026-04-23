import type {
  PublicRosterEntry,
  RosterContributionOption,
  RosterFreeTimeOption,
  RosterGenderOption,
  RosterHallKey,
  RosterHallOption,
  RosterPositionOption,
  RosterRegistrationFormValue,
  RosterRegistrationSection,
} from '@/types/roster'

// 这里定义堂口选项，供登记页、筛选器和详情页统一复用。
export const rosterHallOptions: RosterHallOption[] = [
  { key: 'yunyi', label: '云衣堂', description: '偏汉服形制、妆造穿搭与仪态雅集。' },
  { key: 'qimo', label: '栖墨阁', description: '偏诗词书画、金石篆刻与纸墨清玩。' },
  { key: 'yunshao', label: '云韶坊', description: '偏礼乐琴箫、传统雅集与声律风骨。' },
  { key: 'qiying', label: '栖影轩', description: '偏古风摄影、影像记录与视觉叙事。' },
  { key: 'yunce', label: '云策司', description: '偏活动策划、门派运营与同门联络。' },
  { key: 'other', label: '其他', description: '若所归未列，可自行补充更贴切的堂口说明。' },
]

// 这里定义性别选项，供登记页和后台编辑页统一使用。
export const rosterGenderOptions: RosterGenderOption[] = [
  { key: 'male', label: '男' },
  { key: 'female', label: '女' },
  { key: 'other', label: '其他' },
]

// 这里定义门中分工选项，只区分服务分工，不带上下级意味。
export const rosterPositionOptions: RosterPositionOption[] = [
  { key: 'tongmen', label: '同门', description: '所有入派之人皆为同门，人人平等，只是所担分工不同。' },
  { key: 'zongzhu', label: '宗主', description: '创派之人，护一脉和气，定大方向，但不强迫任何人做任何事。' },
  { key: 'yunsi_wen', label: '云司·文司', description: '自愿整理群内精华、活动记录，留存门派记忆。' },
  { key: 'yunsi_shi', label: '云司·事司', description: '自愿策划组织线上聊天、线下聚会，安排活动事宜。' },
  { key: 'yunsi_cai', label: '云司·财司', description: '自愿管理活动 AA 费用与信物制作费，并定期公开账目。' },
]

// 这里定义空闲时段选项，供多选字段统一使用。
export const rosterFreeTimeOptions: RosterFreeTimeOption[] = [
  { key: 'weekday_evening', label: '平日晚间' },
  { key: 'weekend_all_day', label: '周末全天' },
  { key: 'holiday', label: '法定假日' },
  { key: 'other', label: '其他时段' },
]

// 这里定义效力意愿选项，供前台登记和后台查看统一显示。
export const rosterContributionOptions: RosterContributionOption[] = [
  {
    key: 'steward',
    label: '愿担执事之责',
    description: '更适合愿意长期参与门派事务、可承担固定分工的同门。',
  },
  {
    key: 'help_when_available',
    label: '有空便尽绵薄',
    description: '更适合平时有空就帮一把，不做固定排班的同门。',
  },
  {
    key: 'focus_on_learning',
    label: '暂先潜心修习',
    description: '更适合先熟悉门风与同门，再慢慢决定是否多承担的同门。',
  },
]

// 这里定义登记页六段结构，保证前台大表单始终按同一顺序展开。
export const rosterRegistrationSections: RosterRegistrationSection[] = [
  {
    key: 'identity',
    eyebrow: '弟子名籍',
    title: '先把名籍立稳',
    description: '道号会成为公开页和云名帖的唯一称呼，性别会跟随公开信息一起展示。',
  },
  {
    key: 'duty',
    eyebrow: '门派司职',
    title: '再定堂口与来意',
    description: '堂口只用于归类同好与活动联络，不分高低；入派本心会进入公开详情与名帖。',
  },
  {
    key: 'contact',
    eyebrow: '传讯方式',
    title: '留下正式联络方式',
    description: '传讯信息只用于审核与同门联络，不会出现在公开名帖与公开名录中。',
  },
  {
    key: 'ability',
    eyebrow: '所长与愿',
    title: '让同门知道你所长何在',
    description: '这里适合填写你愿意公开分享的能力、喜好与可参与时段，方便以后雅集协作。',
  },
  {
    key: 'oath',
    eyebrow: '入派誓约',
    title: '既入门籍，也立心志',
    description: '线上入册依旧保留文牒仪式感，签押与立誓日期会随记录一并归档。',
  },
  {
    key: 'submit',
    eyebrow: '提交确认',
    title: '递上文牒，静候执事批阅',
    description: '提交后会立即生成待审核回执名帖；审核通过后会自动转为正式入册名帖并进入公开名录。',
  },
]

// 这里定义状态标签，方便前台、审核台和名帖统一显示。
export const rosterStatusLabelMap = {
  pending: '待审核',
  approved: '准予入册',
  deferred: '暂缓入册',
  rejected: '不予收录',
} as const

// 这里定义状态说明，帮助详情页把不同状态讲清楚。
export const rosterStatusDescriptionMap = {
  pending: '文牒已收，执事正在按门规与名籍顺序查阅。此阶段可先保存待审名帖与分享当前公开详情页。',
  approved: '已准予入册，正式牒号与执事批语均已落定，此条记录会进入公开名录并可生成正式名帖。',
  deferred: '执事已先行暂缓入册，请留意公开批语所写缘由。此阶段不会进入公开名录，也不再提供名帖导出。',
  rejected: '本次未予收录，请以公开批语为准。此阶段不会进入公开名录，也不再提供名帖导出。',
} as const

// 这里定义堂口名映射，供工具函数快速查表。
export const rosterHallLabelMap: Record<RosterHallKey, string> = rosterHallOptions.reduce(
  (map, item) => ({
    ...map,
    [item.key]: item.label,
  }),
  {} as Record<RosterHallKey, string>,
)

// 这里定义海报名帖的固定模板尺寸与文案，供详情页与导出组件统一使用。
export const rosterPosterTemplate = {
  title: '云栖派入册名帖',
  subtitle: '云栖派档案司 · 入册文牒',
  exportWidth: 1080,
  exportHeight: 1350,
  pendingSeal: '待审核',
  approvedSeal: '准予入册',
  deferredSeal: '暂缓入册',
  rejectedSeal: '不予收录',
}

// 这里定义整套名册页面的核心文案，方便页面和组件统一取词。
export const rosterContent = {
  page: {
    eyebrow: '云栖名册',
    title: '线上登记入册，审核通过后正式归于云栖门籍',
    lead: '这是一套独立于江湖名帖工作台的新流程。先线上递交文牒，执事审核后再正式入册，公开页面与分享名帖始终遵循最克制的公开口径。',
    note: '俗家姓名、现居洞府、微信号等敏感信息只用于审核与联络，不会出现在公开名帖与公开名录里；性别与门中分工会随云名帖一并公开。',
  },
  registration: {
    formTitle: '云栖派入门弟子录 · 入册文牒',
    formLead: '请按六段顺序填写。提交后会立即生成待审核回执名帖，可先保存或分享当前公开详情页。',
    guardTip: '道号支持自由拟定，不强制“云”或“栖”开头。系统会自动去首尾空格并校验是否重名。',
    submitButton: '递交入册文牒',
    submittingButton: '文牒递交中...',
    successTitle: '文牒已递入档案司',
    successDescription: '系统已生成待审核名帖，你可以先保存图片、复制链接，待执事批阅后会自动切换为正式入册状态。',
  },
  list: {
    title: '已入册同门名录',
    lead: '这里只展示已经准予入册的公开条目。公开字段会展示道号、性别、门中分工、堂口、同道缘起与正式牒号。',
    searchPlaceholder: '输入道号或文牒号',
    allHallLabel: '全部堂口',
    emptyTitle: '当前还没有符合条件的入册条目',
    emptyDescription: '可以先放宽搜索或筛选条件，也可先递交自己的入册文牒。',
    registerButton: '我要登记入册',
    adminButton: '执事管理入口',
    adminHint: '执事可从此处登录审核台，查看原始登记资料、编辑全部字段、修改文牒号并删除档案。',
  },
  detail: {
    pendingTitle: '待审核名帖',
    approvedTitle: '正式入册名帖',
    statusTitle: '当前状态',
    publicInfoTitle: '公开口径',
    publicInfoLead: '公开详情页与云名帖会展示道号、性别、门中分工、堂口、入派本心、所长雅事、状态标记、牒号或回执号、日期与二维码。',
    shareButton: '分享名帖',
    saveButton: '保存成图',
    copyLinkButton: '复制链接',
  },
  admin: {
    loginTitle: '执事审核台',
    loginLead: '请使用已加入白名单的 Supabase 邮箱密码登录。登录成功后可查看全部原始登记字段，并支持编辑、删档与调整文牒号。',
    loginButton: '登录审核台',
    logoutButton: '退出登录',
    searchPlaceholder: '输入道号或文牒号，也可继续搜回执号或微信号',
    reviewButton: '保存档案',
  },
  privacyNotes: [
    '公开名录、公开详情页与云名帖一律不展示俗家姓名、现居洞府、生年、俗务、微信号、社交号与闲暇时辰。',
    '性别与门中分工会作为公开信息展示在公开名录、公开详情页与云名帖中。',
    '待审核状态可分享回执名帖，但不会显示正式牒号。',
    '暂缓入册与不予收录的详情页会保留公开批语，但不再提供名帖导出。',
  ],
  daohaoTips: [
    '道号支持自由拟定，不再强制“云”或“栖”开头，也不再限制固定两字。',
    '建议尽量简洁、顺口、好记，避免过长或过于复杂，方便同门相称。',
    '系统会先做去空格和重名校验；若已有同名档案，需要改用新的道号再递交。',
    '后台允许执事后续调整道号，但公开详情链接本身不会因为改名而失效。',
  ],
}

// 这里提供默认表单值，保证登记页首次进入就有稳定初始状态。
export function createDefaultRosterRegistrationForm(): RosterRegistrationFormValue {
  const today = new Date()
  const currentDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return {
    daohao: '',
    secularName: '',
    gender: '',
    currentCity: '',
    birthYear: '',
    profession: '',
    referrerName: '自行登门',
    hallKey: '',
    otherHallText: '',
    entryIntent: '',
    wechatId: '',
    socialXiaohongshuDouyin: '',
    socialQq: '',
    socialOther: '',
    allowContactPublic: false,
    strengths: '',
    hobbies: '',
    freeTimeSlots: [],
    contributionLevel: '',
    oathSignedName: '',
    oathSignedDate: currentDate,
    agreedToOath: false,
  }
}

// 这里提供一条空公开记录，便于详情页或名帖组件在加载前稳定占位。
export function createEmptyPublicRosterEntry(): PublicRosterEntry {
  return {
    publicSlug: '',
    status: 'pending',
    receiptCode: '回执待定',
    entryNo: '',
    entryNoValue: null,
    daohao: '云栖新帖',
    gender: '',
    genderLabel: '未定',
    positionKey: 'tongmen',
    positionLabel: '同门',
    hallKey: 'other',
    hallLabel: '未定堂口',
    entryIntent: '尚未递交具体本心文案。',
    strengths: '待补所长',
    hobbies: '待补雅事',
    reviewComment: '',
    statusLabel: rosterStatusLabelMap.pending,
    createdAt: '',
    reviewedAt: '',
    effectiveDate: '',
    posterEnabled: true,
  }
}
