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
  { label: '立派金典', path: '/canon', hint: '门风纲要' },
  { label: '门规与禁律', path: '/discipline', hint: '共守风气' },
  { label: '宗门日常', path: '/life', hint: '云中同道' },
  { label: '入派考核', path: '/join', hint: '来去随缘' },
  { label: '云栖海报', path: '/poster', hint: '玉佩信物' },
]

// 这里定义首页的快捷入口，首屏会直接引用这些操作。
const homeActions: QuickAction[] = [
  { label: '阅立派金典', path: '/canon', style: 'primary' },
  { label: '立玉佩海报', path: '/poster', style: 'secondary' },
  { label: '赴问心考核', path: '/join', style: 'ghost' },
]

// 这里定义首页亮点卡片，用简洁方式概括门派核心精神。
const homeHighlights: HighlightItem[] = [
  {
    title: '以心为山',
    lead: '云栖无山，以心为山',
    description: '本派不设实体山门，以微信群为唯一宗门所在。千里同道，一线相牵，亦可于云栖相逢。',
  },
  {
    title: '以玉为信',
    lead: '云栖玉佩，只作同门相认',
    description: '云栖玉佩为本派身份信物，可自愿申领，只作同门相认之用，不作身份高低之分。',
  },
  {
    title: '以诚立门',
    lead: '相聚随心，来去随缘',
    description: '想说话就说，想潜水就潜；想参加活动便来，不想来亦不勉强，皆是本分。',
  },
  {
    title: '以礼成风',
    lead: '四条底线，共正风气',
    description: '守礼、守心、守和、守缘，是全体同门共守之规；规矩不多，贵在真诚。',
  },
]

