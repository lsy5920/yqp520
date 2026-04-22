import type {
  MemberCardFieldConfig,
  MemberCardFieldGroupConfig,
  MemberCardFormValue,
} from '@/types/memberCard'

// 这里定义江湖名帖本机存储要用到的键名，方便新旧版本分开管理与迁移。
export const memberCardStorageKeys = {
  state: 'yunqi-jianghu-card-state-v3',
  legacyState: 'yunqi-member-card-state-v2',
  legacyDraft: 'yunqi-member-card-draft',
  legacyArchives: 'yunqi-member-card-archives',
} as const

// 这里定义江湖名帖的默认空白表单，方便首次进入页面时直接渲染。
export const memberCardDefaultForm: MemberCardFormValue = {
  jianghuName: '',
  formerName: '',
  fromPlace: '',
  identityLine: '',
  skillTags: '',
  entryStory: '',
  signatureLine: '',
  portraitDataUrl: '',
}

// 这里定义江湖名帖全部字段配置，方便工作台统一渲染输入框。
export const memberCardFields: MemberCardFieldConfig[] = [
  {
    key: 'jianghuName',
    label: '江湖名号',
    placeholder: '例如：云泽、栖尘、听雪',
    help: '这是整张名帖最醒目的主标题，建议短一点、稳一点。',
    maxLength: 18,
  },
  {
    key: 'formerName',
    label: '旧名或本名',
    placeholder: '可留空，愿意再写',
    help: '可写旧名、俗名或别人最常叫你的名字，不写也没关系。',
    maxLength: 18,
  },
  {
    key: 'fromPlace',
    label: '来处',
    placeholder: '例如：浙江台州、临安旧地',
    help: '写城市、州府、常住地或一句来处都可以，点到为止更有味道。',
    maxLength: 24,
  },
  {
    key: 'identityLine',
    label: '身份一句',
    placeholder: '例如：云栖门下行脚客',
    help: '用一句短话概括你的门中气质，像一枚安静的小题记。',
    maxLength: 28,
  },
  {
    key: 'skillTags',
    label: '江湖短签',
    placeholder: '例如：听风观云，喜读书，善夜谈',
    help: '可写兴趣、习惯、擅长之事，用逗号、顿号或换行隔开后会自动拆成短签。',
    rows: 2,
    maxLength: 120,
  },
  {
    key: 'entryStory',
    label: '入门缘起',
    placeholder: '例如：愿在纷扰人间里，寻几位能放心说真话的同道。',
    help: '写一段你为何想在云栖留名的话，越真诚越有江湖气。',
    rows: 4,
    maxLength: 160,
  },
  {
    key: 'signatureLine',
    label: '留名一句',
    placeholder: '例如：既见同道，愿并肩而行',
    help: '这一句会出现在名帖底部收束区，适合写成一句干净落款。',
    rows: 2,
    maxLength: 60,
  },
]

// 这里定义工作台三段式分组，让填写顺序更像在正式立帖。
export const memberCardFieldGroups: MemberCardFieldGroupConfig[] = [
  {
    key: 'naming',
    label: '立名',
    title: '先定名号与来处',
    lead: '先把江湖名号、旧名和来处立稳，整张名帖的骨架就出来了。',
    fieldKeys: ['jianghuName', 'formerName', 'fromPlace'],
  },
  {
    key: 'identity',
    label: '立身',
    title: '再写身份与短签',
    lead: '身份一句负责定气，江湖短签负责让人物更鲜活。',
    fieldKeys: ['identityLine', 'skillTags'],
  },
  {
    key: 'closing',
    label: '留帖',
    title: '最后写缘起与落款',
    lead: '这一段会决定整张名帖最后留下来的温度。',
    fieldKeys: ['entryStory', 'signatureLine'],
  },
]

// 这里集中定义江湖名帖页要用到的全部文案，方便页面和卡片统一取值。
export const memberCardCopy = {
  page: {
    eyebrow: '云栖派 · 江湖名帖',
    title: '立一纸江湖名帖',
    lead: '把名号、来处、身份一句与缘起写下，系统便会排成一张更像正式门籍的江湖正帖。',
    note: '新版以成图为主，草稿会自动保存在本机，文字版可随时复制。',
  },
  studio: {
    previewEyebrow: '江湖正帖',
    previewLead: '左侧看到的就是最终成图，保存时不会再切换另一套版式。',
    portraitTitle: '人像',
    portraitLead: '人像是可选项，不传也会自动用名号首字占位。',
    copyTitle: '文字版只作次要能力',
    copyLead: '点击即可生成简洁文字版，适合直接发进群里，不再单独占一大块主界面。',
  },
  introLines: [
    '立帖时先定名号，再补来处与身份一句，画面会立刻稳下来。',
    '江湖短签会自动拆成几枚小签，不用手动排版。',
    '草稿会自动保存在本机，刷新后还能接着写。',
  ],
  generated: {
    title: '『云栖派 · 江湖名帖』',
    subtitle: '云深栖心 · 门籍留名',
    sideMark: '云栖门籍',
    sealText: '江湖正帖',
    signaturePrefix: '云栖门下',
    yearText: '立派纪年 · 丙午年',
    fallbackJianghuName: '未题名号',
    fallbackFormerName: '旧名未留',
    fallbackFromPlace: '来处未落',
    fallbackIdentityLine: '云栖门下未留身份一句',
    fallbackSkillTags: '听风观云，闲行人间',
    fallbackEntryStory: '愿在纷扰尘世里，留一纸清净门籍，与同道相见。',
    fallbackSignatureLine: '既见同道，愿并肩而行',
  },
} as const

// 这里提供生成空白草稿的函数，避免多个地方重复手写默认值。
export function createDefaultMemberCardForm(): MemberCardFormValue {
  return {
    ...memberCardDefaultForm,
  }
}
