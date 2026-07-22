+++
title = "从空目录到上线：hugo-theme-imx 全量配置手册"
date = 2026-07-15T11:00:00+08:00
description = "完整梳理 IMX 的安装、站点参数、图片、菜单、搜索、文章 Front Matter、样式覆盖、GitHub Pages 部署与日常更新。"
image = "/posts/imx-configuration-deployment-guide/images/cover.webp"
categories = ["主题指南"]
tags = ["Hugo", "IMX Theme", "部署", "配置"]
toc = true
+++

这篇手册按一个真实站点的顺序来写：先把环境和模块装好，再整理 `hugo.toml`、内容与图片，最后部署。文中的配置以 IMX 当前模板实际读取的参数为准，不把 Hugo 的数百项通用设置全部塞进来凑数。

![IMX 从配置到部署的流程示意](images/cover.webp)

如果只想先看效果，下载主题 Release 源码后，在主题目录运行：

```bash
hugo server --source exampleSite
```

但正式建站不要复制 `exampleSite/go.mod`。其中的 `replace github.com/c-x-x/hugo-theme-imx => ../` 只为主题仓库本地开发服务，离开这个目录结构就会失效。

## 1. 环境与目录

IMX 通过 Hugo Module 安装，最低要求是 Hugo Extended `0.112.0` 和 Go `1.20`。先确认本机工具：

```bash
hugo version
go version
git --version
```

`hugo version` 的输出应包含 `extended`。普通建站不需要 Node.js，也不需要执行主题仓库里的 `npm install`；Node.js 和 Playwright 只是主题维护者跑回归测试时使用。

新站点可以这样开始：

```bash
hugo new site my-blog
cd my-blog
git init
hugo mod init github.com/your-name/my-blog
```

一个够用的目录大致如下：

```text
my-blog/
├── archetypes/
├── assets/                 # 覆盖主题 CSS 等资源时才需要
├── content/
│   ├── _index.md
│   ├── about.md
│   ├── categories/_index.md
│   ├── posts/_index.md
│   └── tags/_index.md
├── static/
│   └── images/
├── go.mod
├── go.sum
└── hugo.toml
```

`public/` 和 `resources/_gen/` 都是构建产物，不应当手工维护。建议加入 `.gitignore`：

```gitignore
/public/
/resources/_gen/
/.hugo_build.lock
.DS_Store
```

## 2. 用 Hugo Module 安装并固定版本

在 `hugo.toml` 中加入模块导入：

```toml
[module]
  [module.hugoVersion]
    extended = true
    min = "0.112.0"

  [[module.imports]]
    path = "github.com/c-x-x/hugo-theme-imx"
```

然后安装主题：

```bash
hugo mod get github.com/c-x-x/hugo-theme-imx@v1.4.0
hugo mod tidy
```

版本会写入 `go.mod` 与 `go.sum`。正式站点最好固定到明确版本，升级前先在本地构建；想跟随最新正式版时再执行：

```bash
hugo mod get github.com/c-x-x/hugo-theme-imx@latest
hugo mod tidy
```

这个主题不使用 `theme = "hugo-theme-imx"`，也不需要放进 `themes/`。如果两种安装方式同时存在，排错时反而难以判断 Hugo 到底加载了哪一份模板。

## 3. 一份可以直接改的完整配置

下面这份 `hugo.toml` 覆盖了 IMX 目前公开使用的全部主题参数。先复制，再逐段替换站点信息和图片。

