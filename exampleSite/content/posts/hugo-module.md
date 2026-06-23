+++
title = "使用 Hugo Module 安装主题"
date = 2026-06-21T10:00:00+08:00
description = "用 Hugo Module 引入和更新主题。"
categories = ["Hugo"]
tags = ["Hugo Module", "安装"]
+++

在站点根目录初始化 Go Module：

```bash
hugo mod init github.com/your-name/your-site
```

再在 `hugo.toml` 中导入主题：

```toml
[module]
  [[module.imports]]
    path = "github.com/c-x-x/hugo-theme-imx"
```

运行 `hugo mod get` 下载模块，然后用 `hugo server` 启动本地预览。
