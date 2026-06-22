# Hugo Theme IMX

IMX Theme 是一个面向中文技术博客的现代 Hugo 主题。它使用 Hugo Module 分发，提供液态玻璃导航、响应式布局、全文搜索、文章目录、代码复制、Giscus 评论，以及手动浅色、手动深色、自动三种主题模式。

![IMX Theme 首页预览](images/preview-home.png)

## 功能

- Hugo Module 安装与更新
- 桌面端、平板和移动端响应式布局
- 液态玻璃导航，以及随鼠标速度拉伸、回弹的弹性指示器
- 手动浅色、手动深色、自动三态主题切换
- 自动模式按东八区时间在 08:00 使用浅色、18:00 使用深色
- 首页精选文章和最新文章
- 分类、标签和全文搜索
- 文章目录、阅读进度、代码高亮和一键复制
- 可选 Giscus 评论，并同步深浅色主题
- 默认头像、文章封面、OG 分享图和 favicon
- SEO、Open Graph、Twitter Card 和 RSS
- 无外部字体依赖

## 环境要求

- Hugo Extended `0.112.0` 或更高版本
- Go `1.20` 或更高版本

可通过以下命令检查环境：

```bash
hugo version
go version
```

## 使用 Hugo Module 安装

本主题只提供 Hugo Module 使用方式，不需要设置 `theme`，也不需要把源码复制到站点的 `themes` 目录。

如果站点还没有 `go.mod`：

```bash
hugo mod init github.com/your-name/your-site
```

在站点的 `hugo.toml` 中导入主题：

```toml
[module]
  [[module.imports]]
    path = "github.com/c-x-x/hugo-theme-imx"
```

下载依赖并启动：

```bash
hugo mod get
hugo server
```

更新主题：

```bash
hugo mod get -u github.com/c-x-x/hugo-theme-imx
hugo mod tidy
```

## 最小配置

```toml
baseURL = "https://example.com/"
defaultContentLanguage = "zh-cn"
locale = "zh-CN"
title = "我的博客"

[params]
  description = "站点描述"
  subtitle = "记录技术与思考"
  author = "你的名字"
  keywords = ["Hugo", "技术博客"]
  mainSections = ["posts"]

[outputs]
  home = ["HTML", "RSS", "JSON"]

[module]
  [[module.imports]]
    path = "github.com/c-x-x/hugo-theme-imx"
```

搜索功能依赖首页的 JSON 输出，因此请保留 `outputs.home` 中的 `JSON`。

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

未配置 `menus.main` 时，主题会显示同名的五个中文默认菜单。

## 站点参数

```toml
[params]
  description = "站点描述"
  subtitle = "首页副标题"
  author = "作者"
  keywords = ["关键词一", "关键词二"]
  avatar = "/images/avatar.jpg"
  defaultImage = "/images/default-cover.jpg"
  defaultOGImage = "/images/default-og.jpg"
  favicon = "/images/favicon.svg"
  mainSections = ["posts"]
  footerText = "自定义页脚文字"

  [params.social]
    github = "https://github.com/your-name"
    email = "hello@example.com"
```

以下参数未配置时会使用主题内置资源：

| 参数 | 内置资源 |
| --- | --- |
| `avatar` | `/images/imx/default-avatar.jpg` |
| `defaultImage` | `/images/imx/default-cover.jpg` |
| `defaultOGImage` | `/images/imx/default-og.jpg` |
| `favicon` | `/images/imx/favicon.svg` |

文章没有设置 `image` 时，列表卡片会自动使用 `defaultImage`。页面没有独立图片时，社交分享元数据会使用 `defaultOGImage`。

## 主题模式

主题按钮按照下面的顺序循环：

```text
手动浅色 -> 手动深色 -> 自动 -> 手动浅色
```

自动模式固定使用东八区时间：

- `08:00` 至 `17:59`：浅色
- `18:00` 至次日 `07:59`：深色

模式保存在浏览器 `localStorage` 中，并在页面渲染前应用，减少首屏闪烁。

## Giscus 评论

Giscus 默认关闭。启用前请先在 [giscus.app](https://giscus.app/zh-CN) 获取配置：

```toml
[params.giscus]
  enabled = true
  repo = "your-name/comments"
  repoId = "R_..."
  category = "Announcements"
  categoryId = "DIC_..."
  mapping = "pathname"
  lang = "zh-CN"
```

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

`image` 可以省略，主题会使用默认文章封面。将 `toc` 设置为 `false` 可以关闭当前文章的目录。

## 本地开发

仓库自带一个完全通过 Hugo Module 加载主题的中文示例站：

```bash
hugo server --source exampleSite
```

构建检查：

```bash
hugo --source exampleSite --minify
```

`exampleSite/go.mod` 使用本地 `replace` 指向仓库根目录，上传仓库后不会影响其他站点通过远程模块安装。

## 目录结构

```text
hugo-theme-imx/
├── archetypes/
├── assets/
├── exampleSite/
├── layouts/
├── static/
├── go.mod
├── theme.toml
└── README.md
```

## 贡献

提交问题或改动前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。安全问题请参考 [SECURITY.md](SECURITY.md)。

## 许可证

本项目使用 [MIT License](LICENSE)。