```toml
baseURL = "https://example.com/"
defaultContentLanguage = "zh-cn"
locale = "zh-CN"
title = "我的博客"
enableRobotsTXT = true
timeZone = "Asia/Shanghai"

[params]
  description = "关于编程、产品与长期写作的个人站点。"
  subtitle = "写技术，也记录思路如何成形"
  author = "你的名字"
  keywords = ["Hugo", "技术博客", "开源"]

  logo = "/images/brand/logo.svg"
  logoLight = "/images/brand/logo-light.svg"
  logoDark = "/images/brand/logo-dark.svg"
  avatar = "/images/brand/avatar.jpg"
  defaultImage = "/images/brand/default-cover.jpg"
  defaultOGImage = "/images/brand/default-og.jpg"
  favicon = "/images/brand/favicon.svg"
  faviconLight = "/images/brand/favicon-light.svg"
  faviconDark = "/images/brand/favicon-dark.svg"

  mainSections = ["posts"]
  footerText = "© 2026 你的名字 · 保留所有权利"

  [params.social]
    github = "https://github.com/your-name"
    email = "hello@example.com"

  [params.giscus]
    enabled = false
    demo = false
    repo = ""
    repoId = ""
    category = "Announcements"
    categoryId = ""
    mapping = "pathname"
    lang = "zh-CN"
    lightTheme = "light"
    darkTheme = "dark"

[taxonomies]
  category = "categories"
  tag = "tags"

[[menus.main]]
  name = "首页"
  pageRef = "/"
  weight = 10

[[menus.main]]
  name = "文章"
  pageRef = "/posts"
  weight = 20

[[menus.main]]
  name = "分类"
  pageRef = "/categories"
  weight = 30

[[menus.main]]
  name = "标签"
  pageRef = "/tags"
  weight = 40

[[menus.main]]
  name = "关于"
  pageRef = "/about"
  weight = 50

[markup]
  [markup.highlight]
    anchorLineNos = false
    codeFences = true
    guessSyntax = false
    lineNos = false
    noClasses = false
    style = "dracula"
    tabWidth = 4

  [markup.tableOfContents]
    startLevel = 2
    endLevel = 5
    ordered = false

  [markup.goldmark.renderer]
    unsafe = false

[outputs]
  home = ["HTML", "RSS", "JSON"]

[outputFormats.JSON]
  mediaType = "application/json"
  baseName = "index"
  isPlainText = true

[caches]
  [caches.images]
    dir = ":cacheDir/images"

[module]
  [module.hugoVersion]
    extended = true
    min = "0.112.0"

  [[module.imports]]
    path = "github.com/c-x-x/hugo-theme-imx"
```

如果不需要某一项，优先删除可选项，而不是留一个错误路径。例如只准备了一枚通用 Logo，就保留 `logo`，删掉 `logoLight` 与 `logoDark`。

## 4. 基础站点信息

`baseURL` 是最容易被忽略、也最影响上线结果的一项。

- 独立域名：`https://blog.example.com/`
- GitHub 用户站点：`https://your-name.github.io/`
- GitHub 项目站点：`https://your-name.github.io/repository-name/`

末尾的 `/` 建议保留。它影响 canonical、Open Graph 图片、RSS 和 Giscus 自定义主题 CSS 的绝对地址。GitHub Pages 工作流也可以在构建时用 `--baseURL` 覆盖它，后文会给出写法。

`defaultContentLanguage` 决定站点默认语言和页面 `lang`；`locale` 影响日期、语言区域等本地化行为。中文站使用 `zh-cn` 与 `zh-CN` 即可。`timeZone` 会影响无明确时区日期的解析，以及构建时的日期判断；文章日期仍建议写完整的 `+08:00`。

`enableRobotsTXT = true` 让 Hugo 生成 `robots.txt`。它不等于已经做好 SEO，真正对搜索和分享更重要的是准确的 `description`、`keywords`、页面摘要和 `baseURL`。

## 5. 站点参数逐项说明

| 参数 | 页面位置 | 没有配置时 |
| --- | --- | --- |
| `description` | 默认 meta description | 使用“一个 Hugo 博客” |
| `subtitle` | 首页首屏、About 资料区 | 留空 |
| `author` | `<meta name="author">` | 不输出作者 meta |
| `keywords` | 默认 meta keywords | 不输出关键词 meta |
| `logo` | 顶部导航通用 Logo | 内置浅色雪花 Logo |
| `logoLight` | 浅色模式导航 Logo | 回退到 `logo` |
| `logoDark` | 深色模式导航 Logo | 自定义 `logo`；完全未配置时用内置深色 Logo |
| `avatar` | 首页头像、About 头像、Apple Touch Icon | 内置头像 |
| `defaultImage` | 没有 `image` 的文章卡片 | 内置 1600×900 封面 |
| `defaultOGImage` | 页面没有 `image` 时的社交分享图 | 内置 1200×630 分享图 |
| `favicon` | 通用站点图标 | 内置浅色 favicon |
| `faviconLight` | 浅色模式 favicon | 回退到 `favicon` |
| `faviconDark` | 深色模式 favicon | 自定义 `favicon`；完全未配置时用内置深色 favicon |
| `mainSections` | 首页文章与搜索索引的内容类型 | `posts` |
| `footerText` | 页脚第一行，支持 Markdown | 当前年份加站点标题 |

