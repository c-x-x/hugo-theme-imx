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
