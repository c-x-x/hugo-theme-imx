+++
title = "搜索与评论配置"
date = 2026-06-17T14:00:00+08:00
description = "配置站内搜索，并按需启用 Giscus。"
categories = ["配置"]
tags = ["搜索", "Giscus"]
+++

全文搜索依赖首页的 JSON 输出：

```toml
[outputs]
  home = ["HTML", "RSS", "JSON"]
```

Giscus 默认关闭。填写仓库、分类及对应 ID 后，再将 `params.giscus.enabled` 设置为 `true`。

评论框在加载时读取当前主题，之后也会跟随主题按钮切换。浅色和深色使用的 Giscus 主题可以分别配置。
