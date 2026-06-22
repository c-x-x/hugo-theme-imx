# 贡献指南

感谢你愿意改进 IMX Theme。

## 开始之前

1. 确认问题可以在最新版本复现。
2. 搜索已有 Issue，避免重复提交。
3. 功能改动请说明使用场景、预期行为和兼容影响。

## 本地开发

```bash
git clone https://github.com/c-x-x/hugo-theme-imx.git
cd hugo-theme-imx
hugo server --source exampleSite
```

示例站通过 `exampleSite/go.mod` 中的本地 `replace` 加载当前工作区主题。

## 提交要求

- 保持改动聚焦，不混入无关重构。
- HTML 模板使用两个空格缩进。
- JavaScript 和 CSS 保持现有风格。
- 新增功能需要同步更新 README 或示例内容。
- 视觉改动需检查桌面端和移动端。
- 提交前运行：

```bash
hugo --source exampleSite --minify
```

## Pull Request

请在 PR 中说明：

- 解决的问题
- 主要改动
- 验证方式
- 是否影响配置或已有站点
- 视觉改动的截图
