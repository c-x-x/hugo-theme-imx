#!/usr/bin/env bash

set -euo pipefail

output_dir="${1:-/tmp/hugo-theme-imx-public}"
cache_dir="/tmp/hugo-theme-imx-cache"

output_name="${output_dir#/tmp/}"
if [[ "$output_dir" != /tmp/hugo-theme-imx-* || "$output_name" == */* || "$output_name" == *..* ]]; then
  echo "Strict example output must be a direct /tmp/hugo-theme-imx-* directory: $output_dir" >&2
  exit 2
fi

build_log="$(mktemp /tmp/hugo-theme-imx-build.XXXXXX.log)"
trap 'rm -f "$build_log"' EXIT

rm -rf "$output_dir"

if ! hugo --source exampleSite --destination "$output_dir" --cacheDir "$cache_dir" --gc --minify --noBuildLock 2>&1 | tee "$build_log"; then
  echo "Hugo example build failed." >&2
  exit 1
fi

if grep -Eiq '(^|[[:space:]])warn(ing)?([[:space:]:]|$)|found no layout file' "$build_log"; then
  echo "Hugo emitted a warning; strict example validation stops here." >&2
  exit 1
fi

bash scripts/verify-example-output.sh "$output_dir"
