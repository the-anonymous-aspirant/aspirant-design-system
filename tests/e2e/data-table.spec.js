import { expect, test } from '@playwright/test'

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
