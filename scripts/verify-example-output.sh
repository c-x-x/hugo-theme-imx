#!/usr/bin/env bash

set -euo pipefail

output_dir="${1:-/tmp/hugo-theme-imx-public}"

require_file() {
  local relative_path="$1"
  local file_path="$output_dir/$relative_path"

  if [[ ! -f "$file_path" ]]; then
    echo "Missing required generated artifact: $file_path" >&2
    exit 1
  fi
}

require_content() {
  local relative_path="$1"
  local expected_text="$2"
  local file_path="$output_dir/$relative_path"

  if ! grep -Fq "$expected_text" "$file_path"; then
    echo "Generated artifact does not contain expected content '$expected_text': $file_path" >&2
    exit 1
  fi
}

require_file "index.html"
require_file "index.json"
require_file "posts/index.html"
require_file "posts/regression-long-article/index.html"
require_file "categories/index.html"
require_file "categories/主题指南/index.html"
require_file "tags/index.html"
require_file "tags/hugo/index.html"
require_file "about/index.html"
require_file "404.html"
require_file "asset-version-regression/index.html"

require_content "categories/主题指南/index.html" "主题指南"
require_content "categories/主题指南/index.html" "/posts/imx-configuration-deployment-guide/"
require_content "tags/hugo/index.html" "Hugo"
require_content "tags/hugo/index.html" "/posts/imx-theme-introduction/"
node scripts/verify-navigation-output.js "$output_dir" \
  "index.html=/" \
  "posts/index.html=/posts/" \
  "posts/imx-theme-introduction/index.html=/posts/" \
  "categories/index.html=/categories/" \
  "tags/index.html=/tags/" \
  "about/index.html=/about/"

node - "$output_dir/index.json" <<'NODE'
const fs = require('fs');

const indexPath = process.argv[2];
let entries;

try {
  entries = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
} catch (error) {
  console.error(`Generated search index is not valid JSON: ${error.message}`);
  process.exit(1);
}

if (!Array.isArray(entries) || entries.length === 0) {
  console.error('Generated search index must be a non-empty array.');
  process.exit(1);
}

for (const entry of entries) {
  if (!entry || typeof entry.title !== 'string' || !entry.title ||
      typeof entry.permalink !== 'string' || !entry.permalink) {
    console.error('Every generated search entry must contain a non-empty title and permalink.');
    process.exit(1);
  }
}

if (!entries.some(entry => entry.permalink === '/posts/imx-theme-introduction/')) {
  console.error('Generated search index does not contain the theme introduction article.');
  process.exit(1);
}
NODE

node - "$output_dir/index.html" "$output_dir/asset-version-regression/index.html" <<'NODE'
const crypto = require('crypto');
const fs = require('fs');

const indexHTML = fs.readFileSync(process.argv[2], 'utf8');
const assetRegressionHTML = fs.readFileSync(process.argv[3], 'utf8');
const assets = [
  ['/images/imx/logo.svg', 'static/images/imx/logo.svg', indexHTML],
  ['/images/imx/logo-dark.svg', 'static/images/imx/logo-dark.svg', indexHTML],
  ['/images/imx/favicon.svg', 'static/images/imx/favicon.svg', indexHTML],
  ['/images/imx/favicon-dark.svg', 'static/images/imx/favicon-dark.svg', indexHTML],
  ['/images/imx/default-avatar.jpg', 'static/images/imx/default-avatar.jpg', indexHTML],
  ['/images/imx/default-og.jpg', 'static/images/imx/default-og.jpg', indexHTML],
  ['/images/imx/default-cover.webp', 'static/images/imx/default-cover.webp', assetRegressionHTML]
];

for (const [url, sourcePath, html] of assets) {
  const version = crypto.createHash('md5').update(fs.readFileSync(sourcePath)).digest('hex');
  if (!html.includes(`${url}?v=${version}`)) {
    console.error(`Generated page does not use the content-derived asset version for ${url}.`);
    process.exit(1);
  }
}
NODE