`description` 是站点兜底值。某篇文章写了 Front Matter `description` 后，文章自己的摘要优先。`defaultOGImage` 也遵循同样规则：文章 `image` 优先，没有才使用全站分享图。

### 图片放在哪里

上面这些站点级图片最省事的放法是 `static/images/brand/`。构建后它们会出现在 `/images/brand/`，配置里就写这个公开路径。

建议尺寸：

| 素材 | 建议 |
| --- | --- |
| Logo | SVG，画布接近正方形，图形四周留白 |
| Avatar | 640×640 或更大，正方形 JPG/WebP |
| Default cover | 1600×900，16:9 |
| Default OG image | 1200×630，接近 1.91:1 |
| Favicon | 简洁 SVG；细线不要太细 |

IMX 会正确处理主题内置图片在子目录站点中的 URL，也会给内置资源加版本参数。自定义图片不会自动加版本号；换图后 CDN 仍显示旧图时，可以改文件名，例如从 `avatar.jpg` 改成 `avatar-2026.jpg`。

文章正文图片若希望 Hugo 自动生成 WebP 和多档尺寸，使用页面包更合适：

```text
content/posts/my-post/
├── index.md
└── diagram.png
```

正文写 `![架构图](diagram.png)`，主题的图片渲染钩子会处理本地 JPG/PNG 页面资源。放在 `static/` 下的图片则按原文件直接发布，不会生成响应式变体。

## 6. 首页内容范围与文章排序

默认的 `mainSections = ["posts"]` 表示首页和搜索索引只收录 `content/posts/` 下的普通页面。想把 `notes` 也放到首页：

```toml
[params]
  mainSections = ["posts", "notes"]
```

首页按内容集合的日期顺序显示：前三篇进入“精选文章”，后六篇进入“最新文章”。当前主题没有单独的 `featured = true` 开关；要控制首页位置，就调整文章日期，或在自己的站点覆盖 `layouts/index.html` 实现新的筛选规则。

文章列表使用 Hugo 分页。默认页大小由 Hugo 决定；需要修改时请按自己使用的 Hugo 版本设置全站分页参数，并在升级 Hugo 后留意弃用提示。

## 7. 菜单、分类与标签

完全不写 `menus.main` 时，IMX 会生成“首页、文章、分类、标签、关于”五个默认入口。只要写了任意一项，默认菜单就不再补齐，所以自定义时最好把需要的入口全部列全。

内部内容页优先使用 `pageRef`：Hugo 能识别当前菜单状态，未来调整 permalink 时也更稳。纯 URL 或外部链接使用 `url`：

```toml
[[menus.main]]
  name = "项目"
  url = "https://github.com/your-name"
  weight = 60
```

`weight` 越小越靠前。菜单名称可以改，路径却要和实际内容对应。至少创建：

```toml
+++
title = "文章"
+++
```

并分别保存为 `content/posts/_index.md`、`content/categories/_index.md` 和 `content/tags/_index.md`。分类和标签的复数路径由 `[taxonomies]` 决定；若改成别的名称，菜单 URL 与文章 Front Matter 也要一起改。

## 8. 搜索为什么离不开 JSON 输出

IMX 的搜索不依赖第三方服务。Hugo 在首页旁生成 `index.json`，浏览器加载后搜索标题与正文前 500 个字符，并最多显示 10 条结果。

以下配置不能删：

```toml
[outputs]
  home = ["HTML", "RSS", "JSON"]
```

`[outputFormats.JSON]` 可以保留示例值，确保文件名为 `index.json`。如果搜索框一直没有结果，依次检查：

```bash
hugo --gc --minify
test -f public/index.json
```

再打开浏览器网络面板，看 `index.json` 是 200、404，还是被错误重定向到 HTML。项目站点的 `baseURL` 少了仓库子路径，是最常见的 404 原因。

搜索索引只收录 `mainSections` 指定的内容类型。About 页、分类聚合页和草稿不会混入搜索结果。