// 这里存放立派金典正文，供金典页面逐章展示。
const canonSections: CanonSection[] = [
  {
    id: 'naming',
    title: '一、立派定名',
    subtitle: '本派名曰“云栖”',
    paragraphs: [
      '本派名曰“云栖”。云者，浮游自在，不滞一处；栖者，心有所归，身有所安。故取“浮云自在来去，人心同归栖止”之意，立云栖一派。',
      '本派不设实体山门，以微信群为唯一宗门所在。',
      '千里同道，一线相牵；虽各在人间烟火之中，亦可于云栖相逢。',
    ],
  },
  {
    id: 'origin',
    title: '二、立派初衷',
    subtitle: '寻志同道合之人，造一方精神净土',
    paragraphs: [
      '尘世纷扰，人心多累。有人困于俗务，有人倦于奔忙，有人虽在人群之中，却难寻一处可安心说话之地。',
      '故此创立云栖一派，寻志同道合之人，结清净同道之缘，造一方精神净土。',
      '在此处，不论身份高低，不较来路远近。愿来者可暂歇风尘，愿同门可互相照应，愿每一颗真心都有栖止之所。',
    ],
  },
  {
    id: 'credo',
    title: '三、门派总旨',
    subtitle: '四句立心之语',
    paragraphs: [
      '心随云闲，身自安然。',
      '同道相守，不缚尘烦。',
      '无拘无束，以诚为先。',
      '相聚随心，来去随缘。',
    ],
  },
  {
    id: 'motto',
    title: '四、对外箴言',
    subtitle: '云栖对外之语',
    paragraphs: [
      '云深不问俗事，栖心只守本真。',
      '佩玉入云，真诚同行。',
    ],
  },
  {
    id: 'rules',
    title: '五、宗门规矩',
    subtitle: '四条底线，共正风气',
    paragraphs: [
      '本派不设繁规，不以条条框框束人。全体同门只需共守四条底线，以正风气。',
      '守礼：说话有分寸，待人要真诚，不辱骂他人，不挑起争端。',
      '守心：品行端正，光明磊落，不撒谎骗人，不搬弄是非。',
      '守和：同门之间谦和相处，求同存异，不结小圈子，不生私怨。',
      '守缘：相聚随缘，来去自由，不强留，不绑架，不以亲疏论高低。',
      '除此四条，再无多余约束。想说话就说，想潜水就潜；想参加活动便来，不想来亦不勉强，皆是本分。',
    ],
  },
  {
    id: 'structure',
    title: '六、宗门架构',
    subtitle: '无领导下属之分，只有分工不同',
    paragraphs: [
      '本派无领导下属之分，只有分工不同的服务者。所有职分皆凭自愿担任，日后可随时调整。',
      '宗主：创派之人，护一脉和气，定大方向，不强迫任何人做任何事。',
      '云司：自愿帮忙的执事，分为文司、事司、财司。',
      '文司：整理群内精华、活动记录，留存门派记忆。',
      '事司：策划线上闲谈、线下小聚，安排活动事宜。',
      '财司：管理活动 AA 费用、玉佩制作费，每月公开账目。',
      '同门：所有入派之人，不分年龄、职业、身份，人人平等。',
    ],
  },
  {
    id: 'routine',
    title: '七、宗门日常',
    subtitle: '闲谈、相助、小聚，皆随缘起',
    paragraphs: [
      '平日群中可闲谈，可分享生活，可谈见闻，可说心事。无需日日活跃，不设发言考勤。',
      '有缘时，可约线上茶话、读书分享、技能交流。',
      '逢节假日，可约线下小聚，吃饭、爬山、看展、游玩，费用 AA，自愿参加。',
      '有人遇难处，同门量力相助；有人有喜事，众人一同庆贺。',
    ],
  },
  {
    id: 'join-leave',
    title: '八、入派与退派',
    subtitle: '入派凭真心，退派亦随缘',
    paragraphs: [
      '入派：认同本派宗旨，品行端正，由一位正式同门引荐。入群后简单自我介绍，即为云栖弟子。',
      '玉佩：云栖玉佩为本派身份信物，可自愿申领。玉佩只作同门相认之用，不作身份高低之分。',
      '退派：随时可退，不问缘由。退派后情谊仍在，日后想回来，随时欢迎。',
    ],
  },
  {
    id: 'ban',
    title: '九、宗门禁律',
    subtitle: '三条红线，不可触犯',
    paragraphs: [
      '以下三条，为本派红线，不可触犯。',
      '一、不得发表违法违规言论，不得造谣传谣，不得人身攻击。',
      '二、不得欺骗同门，不得借钱不还，不得泄露他人隐私。',
      '三、不得打着云栖派旗号牟利，不得做败坏门派名声之事。',
      '触犯者，轻则劝退自省，重则逐出山门，永不复用。',
    ],
  },
  {
    id: 'closing',
    title: '十、立派结语',
    subtitle: '不负本心，不负相逢',
    paragraphs: [
      '云栖无山，以心为山。',
      '宗门无殿，以情为殿。',
      '我辈聚于此，不为争霸江湖，不为扬名立万，只愿在纷扰人间之外，留一处可安心栖身之地。',
      '愿同门相守相伴，从容度日。',
      '不负本心，不负相逢。',
    ],
  },
]

// 这里定义四条底线，用于门规页面重点展示。
const disciplineRules: RuleItem[] = [
  {
    title: '守礼',
    summary: '说话有分寸，待人要真诚。',
    details: ['不辱骂他人。', '不挑起争端。', '分歧之中也给彼此留体面。'],
  },
  {
    title: '守心',
    summary: '品行端正，光明磊落。',
    details: ['不撒谎骗人。', '不搬弄是非。', '不拿同门信任试探人心。'],
  },
  {
    title: '守和',
    summary: '同门之间谦和相处，求同存异。',
    details: ['不结小圈子。', '不生私怨。', '有误会先讲清楚。'],
  },
  {
    title: '守缘',
    summary: '相聚随缘，来去自由。',
    details: ['不强留。', '不绑架。', '不以亲疏论高低。'],
  },
]

// 这里定义三条禁律，用于门规页面强调底线。
const disciplineProhibitions: RuleItem[] = [
  {
    title: '禁妄言',
    summary: '不发表违法违规言论。',
    details: ['不造谣传谣。', '不做人身攻击。', '不以攻击他人为乐。'],
  },
  {
    title: '禁失信',
    summary: '不欺骗同门，不借钱不还。',
    details: ['涉及钱财往来要讲明白、守信用。', '不泄露他人隐私。', '他人私事只能被尊重，不能被扩散。'],
  },
  {
    title: '禁败名',
    summary: '不得打着云栖派旗号牟利。',
    details: ['不借门派之名做私利买卖。', '不做败坏门派名声之事。', '触犯者轻则劝退自省，重则逐出山门。'],
  },
]

