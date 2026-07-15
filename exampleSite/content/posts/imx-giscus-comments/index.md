+++
title = "把评论留在 GitHub：IMX 主题接入 Giscus"
date = 2026-07-15T10:00:00+08:00
description = "从启用 Discussions、安装 Giscus App，到填写 IMX 主题参数和检查深浅色联动，一次把评论系统配妥。"
image = "/posts/imx-giscus-comments/images/cover.webp"
categories = ["主题指南"]
tags = ["Giscus", "GitHub Discussions", "Hugo"]
toc = true
+++

Giscus 不替你另建一套评论数据库。每篇文章的评论最终都是 GitHub Discussions 里的一个讨论，访客用 GitHub 账号登录后发言，站长仍在熟悉的仓库里管理内容。对静态博客来说，这套办法省心，也方便迁移。

![IMX 主题与 Giscus 评论连接示意](images/cover.webp)

IMX 已经把 Giscus 的加载、懒加载和深浅色同步写进主题。真正需要做的事只有两部分：先把 GitHub 仓库准备好，再把 giscus.app 生成的参数原样填进 `hugo.toml`。

## 开始前先选好评论仓库

评论可以放在博客源码仓库，也可以单独建一个仓库。个人站点我更倾向于单独建，例如 `your-name/blog-comments`：源码仓库的 Issues、Pull Requests 和 Discussions 不会混在一起，将来更换静态站点生成器，也不影响旧评论。

无论选哪一种，仓库都要满足三个条件：

1. 仓库是公开仓库。Giscus 需要让访客读取讨论内容。
2. 仓库已经启用 GitHub Discussions。
3. Giscus GitHub App 已获准访问这个仓库。

若仓库属于组织，安装 GitHub App 可能需要组织所有者批准。不要等到配置页一直报错才回头查权限。

## 第一步：开启 GitHub Discussions

进入评论仓库，依次打开 **Settings → General → Features**，勾选 **Discussions**。仓库顶部随后会出现 **Discussions** 标签。

第一次进入 Discussions 时，GitHub 会让你选择或创建讨论分类。IMX 示例配置使用 `Announcements`，但这不是硬性要求。你可以新建一个名为“博客评论”的分类，只要稍后在 giscus.app 里选择同一个分类即可。

建议把分类的格式设为 **Open-ended discussion**。如果使用公告类分类，还要确认普通访客能够在对应讨论下回复。

## 第二步：安装 Giscus App

