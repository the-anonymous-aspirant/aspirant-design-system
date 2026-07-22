#!/usr/bin/env bash
#
# Adversarial install check (system_3 #2567).
#
# Asks one question: can someone who has never built this repo install it into
# a bare app and get STYLED components? Not "does it import" — the failure this
# guards against imports fine, mounts fine, renders fine, and is unstyled. So
# the assertion is on computed styles in a real browser, resolved from a real
# install, in a scratch directory outside every checkout.
#
#   ./scripts/verify-install.sh [ref]      # default: the current HEAD
#   ./scripts/verify-install.sh origin/main
#
# It must FAIL on any ref before #2567 and PASS after. A check that passes on
# both proves nothing, and this whole task exists because a passing build was
# the bug.
#
# Install specifier: a git URL, not a filesystem path. npm SYMLINKS a `file:`
# directory dependency and runs no lifecycle scripts for it, so `prepare` can
# never fire for that form — see README §Installing. The git form is the one
# npm actually builds, which makes it the one worth testing.

set -euo pipefail

REF="${1:-HEAD}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# The package manager is not guaranteed on PATH here — this dev box has node
# and corepack but no npm (same constraint playwright.config.js records for the
# webServer command). Unlike that case we genuinely need npm: this is an
# install test. So resolve it rather than assume it.
if command -v npm >/dev/null 2>&1; then
  NPM=(npm)
elif command -v corepack >/dev/null 2>&1; then
  NPM=(corepack npm)
else
  echo "FAIL: no npm and no corepack — cannot run an install test" >&2
  exit 1
fi

WORK="$(mktemp -d -t ds-verify-install-XXXXXX)"
trap 'rm -rf "$WORK"' EXIT

say() { printf '\n=== %s\n' "$1"; }
fail() { printf 'FAIL: %s\n' "$1" >&2; exit 1; }

say "clean clone of $REF"
git clone --quiet --no-local --shared "$REPO_ROOT" "$WORK/ds" 2>/dev/null \
  || git clone --quiet "$REPO_ROOT" "$WORK/ds"
git -C "$WORK/ds" checkout --quiet --detach "$(git -C "$REPO_ROOT" rev-parse "$REF")"
SHA="$(git -C "$WORK/ds" rev-parse --short HEAD)"
echo "cloned at $SHA"

# A clone carries only tracked files. If these exist here, the test is measuring
# a dirty tree rather than a clean install.
[ -e "$WORK/ds/dist" ] && fail "clone carries dist/ — not a clean clone"
[ -e "$WORK/ds/build" ] && fail "clone carries build/ — not a clean clone"
echo "confirmed: no dist/, no build/ in the clone"

say "consumer installs the design system"
mkdir -p "$WORK/app"
cat > "$WORK/app/package.json" <<'JSON'
{
  "name": "ds-install-probe",
  "private": true,
  "type": "module",
  "version": "1.0.0"
}
JSON

cd "$WORK/app"
"${NPM[@]}" install --no-audit --no-fund --silent \
  "git+file://$WORK/ds#$(git -C "$WORK/ds" rev-parse HEAD)" \
  || fail "npm install failed outright"

PKG="$WORK/app/node_modules/@aspirant/design-system"
[ -d "$PKG" ] || fail "package did not install"

say "installed tree"
# Existence and non-emptiness are asserted separately on purpose: an
# empty-but-present tokens.css is the exact failure this task removes, and it
# looks like success to every check that only tests for existence.
for rel in dist/aspirant-design-system.js dist/style.css build/tokens.css build/tokens.js; do
  if [ ! -f "$PKG/$rel" ]; then
    fail "$rel missing from the installed package — a consumer resolving it gets nothing"
  fi
  bytes="$(wc -c < "$PKG/$rel" | tr -d ' ')"
  if [ "$bytes" -eq 0 ]; then
    fail "$rel installed but EMPTY ($bytes bytes) — present-and-empty is the silent failure"
  fi
  printf '  ok  %-34s %8s bytes\n' "$rel" "$bytes"
done

grep -q -- '--brand-primary' "$PKG/build/tokens.css" \
  || fail "build/tokens.css carries no --brand-primary custom property"
echo "  ok  build/tokens.css declares --brand-primary"
echo "  resolved tokens.css: $PKG/build/tokens.css"

say "consumer app builds against the install"
"${NPM[@]}" install --no-audit --no-fund --silent vue@^3.4.0 vite@^5.0.0 @vitejs/plugin-vue@^5.0.0 \
  || fail "could not install the consumer's own toolchain"

cat > "$WORK/app/index.html" <<'HTML'
<!doctype html>
<html><head><meta charset="utf-8"><title>probe</title></head>
<body><div id="app"></div><script type="module" src="/main.js"></script></body></html>
HTML

# The whole consumer contract in five lines: import the tokens, import the
# barrel, mount a component. No second command, no README.
cat > "$WORK/app/main.js" <<'JS'
import '@aspirant/design-system/tokens.css'
import '@aspirant/design-system/styles.css'
import { createApp, h } from 'vue'
import { AspButton } from '@aspirant/design-system'

createApp({ render: () => h(AspButton, { variant: 'primary' }, () => 'Probe') }).mount('#app')
JS

# minify off so a failure is readable in the built output rather than a
# single-letter identifier soup.
cat > "$WORK/app/vite.config.js" <<'JS'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig({ base: './', plugins: [vue()], build: { minify: false } })
JS

"${NPM[@]}" exec --yes -- vite build --logLevel error \
  || fail "consumer build failed against the installed package"
echo "  ok  consumer app built"

say "computed styles in a real browser"
# Playwright lives in the SOURCE checkout's node_modules, not the scratch app's
# — the point is to measure the consumer's built output, not to make the
# consumer depend on a test tool.
if [ ! -d "$REPO_ROOT/node_modules/playwright" ] && [ ! -d "$REPO_ROOT/node_modules/@playwright/test" ]; then
  echo "  SKIP: playwright not installed in $REPO_ROOT — run npm install there"
  echo
  echo "PASS (artifact assertions only; computed-style check skipped) — $SHA"
  exit 0
fi

# Over HTTP, not file://. Chromium refuses `<script type="module">` from a
# file:// origin on CORS grounds, so the page would load, render nothing, and
# report no error — a false red indistinguishable from the true one this
# harness exists to catch.
PREVIEW_PORT=5199
"${NPM[@]}" exec --yes -- vite preview --port "$PREVIEW_PORT" --strictPort \
  >"$WORK/preview.log" 2>&1 &
PREVIEW_PID=$!
trap 'kill "$PREVIEW_PID" 2>/dev/null || true; rm -rf "$WORK"' EXIT

for _ in $(seq 1 60); do
  if curl -sf "http://127.0.0.1:$PREVIEW_PORT/" >/dev/null 2>&1; then break; fi
  sleep 0.5
done
curl -sf "http://127.0.0.1:$PREVIEW_PORT/" >/dev/null 2>&1 \
  || { cat "$WORK/preview.log" >&2; fail "consumer preview server never came up"; }

(cd "$REPO_ROOT" && node scripts/verify-install-computed.mjs "http://127.0.0.1:$PREVIEW_PORT/") \
  || fail "components installed but render untokenised"

echo
echo "PASS — $SHA installs into a bare app and renders with tokens applied"
