import type {
  MemberCardFieldConfig,
  MemberCardFormValue,
  MemberCardTemplateConfig,
  MemberCardTemplateKey,
} from '@/types/memberCard'

// 这里定义名帖草稿和档案在浏览器里保存时要用的键名，避免和旧版本混在一起。
export const memberCardStorageKeys = {
  state: 'yunqi-member-card-state-v2',
  draft: 'yunqi-member-card-draft',
  archives: 'yunqi-member-card-archives',
} as const

// 这里定义名帖表单的默认内容，所有新同门第一次打开页面都会从这里开始。
export const memberCardDefaultForm: MemberCardFormValue = {
  daoName: '',
  worldName: '',
  residence: '',
  shortTags: '',
  origin: '',
  motto: '',
  avatarDataUrl: '',
  templateKey: 'qingya',
}

// 这里定义名帖填写项，页面会按这个顺序渲染表单。
export const memberCardFields: MemberCardFieldConfig[] = [
  {
    key: 'daoName',
    label: '道号',
    placeholder: '例如：云泽、栖月、听雨',
    help: '先写你在云栖派想用的道号，这一项会放在名帖最显眼的位置。',
    maxLength: 18,
  },
  {
    key: 'worldName',
    label: '俗世名号',
    placeholder: '可留空，愿意再写',
    help: '真实姓名不是必填项，想留就留，不留也完全没关系。',
    maxLength: 18,
  },
  {
    key: 'residence',
    label: '所居地域',
    placeholder: '例如：浙江台州',
    help: '只写城市或常住地即可，方便同门知道你从哪里来。',
    maxLength: 18,
  },
  {
    key: 'shortTags',
    label: '门中短签',
    placeholder: '例如：闲观风月，喜读书，爱散步',
    help: '可写兴趣、爱好、擅长之事，用顿号、逗号或换行隔开后，会自动排成几枚短签。',
    rows: 2,
    maxLength: 120,
  },
  {
    key: 'origin',
    label: '入栖初心',
    placeholder: '例如：愿寻同道之人，心有归栖',
    help: '说说你为什么愿意加入云栖派，越真诚越好。',
    rows: 3,
    maxLength: 120,
  },
  {
    key: 'motto',
    label: '心之所语',
    placeholder: '例如：行止从容，本心自持',
    help: '可以是一句座右铭，也可以是一句想对同门说的话。',
    rows: 2,
    maxLength: 60,
  },
]

// 这里定义名帖模板，用户可以在“清雅门帖”和“朱印典藏”之间切换。
export const memberCardTemplates: MemberCardTemplateConfig[] = [
  {
    key: 'qingya',
    name: '清雅门帖',
    description: '留白更轻，适合日常群发，读起来更像一张清净门帖。',
    cardClass: 'member-card-card--qingya',
  },
  {
    key: 'zhuyin',
    name: '朱印典藏',
    description: '朱印更重，适合收藏留念，也更像一卷宗门典藏帖。',
    cardClass: 'member-card-card--zhuyin',
  },
]

// 这里定义页面上的总标题和提示文案，保证名帖页一进来就知道要做什么。
export const memberCardCopy = {
  banner: {
    eyebrow: '同门入山',
    title: '制我栖名门帖',
    lead:
      '先写道号、俗名与居处，再补几枚门中短签，系统便会自动排成一张云栖专属门帖。文字版可直发群聊，图片版可留在本机同门录里。',
    note: '草稿、头像与已生成名帖都会保存在本机，刷新后也能继续接着写。',
  },
  introLines: [
    '先写道号与短签，名帖主位会先落在中间。',
    '文字版和图片版共用同一张卡面，预览与下载会保持一致。',
    '已生成名帖会自动归档到本机同门录，方便日后翻阅。',
  ],
  archive: {
    title: '云栖同门录',
    lead: '这里会保存本机已经生成过的名帖，方便后续沿用、翻看与删除。',
    empty: '当前还没有同门名帖，先生成第一张吧。',
  },
  generated: {
    title: '『云栖派 · 同门名帖』',
    subtitle: '云深栖心 · 同道同归',
    sideMark: '云栖同门录',
    signaturePrefix: '云栖门下',
    yearText: '立派纪年 · 丙午年',
    fallbackDaoName: '未题道号',
    fallbackWorldName: '俗名未留',
    fallbackResidence: '暂未留居处',
    fallbackShortTags: '闲观风月，静享清欢',
    fallbackOrigin: '愿寻同道之人，心有归栖',
    fallbackMotto: '行止从容，本心自持',
  },
} as const

// 这里把默认模板单独导出，方便初始化和回填草稿时直接复用。
export const memberCardDefaultTemplateKey: MemberCardTemplateKey = memberCardDefaultForm.templateKey

// 这里提供一个生成空白草稿的函数，避免多个地方手写同样的默认值。
export function createDefaultMemberCardForm(): MemberCardFormValue {
  return {
    ...memberCardDefaultForm,
  }
}