打开 [Giscus App 安装页](https://github.com/apps/giscus)，点击 **Install**，选择仓库所属的个人账号或组织。

权限范围建议选 **Only select repositories**，只勾选刚才准备的评论仓库。这样以后新建其他仓库时，Giscus 不会自动得到访问权限。

安装完成后，如果换过仓库、转移过仓库所有权，或者从个人账号迁入组织，要回到 GitHub 的 App 安装设置里重新确认访问范围。

## 第三步：让 giscus.app 生成准确参数

打开 [giscus.app 中文配置页](https://giscus.app/zh-CN)，在“仓库”一栏输入完整仓库名：

```text
your-name/blog-comments
```

页面会连续检查仓库是否公开、Discussions 是否启用、Giscus App 是否已经安装。三项全部通过后，再往下配置。

### 页面与 Discussion 的映射

IMX 默认使用 `pathname`，也就是按页面路径查找讨论。比如：

```text
/posts/hello-hugo/
```

它比按标题映射稳妥，因为文章改标题不会丢失原评论。代价也很明确：一旦修改文章 URL 或 slug，Giscus 会把它当成新页面。上线后要改路径时，先在 Discussions 中处理旧讨论标题或映射关系。

常见映射值还有：

| 值 | 匹配依据 | 适用情况 |
| --- | --- | --- |
| `pathname` | 页面路径 | 大多数博客，推荐 |
| `url` | 完整 URL | 域名和协议长期不变的站点 |
| `title` | 页面标题 | 标题永不修改的内容库 |
| `og:title` | Open Graph 标题 | 已有固定社交标题规则的站点 |

如果站点先部署在 `github.io`，以后还准备绑定独立域名，不要选 `url`。`pathname` 不受域名变化影响。

### Discussion 分类

选择刚才准备的分类，并启用“只搜索该分类中的 Discussions”。这样查询范围更小，也不容易误匹配仓库里的其他讨论。

页面底部会生成一段 `<script>`。不用把整段脚本复制到 Hugo 模板里；IMX 已经内置了脚本。我们只需要从中取出下列值：

```html
data-repo="your-name/blog-comments"
data-repo-id="R_kgDO..."
data-category="Announcements"
data-category-id="DIC_kwDO..."
```

`repoId` 和 `categoryId` 不是仓库名与分类名的另一种写法，也不能凭 URL 猜。务必复制配置页生成的原值。

## 第四步：填写 IMX 配置

打开站点根目录的 `hugo.toml`，加入：

```toml
[params.giscus]
  enabled = true
  repo = "your-name/blog-comments"
  repoId = "R_kgDOxxxxxxxx"
  category = "Announcements"
  categoryId = "DIC_kwDOxxxxxxxx"
  mapping = "pathname"
  lang = "zh-CN"
  lightTheme = "light"
  darkTheme = "dark"
```

逐项对照如下：

| IMX 参数 | 来自哪里 | 说明 |
| --- | --- | --- |
| `enabled` | 手动填写 | `true` 才会加载评论区 |
| `repo` | `data-repo` | 必须是 `owner/repository` |
| `repoId` | `data-repo-id` | 仓库的 GraphQL ID |
| `category` | `data-category` | Discussion 分类名称，区分大小写 |
| `categoryId` | `data-category-id` | 分类的 GraphQL ID |
| `mapping` | `data-mapping` | 推荐 `pathname` |
| `lang` | `data-lang` | 简体中文使用 `zh-CN` |
| `lightTheme` | 主题设置 | 浅色评论样式 |
| `darkTheme` | 主题设置 | 深色评论样式 |

这里有一处 IMX 自己的约定：`lightTheme` 留空或写成 `light`，会使用主题内置的 IMX 浅色评论 CSS；`darkTheme` 留空或写成 `dark`，会使用内置的深色 CSS。它们不是直接套用 Giscus 原生的 `light` 和 `dark` 外观。

如果想换回 Giscus 的其他内置主题，可以填写 Giscus 支持的主题名，例如：

```toml
lightTheme = "light_high_contrast"
darkTheme = "dark_dimmed"
```

也可以填写一个公开可访问的自定义主题 CSS URL。若 URL 需要登录、会重定向或被跨域策略拦截，评论 iframe 就无法使用它。

## 第五步：本地检查

先启动 Hugo：

```bash
hugo server --disableFastRender
```

打开任意一篇文章，滚到正文末尾。正常情况下会看到“GitHub Discussions / 评论区”，以及一个“使用 GitHub 登录”的评论框。列表页、分类页和 About 页不会加载 Giscus。

接着至少做四项检查：

- 点击主题按钮，浅色、深色与自动模式下评论框都跟着切换。
- 打开浏览器开发者工具，确认 `https://giscus.app/client.js` 没有被内容拦截器拦下。
- 发一条测试评论，回到仓库 Discussions，确认它进入了指定分类。
- 刷新文章，确认仍然命中同一条 Discussion，而不是重复新建。

本地地址和线上地址的路径相同，使用 `pathname` 时通常会对应同一条讨论。若本地站点通过额外子目录访问，而线上没有这个子目录，两边的映射就会不同；测试时以最终发布路径为准。

## 常见故障

### 页面上完全没有评论区

先确认 `enabled = true` 位于 `[params.giscus]` 下，而不是误放在 `[params]` 同级的其他表里。然后确认当前页面是普通文章页。IMX 只在 single 模板底部渲染评论。

运行下面的命令可以看到 Hugo 最终合并后的配置：

```bash
hugo config | sed -n '/giscus/,+12p'
```

### 显示“仓库未安装 Giscus App”

最常见的原因是 App 只获得了另一个仓库的权限。进入 GitHub **Settings → Applications → Installed GitHub Apps → giscus → Configure**，检查仓库列表。

### 评论框出现，但无法找到分类

重新去 giscus.app 生成配置。分类重命名后，`category` 要同步修改；删除并重建同名分类后，`categoryId` 也会改变。

### 每次访问都新建 Discussion

先核对 `mapping`，再检查站点是否同时存在带斜杠和不带斜杠的两个规范 URL。`baseURL`、重定向规则与 canonical URL 应保持一致。文章发布后，尽量不要随意更改 `url` 或 slug。

### 深浅色不跟随

IMX 通过 `postMessage` 把当前主题发给 Giscus iframe。若评论能加载但颜色不切换，先检查 `lightTheme`、`darkTheme` 是否拼写正确，再看浏览器控制台中是否有自定义 CSS URL 或 iframe 的报错。隐私扩展拦截第三方 iframe 时，也可能出现相同现象。

## 上线前的最后一遍核对

- 评论仓库公开，Discussions 已开启。
- Giscus App 只被授权到需要的仓库。
- `repo`、`repoId`、`category`、`categoryId` 均来自同一次 giscus.app 配置。
- 线上 `baseURL` 正确，文章规范 URL 不会来回跳转。
- 手机端能完成 GitHub 登录，评论框没有横向溢出。
- 隐私说明中写明页面会加载 Giscus，并由 GitHub 处理登录与评论数据。

做到这里，评论系统就算真正接好了。后续日常管理直接在 GitHub Discussions 里完成：置顶、锁定、删除、回复和订阅都不需要再改 Hugo。
