import { expect, test } from '@playwright/test'

import { AA, MEASURE } from './contrast-measure.js'

// The acceptance criterion for #2779 is crash-safety: with a full §3.28 window
// (500 rows) the rendered DOM node count is bounded to ~viewport+overscan, NOT
// 500. These assertions read the bound off the real DOM, and check the a11y
// total stays canonical rather than the windowed slice.

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/e2e/fixtures/data-table.html', { waitUntil: 'networkidle' })
})

const bigRows = (page) => page.locator('#big .data-table__row')
const smallRows = (page) => page.locator('#small .data-table__row')
const bigScroll = (page) => page.locator('#big .data-table__scroll')

test('a 500-row table renders a viewport-bounded number of rows, not 500', async ({ page }) => {
  const count = await bigRows(page).count()
  expect(count).toBeGreaterThan(0)
  // ~viewport + overscan — nowhere near the 500 fetched rows.
  expect(count).toBeLessThan(100)
})

test('aria-rowcount reports the canonical total, not the windowed slice', async ({ page }) => {
  // 500 data rows + the header row.
  await expect(page.locator('#big table')).toHaveAttribute('aria-rowcount', '501')
})

test('the scroll viewport holds the full extent via spacer rows', async ({ page }) => {
  const scrollH = await bigScroll(page).evaluate((el) => el.scrollHeight)
  // 500 rows × 40px ≈ 20000px of scrollable extent, minus a little for chrome.
  expect(scrollH).toBeGreaterThan(500 * 40 * 0.9)
})

test('scrolling advances the window without unbounding the DOM', async ({ page }) => {
  await expect(bigRows(page).first()).toHaveAttribute('data-row-index', '0')

  await bigScroll(page).evaluate((el) => (el.scrollTop = 8000))
  // The window slides to the rows around 8000/40 = 200.
  await expect(bigRows(page).first()).toHaveAttribute('data-row-index', /^(19[2-9]|2\d\d)$/)
  expect(await bigRows(page).count()).toBeLessThan(100)
})

test('a small table renders every row with no window, no spacers, no viewport', async ({
  page,
}) => {
  await expect(smallRows(page)).toHaveCount(5)
  await expect(page.locator('#small .data-table__spacer')).toHaveCount(0)
  await expect(page.locator('#small .data-table__scroll--virtual')).toHaveCount(0)
  // Below the threshold there is no windowing, so no canonical-total override.
  expect(await page.locator('#small table').getAttribute('aria-rowcount')).toBeNull()
})

test('sorting the windowed table reorders and resets the viewport to the top', async ({ page }) => {
  await bigScroll(page).evaluate((el) => (el.scrollTop = 8000))
  await expect(bigRows(page).first()).not.toHaveAttribute('data-row-index', '0')

  await page.locator('#big thead button', { hasText: 'Name' }).click()

  // A sort returns the reader to the top of the newly-ordered list.
  await expect(bigRows(page).first()).toHaveAttribute('data-row-index', '0')
  expect(await bigRows(page).count()).toBeLessThan(100)
})

// --- Per-row hooks (§3.88, #4318) -------------------------------------------
// rowAttrs (attribute pass-through + reserved-key guard) and rowState (closed,
// token-backed emphasis vocabulary), including under virtualization.

test('rowAttrs spreads consumer test hooks onto the data <tr>', async ({ page }) => {
  const first = page.locator('#attrs .data-table__row').first()
  await expect(first).toHaveAttribute('data-test-row-id', '1')
  await expect(first).toHaveAttribute('data-test-source', 'aspirant')
})

test('rowAttrs cannot clobber the component-owned reserved keys', async ({ page }) => {
  const first = page.locator('#attrs .data-table__row').first()
  // Consumer class is stripped — only the component's own class survives.
  await expect(first).toHaveClass(/data-table__row/)
  await expect(first).not.toHaveClass(/consumer-hacked/)
  // data-row-index is the component's absolute index (0), not the consumer's 999.
  await expect(first).toHaveAttribute('data-row-index', '0')
  // tabindex (consumer 99) and role ('presentation') are reserved → not present.
  expect(await first.getAttribute('tabindex')).toBeNull()
  expect(await first.getAttribute('role')).toBeNull()
  // The consumer's onClick was stripped — clicking wires nothing.
  await first.click()
  expect(await page.evaluate(() => window.__consumerClicked)).toBeFalsy()
})

test('rowState applies only the closed muted|active vocabulary', async ({ page }) => {
  const rows = page.locator('#state .data-table__row')
  await expect(rows.nth(0)).toHaveClass(/data-table__row--muted/)
  await expect(rows.nth(1)).toHaveClass(/data-table__row--active/)
  // Row 2 returned an out-of-set value → neither modifier, and no raw class leak.
  await expect(rows.nth(2)).not.toHaveClass(/data-table__row--muted/)
  await expect(rows.nth(2)).not.toHaveClass(/data-table__row--active/)
  await expect(rows.nth(2)).not.toHaveClass(/bogus/)
})

