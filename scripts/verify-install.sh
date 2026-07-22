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

cat > "$WORK/app/vite.config.js" <<'JS'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig({ plugins: [vue()], build: { minify: false } })
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

cat > "$WORK/check-computed.mjs" <<'JS'
import { chromium } from 'playwright'

const dist = process.argv[2]
const browser = await chromium.launch()
const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
await page.goto(`file://${dist}/index.html`)
await page.waitForSelector('button', { timeout: 10_000 })

const probe = await page.evaluate(() => {
  const root = getComputedStyle(document.documentElement)
  const el = document.querySelector('button')
  const cs = getComputedStyle(el)
  return {
    tokenOnRoot: root.getPropertyValue('--brand-primary').trim(),
    background: cs.backgroundColor,
    color: cs.color,
    padding: cs.padding,
  }
})
await browser.close()

const problems = []
if (errors.length) problems.push(`page errors: ${errors.join(' | ')}`)

// The token must exist as a resolved custom property on :root. Absent means
// tokens.css never made it into the bundle — the silent case.
if (!probe.tokenOnRoot) problems.push('--brand-primary does not resolve on :root')

// And the component must actually be WEARING it. An unstyled button computes
// to a transparent/default background; a tokenised one does not.
const unstyled = ['rgba(0, 0, 0, 0)', 'transparent', '']
if (unstyled.includes(probe.background)) {
  problems.push(`button background computed to ${probe.background || '<empty>'} — component rendered untokenised`)
}
if (probe.padding === '0px') problems.push('button padding computed to 0px — component stylesheet absent')

console.log('  computed --brand-primary :', probe.tokenOnRoot || '<unresolved>')
console.log('  computed background      :', probe.background)
console.log('  computed color           :', probe.color)
console.log('  computed padding         :', probe.padding)

if (problems.length) {
  console.error(`FAIL: ${problems.join('; ')}`)
  process.exit(1)
}
JS

NODE_PATH="$REPO_ROOT/node_modules" node "$WORK/check-computed.mjs" "$WORK/app/dist" \
  || fail "components installed but render untokenised"

echo
echo "PASS — $SHA installs into a bare app and renders with tokens applied"
