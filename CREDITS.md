# 素材与第三方服务

## 仓库内置素材

- 极简黑白雪花 Logo 和 favicon 为本项目绘制。
- 默认头像、文章封面和 OG 分享图使用 OpenAI 图像生成工具制作，并经过本地裁切与压缩。
- 上述素材随主题按 MIT License 分发。

## 项目依赖

- 页面由 [Hugo](https://gohugo.io/) 构建。
- 评论功能按需加载 [Giscus](https://giscus.app/)。
- GitHub 和邮件图标使用仓库内置 SVG 路径。

## 字体

- **Inter Variable**：Inter Project Authors，主要设计者 Rasmus Andersson；来源为 [rsms/inter](https://github.com/rsms/inter)；许可证为 SIL Open Font License 1.1；本地文件为 `static/fonts/imx/inter-variable.woff2`，完整许可证为 `static/fonts/imx/OFL-Inter.txt`。
- **Noto Serif SC**：Google、Adobe 与 Noto CJK 项目贡献者；来源为 [notofonts/noto-cjk](https://github.com/notofonts/noto-cjk) 和 [Google Fonts 的 Noto Serif SC 分发目录](https://github.com/google/fonts/tree/main/ofl/notoserifsc)；许可证为 SIL Open Font License 1.1；本地文件为 `static/fonts/imx/noto-serif-sc-regular.woff2` 与 `static/fonts/imx/noto-serif-sc-bold.woff2`，完整许可证为 `static/fonts/imx/OFL-Noto-Serif-SC.txt`。

通用界面使用系统字体栈；文章页通过本地 WOFF2 文件加载上述字体，不请求远程字体服务。字体文件保持现有 WOFF2 包装和字形内容，字体授权不受项目 MIT License 替代。

站点作者自行添加的文章、图片、头像、评论和第三方脚本不属于本仓库的授权范围。
