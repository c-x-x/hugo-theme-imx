+++
title = "搜索与评论配置"
date = 2026-06-17T14:00:00+08:00
description = "启用 JSON 搜索索引，并按需连接 Giscus 评论系统。"
categories = ["配置"]
tags = ["搜索", "Giscus"]
+++

全文搜索依赖首页的 JSON 输出：

```toml
[outputs]
  home = ["HTML", "RSS", "JSON"]
```

Giscus 默认关闭。填写仓库、分类及对应 ID 后，将 `params.giscus.enabled` 设置为 `true` 即可启用。

评论区域会跟随主题的实际浅色或深色状态同步切换。
