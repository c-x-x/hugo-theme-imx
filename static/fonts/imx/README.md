# IMX Webfont Licenses

The theme uses an open-source, self-hosted font pairing. The browser font files
live in `assets/fonts/imx/` so Hugo Pipes can publish fingerprinted URLs; this
directory keeps the license texts available in the source tree and generated site.

- `assets/fonts/imx/inter-variable.woff2`
  - Inter Variable by Rasmus Andersson
  - License: SIL Open Font License 1.1
  - Source: https://rsms.me/inter/
  - Full license: `OFL-Inter.txt`

- `assets/fonts/imx/noto-serif-sc-400-{core,common,extended}.woff2`
- `assets/fonts/imx/noto-serif-sc-700-{core,common,extended}.woff2`
  - Noto Serif SC by Google / Adobe
  - License: SIL Open Font License 1.1
  - Source: https://fonts.google.com/noto/specimen/Noto+Serif+SC
  - Full license: `OFL-Noto-Serif-SC.txt`
  - Version: Noto Serif CJK 2.003
  - The checked source fonts are partitioned by `scripts/subset-fonts.py`; retained glyphs are packaged as WOFF2 without replacing the typeface.

The fonts are served locally and no remote font service is required at runtime.

- `assets/fonts/imx/wenkai-{400,700}-{core,common,extended}.woff2`
  - LXGW WenKai v1.522 by LXGW and The Klee Project Authors
  - License: SIL Open Font License 1.1; full text: `OFL-WenKai.txt`
  - Source: https://github.com/lxgw/LxgwWenKai/releases/tag/v1.522
  - Regular is used for 400; Medium is used for 700.
  - Rebuild with the pinned `scripts/font-requirements.txt` dependencies:
    `python scripts/subset-wenkai.py LXGWWenKai-Regular.ttf LXGWWenKai-Medium.ttf`
  - Source hashes are checked by the script; generated hashes are in `wenkai-sha256.txt`.
  - These optional fonts load only when the hidden home-logo gesture enables WenKai.
