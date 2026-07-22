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
