import type {
  CanonSection,
  FaqItem,
  FlowStep,
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
  { label: '立派全典', path: '/canon', hint: '完整典章' },
  { label: '门规与禁律', path: '/discipline', hint: '共守风气' },
  { label: '宗门日常', path: '/life', hint: '同门相处' },
  { label: '入派指引', path: '/join', hint: '来去随缘' },
  { label: '入派考核', path: '/assessment', hint: '问心入门' },
  { label: '云栖海报', path: '/poster', hint: '分享门面' },
]

// 这里定义首页的快捷入口，首屏会直接引用这些操作。
const homeActions: QuickAction[] = [
  { label: '阅立派全典', path: '/canon', style: 'primary' },
  { label: '启江湖海报', path: '/poster', style: 'secondary' },
  { label: '观入派指引', path: '/join', style: 'ghost' },
]

// 这里定义首页亮点卡片，用简洁方式概括门派核心精神。
const homeHighlights: HighlightItem[] = [
  {
    title: '以心为山',
    lead: '云栖无山，以心为山',
    description: '不立实体山门，不筑殿宇楼阁，只以一方群聊安顿同道之心。',
  },
  {
    title: '以诚相守',
    lead: '同门相守，不缚尘烦',
    description: '不争名夺利，不卷功利攀附，只盼一群人说真话、交真心。',
  },
  {
    title: '以缘聚散',
    lead: '相聚随心，来去随缘',
    description: '合得来便常相见，合不来便各自安好，来去皆自由，情谊仍长留。',
  },
  {
    title: '以礼成风',
    lead: '仅守底线，不设苛规',
    description: '全派共守四条底线、三条禁律，让清净风气长久稳稳地留下来。',
  },
]

