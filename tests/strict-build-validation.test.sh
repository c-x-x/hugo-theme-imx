#!/usr/bin/env bash

set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
empty_output_dir="$(mktemp -d /tmp/hugo-theme-imx-empty-output.XXXXXX)"
built_output_dir="$(mktemp -d /tmp/hugo-theme-imx-built-output.XXXXXX)"
warning_output_dir="$(mktemp -d /tmp/hugo-theme-imx-warning-output.XXXXXX)"
fake_bin="$(mktemp -d /tmp/hugo-theme-imx-fake-bin.XXXXXX)"
trap 'rm -rf "$empty_output_dir" "$built_output_dir" "$warning_output_dir" "$fake_bin"' EXIT

cd "$root_dir"

if verification_output="$(npm run --silent verify:example -- "$empty_output_dir" 2>&1)"; then
  echo "Expected verification to reject an output directory with no generated artifacts." >&2
  exit 1
fi

if ! grep -Fq "Missing required generated artifact" <<<"$verification_output"; then
  echo "Verification did not identify the missing generated artifact." >&2
  printf '%s\n' "$verification_output" >&2
  exit 1
fi

cat > "$fake_bin/hugo" <<'FAKE_HUGO'
#!/usr/bin/env bash
echo 'WARN found no layout file for html'
exit 0
FAKE_HUGO
chmod +x "$fake_bin/hugo"

if warning_output="$(PATH="$fake_bin:$PATH" bash scripts/build-example-strict.sh "$warning_output_dir" 2>&1)"; then
  echo "Expected strict build to reject Hugo warnings." >&2
  exit 1
fi

if ! grep -Fq "Hugo emitted a warning" <<<"$warning_output"; then
  echo "Strict build did not identify the Hugo warning." >&2
  printf '%s\n' "$warning_output" >&2
  exit 1
fi

if traversal_output="$(bash scripts/build-example-strict.sh "/tmp/hugo-theme-imx-output/nested" 2>&1)"; then
  echo "Expected strict build to reject nested or traversal-capable output paths." >&2
  exit 1
fi

if ! grep -Fq "must be a direct /tmp/hugo-theme-imx-* directory" <<<"$traversal_output"; then
  echo "Strict build did not reject the unsafe output path before deletion." >&2
  printf '%s\n' "$traversal_output" >&2
  exit 1
fi

npm run build:example:strict -- "$built_output_dir"
npm run verify:example -- "$built_output_dir"
