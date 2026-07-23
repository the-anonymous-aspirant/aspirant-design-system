import { expect, test } from '@playwright/test'

import { AA, MEASURE } from './contrast-measure.js'

// AspSplitPane — the list-plus-detail container (#2582). Behaviour (closed full
// width, ratios, scroll preservation, Escape/close focus return, labelled
// region, sub-md stacking) plus rendered contrast measured with the #2420 probe
// on the OPEN state, on the page surface AND inside a dark card, both themes
// (AC2 / §3.18) — a closed specimen never reaches the secondary pane.

const FIXTURE = '/tests/e2e/fixtures/split-pane.html'

const pane = (page) => page.locator('#interactive .split-pane')
const primary = (page) => page.locator('#interactive .split-pane__primary')
const secondary = (page) => page.locator('#interactive .split-pane__secondary')
const rows = (page) => primary(page).locator('.list-item__inner')

test.describe('structure and layout (desktop)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FIXTURE, { waitUntil: 'networkidle' })
  })

  test('closed: primary is full width and the secondary is absent (AC5)', async ({ page }) => {
    await expect(secondary(page)).toHaveCount(0)
    const paneW = await pane(page).evaluate((el) => el.clientWidth)
    const primW = await primary(page).evaluate((el) => el.clientWidth)
    // Full width, no reserved gap: the sole child fills the container.
    expect(primW).toBe(paneW)
  })

  test('open at 1:1: the two panes are within a pixel of equal width', async ({ page }) => {
    await page.locator('#toggle').click()
    await expect(secondary(page)).toBeVisible()
    const [primW, secW] = await Promise.all([
      primary(page).evaluate((el) => el.getBoundingClientRect().width),
      secondary(page).evaluate((el) => el.getBoundingClientRect().width),
    ])
    // 1:1 flex-basis:0 splits the free space evenly; the divider border is the
    // only sub-pixel asymmetry.
    expect(Math.abs(primW - secW)).toBeLessThan(2)
  })

  test('open at 2:1: the primary is about twice the secondary', async ({ page }) => {
    // A dedicated 2:1 pane lives in the contrast-page region, statically open.
    const p = page.locator('#contrast-page .split-pane__primary')
    const s = page.locator('#contrast-page .split-pane__secondary')
    const [primW, secW] = await Promise.all([
      p.evaluate((el) => el.getBoundingClientRect().width),
      s.evaluate((el) => el.getBoundingClientRect().width),
    ])
    // flex 2 vs 1 over shared free space — allow slack for the gutter/divider.
    expect(primW / secW).toBeGreaterThan(1.7)
    expect(primW / secW).toBeLessThan(2.3)
  })
})

test('primary scroll survives an open → close → open cycle (AC3)', async ({ page }) => {
  await page.goto(FIXTURE, { waitUntil: 'networkidle' })

  // Open first so the primary is a bounded scroll container, then scroll it.
  await page.locator('#toggle').click()
  await expect(secondary(page)).toBeVisible()

  await primary(page).evaluate((el) => {
    el.scrollTop = 200
  })
  const before = await primary(page).evaluate((el) => el.scrollTop)
  expect(before).toBeGreaterThan(150)

  // Close via Escape, then reopen via the external toggle (outside the primary,
  // so Playwright does not scroll the primary to reach it).
  await page.keyboard.press('Escape')
  await expect(secondary(page)).toHaveCount(0)
  await page.locator('#toggle').click()
  await expect(secondary(page)).toBeVisible()

  const after = await primary(page).evaluate((el) => el.scrollTop)
  expect(after, 'the list lost its place across the open/close cycle — the defect the pane exists to avoid').toBe(before)
})

test.describe('close and focus (AC6, AC7)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FIXTURE, { waitUntil: 'networkidle' })
  })

  test('the secondary is a labelled region focus lands in on open (AC7)', async ({ page }) => {
    await rows(page).nth(2).click()
    const region = secondary(page)
    await expect(region).toBeVisible()
    await expect(region).toHaveAttribute('role', 'region')
    await expect(region).toHaveAttribute('aria-label', 'Dataset detail')
    // Focus moved into the region so assistive tech announces it, rather than a
    // silent DOM insertion.
    await expect(region).toBeFocused()
  })

  test('Escape closes and returns focus to the row that opened it (AC6)', async ({ page }) => {
    const opener = rows(page).nth(3)
    await opener.click()
    await expect(secondary(page)).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(secondary(page)).toHaveCount(0)
    await expect(opener, 'focus did not return to the opener after Escape').toBeFocused()
  })

  test('the ✕ control closes and returns focus to the opener (AC6)', async ({ page }) => {
    const opener = rows(page).nth(1)
    await opener.click()
    await expect(secondary(page)).toBeVisible()

    await page.locator('#interactive .split-pane__close').click()
    await expect(secondary(page)).toHaveCount(0)
    await expect(opener, 'focus did not return to the opener after the ✕').toBeFocused()
  })
})

test.describe('sub-md stacking (AC4)', () => {
  test.use({ viewport: { width: 360, height: 780 } })

  test('at 360px the secondary stacks below the primary, full width, no overflow', async ({
    page,
  }) => {
    await page.goto(FIXTURE, { waitUntil: 'networkidle' })
    await page.locator('#toggle').click()
    await expect(secondary(page)).toBeVisible()

    const [primBox, secBox] = await Promise.all([
      primary(page).evaluate((el) => el.getBoundingClientRect()),
      secondary(page).evaluate((el) => el.getBoundingClientRect()),
    ])
    // Stacked: the secondary's top is at or below the primary's bottom.
    expect(secBox.top).toBeGreaterThanOrEqual(primBox.bottom - 1)
    // Full width: primary and secondary share the same width.
    expect(Math.abs(primBox.width - secBox.width)).toBeLessThan(2)

    // No horizontal overflow anywhere on the page at 360px.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
    expect(overflow, 'the page scrolls sideways at 360px').toBe(true)
  })
})

test.describe('contrast on the open state (AC2 / §3.18)', () => {
  for (const theme of ['light', 'dark']) {
    test(`every text site on the open split pane meets WCAG AA (${theme})`, async ({ page }) => {
      const q = theme === 'dark' ? '?theme=dark' : ''
      await page.goto(`${FIXTURE}${q}`, { waitUntil: 'networkidle' })

      // The statically-open regions (page + card) carry the secondary surface
      // the closed default never reaches. Measure only the split-pane subtrees.
      const roots = ['#contrast-page', '#contrast-card']
      const sites = []
      for (const root of roots) {
        for (const r of await page.evaluate(MEASURE, root)) {
          if (r.ratio < AA) sites.push({ ...r, root })
        }
      }
      const report = sites
        .sort((a, b) => a.ratio - b.ratio)
        .map((s) => `  ${s.ratio}:1  [${s.root} ${s.surface}] ${s.selector} — "${s.text}"`)
        .join('\n')
      expect(sites, `sites below ${AA}:1 in ${theme} theme:\n${report}`).toEqual([])
    })
  }

  test('the probe actually reached the open secondary surface (teeth)', async ({ page }) => {
    // A green pass above proves nothing if the secondary rendered no measurable
    // text. Assert the split-secondary surface is present and non-trivial, so a
    // future change that drops the open state out of the fixture fails loudly.
    await page.goto(FIXTURE, { waitUntil: 'networkidle' })
    const measured = (await page.evaluate(MEASURE, '#contrast-card')).filter(
      (r) => r.surface === 'split-secondary'
    )
    expect(
      measured.length,
      'no text measured on the open secondary surface — the AA pass above measured nothing'
    ).toBeGreaterThan(0)
  })
})
