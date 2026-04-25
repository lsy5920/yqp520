# 云栖派官方网站

## 项目介绍
这是一个为“云栖派”打造的 Vue 前端项目，用来展示门派内容、问心考核、海报生成、江湖名帖和“云栖名册”登记审核系统。

当前重点功能如下：

- 首页展示云栖派入口、内容导航和全站背景音乐。
- 立派全典、门规与禁律、宗门日常用于展示门派世界观和规则内容。
- 入派考核支持本地答题、自动保存、合格判断和结果海报生成。
- 云栖海报和江湖名帖支持填写内容、实时预览、保存图片和分享。
- 云栖名册支持考核合格后登记、Supabase 入库、执事后台审核、动态二维码、公开名册、公开详情和入册海报。
- 公开名册已经重构为“玉佩云海”：清白玉玉佩随机漂浮，男生泛青蓝光，女生泛粉红光，未选择性别不泛光；点击玉佩会放大并展开卷轴，展示全部公开信息。
- 本次设计稿已生成在 Figma，可编辑地址：[云栖名册玉佩云海重构设计稿](https://www.figma.com/design/gr2Xqmm7y2Jzk38ChY7SSD)。

## 环境要求
建议使用下面环境运行，避免版本不一致导致安装或构建失败：

- 操作系统：`Windows 10` 或 `Windows 11`
- `Node.js`：`25.8.0`
- `npm`：`11.11.0`
- 编码要求：所有源码、文档和 SQL 文件都使用 `UTF-8`

项目依赖版本如下：

### 运行依赖

- `@supabase/supabase-js`：`2.57.4`
- `gsap`：`3.12.5`
- `html-to-image`：`1.11.13`
- `qrcode`：`1.5.4`
- `vue`：`3.5.21`
- `vue-router`：`4.5.1`

### 开发依赖

- `@types/node`：`25.6.0`
- `@types/qrcode`：`1.5.6`
- `@vitejs/plugin-vue`：`6.0.1`
- `@vue/tsconfig`：`0.8.1`
- `typescript`：`5.8.3`
- `vite`：`7.3.2`
- `vue-tsc`：`3.0.7`

## 安装部署教程

### 第一步：进入项目目录

打开 PowerShell，执行：

```powershell
cd "C:\Users\lanshiy\Documents\小亦伟大工程\yqp520"
```

### 第二步：安装依赖

第一次运行前执行：

```powershell
npm install
```

如果没有报错，说明依赖已经安装完成。

### 第三步：配置 Supabase

复制环境变量模板：

```powershell
Copy-Item .env.example .env.local
```

打开 `.env.local`，填写你的 Supabase 配置：

```text
VITE_SUPABASE_URL=你的 Supabase 项目地址
VITE_SUPABASE_ANON_KEY=你的 Supabase 匿名密钥
```

如果暂时不配置，普通内容页可以打开，但云栖名册登记、公开名册、详情页和审核台会提示没有连接数据库。

### 第四步：执行数据库脚本

打开 Supabase 后台的 `SQL Editor`，完整复制并执行：

```text
supabase/yunqi_roster.sql
```

这个脚本会创建或更新：

- `yunqi_roster_cards`：新版云栖名册主表。
- `yunqi_roster_admin_profiles`：执事账号权限表。
- `yunqi_roster_card_review_logs`：审核日志表。
- `gender_key`：新增性别字段，取值为 `male`、`female`、`unspecified`。
- 从旧表 `yunqi_roster_entries.gender` 自动迁移性别数据：`male` 迁移为男生，`female` 迁移为女生，空值或其它值迁移为未选择。

执行后建议在 Supabase 表格中抽查三类记录：

- 旧表 `gender = male` 的记录，新表 `gender_key` 应为 `male`。
- 旧表 `gender = female` 的记录，新表 `gender_key` 应为 `female`。
- 旧表 `gender` 为空的记录，新表 `gender_key` 应为 `unspecified`。

### 第五步：配置执事账号

先在 Supabase 的 `Authentication` 中创建执事邮箱账号。

然后在 SQL 编辑器中执行下面模板，把用户编号和邮箱替换成真实值：

```sql
insert into public.yunqi_roster_admin_profiles (user_id, email, display_name, role, is_active)
values ('替换为 auth.users.id', 'admin@example.com', '云栖执事', '名册执事', true)
on conflict (user_id) do update
set email = excluded.email,
    display_name = excluded.display_name,
    role = excluded.role,
    is_active = excluded.is_active;
```

### 第六步：启动本地开发

执行：

```powershell
npm run dev
```

终端出现本地地址后，用浏览器打开，例如：

```text
http://localhost:5173
```

### 第七步：生产构建验证

每次修改后都建议执行：

```powershell
npm run build
```

这个命令会先做 TypeScript 类型检查，再生成生产文件。

## 使用教程

### 查看公开名册

1. 打开 `/roster/list`。
2. 在搜索框输入道名、编号、身份、地域或标签。
3. 点击身份筛选按钮，可以只看某一类身份。
4. 点击任意玉佩，玉佩会放大并展开成卷轴。
5. 卷轴中会展示公开故事、地域、羁绊状态、性别光效、入册时间和标签。
6. 点击“打开独立详情”可以进入 `/roster/entry/:publicSlug`。

### 登记云栖名册

1. 先进入 `/join#exam` 完成问心考核。
2. 当前题卷成绩达到 `80` 分并通过后，进入 `/roster`。
3. 按五步填写江湖名、真实姓名、性别、身份、地域、宣言、故事、标签、羁绊、封面和联系方式。
4. 性别选择会影响公开名册玉佩光效：男生青蓝光，女生粉红光，未选择不泛光。
5. 勾选名册盟约后提交。
6. 提交成功会生成待审名册令，可保存图片并分享给执事扫码审核。

### 审核名册

1. 进入 `/roster/admin/login`。
2. 使用 Supabase Auth 中创建的执事邮箱和密码登录。
3. 后台可以筛选待审、已入册、暂缓和退回记录。
4. 点击左侧名帖后，可编辑江湖名、真实姓名、入册编号、身份、性别、地域、宣言、故事、标签、羁绊、封面、状态、公开开关、联系方式、审核备注和内部备注。
5. 保存为“已入册”时会自动生成不含数字 `4` 的入册编号，也可以手动填写合法编号。
6. 公开页不会展示真实姓名、联系方式、审核备注和内部备注。

### 生成海报

1. 问心考核结果页可以生成考核海报。
2. 云栖海报页可以生成官方宣传海报。
3. 江湖名帖页可以生成个人名帖海报。
4. 云栖名册登记成功后可以生成待审名册令，审核通过后详情页可以生成入册名册令。

## 项目目录结构

```text
yqp520
├─ .github
│  └─ workflows
│     └─ deploy-pages.yml              GitHub Pages 自动部署流程
├─ public                              静态资源目录
├─ scripts
│  └─ copy-github-pages-404.mjs        构建 Pages 时复制 404 页面
├─ src
│  ├─ App.vue                          全站根组件
│  ├─ main.ts                          Vue 启动入口
│  ├─ style.css                        全站公共样式
│  ├─ components                       可复用组件
│  │  ├─ assessment                    问心考核组件
│  │  ├─ common                        公共展示组件
│  │  ├─ layout                        页头页脚组件
│  │  ├─ member-card                   江湖名帖组件
│  │  ├─ music                         背景音乐组件
│  │  ├─ poster                        云栖海报组件
│  │  └─ roster                        云栖名册海报组件
│  ├─ composables                      可复用状态逻辑
│  ├─ data                             页面文案、选项和默认内容
│  ├─ lib
│  │  └─ supabase.ts                   Supabase 客户端配置
│  ├─ router
│  │  └─ index.ts                      全站路由配置
│  ├─ services
│  │  └─ roster.ts                     云栖名册数据库读写服务
│  ├─ types                            TypeScript 类型定义
│  ├─ utils                            工具函数
│  └─ views                            页面视图
├─ supabase
│  └─ yunqi_roster.sql                 云栖名册建表、权限和迁移脚本
├─ .env.example                        环境变量模板
├─ package.json                        项目命令和依赖版本
├─ package-lock.json                   锁定依赖版本
├─ tsconfig.json                       TypeScript 总配置
└─ vite.config.ts                      Vite 构建配置
```

## 常见问题排查

### 页面提示没有配置 Supabase

检查 `.env.local` 是否存在，并确认已经填写：

```text
VITE_SUPABASE_URL=你的 Supabase 项目地址
VITE_SUPABASE_ANON_KEY=你的 Supabase 匿名密钥
```

改完后需要重启 `npm run dev`。

### 登记页不显示表单

云栖名册登记需要先通过当前题卷问心考核。请进入 `/join#exam` 完成考核，并确保分数不低于 `80` 分。

### 提交名帖时报数据库字段不存在

通常是 Supabase 还没有执行最新版 SQL。请重新完整执行：

```text
supabase/yunqi_roster.sql
```

本次版本新增了 `gender_key` 字段，如果没有执行脚本，登记和后台保存都会失败。

### 旧表性别没有迁移

请确认旧表 `yunqi_roster_entries` 中确实存在 `gender` 字段，并且值为 `male` 或 `female`。其它值会按规则迁移为 `unspecified`。

### 后台登录后提示没有权限

说明当前 Supabase 用户还没有写入 `yunqi_roster_admin_profiles`。请按“配置执事账号”步骤执行授权 SQL。

### 入册编号保存失败

入册编号必须是大于 `0` 的整数，并且不能包含数字 `4`。如果留空，审核通过时系统会自动生成。

### 图片保存失败

部分浏览器可能限制图片导出。可以先刷新页面再试，或者换用最新版 Chrome、Edge 浏览器。

### 构建失败

先确认依赖版本没有漂移：

```powershell
npm install
npm run build
```

如果仍失败，优先查看终端里第一条 TypeScript 报错，通常就是需要修复的具体文件和行号。

## 更新日志

2026-04-25 17:13 【初次发布】完成云栖派官网核心页面、问心考核、海报生成、江湖名帖、云栖名册登记审核和 Supabase 基础脚本。
2026-04-26 00:49 【新增】重构云栖名册为玉佩云海主题，新增性别字段、性别迁移脚本、登记页性别选择、后台性别编辑、公开玉佩光效和点击卷轴展开交互，同步生成 Figma 设计稿并更新项目文档。
2026-04-26 01:05 【修复】修复手机端云栖名册玉佩布局溢出、触摸放大闪烁和卷轴移动端单列问题，移动端卷轴内容恢复优先双列展示，极窄屏自动退回单列。
2026-04-26 01:12 【优化】优化云栖名册手机端渲染性能，关闭手机端高成本背景模糊、循环云层动画和卷轴模糊形变，减少滚动卡顿与闪屏。