## 9. 代码高亮、目录与 Markdown

IMX 使用 Hugo 的 Chroma 输出带 class 的高亮代码，因此 `noClasses = false` 要保留。`style = "dracula"` 仍可设置，但主题还会用自己的 CSS 变量统一代码块外观、语言标签和复制按钮。

目录默认收集二级到五级标题：

```toml
[markup.tableOfContents]
  startLevel = 2
  endLevel = 5
  ordered = false
```

文章中至少要有一个符合层级的标题，侧栏目录才出现。某篇长文不想显示目录，在 Front Matter 写：

```toml
toc = false
```

`unsafe = false` 会过滤 Markdown 中的原始 HTML，安全性更好。确实要在正文写自定义 HTML 时，可以改为 `true`，但应先确认内容来源可信；多数图片、表格、链接和代码块不需要开放它。

## 10. 一篇文章的完整 Front Matter

```toml
+++
title = "文章标题"
date = 2026-07-15T09:30:00+08:00
lastmod = 2026-07-16T18:00:00+08:00
draft = false
description = "一两句话说明本文解决什么问题。"
image = "/images/posts/article-cover.jpg"
categories = ["Hugo"]
tags = ["主题", "部署"]
toc = true
+++
```

这些字段的实际效果：

- `title`：页面标题、列表标题和社交标题。
- `date`：发布日期，也是首页排序依据。
- `lastmod`：晚于 `date` 时，文章头部显示更新日期。
- `draft`：`true` 时，普通构建不发布；本地用 `hugo server -D` 查看。
- `description`：列表摘要、SEO 与社交描述，优先于自动截断正文。
- `image`：文章卡片封面，同时用作 Open Graph 与 Twitter 大图。
- `categories`：文章页全部显示，卡片通常只显示第一个。
- `tags`：文章页全部显示，首页和列表按布局显示前两到三个。
- `toc`：只有明确写 `false` 才关闭目录。

文件名最终会参与 URL。中文标题可以保留，文件名建议用稳定的小写英文短语；已经发布的文章不要只为“更好看”而改文件名。确实要换路径时，可在 Front Matter 固定：

```toml
url = "/posts/stable-address/"
```

## 11. About 页与访客信息

About 页需要指定专用布局：

```toml
+++
title = "关于"
layout = "about"
description = "关于我和这个站点"
+++
```

该布局会显示头像、站点标题、副标题和正文，还会请求第三方 IP 地理服务来展示访客 IP 与地区。当前主题没有关闭参数；请求按顺序尝试 `ipwho.is`、`ipapi.co`、`freeipapi.com` 与 `api.ip.sb`，结果在当前浏览器会话缓存 10 分钟。

这不是一个可以忽略的装饰细节。部署到面向公众的站点前，应在隐私说明中披露第三方请求。如果你的政策不允许该行为，可以在站点中覆盖 `layouts/_default/about.html`，移除带 `about-visitor-info` 的区域；主题脚本检测不到对应元素后就不会发起请求。

## 12. 深浅色模式

主题按钮依次循环：手动浅色、手动深色、自动。自动模式按东八区时间判断，08:00–17:59 为浅色，其余时间为深色，选择保存在浏览器 `localStorage`。

目前没有配置项可以修改时区或切换时间。站点的 `timeZone` 也不会改变这个规则，因为判断逻辑在浏览器脚本里固定使用 UTC+8。若要改变行为，需要在站点的 `assets/js/` 或布局层覆盖对应主题资源，并承担后续升级合并成本。

## 13. 评论系统

Giscus 默认关闭。它涉及 GitHub Discussions、App 授权、仓库与分类 ID、URL 映射和深浅色主题，不适合在总配置里压缩成几行。请按 [《把评论留在 GitHub：IMX 主题接入 Giscus》]({{% ref "/posts/imx-giscus-comments" %}}) 完成配置与排错。

在准备好仓库前保持 `enabled = false`，不要用空的 `repoId` 和 `categoryId` 强行开启。

主题仓库的 `exampleSite` 为了展示评论区布局，设置了 `demo = true`。它只渲染带“模拟展示”标识的静态提示，不会加载 Giscus，也不能发布或保存评论。复制配置到正式站点时应使用 `demo = false`；准备好有效的仓库与分类 ID 后，再把 `enabled` 改为 `true`。真实 Giscus 的优先级高于模拟模式。

