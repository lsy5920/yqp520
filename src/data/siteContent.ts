import type {
  CanonSection,
  HighlightItem,
  MusicLyricLine,
  MusicTrack,
  NavItem,
  PosterTemplate,
  QuickAction,
  RoleItem,
  RoutineItem,
  RuleItem,
} from '@/types/site'
import { assessmentContent } from '@/data/assessmentContent'

/**
 * 解析歌词时间文本
 * 用途：把“分:秒.毫秒”格式转换成播放器可用的秒数
 * 入参：timestamp 为歌词时间文本
 * 返回值：返回换算后的秒数，异常时回退为 0
 */
function parseLyricTimestamp(timestamp: string): number {
  const matchedParts = timestamp.trim().match(/^(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/)

  if (!matchedParts) {
    return 0
  }

  const minutes = Number(matchedParts[1] || '0')
  const seconds = Number(matchedParts[2] || '0')
  const milliseconds = Number((matchedParts[3] || '0').padEnd(3, '0'))

  return (minutes * 60) + seconds + (milliseconds / 1000)
}

/**
 * 创建歌词时间轴
 * 用途：把歌词时间和文案统一整理成可复用的数据结构
 * 入参：items 为歌词时间和歌词内容数组
 * 返回值：返回按时间顺序整理好的歌词时间轴
 */
function createMusicLyrics(items: Array<[string, string]>): MusicLyricLine[] {
  return items
    .map(([timestamp, text]) => ({
      time: parseLyricTimestamp(timestamp),
      text: text.trim(),
    }))
    .filter((item) => item.text.length > 0)
    .sort((previousItem, nextItem) => previousItem.time - nextItem.time)
}

// 这里集中存放官网全部内容，页面只负责展示，方便后续统一维护。
const navItems: NavItem[] = [
  { label: '首页', path: '/', hint: '门派总览' },
  { label: '立派典章', path: '/canon', hint: '门风纲要' },
  { label: '门规与禁律', path: '/discipline', hint: '共守风气' },
  { label: '宗门日常', path: '/life', hint: '云中同道' },
  { label: '入派考核', path: '/join', hint: '来去随缘' },
  { label: '云栖海报', path: '/poster', hint: '玉佩信物' },
]

// 这里定义首页的快捷入口，首屏会直接引用这些操作。
const homeActions: QuickAction[] = [
  { label: '阅立派典章', path: '/canon', style: 'primary' },
  { label: '立玉佩海报', path: '/poster', style: 'secondary' },
  { label: '赴问心考核', path: '/join', style: 'ghost' },
]

// 这里定义首页亮点卡片，用简洁方式概括门派核心精神。
const homeHighlights: HighlightItem[] = [
  {
    title: '以心为山',
    lead: '山不在远，心安处即是山门',
    description: '我云栖派不凭殿宇立名，只凭一枚玉佩、一份真心，把散在各处的同道照拂成门。',
  },
  {
    title: '以玉为信',
    lead: '清白玉佩，在云海中相认',
    description: '玉佩不是高低凭证，只是一点门中记认：愿你来时有人迎，久别归来仍有人认得。',
  },
  {
    title: '以诚立门',
    lead: '江湖可轻，信义不可轻',
    description: '同门相交，不靠声势撑场，也不拿热闹作证；话要说清，心要放正，情分才走得长远。',
  },
  {
    title: '以礼成风',
    lead: '门规不重，底线须明',
    description: '守礼、守心、守和、守缘，是云栖门风的四根梁；三条禁律，是护住同门清净的界碑。',
  },
]

// 这里存放立派典章正文，供典章页面逐章展示。
const canonSections: CanonSection[] = [
  {
    id: 'naming',
    title: '一、云栖其名',
    subtitle: '浮云有归处，散人有山门',
    paragraphs: [
      '云栖二字，取的是云行自在、心有所栖。',
      '我派不以楼阁为山门，也不以头衔排尊卑。人能相认，心能停靠，山门便在此处。',
      '当前线上山门设在微信群。纵使同门相隔千里，也可于一处云海中相逢、相识、相照应。',
    ],
  },
  {
    id: 'origin',
    title: '二、立派缘起',
    subtitle: '在人间风尘里，留一盏同道灯',
    paragraphs: [
      '尘世日忙，很多关系被利害、比较和匆忙推着走，久了便少一处能安心说话的地方。',
      '云栖派所求不大：有事可谈，有喜可贺，有难处时有人听你说几句。',
      '我派不争声势，不收虚名，不以热闹论亲疏。能坦荡相待、守住分寸，便是门中好风气。',
      '有人忙时可隐入云雾，有人需要时同门量力相助。情分不靠催促维系，只靠长久的善意留住。',
    ],
  },
  {
    id: 'credo',
    title: '三、门派总旨',
    subtitle: '四句门风，立住云栖根骨',
    paragraphs: [
      '心随云闲：相处不添重负，同行不造枷锁。',
      '以诚为先：言出有信，不拿同门信任试探人心。',
      '同道相敬：不以身份、资历、圈子压人。',
      '来去随缘：能同行便好好同行，暂别江湖也不互相亏欠。',
    ],
  },
  {
    id: 'motto',
    title: '四、对外一句话',
    subtitle: '云栖玉佩上刻给世人看的话',
    paragraphs: ['佩玉入云，真诚同行。'],
  },
  {
    id: 'rules',
    title: '五、相处底线',
    subtitle: '门规不重，底线须明',
    paragraphs: [
      '云栖派不设森严等级，也不拿繁文缚住同门。',
      '门中只共守四条底线，守住了，云海便清。',
      '守礼：言语有分寸，论事不伤人，分歧之中也给彼此留体面。',
      '守心：做人做事坦荡，不欺瞒、不造谣、不搬弄是非。',
      '守和：有误会先讲清楚，不结私圈，不借小事挑起对立。',
      '守缘：亲疏有时，来去有度；不强留，不绑架，不以热闹定情分。',
      '除此之外，发言、潜水、赴约皆随本心。云栖求的是自在门风，不是打卡规矩。',
    ],
  },
  {
    id: 'structure',
    title: '六、分工方式',
    subtitle: '门中无高低，事上有分工',
    paragraphs: [
      '云栖派不排座次，不分高低。所谓分工，只是让门中诸事有人照看。',
      '宗主守大方向，也守门派气质；但宗主不能以名位强迫任何同门。',
      '云司为自愿担事之人，不是高位，只是多托一份心。',
      '文司掌门中纪事，收拾群内精华、活动记录与云栖记忆。',
      '事司掌约聚与活动，牵头茶话、分享、小聚和出行。',
      '财司掌公开账目，活动 AA 费用、玉佩制作费皆要清楚透明。',
      '同门不论年龄、职业、身份，入云栖后同佩一脉清光，平等相待。',
    ],
  },
  {
    id: 'routine',
    title: '七、日常如何相处',
    subtitle: '有云可栖，有事可谈',
    paragraphs: [
      '云栖没有每日任务，也不设发言考勤。热闹时同赏一片云，安静时各守一盏灯。',
      '群中可谈生活、兴趣、见闻，也可认真说说近日心事。',
      '有空时，门中会起线上茶话、读书分享、技能交流。',
      '节假日亦可约线下小聚，吃饭、爬山、看展、游玩皆可，费用 AA，自愿赴约。',
      '有人遇难处，同门量力相帮；有人得喜事，大家一同道贺。',
    ],
  },
  {
    id: 'join-leave',
    title: '八、加入与离开',
    subtitle: '入门凭真心，离去留体面',
    paragraphs: [
      '入云栖者，须认同门派宗旨，愿守相处底线，并由一位正式在册同门引荐。',
      '入群后报上江湖名、来处与来意，便算与诸位同门正式照面。',
      '云栖玉佩为门派信物，可按个人意愿申领；玉佩只作相认，不作高低凭证。',
      '若有一日想暂别山门，随时可退，不问缘由。日后云开再归，仍可重新联系同门。',
    ],
  },
  {
    id: 'ban',
    title: '九、绝对红线',
    subtitle: '三道界碑，不可越过',
    paragraphs: [
      '不得发表违法违规内容，不造谣传谣，不做人身攻击。',
      '不得欺骗同门，不借钱不还，不泄露他人隐私。',
      '不得打着云栖派名义牟利，不做损害门派名声和同门信任之事。',
      '越界者，轻则劝退，重则移出云栖并不再接纳。',
    ],
  },
  {
    id: 'closing',
    title: '十、最后想说',
    subtitle: '愿玉有清光，愿人有归处',
    paragraphs: [
      '云栖派不求声势，不借虚名，也不靠仪式证明自己。',
      '我们只愿在忙乱人间之外，留一处同道能安心停靠的云海。',
      '愿你在此说话不必层层设防，沉默也不会被轻易误解。',
      '能同行时共看云起，暂时走远时亦互道珍重。',
      '若有一枚清白玉佩能让同门在江湖中相认，这便是云栖想守住的光。',
    ],
  },
]

// 这里定义四条底线，用于门规页面重点展示。
const disciplineRules: RuleItem[] = [
  {
    title: '守礼',
    summary: '言语有锋，也要有鞘。',
    details: ['不辱骂他人。', '不故意挑起争端。', '论事留余地，争辩也留体面。'],
  },
  {
    title: '守心',
    summary: '心若清白，玉才有光。',
    details: ['不撒谎骗人。', '不搬弄是非。', '做人做事以坦荡为先，不拿同门信任试探人心。'],
  },
  {
    title: '守和',
    summary: '同道不必同声，但要同守和气。',
    details: ['不结小圈子。', '不暗生私怨。', '有不同意见时，先讲道理，再讲体谅。'],
  },
  {
    title: '守缘',
    summary: '缘来同路，缘缓各安。',
    details: ['合得来便多相聚。', '一时走远也不亏欠。', '不因关系远近而生高低之分。'],
  },
]

// 这里定义三条禁律，用于门规页面强调底线。
const disciplineProhibitions: RuleItem[] = [
  {
    title: '禁妄言',
    summary: '江湖传言多，云栖不添乱。',
    details: ['不发表违法违规言论。', '不造谣传谣。', '不以攻击他人为乐。'],
  },
  {
    title: '禁失信',
    summary: '信义是门中底气，失信便伤玉光。',
    details: ['不利用信任谋私。', '涉及钱财往来要讲明白、守信用。', '他人隐私只能被尊重，不能被扩散。'],
  },
  {
    title: '禁败名',
    summary: '门名可轻，不可拿来谋私。',
    details: ['不借门派之名做私利买卖。', '不借名头招摇。', '一旦越线，轻则劝退，重则移出云栖。'],
  },
]

// 这里定义宗门角色，用于日常页面展示服务分工。
const lifeRoles: RoleItem[] = [
  {
    title: '宗主',
    duty: '守山门方向，也守云栖一脉和气。',
    details: ['看护整体氛围。', '遇到大方向问题时做最后协调。', '不以身份压人，不强迫任何人做任何事。'],
  },
  {
    title: '文司',
    duty: '掌门中纪事，收云海里值得留下的光。',
    details: ['负责整理纪事。', '沉淀有价值的聊天与活动内容。', '让新同门也能快速了解云栖一路走来的故事。'],
  },
  {
    title: '事司',
    duty: '牵头茶话、小聚与同门活动。',
    details: ['负责发起茶话会、读书会、技能交流。', '协助线下小聚的时间、地点和流程安排。', '不搞强制，不设考勤。'],
  },
  {
    title: '财司',
    duty: '掌公开账目，让每一笔银钱清楚落地。',
    details: ['负责把活动 AA 费用和玉佩制作费算清楚。', '所有账目公开透明。', '让大家参加活动和申领玉佩时放心、安心。'],
  },
  {
    title: '同门',
    duty: '同佩云栖清光，不以年龄、职业、身份分高低。',
    details: ['有人擅长倾听。', '有人擅长组织。', '有人只是安静潜水，也同样被视作门中一员。'],
  },
]

// 这里定义宗门日常场景，让页面更有生活感与温度。
const lifeRoutines: RoutineItem[] = [
  { title: '群中闲谈', description: '聊生活、聊见闻、聊心事，云深处也能听见同门回应。' },
  { title: '线上茶话', description: '隔屏围坐，借一个话题闲谈半晚，不端架子，不摆场面。' },
  { title: '读书分享', description: '一本书、一段话、一次被打动的经历，都能成为同门相见的由头。' },
  { title: '技能交流', description: '有人传经验，有人问路数，彼此搭把手，少走些独行弯路。' },
  { title: '节假小聚', description: '吃饭、爬山、看展、游玩，费用 AA，自愿赴约，不做江湖负担。' },
  { title: '相助与同贺', description: '有人遇难处，同门量力相帮；有人有喜事，众人一同道贺。' },
]

// 这里定义合并后的入派页要点卡片，统一收口入门说明与问心考核前提。
const joinKeyPoints = [
  {
    eyebrow: '认同宗旨',
    title: '先看心意是否同道',
    description: '认同云栖“佩玉入云，真诚同行”的门风，便已走到山门之前。',
  },
  {
    eyebrow: '入门方式',
    title: '报上名号，便算见礼',
    description: '入群后说清江湖名、来处和来意，彼此知道你是谁、为何而来，便算正式照面。',
  },
  {
    eyebrow: '来去自由',
    title: '入云可来，出云可去',
    description: '想来可来，想退可退；情谊重在自在相守，不靠名位和规矩压人。',
  },
  {
    eyebrow: '问心考核',
    title: '先问本心，再佩玉入册',
    description: '固定三十题、十分钟作答，不为难同道，只核对门风、门规与禁律是否已经读明白。',
  },
]

// 这里定义海报模板，用于海报生成器和导出尺寸控制。
const posterTemplate: PosterTemplate = {
  id: 'yunqi-jade-token',
  name: '云栖玉佩帖',
  title: '云栖玉佩帖',
  phrase: '佩玉入云，真诚同行。',
  defaultBlessing: '愿你入人间烟火，也守心上一寸清明；佩玉入云，仍是自在同道。',
  stampText: '云栖玉佩',
  qrLabel: '扫码入山门',
  exportWidth: 1080,
  exportHeight: 1350,
}

// 这里定义背景音乐配置。当前已接入正式曲目，可直接播放。
const musicTracks: MusicTrack[] = [
  {
    id: 'yunqi-theme',
    name: '云栖之缘',
    filePath: 'media/云栖之缘.mp3',
    coverText: '山门清音 · 云栖之缘',
    lyrics: createMusicLyrics([
      ['00:34.020', '晨光洒落在拥挤地铁站台'],
      ['00:37.740', '谁还留心看云影徘徊'],
      ['00:41.070', '钢筋森林里真心被谁深埋'],
      ['00:48.840', '直到那天你邀我入群来'],
      ['00:52.470', '指尖轻点便推开山海'],
      ['00:56.910', '从此有片天地不必设防'],
      ['01:03.240', '云栖处你我心随风闲'],
      ['01:10.590', '同道者何须万语千言'],
      ['01:17.970', '纵使尘世喧嚣如浪卷'],
      ['01:25.260', '这一隅清净永不变'],
      ['02:02.730', '霓虹闪烁照不亮眼底霜'],
      ['02:06.390', '名利场中面具层层妆'],
      ['02:09.660', '你说不如共赏月色微凉'],
      ['02:17.490', '没有道观不立山门墙'],
      ['02:21.180', '微信群聊即修炼道场'],
      ['02:25.680', '笑谈间已把浮名抛光'],
      ['02:31.830', '云栖处你我心随风闲'],
      ['02:39.210', '同道者何须万语千言'],
      ['02:46.530', '纵使尘世喧嚣如浪卷'],
      ['02:53.880', '这一隅清净永不变'],
      ['03:01.800', '当万家灯火渐次暗'],
      ['03:09.210', '我们仍守着这片云端'],
    ]),
    enabled: true,
    defaultVolume: 0.56,
    onboarding: true,
  },
]

// 这里导出全站内容，供所有页面和组件统一读取。
export const siteContent = {
  site: {
    name: '云栖派',
    subtitle: '玉佩为信 · 云中同道',
    lead: '我云栖派不争虚名，不设高墙；只以清白玉佩为信，在人间风尘里认一群真诚同道。',
    motto: '佩玉入云，真诚同行。',
    closing: '愿云海有归处，愿玉光照同道；能同行时共看云起，暂别江湖也各自珍重。',
  },
  navItems,
  home: {
    actions: homeActions,
    highlights: homeHighlights,
    opening: [
      '云栖派无实体山门，却有一片同道可栖的云海。',
      '我们聚在这里，不为声势，不为排场，只为在人间风尘里认得几位真诚同行之人。',
    ],
    credoLines: ['心随云闲', '以诚为先', '同道相敬', '来去随缘'],
    dailyFocus: [
      '有空时同看云起，忙起来各守本心，彼此不生亏欠。',
      '群中可聊生活、可谈兴趣、可分享见闻，也可把心事暂寄云间。',
      '有人遇难处，同门量力相帮；有人得喜事，大家一同道贺。',
    ],
  },
  canonSections,
  discipline: {
    rules: disciplineRules,
    prohibitions: disciplineProhibitions,
    note: '云栖派重在守底线，不靠层层规矩压人。规矩不多，但每一条都关系到门派的清净与信任。',
  },
  life: {
    roles: lifeRoles,
    routines: lifeRoutines,
    note: '云栖门中不排高低座次。分工只是有人多托一份心，不是谁借名位压人。',
  },
  join: {
    keyPoints: joinKeyPoints,
    note: '认同门风 · 来去随缘 · 固定三十题 · 十分钟问心卷',
  },
  assessment: assessmentContent,
  poster: {
    template: posterTemplate,
    defaultTitle: '云中同道',
  },
  musicTracks,
}



