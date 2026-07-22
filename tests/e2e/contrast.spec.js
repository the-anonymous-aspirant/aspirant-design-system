import { expect, test } from '@playwright/test'

import { AA, MEASURE } from './contrast-measure.js'

const THEMES = ['light', 'dark']

// Hover states carry their own colour rules, and two real defects (the sidebar
// toggle and app-shell menu re-asserting an ambient ink over dark chrome) were
// invisible to a static pass. Anything with a :hover colour belongs here.
// `.back-btn` earns its place here: its hover ink is the #2419 amber-on-any-surface
// trap, and a static pass cannot see it.
// `.breadcrumb__label--link` and `.breadcrumb__overflow` both paint a wash of
// currentColor on hover, which is a background the resting state does not have.
// The row is otherwise an ink-inheritor, so hover is the only state where it
// sets a surface — exactly the case a static pass cannot see.
const HOVER_TARGETS = [
  '.sidebar__toggle',
  '.app-shell__menu',
  '.data-table__sort',
  '.back-btn',
  '.list-item__inner',
  '.breadcrumb__label--link',
  '.breadcrumb__overflow',
]

async function subAaSites(page, fixture, theme) {
  // ?theme= is read by the fixture before any stylesheet applies. Setting the
  // attribute after load and measuring shortly after is racy — see the comment
  // in the fixture.
  const q = theme === 'dark' ? '?theme=dark' : ''
  await page.goto(`/tests/e2e/fixtures/${fixture}${q}`, { waitUntil: 'networkidle' })

  // Open every select in the dedicated open-panel surfaces before measuring.
  // A dropdown's panel is a surface no closed specimen reaches; leaving them
  // shut would let invisible option text pass.
  for (const trigger of await page.locator('[data-surface$="-select-open"] .select__trigger').all()) {
    await trigger.click()
  }
  // Same reasoning for the breadcrumb's overflow panel: it is a --surface-card
  // panel inside a component that otherwise inherits its ink, and it does not
  // exist in the DOM's rendered form until the row overflows and someone opens
  // it. Left shut, the panel's ink would never be measured.
  for (const trigger of await page.locator('[data-surface$="-breadcrumb-open"] .breadcrumb__overflow').all()) {
    await trigger.click()
  }
  await page.waitForTimeout(80)

  const found = (await page.evaluate(MEASURE)).filter((r) => r.ratio < AA)

  for (const selector of HOVER_TARGETS) {
    const el = page.locator(selector).first()
    if (!(await el.count())) continue
    await el.hover().catch(() => {})
    // Longer than --transition-fast (0.15s). The rule is about the settled
    // hover state; a colour caught mid-transition is a transient, not a defect.
    // Sampling at 120ms measured exactly that transient -- see #2375.
    await page.waitForTimeout(250)
    for (const r of await page.evaluate(MEASURE)) {
      if (r.ratio < AA && r.selector.includes(selector.slice(1))) {
        found.push({ ...r, selector: `${r.selector}:hover` })
      }
    }
  }

  // The modal goes LAST, on purpose. Its scrim is fixed inset-0 at z-index
  // 1000, so opening it earlier would intercept the select clicks and the
  // hovers above — and the hovers are `.catch`ed, so they would degrade to
  // silent no-ops rather than failing loudly.
  const modalTrigger = page.locator('#probe-open-modal')
  if (await modalTrigger.count()) {
    await modalTrigger.click()
    await page.waitForTimeout(80)
    for (const r of await page.evaluate(MEASURE)) {
      if (r.ratio < AA && r.surface === 'modal') found.push(r)
    }
  }

  // Dedupe: the same rule repeats across identical specimens per surface.
  const seen = new Set()
  return found.filter((r) => {
    const k = `${r.surface}|${r.selector}|${r.ratio}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

const report = (sites) =>
  sites
    .sort((a, b) => a.ratio - b.ratio)
    .map((s) => `  ${s.ratio}:1  [${s.surface}] ${s.selector} — "${s.text}"`)
    .join('\n')

for (const theme of THEMES) {
  test(`every component meets WCAG AA on every surface (${theme})`, async ({ page }) => {
    const sites = await subAaSites(page, 'matrix.html', theme)
    expect(sites, `sites below ${AA}:1 in ${theme} theme:\n${report(sites)}`).toEqual([])
  })
}

// The teeth check. Without this, a probe that silently stopped measuring
// anything would pass the suite above forever. Three separate defects in this
// probe were found while building it, one of which reported a regression that
// contradicted sound reasoning; a probe that has only ever agreed with us has
// not been tested.
test.describe('the probe itself', () => {
  for (const theme of THEMES) {
    test(`detects the known-bad control (${theme})`, async ({ page }) => {
      const sites = await subAaSites(page, 'known-bad.html', theme)
      expect(
        sites.length,
        `known-bad fixture reinstates shipped defects but the probe reported them clean in ${theme} — the probe is broken, not the library`
      ).toBeGreaterThan(0)
    })
  }

  // The modal is opened by a click and attributed by an imperatively-set
  // data-surface. Either step can break silently, and the failure mode is a
  // GREEN matrix that measured no modal at all. Assert the surface is present
  // and non-trivial rather than trusting the pass above.
  test('actually measures the open modal surface', async ({ page }) => {
    await page.goto('/tests/e2e/fixtures/matrix.html', { waitUntil: 'networkidle' })
    await page.locator('#probe-open-modal').click()
    await page.waitForTimeout(80)
    const modalSites = (await page.evaluate(MEASURE)).filter((r) => r.surface === 'modal')
    expect(
      modalSites.length,
      'no text measured on the modal surface — the trigger or the data-surface tag broke, and the AA pass above is measuring nothing'
    ).toBeGreaterThan(3)
  })

  // The breadcrumb panel is reached through TWO things that can break silently:
  // the row must actually overflow (or no overflow control is rendered) and the
  // click must land. Either failure leaves the AA pass green having measured no
  // panel — the same green-by-construction hole the modal check closes.
  test('actually measures the open breadcrumb overflow panel', async ({ page }) => {
    await page.goto('/tests/e2e/fixtures/matrix.html', { waitUntil: 'networkidle' })
    const trigger = page.locator('[data-surface$="-breadcrumb-open"] .breadcrumb__overflow').first()
    await expect(
      trigger,
      'no overflow control rendered — the deep specimen stopped collapsing, so the panel is unreachable and its ink is unmeasured'
    ).toBeVisible()
    await trigger.click()
    await page.waitForTimeout(80)
    const panelSites = (await page.evaluate(MEASURE)).filter((r) =>
      String(r.selector).includes('breadcrumb__panel-link')
    )
    expect(
      panelSites.length,
      'no text measured inside the breadcrumb overflow panel — the panel did not open and the AA pass above is measuring nothing for this surface'
    ).toBeGreaterThan(0)
  })

  // Same failure mode as the modal check above: the chat surfaces could vanish
  // from the matrix (a dropped spread in `shell()`) and the AA pass would stay
  // green having measured no chat at all.
  test('actually measures the chat surfaces', async ({ page }) => {
    await page.goto('/tests/e2e/fixtures/matrix.html', { waitUntil: 'networkidle' })
    const chat = (await page.evaluate(MEASURE)).filter((r) => r.surface.startsWith('chat'))
    expect(
      chat.length,
      'no text measured on any chat surface — the specimens dropped out of the matrix and the AA pass above is measuring nothing for this component'
    ).toBeGreaterThan(20)
  })

  // The load-bearing invariant of AspChatBubble (#2381). Both fills the §3.12
  // ruling names are ALPHAS, and an alpha's contrast is a function of whatever
  // is beneath it. The area supplies an opaque surface so the result cannot
  // depend on where it was dropped — which means the same specimen on the light
  // page and inside a dark card must measure IDENTICALLY.
  //
  // Asserting equality rather than "both above AA" is deliberate: both could
  // clear AA while still varying with the backdrop, and that variance is the
  // defect (#2417) rather than the ratio itself.
  for (const theme of THEMES) {
    test(`chat bubbles measure identically on every backdrop (${theme})`, async ({ page }) => {
      const q = theme === 'dark' ? '?theme=dark' : ''
      await page.goto(`/tests/e2e/fixtures/matrix.html${q}`, { waitUntil: 'networkidle' })
      const rows = await page.evaluate(MEASURE)
      const forSurface = (s) =>
        rows
          .filter((r) => r.surface === s && r.selector.includes('chat-bubble'))
          .map((r) => `${r.selector}|${r.text}|${r.ratio}`)
          .sort()

      const onPage = forSurface('chat-on-page')
      const onCard = forSurface('chat-on-card')
      expect(onPage.length, 'no chat bubbles measured on the page surface').toBeGreaterThan(0)
      expect(
        onCard,
        'the same bubble measured differently on a dark card than on the light page — an ambient surface is compositing through, so the fill has become backdrop-dependent again'
      ).toEqual(onPage)
    })
  }

  test('detects the specific 1:1 invisible-text defect it was built for', async ({ page }) => {
    const sites = await subAaSites(page, 'known-bad.html', 'light')
    const invisible = sites.filter((s) => s.surface.startsWith('card') && s.ratio <= 1.1)
    expect(
      invisible.length,
      `expected ~1:1 text on a dark card from the reinstated #2416 defect; got:\n${report(sites)}`
    ).toBeGreaterThan(0)
  })
})
