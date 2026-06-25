<p align="center">
  <img src="images/logo.svg" width="96" height="96" alt="IMX 雪花标志">
</p>

# Hugo Theme IMX

IMX 是一个面向中文博客的 Hugo 主题，通过 Hugo Module 安装。它包含文章列表、分类与标签、站内搜索、文章目录、代码复制和 Giscus 评论，适合技术笔记和长期写作。

![首页预览](images/preview-home.png)

## 主要功能

- 只使用 Hugo Module 安装和更新
- 桌面端与移动端导航
- 带弹性滑块的玻璃导航栏
- 浅色、深色和自动三种主题模式
- 首页、文章列表、分类、标签和关于页面
- 基于首页 JSON 输出的站内搜索
- 文章目录、阅读进度和代码复制
- 可选的 Giscus 评论
- SEO、Open Graph、Twitter Card 和 RSS
- 内置雪花 Logo、头像、文章封面、分享图和 favicon
- 不加载远程字体

分类页和标签页：

![分类页预览](images/preview-categories.png)

![标签页预览](images/preview-tags.png)

## 环境要求

- Hugo Extended `0.112.0` 或更高版本
- Go `1.20` 或更高版本

```bash
hugo version
go version
```

## 安装

如果站点还没有 `go.mod`，先在站点根目录执行：

```bash
hugo mod init github.com/your-name/your-site
```

在 `hugo.toml` 中导入主题：

```toml
[module]
  [[module.imports]]
    path = "github.com/c-x-x/hugo-theme-imx"
```

安装当前正式版并启动本地预览：

```bash
hugo mod get github.com/c-x-x/hugo-theme-imx@v1.0.0
hugo mod tidy
hugo server
```

更新主题：

```bash
hugo mod get github.com/c-x-x/hugo-theme-imx@latest
hugo mod tidy
```

主题不使用 `theme = "..."` 配置，也不需要复制到站点的 `themes` 目录。

## 最小配置

```toml
baseURL = "https://example.com/"
defaultContentLanguage = "zh-cn"
locale = "zh-CN"
title = "我的博客"

[params]
  description = "站点描述"
  subtitle = "首页副标题"
  author = "你的名字"
  mainSections = ["posts"]

[outputs]
  home = ["HTML", "RSS", "JSON"]

[module]
  [[module.imports]]
    path = "github.com/c-x-x/hugo-theme-imx"
```

搜索依赖首页的 JSON 输出，请保留 `outputs.home` 中的 `JSON`。

## 导航菜单

```toml
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
  url = "/categories/"
  weight = 30

[[menus.main]]
  name = "标签"
  url = "/tags/"
  weight = 40

[[menus.main]]
  name = "关于"
  pageRef = "/about"
  weight = 50
```

未配置菜单时，主题会使用上面这五项作为默认值。

## 站点参数

```toml
[params]
  description = "站点描述"
  subtitle = "首页副标题"
  author = "作者"
  keywords = ["Hugo", "博客"]
  logo = "/images/logo.svg"
  logoDark = "/images/logo-dark.svg"
  avatar = "/images/avatar.jpg"
  defaultImage = "/images/default-cover.jpg"
  defaultOGImage = "/images/default-og.jpg"
  favicon = "/images/favicon.svg"
  faviconDark = "/images/favicon-dark.svg"
  mainSections = ["posts"]
  footerText = "页脚文字"

  [params.social]
    github = "https://github.com/your-name"
    email = "hello@example.com"
```

`logo` 用于顶部导航，`avatar` 用于首页和关于页面。`logoDark` 和 `faviconDark` 可为深色模式提供单独素材；未配置时，自定义的 `logo` 和 `favicon` 会在深浅色中复用同一份文件。

未配置图片时，主题使用以下内置资源：

| 参数 | 默认值 |
| --- | --- |
| `logo` | `/images/imx/logo.svg` |
| `logoDark` | `/images/imx/logo-dark.svg` |
| `avatar` | `/images/imx/default-avatar.jpg` |
| `defaultImage` | `/images/imx/default-cover.jpg` |
| `defaultOGImage` | `/images/imx/default-og.jpg` |
| `favicon` | `/images/imx/favicon.svg` |
| `faviconDark` | `/images/imx/favicon-dark.svg` |

文章没有设置 `image` 时，列表卡片使用 `defaultImage`。页面没有独立图片时，分享元数据使用 `defaultOGImage`。

## 主题模式

主题按钮按以下顺序切换：

```text
手动浅色 -> 手动深色 -> 自动
```

自动模式按东八区时间切换：

- `08:00` 至 `17:59` 使用浅色
- `18:00` 至次日 `07:59` 使用深色

选择结果保存在浏览器本地，并在页面内容绘制前应用。

## Giscus 评论

先在 [giscus.app](https://giscus.app/zh-CN) 为评论仓库生成配置，然后填写：

```toml
[params.giscus]
  enabled = true
  repo = "your-name/comments"
  repoId = "R_..."
  category = "Announcements"
  categoryId = "DIC_..."
  mapping = "pathname"
  lang = "zh-CN"
  lightTheme = "light"
  darkTheme = "dark"
```

评论框在首次加载时读取站点当前主题，之后会跟随主题按钮实时切换。`lightTheme` 和 `darkTheme` 也可以填写 Giscus 支持的其他主题名称或自定义主题 URL。

## 文章 Front Matter

```toml
+++
title = "文章标题"
date = 2026-06-22T09:00:00+08:00
description = "文章摘要"
image = "/images/posts/example.jpg"
categories = ["Hugo"]
tags = ["主题", "教程"]
toc = true
+++
```

`image` 可以省略。将 `toc` 设置为 `false` 可关闭当前文章的目录。

## 本地开发

仓库中的示例站同样通过 Hugo Module 加载主题：

```bash
hugo server --source exampleSite
```

构建检查：

```bash
hugo --source exampleSite --minify
```

`exampleSite/go.mod` 使用本地 `replace` 指向仓库根目录，仅用于开发。

## 目录结构

```text
hugo-theme-imx/
├── archetypes/
├── assets/
├── exampleSite/
├── images/
├── layouts/
├── static/
├── go.mod
├── theme.toml
└── README.md
```

## 参与维护

提交 Issue 或 Pull Request 前，请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。安全问题的报告方式见 [SECURITY.md](SECURITY.md)。

## 许可证

代码和仓库内置素材按 [MIT License](LICENSE) 分发。第三方内容的授权范围见 [CREDITS.md](CREDITS.md)。
