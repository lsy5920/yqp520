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
  { label: '立派手册', path: '/canon', hint: '门风说明' },
  { label: '门规与禁律', path: '/discipline', hint: '共守风气' },
  { label: '宗门日常', path: '/life', hint: '同门相处' },
  { label: '入派考核', path: '/join', hint: '来去随缘' },
  { label: '云栖海报', path: '/poster', hint: '玉佩信物' },
]

// 这里定义首页的快捷入口，首屏会直接引用这些操作。
const homeActions: QuickAction[] = [
  { label: '读立派手册', path: '/canon', style: 'primary' },
  { label: '启江湖海报', path: '/poster', style: 'secondary' },
  { label: '观入派考核', path: '/join', style: 'ghost' },
]

// 这里定义首页亮点卡片，用简洁方式概括门派核心精神。
const homeHighlights: HighlightItem[] = [
  {
    title: '以心为山',
    lead: '没有高墙，只有能安心停靠的人',
    description: '云栖派不靠场地和排场成立，只把同门之间的真诚、分寸和长期陪伴放在第一位。',
  },
  {
    title: '以诚相守',
    lead: '少一点试探，多一点坦荡',
    description: '这里不鼓励攀附和表演式热闹，只希望大家能说真话、讲信用，轻松相处。',
  },
  {
    title: '以缘聚散',
    lead: '合得来就同行，忙起来也不亏欠',
    description: '云栖尊重每个人的生活节奏。想来就来，想安静也可以，关系不靠打卡维持。',
  },
  {
    title: '以礼成风',
    lead: '规矩不多，但底线清楚',
    description: '四条相处底线、三条禁律，都是为了保护同门安全感，让这处云栖长久干净。',
  },
]

// 这里存放立派手册正文，供手册页面逐章展示。
const canonSections: CanonSection[] = [
  {
    id: 'naming',
    title: '一、名字从何而来',
    subtitle: '云是自由，栖是停靠',
    paragraphs: [
      '云栖派的名字，取自“像云一样自在，也能在这里安心停靠”。',
      '我们没有实体山门，也不把地点、头衔和排场当作门派的根基。',
      '当前唯一的线上山门是微信群。同门可能相隔很远，但可以在同一处聊天、相识、互相照应。',
    ],
  },
  {
    id: 'origin',
    title: '二、为什么要立派',
    subtitle: '在忙乱生活里，留一个能放心说话的地方',
    paragraphs: [
      '现实生活已经足够拥挤，很多关系也常常被效率、比较和利益推着走。',
      '云栖派想留下一块轻一点的地方：可以闲聊，可以分享近况，也可以在低落时有人听你说几句。',
      '我们不追求声势，也不鼓励抱团攀比。能彼此尊重、真诚相待，就是最重要的门风。',
      '有人忙时可以安静潜水，有人需要帮助时大家量力而行。关系不靠压力维持，而靠长久的善意留下。',
    ],
  },
  {
    id: 'credo',
    title: '三、门派总旨',
    subtitle: '四句话，讲清云栖的相处方式',
    paragraphs: [
      '相处轻松，不给彼此制造额外负担。',
      '真诚守信，不拿同门的信任开玩笑。',
      '互相尊重，不用身份、资历和圈子压人。',
      '来去自由，能同行时好好同行，暂时离开也不互相亏欠。',
    ],
  },
  {
    id: 'motto',
    title: '四、对外一句话',
    subtitle: '让别人一眼明白云栖',
    paragraphs: ['真诚相待，自在同行。'],
  },
  {
    id: 'rules',
    title: '五、相处底线',
    subtitle: '规矩不多，但每条都要守住',
    paragraphs: [
      '云栖派不设复杂等级，也不靠繁琐流程管理同门。',
      '大家只需要共同守住四条底线。',
      '守礼：说话有分寸，表达不同意见时也给别人留体面。',
      '守心：做人做事坦荡，不骗人、不造谣、不搬弄是非。',
      '守和：遇到分歧先讲清楚，不结小圈子，不故意制造对立。',
      '守缘：尊重来去和亲疏变化，不强留、不绑架、不用热闹衡量关系。',
      '除此之外，发言、潜水、参加活动都按自愿来。云栖要的是自在，不是打卡压力。',
    ],
  },
  {
    id: 'structure',
    title: '六、分工方式',
    subtitle: '没有上下级，只有愿意多做一点的人',
    paragraphs: [
      '云栖派没有上下级。所谓分工，只是为了让事情有人照看。',
      '宗主负责守住整体方向和门派气质，但不能强迫任何人做不愿意做的事。',
      '云司是自愿帮忙的服务者，按事情不同分为三类。',
      '文司负责整理群内精华、活动记录和门派记忆。',
      '事司负责发起线上聊天、线下小聚和活动安排。',
      '财司负责活动 AA 费用、玉佩制作费等公开账目，保证钱款透明。',
      '所有同门不分年龄、职业、身份，进入云栖后都平等相处。',
    ],
  },
  {
    id: 'routine',
    title: '七、日常如何相处',
    subtitle: '不强制热闹，也不让关系冷掉',
    paragraphs: [
      '云栖没有每日任务，也没有发言考勤。',
      '群里可以聊生活、兴趣、见闻，也可以认真说说最近的困惑。',
      '有空时会组织线上茶话、读书分享、技能交流。',
      '节假日也可以约线下小聚，吃饭、爬山、看展、游玩都行，费用 AA，自愿参加。',
      '有人遇到难处，同门量力相助；有人迎来好事，大家一起庆贺。',
    ],
  },
  {
    id: 'join-leave',
    title: '八、加入与离开',
    subtitle: '进门要真诚，离开也体面',
    paragraphs: [
      '加入云栖，需要认同门派宗旨，愿意遵守相处底线，并由一位正式在册同门引荐。',
      '入群后做一个简单自我介绍，让大家知道你是谁、为什么而来，就算正式见过同门。',
      '云栖玉佩是门派身份信物，可按个人意愿申领，不作为高低身份的证明。',
      '想离开时可以随时退出，不必说明理由。日后想回来，也可以重新联系同门。',
    ],
  },
  {
    id: 'ban',
    title: '九、绝对红线',
    subtitle: '三件事不能碰',
    paragraphs: [
      '不发表违法违规内容，不造谣传谣，不做人身攻击。',
      '不欺骗同门，不借钱不还，不泄露他人隐私。',
      '不打着云栖派名义牟利，不做损害门派名声和同门信任的事。',
      '触碰红线者，轻则劝退，重则移出云栖并不再接纳。',
    ],
  },
  {
    id: 'closing',
    title: '十、最后想说',
    subtitle: '把关系放轻，把真诚放稳',
    paragraphs: [
      '云栖派不追求热闹声量，也不靠仪式感证明自己。',
      '我们只是希望，在忙乱现实之外，还有一群可以放心相处的人。',
      '愿大家在这里说话不必过度防备，沉默也不会被误解。',
      '能同行时好好同行，暂时走远时也彼此祝好。',
      '这就是云栖派想长期守住的样子。',
    ],
  },
]