// 这里定义宗门角色，用于日常页面展示服务分工。
const lifeRoles: RoleItem[] = [
  {
    title: '宗主',
    duty: '护一脉和气，定门派大方向。',
    details: ['看护整体氛围。', '遇到大方向问题时做协调。', '不强迫任何人做任何事。'],
  },
  {
    title: '文司',
    duty: '整理群内精华、活动记录，留存门派记忆。',
    details: ['负责整理群内精华。', '负责整理活动记录。', '把值得留下的内容沉淀下来。'],
  },
  {
    title: '事司',
    duty: '策划线上闲谈、线下小聚，安排活动事宜。',
    details: ['负责发起茶话会、读书会、技能交流。', '协助线下小聚的时间、地点和流程安排。', '所有活动自愿参加。'],
  },
  {
    title: '财司',
    duty: '管理活动 AA 费用、玉佩制作费，每月公开账目。',
    details: ['负责把活动 AA 费用算清楚。', '负责把玉佩制作费算清楚。', '所有账目公开透明。'],
  },
  {
    title: '同门',
    duty: '所有入派之人，不分年龄、职业、身份，人人平等。',
    details: ['可以闲谈。', '可以潜水。', '可以参加活动，也可以安静同行。'],
  },
]

// 这里定义宗门日常场景，让页面更有生活感与温度。
const lifeRoutines: RoutineItem[] = [
  { title: '群中闲谈', description: '平日群中可闲谈，可分享生活，可谈见闻，可说心事。' },
  { title: '线上茶话', description: '有缘时，可约线上茶话，围着一个话题从容闲谈。' },
  { title: '读书分享', description: '读到好书好句，可拿出来同门共赏。' },
  { title: '技能交流', description: '有人传经验，有人问方法，彼此量力相助。' },
  { title: '节假小聚', description: '吃饭、爬山、看展、游玩，费用 AA，自愿参加。' },
  { title: '相助与同贺', description: '有人遇难处，同门量力相助；有人有喜事，众人一同庆贺。' },
]

// 这里定义合并后的入派页要点卡片，统一收口入门说明与问心考核前提。
const joinKeyPoints = [
  {
    eyebrow: '认同宗旨',
    title: '认同本派宗旨',
    description: '认同云栖总旨，品行端正，愿以真心入派。',
  },
  {
    eyebrow: '入门方式',
    title: '由同门引荐',
    description: '由一位正式同门引荐，入群后简单自我介绍，即为云栖弟子。',
  },
  {
    eyebrow: '来去自由',
    title: '退派亦随缘',
    description: '随时可退，不问缘由。退派后情谊仍在，日后想回来，随时欢迎。',
  },
  {
    eyebrow: '问心考核',
    title: '先问本心，再佩玉入册',
    description: '固定三十题、十分钟作答，核对门风、门规与禁律是否已经读明白。',
  },
]

// 这里定义海报模板，用于海报生成器和导出尺寸控制。
const posterTemplate: PosterTemplate = {
  id: 'yunqi-jade-token',
  name: '云栖玉佩帖',
  title: '云栖玉佩帖',
  phrase: '佩玉入云，真诚同行。',
  defaultBlessing: '愿你心有山河，身在烟火，仍能守住一寸清明与热忱。',
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
    lead: '云栖无山，以心为山；宗门无殿，以情为殿。愿同门相守相伴，不负本心，不负相逢。',
    motto: '云深不问俗事，栖心只守本真。',
    closing: '愿同门相守相伴，从容度日，不负本心，不负相逢。',
  },
  navItems,
  home: {
    actions: homeActions,
    highlights: homeHighlights,
    opening: [
      '本派名曰“云栖”。云者，浮游自在，不滞一处；栖者，心有所归，身有所安。',
      '我辈聚于此，不为争霸江湖，不为扬名立万，只愿在纷扰人间之外，留一处可安心栖身之地。',
    ],
    credoLines: ['心随云闲，身自安然', '同道相守，不缚尘烦', '无拘无束，以诚为先', '相聚随心，来去随缘'],
    dailyFocus: [
      '平日群中可闲谈，可分享生活，可谈见闻，可说心事。',
      '有缘时，可约线上茶话、读书分享、技能交流。',
      '有人遇难处，同门量力相助；有人有喜事，众人一同庆贺。',
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