## 14. 页脚社交链接

`[params.social]` 当前只识别两个键：

```toml
[params.social]
  github = "https://github.com/your-name"
  email = "hello@example.com"
```

它们只在页脚显示图标，不会自动写入 About 正文。`email` 不要加 `mailto:`，模板会自动补。`footerText` 支持 Markdown，可以放备案号链接，但不要写复杂块级 HTML。

## 15. 在不改主题源码的前提下定制

Hugo Module 会把主题资源合并进站点的虚拟文件系统；站点本地的同路径文件优先。因此定制时把文件放在自己的仓库，不要直接改模块缓存。

### 改颜色与设计变量

IMX 的主色、背景、文字、边框、阴影和代码块配色集中在 `assets/css/tokens.css`。需要整体换色时，可以从主题复制该文件到站点同路径：

```text
assets/css/tokens.css
```

重点修改 `:root` 与 `[data-theme="dark"]` 中的变量。这样做会完全覆盖主题的同名文件；升级版本后如果主题增加了新变量，要手动把变化合并进来。

只追加少量 CSS 时，当前模板没有 `customCSS` 参数。较稳妥的做法是覆盖 `layouts/_default/baseof.html` 并增加自己的资源入口，但这会复制一份较大的基础模板。开始前先问自己：这几行样式是否值得承担模板升级成本。

### 改首页或 About 布局

把主题中的相对路径复制到站点，例如：

```text
layouts/index.html
layouts/_default/about.html
```

Hugo 会优先用站点版本。只复制确实需要修改的模板，并在升级主题后用 Git diff 对照上游变更。不要整包复制 `layouts/`，否则模块升级看似成功，页面却永远停在旧模板。

### 替换 Logo 与图片

这是成本最低的定制。把素材放进 `static/images/`，修改 `hugo.toml` 路径即可，不需要覆盖任何模板。通常先把品牌图片换好，再决定是否真的需要改 CSS。

## 16. 本地预览与发布前构建

写作时：

```bash
hugo server -D --disableFastRender
```

`-D` 显示草稿，`--disableFastRender` 让大范围配置修改后页面更可靠地重建。发布前不要只看开发服务器，至少跑一次干净构建：

```bash
hugo --gc --minify --cleanDestinationDir
```

再检查关键文件：

```bash
test -f public/index.html
test -f public/index.json
test -f public/posts/index.html
test -f public/categories/index.html
test -f public/tags/index.html
test -f public/about/index.html
test -f public/404.html
```

本地预览重点看：首页前九篇文章、手机导航、搜索、长文章目录、代码复制、图片 404、浅色与深色，以及控制台报错。

## 17. 用 GitHub Pages 自动部署

这是最适合 GitHub 托管源码站点的做法。仓库进入 **Settings → Pages**，将 **Source** 设为 **GitHub Actions**，然后创建 `.github/workflows/hugo.yaml`：

```yaml
name: Deploy Hugo site to Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v7
        with:
          fetch-depth: 0

      - name: Setup Go
        uses: actions/setup-go@v6
        with:
          go-version: "1.20"
          cache: false

      - name: Setup Hugo
        uses: peaceiris/actions-hugo@v3
        with:
          hugo-version: "0.164.0"
          extended: true

      - name: Setup Pages
        id: pages
        uses: actions/configure-pages@v6

      - name: Build
        run: >-
          hugo
          --gc
          --minify
          --baseURL "${{ steps.pages.outputs.base_url }}/"
          --cacheDir "${{ runner.temp }}/hugo_cache"

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v5
        with:
          path: ./public

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v5
```

这里有三个不能随意删的点：

1. 必须安装 Go，因为 IMX 是 Hugo Module。
2. 必须使用 Hugo Extended，且版本不低于主题要求。
3. 构建时读取 Pages 给出的 `base_url`，项目站点的仓库子路径才能正确进入所有资源链接。

推送到 `main` 后，到仓库 **Actions** 查看构建。第一次失败时先展开 Build 步骤，不要反复改 DNS。只有构建和上传完成，域名设置才有意义。