node - "$output_dir" <<'NODE'
const fs = require('fs');
const path = require('path');

const outputDir = process.argv[2];
const fontDir = path.join(outputDir, 'fonts', 'imx');
const fontFiles = fs.readdirSync(fontDir).filter(file => file.endsWith('.woff2'));
const expectedFonts = [
  'inter-variable',
  'noto-serif-sc-400-core',
  'noto-serif-sc-400-common',
  'noto-serif-sc-400-extended',
  'noto-serif-sc-700-core',
  'noto-serif-sc-700-common',
  'noto-serif-sc-700-extended'
];

for (const basename of expectedFonts) {
  const matches = fontFiles.filter(file => new RegExp(`^${basename}\\.[a-f0-9]{64}\\.woff2$`).test(file));
  if (matches.length !== 1) {
    console.error(`Expected one fingerprinted ${basename} webfont; found ${matches.length}.`);
    process.exit(1);
  }
}

const forbiddenFonts = [
  'inter-variable.woff2',
  'noto-serif-sc-regular.woff2',
  'noto-serif-sc-bold.woff2'
];
for (const filename of forbiddenFonts) {
  if (fontFiles.includes(filename)) {
    console.error(`Generated site contains an unfingerprinted or retired webfont: ${filename}`);
    process.exit(1);
  }
}

function fontPreloads(relativePath) {
  const html = fs.readFileSync(path.join(outputDir, relativePath), 'utf8');
  return [...html.matchAll(/<link\s+rel=preload\s+href=([^\s>]+)[^>]*\sas=font(?:\s|>)/g)]
    .map(match => match[1]);
}

const homePreloads = fontPreloads('index.html');
const aboutPreloads = fontPreloads('about/index.html');
const articlePreloads = fontPreloads('posts/imx-theme-introduction/index.html');
const interPattern = /^\/fonts\/imx\/inter-variable\.[a-f0-9]{64}\.woff2$/;
const articlePattern = /^\/fonts\/imx\/noto-serif-sc-400-core\.[a-f0-9]{64}\.woff2$/;

for (const [page, preloads] of [['home', homePreloads], ['about', aboutPreloads]]) {
  if (preloads.length !== 1 || !interPattern.test(preloads[0])) {
    console.error(`${page} must preload only the fingerprinted Inter webfont.`);
    process.exit(1);
  }
}
if (articlePreloads.length !== 2 ||
    !articlePreloads.some(url => interPattern.test(url)) ||
    !articlePreloads.some(url => articlePattern.test(url))) {
  console.error('Article pages must preload fingerprinted Inter and the Noto Serif SC core partition.');
  process.exit(1);
}

const cssFiles = fs.readdirSync(path.join(outputDir, 'css'))
  .filter(file => /^main\.min\.[a-f0-9]{64}\.css$/.test(file));
if (cssFiles.length !== 1) {
  console.error(`Expected one fingerprinted main stylesheet; found ${cssFiles.length}.`);
  process.exit(1);
}
const css = fs.readFileSync(path.join(outputDir, 'css', cssFiles[0]), 'utf8');
for (const basename of expectedFonts) {
  if (!new RegExp(`/fonts/imx/${basename}\\.[a-f0-9]{64}\\.woff2`).test(css)) {
    console.error(`Main stylesheet does not reference fingerprinted ${basename}.`);
    process.exit(1);
  }
}
if (!css.includes('--font-ui:') || !css.includes('--font-reading:') || !css.includes('--font-mono:')) {
  console.error('Main stylesheet is missing the shared font-family tokens.');
  process.exit(1);
}
NODE

if grep -Fq "IMX Inter" static/giscus/imx-light.css static/giscus/imx-dark.css; then
  echo "Giscus iframe themes must not reference a parent-page-only font family." >&2
  exit 1
fi
