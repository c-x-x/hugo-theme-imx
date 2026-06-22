+++
title = "使用 Hugo Module 安装主题"
date = 2026-06-21T10:00:00+08:00
description = "只用 Hugo Module 引入、更新和管理 IMX Theme。"
categories = ["Hugo"]
tags = ["Hugo Module", "安装"]
+++

新站点首先需要初始化 Go Module：

```bash
hugo mod init github.com/your-name/your-site
```

然后在 `hugo.toml` 中导入主题：

```toml
[module]
  [[module.imports]]
    path = "github.com/c-x-x/hugo-theme-imx"
```

完成后运行 `hugo server` 即可启动本地预览。