Hugo 官方维护了一份更完整、会随 Actions 版本更新的 [GitHub Pages 部署说明](https://gohugo.io/host-and-deploy/host-on-github-pages/)。工作流组件出现新大版本时，以官方页面为准。

## 18. Vercel、Netlify 与其他静态托管

无论平台界面怎么命名，IMX 的构建需要四件事：

| 设置 | 值 |
| --- | --- |
| 项目根目录 | Hugo 站点根目录，即 `hugo.toml` 所在目录 |
| 构建命令 | `hugo --gc --minify` |
| 输出目录 | `public` |
| 构建环境 | Hugo Extended + Go 1.20 或更高 |

如果站点位于 monorepo 子目录，平台的 Root Directory 必须指向该子目录；不要把构建命令改成 `hugo --source subdir` 后又让输出目录仍相对仓库根目录，两套相对路径很容易互相打架。

Vercel 当前的官方 Hugo 流程会用 `vercel.json` 指定 `public`，再通过构建脚本安装固定版本的 Hugo 与 Go。具体脚本应直接参考 [Hugo 官方 Vercel 部署说明](https://gohugo.io/host-and-deploy/host-on-vercel/)，不要假设平台预装的 Hugo 永远满足版本要求。

Netlify 等平台如果允许通过环境变量固定工具版本，至少明确设置 Hugo 与 Go 版本。部署日志中先打印：

```bash
hugo version
go version
```

只要构建环境一致，IMX 生成的是普通静态文件，不绑定某一家托管服务。Hugo 官方的 [Host and deploy](https://gohugo.io/host-and-deploy/) 页面列出了 Cloudflare、GitLab Pages、Netlify、Render 等平台的最新步骤。

## 19. 独立域名、HTTPS 与缓存

绑定独立域名后，把 `baseURL` 改成最终的 HTTPS 地址，并做一次完整构建。平台通常会自动签发证书；证书生效前不要同时保留多套互相跳转的域名规则。

上线后检查页面源码中的：

- `<link rel="canonical">`
- `og:url`
- `og:image`
- RSS 地址
- favicon 与文章封面地址

它们都应指向最终域名。若 HTML 正常而图片仍是旧版，多半是 CDN 或浏览器缓存；自定义静态图片换文件名比反复刷新更可靠。

## 20. 更新、回滚与排错顺序

更新主题前先提交当前站点，然后执行：

```bash
hugo mod get github.com/c-x-x/hugo-theme-imx@latest
hugo mod tidy
hugo --gc --minify
git diff -- go.mod go.sum
```

发现问题时，可以回到已知可用版本：

```bash
hugo mod get github.com/c-x-x/hugo-theme-imx@v1.4.0
hugo mod tidy
```

排错建议保持固定顺序：

1. `hugo version` 与 `go version` 是否满足要求。
2. `hugo mod graph` 中是否只有预期的 IMX 版本。
3. `hugo config` 合并后的参数是否正确。
4. 本地干净构建是否成功。
5. `public/` 中目标文件是否存在。
6. 浏览器网络面板里是 404、跨域还是缓存。
7. 最后才看部署平台和 DNS。

如果使用了本地模板或 CSS 覆盖，排错时把它们列为第一嫌疑。模块已经更新、页面却没有上游新效果，通常不是 Hugo 缓存，而是站点同路径文件仍在覆盖主题。

## 发布清单

- `baseURL` 与最终域名或 Pages 子路径一致。
- `go.mod`、`go.sum` 已提交，没有 exampleSite 的本地 `replace`。
- Logo、头像、默认封面、OG 图与 favicon 均可访问。
- 首页 JSON 输出存在，搜索能返回中文文章。
- 文章摘要、分类、标签、目录和代码块显示正常。
- About 页的第三方访客信息请求已在隐私说明中披露，或已通过模板覆盖移除。
- Giscus 未配置完成前保持 `enabled = false`，正式站点同时保持 `demo = false`。
- GitHub Pages 或托管平台同时提供 Hugo Extended 与 Go。
- 手机、桌面、浅色、深色至少各检查一次。
- `public/` 未提交到源码仓库。

完成这些检查后，站点就不再是“本地能打开”的 Demo，而是一套可以稳定更新、能回滚、出了问题也知道从哪里查的 Hugo 博客。
