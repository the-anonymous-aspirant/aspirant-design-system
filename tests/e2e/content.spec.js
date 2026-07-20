import { expect, test } from '@playwright/test'

import { AA, MEASURE } from './contrast-measure.js'

// AspContent was filed against three logged defects (#2382). Each one gets an
// assertion that would have FAILED before the component existed, rather than an
// assertion that merely describes what it now does:
//
//   1. fenced code rendered with no syntax highlighting;
//   2. raw source fed to a markdown parser came out as mangled paragraphs;
//   3. the body had no max-height and grew to the full page height.
//
// Plus the contrast contract from spec amendment comment 9767, which is the
// reason the ramp is re-mapped onto DS tokens instead of vendored.

const THEMES = ['light', 'dark']

const open = async (page, theme) => {
  await page.goto(`/tests/e2e/fixtures/content.html${theme === 'dark' ? '?theme=dark' : ''}`, {
    waitUntil: 'networkidle',
  })
  // Wait for the MOUNT, not just the network. This fixture pulls in
  // highlight.js's grammar modules, and on the first hit of a cold `vite dev`
  // the transform of that module graph can outlast a 5s assertion timeout — so
  // the suite failed once with "element(s) not found" on an ordering where this
  // spec ran first, and passed on every ordering where something else warmed
  // the server. Waiting on the component's own root removes the dependence on
  // which spec happens to go first.
  await page.locator('.asp-content').first().waitFor({ state: 'attached' })
}

// --- defect 1: highlighting -------------------------------------------------

test('fenced code is highlighted', async ({ page }) => {
  await open(page, 'light')
  const tokens = page.locator('#probe-fenced .hljs-keyword')
  // The pre-fix render produced a <pre><code> with no child spans at all, so a
  // non-zero token count is exactly the thing that regressed.
  await expect(tokens.first()).toBeVisible()
  expect(await tokens.count()).toBeGreaterThan(0)
})

test('the highlight covers every token class the ramp colours', async ({ page }) => {
  await open(page, 'light')
  // A ramp rule for a class no fixture reaches is an unmeasured colour. This
  // asserts the specimen actually exercises each one, so the contrast test
  // below is measuring the whole ramp rather than the two easy classes.
  const classes = await page
    .locator('#probe-fenced [class*="hljs-"]')
    .evaluateAll((els) => [...new Set(els.map((e) => e.className))])
  for (const expected of ['hljs-keyword', 'hljs-string', 'hljs-comment', 'hljs-number']) {
    expect(classes.join(' ')).toContain(expected)
  }
})

test('a fence with no language hint renders unhighlighted rather than guessed', async ({
  page,
}) => {
  await open(page, 'light')
  // Guessing is worse than not colouring: hljs.highlightAuto mis-grammars short
  // snippets, and a wrong grammar mis-colours code that reads fine plain.
  const pre = page.locator('#probe-unhinted pre')
  await expect(pre).toBeVisible()
  expect(await pre.innerHTML()).not.toContain('hljs-')
  // Still rendered as a code block, just an uncoloured one.
  expect(await pre.innerText()).toContain('swap  green -> blue  ok')
})

// --- defect 2: raw source is preserved, not mangled --------------------------

test('raw source keeps its indentation and its metacharacters', async ({ page }) => {
  await open(page, 'light')
  const text = await page.locator('#probe-raw pre').innerText()
  // Four-space indentation survives. A markdown parser eats it.
  expect(text).toContain('    "timeout": 2.5,')
  // The glob survives as a glob. A markdown parser reads `*.yaml", "*` as emphasis.
  expect(text).toContain('["*.yaml", "*.yml"]')
  // The leading `#` stays a comment character, not a heading.
  expect(text).toContain('# module: probe_runner')
})

test('raw source produces no markdown structure', async ({ page }) => {
  await open(page, 'light')
  // The precise shape of the defect: `#` became an <h1>, `*` became an <em>.
  await expect(page.locator('#probe-raw h1, #probe-raw h2, #probe-raw em')).toHaveCount(0)
})

test('the control proves the fixture can detect mangling', async ({ page }) => {
  await open(page, 'light')
  // The SAME string forced down the markdown path. If this does not mangle,
  // the two assertions above are vacuous — they would pass on any input.
  const control = page.locator('#probe-raw-as-markdown')
  // Two, not one: the specimen opens with two `#` comment lines, and the
  // markdown path promotes BOTH to headings. That is the mangling.
  await expect(control.locator('h1')).toHaveCount(2)
  const text = await control.innerText()
  expect(text).not.toContain('    "timeout": 2.5,')
})

test('`auto` routes raw source away from markdown unaided', async ({ page }) => {
  await open(page, 'light')
  await expect(page.locator('#probe-auto h1, #probe-auto em')).toHaveCount(0)
  expect(await page.locator('#probe-auto pre').innerText()).toContain('    "timeout": 2.5,')
})

// --- defect 3: capped height + internal scroll -------------------------------

test('a long body is capped and scrolls internally', async ({ page }) => {
  await open(page, 'light')
  const box = page.locator('#probe-long .asp-content')
  const { clientHeight, scrollHeight } = await box.evaluate((el) => ({
    clientHeight: el.clientHeight,
    scrollHeight: el.scrollHeight,
  }))
  // Capped at the requested 320px...
  expect(clientHeight).toBeLessThanOrEqual(322)
  // ...and the overflow is real, i.e. the content genuinely exceeds the cap
  // rather than the fixture being too short to test anything.
  expect(scrollHeight).toBeGreaterThan(clientHeight * 2)
})