test('rowState emphasis is token-painted and distinct (active tint + accent, muted de-emphasised)', async ({
  page,
}) => {
  const activeCell = page.locator('#state .data-table__row--active td').first()
  const bg = await activeCell.evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(bg).not.toBe('rgba(0, 0, 0, 0)') // the brand tint resolved and painted
  expect(bg).not.toBe('transparent')
  const shadow = await activeCell.evaluate((el) => getComputedStyle(el).boxShadow)
  expect(shadow).not.toBe('none') // the left accent bar
  // A muted row's ink is de-emphasised vs a plain (stateless) row's ink.
  const mutedInk = await page
    .locator('#state .data-table__row--muted td')
    .first()
    .evaluate((el) => getComputedStyle(el).color)
  const plainInk = await page
    .locator('#state .data-table__row')
    .nth(3)
    .locator('td')
    .first()
    .evaluate((el) => getComputedStyle(el).color)
  expect(mutedInk).not.toBe(plainInk)
})

for (const surface of ['state', 'state-dark']) {
  test(`rowState rows stay AA on the ${surface} surface`, async ({ page }) => {
    const sites = await page.evaluate(MEASURE, `#${surface}`)
    expect(sites.length).toBeGreaterThan(0)
    const failures = sites.filter((s) => s.ratio < AA)
    expect(
      failures,
      failures.map((f) => `"${f.text}" ${f.ratio}:1`).join(', '),
    ).toHaveLength(0)
  })
}

// --- Horizontal-overflow edge cue (#4529) -----------------------------------
// A wide table in a narrow container overflows horizontally; the viewport
// toggles --overflow-start / --overflow-end so an edge-fade signals "more to
// scroll" at each end. A table that fits shows neither.

const viewport = (page, id) => page.locator(`#${id} .data-table__viewport`)
const scrollOf = (page, id) => page.locator(`#${id} .data-table__scroll`)

test('a table that fits its container shows no overflow cue', async ({ page }) => {
  const vp = viewport(page, 'fits')
  await expect(vp).not.toHaveClass(/data-table__viewport--overflow-start/)
  await expect(vp).not.toHaveClass(/data-table__viewport--overflow-end/)
})

test('an overflowing table cues the trailing edge at rest and swaps as it scrolls', async ({
  page,
}) => {
  const vp = viewport(page, 'overflow-light')
  const scroll = scrollOf(page, 'overflow-light')
  // Sanity: the table really does overflow its narrow container.
  const overflows = await scroll.evaluate((el) => el.scrollWidth > el.clientWidth + 1)
  expect(overflows).toBe(true)

  // At rest (scrollLeft 0): trailing cue on, leading cue off.
  await expect(vp).toHaveClass(/data-table__viewport--overflow-end/)
  await expect(vp).not.toHaveClass(/data-table__viewport--overflow-start/)

  // Scroll partway: both edges cue.
  await scroll.evaluate((el) => (el.scrollLeft = 40))
  await expect(vp).toHaveClass(/data-table__viewport--overflow-start/)
  await expect(vp).toHaveClass(/data-table__viewport--overflow-end/)

  // Scroll to the true end: leading cue on, trailing cue off.
  await scroll.evaluate((el) => (el.scrollLeft = el.scrollWidth))
  await expect(vp).toHaveClass(/data-table__viewport--overflow-start/)
  await expect(vp).not.toHaveClass(/data-table__viewport--overflow-end/)
})

test('the edge-fade colour resolves to the table’s own surface, light and dark', async ({
  page,
}) => {
  // The fade dissolves into --asp-dt-surface, set inline to the resolved
  // ancestor background — the light page on one section, the dark card on the
  // other — so it composites without a visible band on either.
  const lightSurface = await viewport(page, 'overflow-light').evaluate((el) =>
    el.style.getPropertyValue('--asp-dt-surface').trim(),
  )
  const darkSurface = await viewport(page, 'overflow-dark').evaluate((el) =>
    el.style.getPropertyValue('--asp-dt-surface').trim(),
  )
  expect(lightSurface).not.toBe('')
  expect(darkSurface).not.toBe('')
  // Different surfaces → different resolved fade colours (no single hardcoded value).
  expect(lightSurface).not.toBe(darkSurface)
})

test('per-row hooks key off the absolute index under virtualization', async ({ page }) => {
  const rows = () => page.locator('#bighooks .data-table__row')
  // First visible row: rowAttrs stamped the absolute index, matching data-row-index.
  await expect(rows().first()).toHaveAttribute('data-abs', '0')
  await expect(rows().first()).toHaveAttribute('data-row-index', '0')
  // The active row (absolute index 250) is outside the initial window...
  await expect(page.locator('#bighooks .data-table__row--active')).toHaveCount(0)
  // ...scroll it into view (250 × 40 = 10000px); it appears, keyed by absolute index.
  await page.locator('#bighooks .data-table__scroll').evaluate((el) => (el.scrollTop = 10000))
  const active = page.locator('#bighooks .data-table__row--active')
  await expect(active).toHaveCount(1)
  await expect(active).toHaveAttribute('data-row-index', '250')
  await expect(active).toHaveAttribute('data-abs', '250')
})
