# 参与维护

欢迎报告问题、改进文档或提交代码。

## 提交 Issue

提交前请先搜索现有 Issue。Bug 报告至少应包含：

- Hugo 版本
- 操作系统和浏览器
- 最小复现步骤
- 实际结果与预期结果
- 与问题有关的配置片段

请先删除仓库令牌、邮箱和其他敏感信息。

## 本地运行

```bash
git clone https://github.com/c-x-x/hugo-theme-imx.git
cd hugo-theme-imx
hugo server --source exampleSite
```

示例站通过 `exampleSite/go.mod` 中的本地 `replace` 使用当前工作区代码。

## 修改约定

- 一次提交只解决一类问题。
- 保持现有 HTML、CSS 和 JavaScript 风格。
- 新增配置时同步更新 README 和示例站。
- 改动布局时检查桌面端和移动端。
- 改动颜色或交互时同时检查浅色、深色和减少动画模式。
- 不要提交 `exampleSite/public`、`.hugo_build.lock` 或系统生成文件。

提交前至少运行：

```bash
npm run build:example:strict
```

安装测试依赖后，运行全部 JavaScript 语法检查和浏览器回归：

```bash
npm ci
npx playwright install chromium
npm run check:js
npm run test:build-validation
npm run test:e2e
```

普通主题使用者不需要安装 Node.js；这些依赖只服务于仓库维护和 CI。严格构建会拒绝 Hugo 警告并验证搜索索引、关键页面和默认资源内容哈希。Playwright 使用 Chromium 覆盖五种视口、评论主题同步、搜索、Dock、目录、404 游戏和 About 访客行为，并比较首页、文章页和 About 页的浅色/深色视觉基线。涉及兼容性的改动还应人工抽查 Firefox 与 Safari/WebKit。

## Pull Request

PR 说明中请写清：

- 问题是什么
- 做了哪些改动
- 如何验证
- 是否新增或修改配置
- 是否影响已有站点

视觉改动请附桌面端和移动端截图。
