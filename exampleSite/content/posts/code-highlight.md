+++
title = "代码高亮与复制"
date = 2026-06-19T12:00:00+08:00
description = "展示代码块、语言标签和一键复制按钮。"
categories = ["功能介绍"]
tags = ["代码高亮", "JavaScript"]
+++

代码块支持 Hugo 内置语法高亮，并自动显示复制按钮。

```javascript
function greet(name) {
  return `你好，${name}！`;
}

console.log(greet('IMX Theme'));
```

也可以通过站点的 `markup.highlight` 配置调整行号和高亮样式。
