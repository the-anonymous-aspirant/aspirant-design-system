/**
 * Computed-style probe for scripts/verify-install.sh (system_3 #2567).
 *
 *   node scripts/verify-install-computed.mjs <consumer-url>
 *
 * Lives in the repo rather than inside the harness's scratch dir so that
 * `import 'playwright'` resolves against THIS checkout's node_modules — the
 * consumer under test must not depend on a test tool. (NODE_PATH does not
 * work here: it is honoured by CommonJS resolution only, not ESM.)
 *
 * The bar is deliberately not "did it import". A design system whose tokens
 * never arrived still imports, still mounts, and still renders — it just
 * renders wrong, silently. So this asks the browser what the pixels actually
 * resolved to.
 */

import { chromium } from 'playwright'

const url = process.argv[2]
if (!url) {
  console.error('usage: node scripts/verify-install-computed.mjs <consumer-url>')
  process.exit(2)
}

const browser = await chromium.launch()
const page = await browser.newPage()

const errors = []
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto(url)
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
    text: el.textContent.trim(),
  }
})

await browser.close()

const problems = []
if (errors.length) problems.push(`page errors: ${errors.join(' | ')}`)

// The custom property must resolve on :root. Absent means tokens.css never
// reached the bundle — the silent half of the failure.
if (!probe.tokenOnRoot) {
  problems.push('--brand-primary does not resolve on :root — tokens.css absent from the bundle')
}

// #ffb300, the brand amber, is what AspButton's primary variant reads through
// var(--brand-primary). Asserting the value and not merely its presence is the
// difference between "a stylesheet loaded" and "the right one did".
if (probe.tokenOnRoot && probe.tokenOnRoot.toLowerCase() !== '#ffb300') {
  problems.push(`--brand-primary resolved to ${probe.tokenOnRoot}, expected #ffb300`)
}
if (probe.background !== 'rgb(255, 179, 0)') {
  problems.push(
    `button background computed to ${probe.background || '<empty>'}, expected rgb(255, 179, 0) — ` +
      'the component rendered untokenised',
  )
}

// A component whose stylesheet never arrived computes to the UA default.
if (probe.padding === '0px') {
  problems.push('button padding computed to 0px — component stylesheet absent')
}
if (probe.text !== 'Probe') problems.push(`button rendered "${probe.text}", expected "Probe"`)

console.log('  computed --brand-primary :', probe.tokenOnRoot || '<unresolved>')
console.log('  computed background      :', probe.background)
console.log('  computed color           :', probe.color)
console.log('  computed padding         :', probe.padding)

if (problems.length) {
  console.error(`FAIL: ${problems.join('; ')}`)
  process.exit(1)
}