test('the capped region actually scrolls', async ({ page }) => {
  await open(page, 'light')
  const box = page.locator('#probe-long .asp-content')
  await box.evaluate((el) => el.scrollBy(0, 200))
  expect(await box.evaluate((el) => el.scrollTop)).toBeGreaterThan(0)
})

test('the capped region is reachable by keyboard', async ({ page }) => {
  await open(page, 'light')
  // A scroll container only a mouse can move is unreachable content (WCAG
  // 2.1.1). tabindex="0" is what makes the overflow keyboard-operable.
  const box = page.locator('#probe-long .asp-content')
  await expect(box).toHaveAttribute('tabindex', '0')
  await expect(box).toHaveAttribute('role', 'region')
})

test('maxHeight null opts out of the cap', async ({ page }) => {
  await open(page, 'light')
  const box = page.locator('#probe-uncapped .asp-content')
  // No cap means no internal scroller, so it must not claim to be one.
  await expect(box).not.toHaveAttribute('tabindex', '0')
  const { clientHeight, scrollHeight } = await box.evaluate((el) => ({
    clientHeight: el.clientHeight,
    scrollHeight: el.scrollHeight,
  }))
  expect(scrollHeight - clientHeight).toBeLessThanOrEqual(1)
})

// --- untrusted input ---------------------------------------------------------

test('raw HTML in the body is escaped, not executed', async ({ page }) => {
  await open(page, 'light')
  await expect(page.locator('#probe-hostile script')).toHaveCount(0)
  await expect(page.locator('#probe-hostile img')).toHaveCount(0)
  expect(await page.evaluate(() => window.__XSS)).toBeUndefined()
  // Escaped means VISIBLE as text, not silently dropped — a body that quietly
  // loses content is its own defect.
  expect(await page.locator('#probe-hostile').innerText()).toContain('window.__XSS = true')
  // ...and markdown still works around it.
  await expect(page.locator('#probe-hostile strong')).toHaveCount(1)
})

// --- the contrast contract (spec amendment #2382 comment 9767) ---------------

/**
 * Measures the highlight ramp against the code block's REAL painted surface.
 *
 * This used to re-implement the colour maths locally, because the shared probe
 * had a genuine blind spot: `effectiveBg` composited `backgroundColor` up the
 * ancestor chain and never read `background-image`. The code block paints in two
 * layers — an opaque `--surface-card` plus a translucent `--surface-card-inner`
 * wash as a gradient — because the inner token is translucent in BOTH themes and
 * alone would inherit whatever sits beneath it. So the shared probe measured
 * against the bare card: conservative in the light theme, and OVERSTATING
 * contrast in the dark one, where the wash is white and the real surface is
 * #373737 against a measured #2a2a2a.
 *
 * #2467 fixed that in the shared probe, so the duplicate is gone and this is now
 * a scoped call into `MEASURE`. Keeping a second implementation would mean two
 * places to fix the next probe defect, and only one of them would get fixed.
 */
const rampRatios = async (page) => {
  const rows = await page.evaluate(MEASURE, '#probe-fenced')
  // The block's own ink plus every highlighted token in it.
  const sites = rows
    .filter((r) => r.selector === 'PRE' || /hljs-/.test(r.selector))
    .map((r) => ({ name: r.selector, text: r.text.slice(0, 20), ratio: r.ratio, bg: r.bg }))
  return { surface: sites[0]?.bg ?? [], sites }
}

for (const theme of THEMES) {
  test(`highlight ramp clears AA on the painted code surface (${theme})`, async ({ page }) => {
    await open(page, theme)
    const { surface, sites } = await rampRatios(page)

    // Guard the guard: if the specimen yielded no token spans the loop below
    // would pass vacuously.
    expect(sites.length).toBeGreaterThan(4)

    const failures = sites.filter((s) => s.ratio < AA)
    expect(
      failures,
      `code surface rgb(${surface.join(',')}) — sub-AA: ` +
        failures.map((f) => `${f.name} ${f.ratio}:1 ("${f.text}")`).join(', ')
    ).toEqual([])
  })
}

test('the code block paints its own surface rather than inheriting', async ({ page }) => {
  // The SETTER half of the MIXED role. If the block ever stops painting, the
  // ramp's colours land on an unknown surface and every ratio above becomes
  // meaningless — so this asserts the premise those tests rest on.
  const resolved = {}
  for (const theme of THEMES) {
    await open(page, theme)
    resolved[theme] = await page.locator('#probe-fenced pre').evaluate((el) => {
      const cs = getComputedStyle(el)
      return { bg: cs.backgroundColor, img: cs.backgroundImage }
    })
    expect(resolved[theme].bg).not.toBe('rgba(0, 0, 0, 0)')
    expect(resolved[theme].img).toContain('gradient')
  }
})

test('prose inherits the surface ink rather than asserting one', async ({ page }) => {
  // The INHERITOR half. Prose that pins an absolute ink is the #2415 defect
  // family: legible on one surface, invisible on the other. Asserting the ink
  // CHANGES between themes is what proves it is inherited — a component that
  // hardcoded a colour would report the same value in both.
  const inks = {}
  for (const theme of THEMES) {
    await open(page, theme)
    inks[theme] = await page
      .locator('#probe-fenced .asp-content__prose p')
      .first()
      .evaluate((el) => getComputedStyle(el).color)
  }
  expect(inks.light).not.toBe(inks.dark)
})