// 这里定义四条底线，用于门规页面重点展示。
const disciplineRules: RuleItem[] = [
  {
    title: '守礼',
    summary: '说话有分寸，待人有真心。',
    details: ['不辱骂他人。', '不故意挑起争端。', '交流时保留体面，也给别人留余地。'],
  },
  {
    title: '守心',
    summary: '品行端正，光明磊落。',
    details: ['不撒谎骗人。', '不搬弄是非。', '做人做事以坦荡为先，不拿同门信任开玩笑。'],
  },
  {
    title: '守和',
    summary: '求同存异，谦和相处。',
    details: ['不结小圈子。', '不生私怨。', '有不同意见时，先讲道理，再讲体谅。'],
  },
  {
    title: '守缘',
    summary: '来去自由，互不勉强。',
    details: ['合得来便多相聚。', '合不来便各自安好。', '不因关系远近而生高低之分。'],
  },
]

// 这里定义三条禁律，用于门规页面强调底线。
const disciplineProhibitions: RuleItem[] = [
  {
    title: '禁妄言',
    summary: '不触碰违法违规、不造谣、不做人身攻击。',
    details: ['不发表违法违规言论。', '不造谣传谣。', '不以攻击他人为乐。'],
  },
  {
    title: '禁失信',
    summary: '不欺骗同门，不借钱不还，不泄露他人隐私。',
    details: ['不利用信任谋私。', '涉及钱财往来要讲明白、守信用。', '他人隐私只能被尊重，不能被扩散。'],
  },
  {
    title: '禁败名',
    summary: '不打着云栖派旗号牟利，不做败坏门派名声之事。',
    details: ['不借门派之名做私利买卖。', '不借名头招摇。', '一旦越线，轻则劝退，重则逐出山门。'],
  },
]

