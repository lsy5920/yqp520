import type {
  MemberCardFieldConfig,
  MemberCardFormValue,
  MemberCardTemplateConfig,
  MemberCardTemplateKey,
} from '@/types/memberCard'

// 这里定义名片草稿和档案在浏览器里保存时要用的键名，避免和其他模块冲突。
export const memberCardStorageKeys = {
  draft: 'yunqi-member-card-draft',
  archives: 'yunqi-member-card-archives',
} as const

// 这里定义名片表单的默认内容，所有新同门第一次打开页面都会从这里开始。
export const memberCardDefaultForm: MemberCardFormValue = {
  title: '',
  secularName: '',
  region: '',
  hobbies: '',
  origin: '',
  motto: '',
  avatarDataUrl: '',
  templateKey: 'simple',
}

// 这里定义名片填写项，页面会按这个顺序渲染表单。
export const memberCardFields: MemberCardFieldConfig[] = [
  {
    key: 'title',
    label: '宗门称谓',
    placeholder: '例如：云泽、栖月、听雨',
    help: '写你在云栖派想用的道号或昵称，这一项会放在名片最显眼的位置。',
    maxLength: 18,
  },
  {
    key: 'secularName',
    label: '俗世名号',
    placeholder: '可留空，愿意再写',
    help: '真实姓名不是必填项，想留就留，不留也完全没关系。',
    maxLength: 18,
  },
  {
    key: 'region',
    label: '所处地域',
    placeholder: '例如：浙江台州',
    help: '只写城市或常住地即可，方便同门知道你从哪里来。',
    maxLength: 18,
  },
  {
    key: 'hobbies',
    label: '平生所好',
    placeholder: '例如：闲观风月，喜读书，爱散步',
    help: '可写兴趣、爱好、擅长之事，也可以写成一小句白话。',
    rows: 2,
    maxLength: 80,
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
    label: '个人寄语',
    placeholder: '例如：行止从容，本心自持',
    help: '可以是一句座右铭，也可以是一句想对同门说的话。',
    rows: 2,
    maxLength: 60,
  },
]

// 这里定义名片模板，用户可以在“极简素雅”和“重纹典藏”之间切换。
export const memberCardTemplates: MemberCardTemplateConfig[] = [
  {
    key: 'simple',
    name: '极简素雅',
    description: '留白更多，适合日常群发，读起来更轻快。',
    cardClass: 'member-card-card--simple',
  },
  {
    key: 'ornate',
    name: '重纹典藏',
    description: '纹饰更重，适合保存纪念，也更像一张宗门典藏帖。',
    cardClass: 'member-card-card--ornate',
  },
]

// 这里定义页面上的总标题和提示文案，保证名片页一进来就知道要做什么。
export const memberCardCopy = {
  banner: {
    eyebrow: '同门入山',
    title: '制我栖名名片',
    lead: '新入门同门只需填七项基础信息，系统便会自动排版成一张云栖专属古风名片。文字版可直接发群，图片版可长期留存。',
    note: '本机同门录会自动保存草稿与已生成记录，刷新页面也能继续查看。',
  },
  introLines: [
    '填完就能出卡，不用写复杂资料。',
    '先出文字版，再出高清图，适合微信群直接发。',
    '已生成名片会自动归档到本机同门录。',
  ],
  archive: {
    title: '云栖同门录',
    lead: '这里会保存本机已经生成过的同门名片，方便后续翻阅和认人。',
    empty: '当前还没有同门名片，先生成第一张吧。',
  },
  generated: {
    title: '『云栖派 · 同门录』云深栖心 同道同归',
    divider: '——————————',
    signaturePrefix: '云栖门下',
    yearText: '立派纪年 · 丙午年',
    fallbackTitle: '未题道号',
    fallbackRegion: '暂未留居所',
    fallbackSecularName: '俗名未留',
    fallbackHobbies: '闲观风月，静享清欢',
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