// 这里存放立派全典正文，供全典页面逐章展示。
const canonSections: CanonSection[] = [
  {
    id: 'naming',
    title: '一、立派定名',
    subtitle: '以云为意，以栖为心',
    paragraphs: [
      '本派名曰云栖派。',
      '取“浮云自在来去，人心同归栖止”之意。',
      '不立实体山门，不筑殿宇楼阁，不划地界疆土。',
      '以微信群为唯一宗门所在，千里同道，一线相牵。',
    ],
  },
  {
    id: 'origin',
    title: '二、立派初衷',
    subtitle: '在浮躁世间，留一处安心停靠之所',
    paragraphs: [
      '当今之世，人人奔波劳碌，为生计所困，为功利所扰。',
      '世间相交，多讲得失，多论利弊，真心难得，知己难求。',
      '我辈既不愿争名夺利，也不愿结党纷争，只愿寻一群志同道合之人。',
      '闲时闲话风月，忙时各自安好；遇事能搭把手，心事能有人听。',
      '故此创立云栖一派，结清净同道之缘，造一方精神净土。',
    ],
  },
  {
    id: 'credo',
    title: '三、门派总旨',
    subtitle: '四句立心，定一派风骨',
    paragraphs: [
      '心随云闲，身自安然；',
      '同道相守，不缚尘烦；',
      '无拘无束，以诚为先；',
      '相聚随心，来去随缘。',
    ],
  },
  {
    id: 'motto',
    title: '四、对外箴言',
    subtitle: '一语见本真',
    paragraphs: ['云深不问俗事，栖心只守本真。'],
  },
  {
    id: 'rules',
    title: '五、宗门规矩',
    subtitle: '仅守四条底线，庄重不苛责',
    paragraphs: [
      '本派无繁文缛节，无森严戒律，无高低尊卑。',
      '全体同门共守四条底线，以正风气。',
      '守礼：说话有分寸，待人要真诚，不辱骂他人，不挑起争端。',
      '守心：品行端正，光明磊落，不撒谎骗人，不搬弄是非。',
      '守和：同门之间谦和相处，求同存异，不结小圈子，不生私怨。',
      '守缘：合得来就多聚，合不来就散，来去自由，互不勉强。',
      '除此四条，再无约束。想说话就说，想潜水就潜，想参加活动就来，不想来就不去，皆是本分。',
    ],
  },
  {
    id: 'structure',
    title: '六、宗门架构',
    subtitle: '无实权，纯服务',
    paragraphs: [
      '本派无领导下属之分，只有分工不同的服务者，全凭自愿担任，定期轮换。',
      '宗主：创派之人，护一脉和气，定大方向，不强迫任何人做任何事。',
      '云司：自愿帮忙的执事，分三类。',
      '文司：整理群内精华、活动记录，留存门派记忆。',
      '事司：策划组织线上聊天、线下聚会，安排活动事宜。',
      '财司：管理活动 AA 费用、信物制作费，每月公开账目。',
      '同门：所有入派之人，不分年龄、职业、身份，人人平等。',
    ],
  },
  {
    id: 'routine',
    title: '七、宗门日常',
    subtitle: '有事相帮，有喜同贺',
    paragraphs: [
      '无早晚课，无强制任务，无考核要求。',
      '平日群内可聊生活琐事，可谈兴趣爱好，可分享见闻，可倾诉心事。',
      '闲时组织线上茶话会、读书分享、技能交流。',
      '逢节假日约线下小聚，吃饭、爬山、看展、游玩，费用 AA，自愿参加。',
      '有人遇到难处，同门量力相助；有人取得成就，大家一同庆贺。',
    ],
  },
  {
    id: 'join-leave',
    title: '八、入派与退派',
    subtitle: '来去皆自由，情谊不散场',
    paragraphs: [
      '入派：认同本派宗旨，品行端正，由一位正式同门引荐，入群后简单自我介绍，即为云栖弟子。自愿申领云栖铜章作为身份信物。',
      '退派：随时可退，不问缘由。退派后情谊仍在，日后想回来，随时欢迎。',
    ],
  },
  {
    id: 'ban',
    title: '九、宗门禁律',
    subtitle: '仅三条，违者必究',
    paragraphs: [
      '不得发表违法违规言论，不得造谣传谣、人身攻击。',
      '不得欺骗同门、借钱不还，不得泄露他人隐私。',
      '不得打着云栖派旗号牟利，不得做败坏门派名声之事。',
      '触犯者，轻则劝退自省，重则逐出山门，永不复用。',
    ],
  },
  {
    id: 'closing',
    title: '十、立派结语',
    subtitle: '愿同道相守，不负本心',
    paragraphs: [
      '云栖无山，以心为山；宗门无殿，以情为殿。',
      '我辈聚于此，不为争霸江湖，不为扬名立万。',
      '只为在这浮躁世间，有一群可以放心相处的朋友，有一个可以安心停靠的港湾。',
      '愿我们相守相伴，从容度日，不负本心，不负相逢。',
      '云栖一派，自此而立。',
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
    duty: '创派之人，护一脉和气，定大方向。',
    details: ['负责守住门派气质。', '遇到大方向问题时做最后定调。', '不以身份压人，不强迫任何人做任何事。'],
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
    duty: '管理活动 AA 费用、信物制作费，每月公开账目。',
    details: ['负责把钱算清楚。', '所有账目公开透明。', '让大家参加活动时放心、安心。'],
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

// 这里定义入派流程，供入派页面逐步展示。
const joinSteps: FlowStep[] = [
  {
    title: '认同宗旨',
    description: '先认同云栖派“以诚为先、来去随缘、同道相守”的总旨，这是入派的第一步。',
  },
  {
    title: '同门引荐',
    description: '由一位正式同门引荐入群，避免陌生人硬闯，也让新同门有人照应。',
  },
  {
    title: '简单自介',
    description: '入群后做一个轻松的自我介绍，不求华丽，只求彼此知道你是谁、为何而来。',
  },
  {
    title: '自在相处',
    description: '自我介绍完成，即为云栖弟子。之后说话、潜水、参加活动，都按自己的节奏来。',
  },
]

// 这里定义退派说明，让用户知道云栖派重在情谊而非束缚。
const leaveSteps: FlowStep[] = [
  {
    title: '随时可退',
    description: '退派不问缘由，不做追问，不作挽留上的情感绑架。',
  },
  {
    title: '情谊仍在',
    description: '离开宗门不等于情谊断绝，曾经同行的缘分依旧值得珍惜。',
  },
  {
    title: '日后可归',
    description: '若有一日想回来，仍可回到云栖之中，再续旧缘。',
  },
]

// 这里定义常见问题，帮助新同门快速理解门派风格。
const joinFaqs: FaqItem[] = [
  {
    question: '云栖派是不是必须天天发言？',
    answer: '不是。想说话就说，想潜水就潜，安静陪伴也是同门的一种方式。',
  },
  {
    question: '参加线下活动是不是强制的？',
    answer: '不是。所有活动都以自愿为前提，费用 AA，想来就来，不想来也完全没关系。',
  },
  {
    question: '云栖铜章一定要领吗？',
    answer: '不是。铜章是身份信物，重在仪式感，是否申领由个人自愿决定。',
  },
  {
    question: '如果和部分同门处不来怎么办？',
    answer: '云栖讲究“守和”与“守缘”，先求同存异，若确实合不来也可保持距离，互不勉强。',
  },
]

// 这里定义海报模板，用于海报生成器和导出尺寸控制。
const posterTemplate: PosterTemplate = {
  id: 'yunqi-official',
  name: '青金云海帖',
  title: '云栖同道帖',
  phrase: '云深不问俗事，栖心只守本真。',
  defaultBlessing: '愿你心随云闲，身自安然；同道相守，不缚尘烦。',
  stampText: '云栖印',
  qrLabel: '扫码入云栖',
  exportWidth: 1080,
  exportHeight: 1920,
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
    subtitle: '半文半白立派全典',
    lead: '不立山门，不争江湖，只愿在纷扰世间留一处可安心停靠的人情之地。',
    motto: '云深不问俗事，栖心只守本真。',
    closing: '愿我们相守相伴，从容度日，不负本心，不负相逢。',
  },
  navItems,
  home: {
    actions: homeActions,
    highlights: homeHighlights,
    opening: [
      '云栖无山，以心为山；宗门无殿，以情为殿。',
      '我辈聚于此，不为争霸江湖，不为扬名立万，只为在浮躁尘世中，寻一群可以放心相处的朋友。',
    ],
    credoLines: ['心随云闲，身自安然', '同道相守，不缚尘烦', '无拘无束，以诚为先', '相聚随心，来去随缘'],
    dailyFocus: [
      '闲时闲话风月，忙时各自安好。',
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
    steps: joinSteps,
    leaves: leaveSteps,
    faqs: joinFaqs,
    note: '认同宗旨、品行端正、愿与同门真诚相待，便是踏入云栖最重要的门槛。',
  },
  assessment: assessmentContent,
  poster: {
    template: posterTemplate,
    defaultTitle: '云中同门',
    introLines: [
      '这是一张为云栖派量身定制的门面海报。',
      '你可以填写自己的同门称呼与一句寄语，生成一张带着门派气质的专属分享图。',
      '海报会默认嵌入云栖首页二维码，方便扫码后直接回到山门首页。',
      '若当前环境支持原生分享，会优先唤起系统分享；否则会自动保存图片到本地。',
    ],
  },
  musicTracks,
}