// 这里定义宗门角色，用于日常页面展示服务分工。
const lifeRoles: RoleItem[] = [
  {
    title: '宗主',
    duty: '负责守住门派气质和大方向。',
    details: ['看护整体氛围。', '遇到大方向问题时做最后协调。', '不以身份压人，不强迫任何人做任何事。'],
  },
  {
    title: '文司',
    duty: '整理群内精华、活动记录，留存门派记忆。',
    details: ['负责整理纪事。', '沉淀有价值的聊天与活动内容。', '让新同门也能快速了解云栖一路走来的故事。'],
  },
  {
    title: '事司',
    duty: '策划组织线上聊天、线下聚会，安排活动事宜。',
    details: ['负责发起茶话会、读书会、技能交流。', '协助线下小聚的时间、地点和流程安排。', '不搞强制，不设考勤。'],
  },
  {
    title: '财司',
    duty: '管理活动 AA 费用、玉佩制作费，每月公开账目。',
    details: ['负责把钱算清楚。', '所有账目公开透明。', '让大家参加活动和申领玉佩时放心、安心。'],
  },
  {
    title: '同门',
    duty: '所有入派之人，不分年龄、职业、身份，人人平等。',
    details: ['有人擅长倾听。', '有人擅长组织。', '有人只是安静潜水，也同样被视作门中一员。'],
  },
]

// 这里定义宗门日常场景，让页面更有生活感与温度。
const lifeRoutines: RoutineItem[] = [
  { title: '群中闲谈', description: '聊生活、聊见闻、聊心事，让每个人都能自在开口。' },
  { title: '线上茶话', description: '隔屏相聚，围绕一个话题闲谈半晚，不设主持腔，不搞正式流程。' },
  { title: '读书分享', description: '一本书、一段话、一次被打动的经历，都能成为同门相见的由头。' },
  { title: '技能交流', description: '有人分享经验，有人提问取经，彼此搭把手，省去很多独自摸索的弯路。' },
  { title: '节假小聚', description: '吃饭、爬山、看展、游玩，费用 AA，自愿参加，不做社交负担。' },
  { title: '相助与同贺', description: '有人遇难处，同门量力相助；有人有喜事，众人一同庆贺。' },
]

// 这里定义合并后的入派页要点卡片，统一收口入门说明与问心考核前提。
const joinKeyPoints = [
  {
    eyebrow: '认同宗旨',
    title: '先看心意是否相合',
    description: '认同云栖“以诚为先、来去随缘、同道相守”的总旨，便已走在入门路上。',
  },
  {
    eyebrow: '入门方式',
    title: '入群自介，便算见礼',
    description: '入群后做一个简短自我介绍，彼此知道你是谁、为何而来，便算正式见过同门。',
  },
  {
    eyebrow: '来去自由',
    title: '不强留，也不设高墙',
    description: '想来可来，想退可退；情谊重在自在相守，不靠规矩和身份去压人。',
  },
  {
    eyebrow: '问心考核',
    title: '读明白之后，再答这一卷',
    description: '固定三十题、十分钟作答，不为难人，只核对门风、门规与禁律是否已经读明白。',
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
    lead: '不靠排场立门派，只在纷扰生活里留一处能真诚相待、自在同行的云栖。',
    motto: '真诚相待，自在同行。',
    closing: '愿我们把关系放轻，把真诚放稳，在云栖长久相逢。',
  },
  navItems,
  home: {
    actions: homeActions,
    highlights: homeHighlights,
    opening: [
      '云栖派不靠实体山门成立，也不靠热闹声势证明自己。',
      '我们聚在这里，只是希望在忙乱现实之外，留住一群可以放心说话、轻松相处的朋友。',
    ],
    credoLines: ['相处轻松', '真诚守信', '互相尊重', '来去自由'],
    dailyFocus: [
      '有空时多聊几句，忙起来也不互相亏欠。',
      '群中可聊生活、可谈兴趣、可分享见闻，也可把心事轻轻放下。',
      '有人遇难处，同门量力相助；有人有成就，大家一同庆贺。',
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
    note: '这里没有森严等级，只有愿意多做一点事的人。分工是为了让大家更轻松，不是为了让谁拥有高位。',
  },
  join: {
    keyPoints: joinKeyPoints,
    note: '认同宗旨 · 来去自由 · 固定三十题 · 十分钟问心卷',
  },
  assessment: assessmentContent,
  poster: {
    template: posterTemplate,
    defaultTitle: '云中同道',
  },
  musicTracks,
}


