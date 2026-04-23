import type {
  PublicRosterEntry,
  RosterContributionOption,
  RosterFreeTimeOption,
  RosterHallKey,
  RosterHallOption,
  RosterRegistrationFormValue,
  RosterRegistrationSection,
  RosterStyleNameBranch,
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

// 这里定义空闲时段选项，供多选字段统一使用。
export const rosterFreeTimeOptions: RosterFreeTimeOption[] = [
  { key: 'weekday_evening', label: '平日晚间' },
  { key: 'weekend_all_day', label: '周末全天' },
  { key: 'holiday', label: '法定假日' },
  { key: 'other', label: '其他时段' },
]

// 这里定义效力意愿选项，供前台登记和审核台查看统一显示。
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
    description: '这些信息用于确认你在云栖的常用称呼与基本归档口径，其中公开页面只会展示最克制的部分。',
  },
  {
    key: 'duty',
    eyebrow: '门派司职',
    title: '再定法号与堂口',
    description: '云栖法号会进入正式门籍，提交前会先做重名校验；堂口只用于归类同好与活动联络，不分高低。',
  },
  {
    key: 'contact',
    eyebrow: '传讯方式',
    title: '留下正式联络方式',
    description: '传讯信息仅用于同门联络与审核查验，不会出现在公开名帖与公开名录中。',
  },
  {
    key: 'ability',
    eyebrow: '所长与愿',
    title: '让同门知道你所长何在',
    description: '这里更适合填写你愿分享的能力、喜好与可参与的时段，让未来雅集与协作更容易找到你。',
  },
  {
    key: 'oath',
    eyebrow: '入派誓约',
    title: '既入门籍，也立心志',
    description: '线上入册依旧保留文牒仪式感。签押与立誓日期会随记录一并归档，分享名帖只展示克制公开信息。',
  },
  {
    key: 'submit',
    eyebrow: '提交确认',
    title: '递上文牒，静候执事批阅',
    description: '提交后会立即生成一张待审核的回执名帖。执事审核通过后，会自动转为正式入册名帖并进入公开名录。',
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

// 这里定义“云字辈”与“栖字辈”字号清单，供登记页静态展示和一键带入。
export const rosterStyleNameBranches: RosterStyleNameBranch[] = [
  {
    key: 'yun',
    title: '云字辈',
    lead: '飘逸高远，如行云自在。',
    categories: [
      {
        key: 'landscape',
        title: '山水意境',
        description: '适配全堂口，大气开阔。',
        items: [
          { value: '云川', hallKeys: ['yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other'] },
          { value: '云岫', hallKeys: ['yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other'] },
          { value: '云汀', hallKeys: ['yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other'] },
          { value: '云涧', hallKeys: ['yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other'] },
          { value: '云泽', hallKeys: ['yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other'] },
          { value: '云峦', hallKeys: ['yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other'] },
          { value: '云溪', hallKeys: ['yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other'] },
          { value: '云涯', hallKeys: ['yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other'] },
          { value: '云渚', hallKeys: ['yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other'] },
          { value: '云壑', hallKeys: ['yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other'] },
          { value: '云涛', hallKeys: ['yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other'] },
          { value: '云潮', hallKeys: ['yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other'] },
        ],
      },
      {
        key: 'elegance',
        title: '风雅意境',
        description: '适配栖墨阁、云韶坊。',
        items: [
          { value: '云墨', hallKeys: ['qimo', 'yunshao'] },
          { value: '云笺', hallKeys: ['qimo', 'yunshao'] },
          { value: '云砚', hallKeys: ['qimo', 'yunshao'] },
          { value: '云笔', hallKeys: ['qimo', 'yunshao'] },
          { value: '云弦', hallKeys: ['yunshao', 'qiying'] },
          { value: '云笙', hallKeys: ['yunshao'] },
          { value: '云箫', hallKeys: ['yunshao'] },
          { value: '云琴', hallKeys: ['yunshao'] },
          { value: '云棋', hallKeys: ['qimo', 'yunshao'] },
          { value: '云书', hallKeys: ['qimo', 'yunshao'] },
          { value: '云诗', hallKeys: ['qimo', 'yunshao'] },
          { value: '云画', hallKeys: ['qimo', 'qiying'] },
        ],
      },
      {
        key: 'peaceful',
        title: '清宁意境',
        description: '适配所有堂口，恬淡安然。',
        items: [
          { value: '云舒', hallKeys: ['yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other'] },
          { value: '云卷', hallKeys: ['yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other'] },
          { value: '云闲', hallKeys: ['yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other'] },
          { value: '云眠', hallKeys: ['yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other'] },
          { value: '云悠', hallKeys: ['yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other'] },
          { value: '云淡', hallKeys: ['yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other'] },
          { value: '云静', hallKeys: ['yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other'] },
          { value: '云宁', hallKeys: ['yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other'] },
          { value: '云安', hallKeys: ['yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other'] },
          { value: '云霁', hallKeys: ['yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other'] },
          { value: '云岚', hallKeys: ['yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other'] },
          { value: '云烟', hallKeys: ['yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other'] },
        ],
      },
      {
        key: 'character',
        title: '风骨意境',
        description: '适配云策司、栖影轩。',
        items: [
          { value: '云铮', hallKeys: ['yunce', 'qiying'] },
          { value: '云松', hallKeys: ['yunce', 'qiying', 'other'] },
          { value: '云柏', hallKeys: ['yunce', 'qiying', 'other'] },
          { value: '云竹', hallKeys: ['yunce', 'qimo'] },
          { value: '云梅', hallKeys: ['yunce', 'qimo'] },
          { value: '云鹤', hallKeys: ['yunce', 'qiying'] },
          { value: '云鸿', hallKeys: ['yunce', 'qiying'] },
          { value: '云毅', hallKeys: ['yunce', 'other'] },
          { value: '云恒', hallKeys: ['yunce', 'other'] },
          { value: '云清', hallKeys: ['yunce', 'other'] },
          { value: '云朗', hallKeys: ['yunce', 'other'] },
          { value: '云昭', hallKeys: ['yunce', 'other'] },
        ],
      },
    ],
  },
  {
    key: 'qi',
    title: '栖字辈',
    lead: '安住归心，如栖于雅境。',
    categories: [
      {
        key: 'plants',
        title: '草木意境',
        description: '适配云衣堂、栖墨阁，君子之风。',
        items: [
          { value: '栖梧', hallKeys: ['yunyi', 'qimo'] },
          { value: '栖竹', hallKeys: ['yunyi', 'qimo'] },
          { value: '栖兰', hallKeys: ['yunyi', 'qimo'] },
          { value: '栖梅', hallKeys: ['yunyi', 'qimo'] },
          { value: '栖菊', hallKeys: ['yunyi', 'qimo'] },
          { value: '栖荷', hallKeys: ['yunyi', 'qimo'] },
          { value: '栖桂', hallKeys: ['yunyi', 'qimo'] },
          { value: '栖棠', hallKeys: ['yunyi', 'qimo'] },
          { value: '栖松', hallKeys: ['yunyi', 'qimo', 'other'] },
          { value: '栖柏', hallKeys: ['yunyi', 'qimo', 'other'] },
          { value: '栖桐', hallKeys: ['yunyi', 'qimo'] },
          { value: '栖柳', hallKeys: ['yunyi', 'qimo'] },
        ],
      },
      {
        key: 'moon',
        title: '风月意境',
        description: '适配云韶坊、栖影轩，诗意浪漫。',
        items: [
          { value: '栖月', hallKeys: ['yunshao', 'qiying'] },
          { value: '栖风', hallKeys: ['yunshao', 'qiying'] },
          { value: '栖星', hallKeys: ['yunshao', 'qiying'] },
          { value: '栖露', hallKeys: ['yunshao', 'qiying'] },
          { value: '栖霜', hallKeys: ['yunshao', 'qiying'] },
          { value: '栖雪', hallKeys: ['yunshao', 'qiying'] },
          { value: '栖霞', hallKeys: ['yunshao', 'qiying'] },
          { value: '栖虹', hallKeys: ['yunshao', 'qiying'] },
          { value: '栖雾', hallKeys: ['yunshao', 'qiying'] },
          { value: '栖雨', hallKeys: ['yunshao', 'qiying'] },
          { value: '栖晨', hallKeys: ['yunshao', 'qiying'] },
          { value: '栖霁', hallKeys: ['yunshao', 'qiying'] },
        ],
      },
      {
        key: 'objects',
        title: '雅物意境',
        description: '适配全堂口，雅致温润。',
        items: [
          { value: '栖琴', hallKeys: ['yunshao', 'other'] },
          { value: '栖棋', hallKeys: ['qimo', 'yunshao'] },
          { value: '栖书', hallKeys: ['qimo', 'yunshao'] },
          { value: '栖画', hallKeys: ['qimo', 'qiying'] },
          { value: '栖诗', hallKeys: ['qimo', 'yunshao'] },
          { value: '栖茶', hallKeys: ['yunyi', 'other'] },
          { value: '栖香', hallKeys: ['yunyi', 'other'] },
          { value: '栖花', hallKeys: ['yunyi', 'other'] },
          { value: '栖砚', hallKeys: ['qimo'] },
          { value: '栖笔', hallKeys: ['qimo'] },
          { value: '栖墨', hallKeys: ['qimo'] },
          { value: '栖弦', hallKeys: ['yunshao'] },
        ],
      },
      {
        key: 'heart',
        title: '归心意境',
        description: '适配所有堂口，温暖治愈。',
        items: [
          { value: '栖安', hallKeys: ['yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other'] },
          { value: '栖宁', hallKeys: ['yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other'] },
          { value: '栖心', hallKeys: ['yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other'] },
          { value: '栖身', hallKeys: ['yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other'] },
          { value: '栖意', hallKeys: ['yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other'] },
          { value: '栖梦', hallKeys: ['yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other'] },
          { value: '栖思', hallKeys: ['yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other'] },
          { value: '栖迟', hallKeys: ['yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other'] },
          { value: '栖隐', hallKeys: ['yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other'] },
          { value: '栖逸', hallKeys: ['yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other'] },
          { value: '栖恬', hallKeys: ['yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other'] },
          { value: '栖然', hallKeys: ['yunyi', 'qimo', 'yunshao', 'qiying', 'yunce', 'other'] },
        ],
      },
    ],
  },
]

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
    note: '俗家姓名、现居洞府、微信号等敏感信息只用于审核与联络，不会出现在公开名帖与公开名录里。',
  },
  registration: {
    formTitle: '云栖派入门弟子录 · 入册文牒',
    formLead: '请按六段顺序填写。提交后会立即生成待审核回执名帖，可先保存或分享当前公开详情页。',
    guardTip: '法号需以“云”或“栖”开头，固定两字；若已重名，系统会在同组字号中给出近邻推荐。',
    submitButton: '递交入册文牒',
    submittingButton: '文牒递交中...',
    successTitle: '文牒已递入档案司',
    successDescription: '系统已生成待审核名帖，你可以先保存图片、复制链接，待执事批阅后会自动切换为正式入册状态。',
  },
  list: {
    title: '已入册同门名录',
    lead: '这里只展示已经准予入册的公开条目。所有字段都遵循最克制公开原则，只保留江湖身份与同道缘起。',
    searchPlaceholder: '搜索江湖名号或云栖法号',
    allHallLabel: '全部堂口',
    emptyTitle: '当前还没有符合条件的入册条目',
    emptyDescription: '可以先放宽搜索或筛选条件，也可先递交自己的入册文牒。',
    registerButton: '我要登记入册',
    adminButton: '执事管理入口',
    adminHint: '执事可从此处登录审核台，查看原始登记资料并执行准予、暂缓或不予收录。',
  },
  detail: {
    pendingTitle: '待审核名帖',
    approvedTitle: '正式入册名帖',
    statusTitle: '当前状态',
    publicInfoTitle: '公开口径',
    publicInfoLead: '公开详情页与分享名帖只展示江湖名号、法号、堂口、入派本心、所长雅事、状态标记、牒号或回执号、日期与二维码。',
    shareButton: '分享名帖',
    saveButton: '保存成图',
    copyLinkButton: '复制链接',
  },
  admin: {
    loginTitle: '执事审核台',
    loginLead: '请使用已加入白名单的 Supabase 邮箱密码登录。登录成功后可查看全部原始登记字段并执行审核。',
    loginButton: '登录审核台',
    logoutButton: '退出登录',
    searchPlaceholder: '搜索名号、法号、回执号或微信号',
    reviewButton: '提交审核',
  },
  privacyNotes: [
    '公开名录、公开详情页与分享名帖一律不展示俗家姓名、现居洞府、生年、俗务、微信号、社交号与闲暇时辰。',
    '待审核状态可分享回执名帖，但不会显示正式牒号。',
    '暂缓入册与不予收录的详情页会保留公开批语，但不再提供名帖导出。',
  ],
  styleTips: [
    '避免使用生僻字、多音字或寓意不佳的字，方便同门称呼。',
    '可结合个人特长或喜好选字，如擅长摄影可偏向“栖影”“云镜”一路意象。',
    '提交前可先在门派内查询是否已有重名，重名需重新拟定。',
    '字号一经审核生效，原则上不予更改，确有特殊原因需向档案司申请。',
  ],
}

// 这里提供默认表单值，保证登记页首次进入就有稳定初始状态。
export function createDefaultRosterRegistrationForm(): RosterRegistrationFormValue {
  const today = new Date()
  const currentDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return {
    jianghuName: '',
    secularName: '',
    currentCity: '',
    birthYear: '',
    profession: '',
    requestedStyleName: '',
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
    jianghuName: '云栖新帖',
    styleName: '云栖',
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
