/**
 * §3.120 Q11 / system_3 #9182 — on a phone a list scrolls with the page: no
 * inner scroll box under a fixed filter block. `scroll-root="window"` keeps the
 * §3.33 virtualisation (the crash-safety lever) but reads its window from the
 * page scroll, and the table's scroll wrapper takes no height cap and no
 * vertical overflow. Measured at 390×844 on 1,000 rows.
 */
import { expect, test } from '@playwright/test'

const ROW_H = 40

const open = async (page, query = '') => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`/tests/e2e/fixtures/data-table-window.html${query}`, { waitUntil: 'networkidle' })
  await page.locator('.data-table tbody tr.data-table__row').first().waitFor()
}

const dataRows = (page) => page.locator('.data-table tbody tr.data-table__row')

const scrollWindowTo = async (page, y) => {
  await page.evaluate((top) => window.scrollTo(0, top), y)
  // Let the scroll handler and the re-render settle.
  await page.waitForTimeout(200)
}

test('the page is the only scroller: no cap, no vertical scroll extent on the wrapper', async ({ page }) => {
  // `overflow-y` cannot compute `visible` here: the wrapper keeps
  // `overflow-x: auto` for the sideways scroll and edge fade (#4529), and CSS
  // computes a `visible` paired with `auto` as `auto`. What the rule needs is
  // that the wrapper never scrolls vertically: no cap, and no scroll extent.
  await open(page)
  const s = await page.locator('.data-table__scroll').evaluate((el) => {
    const cs = getComputedStyle(el)
    return { maxHeight: cs.maxHeight, inner: el.scrollHeight - el.clientHeight, cls: el.className }
  })
  expect(s.maxHeight).toBe('none')
  expect(s.inner, 'the wrapper has no vertical scroll extent').toBeLessThanOrEqual(1)
  expect(s.cls).not.toContain('data-table__scroll--virtual')
  // And the page is what moves the list.
  await page.evaluate(() => window.scrollTo(0, 4000))
  await page.waitForTimeout(200)
  expect(await page.locator('.data-table__scroll').evaluate((el) => el.scrollTop)).toBe(0)
})

test('the document grows to the full list height', async ({ page }) => {
  await open(page)
  const h = await page.evaluate(() => document.documentElement.scrollHeight)
  expect(h).toBeGreaterThanOrEqual(1000 * ROW_H)
})

test('the DOM holds a bounded window at the top, middle and end of the page scroll', async ({ page }) => {
  await open(page)
  const total = await page.evaluate(() => document.documentElement.scrollHeight)
  for (const y of [0, Math.round(total / 2), total]) {
    await scrollWindowTo(page, y)
    const count = await dataRows(page).count()
    expect(count, `rows in the DOM at scrollY ${y}`).toBeGreaterThan(0)
    expect(count, `rows in the DOM at scrollY ${y}`).toBeLessThanOrEqual(60)
  }
})

test('scrolling the window to the end renders the last row', async ({ page }) => {
  await open(page)
  await scrollWindowTo(page, await page.evaluate(() => document.documentElement.scrollHeight))
  await expect(page.locator('.data-table tbody', { hasText: 'Task 1000' })).toHaveCount(1)
  await expect(dataRows(page).last()).toBeInViewport()
})

test('the middle of the page shows the middle of the list', async ({ page }) => {
  await open(page)
  const total = await page.evaluate(() => document.documentElement.scrollHeight)
  await scrollWindowTo(page, Math.round(total / 2))
  // Whatever row sits mid-viewport is near the middle of the 1,000.
  const ids = await dataRows(page).evaluateAll((trs) =>
    trs
      .filter((tr) => {
        const r = tr.getBoundingClientRect()
        return r.bottom > 0 && r.top < innerHeight
      })
      .map((tr) => Number((tr.textContent.match(/Task (\d+)/) || [])[1])),
  )
  expect(ids.length).toBeGreaterThan(0)
  const mid = ids[Math.floor(ids.length / 2)]
  expect(mid).toBeGreaterThan(350)
  expect(mid).toBeLessThan(650)
})

test('aria-rowcount stays the canonical total under the window', async ({ page }) => {
  await open(page)
  const count = await page.locator('.data-table').getAttribute('aria-rowcount')
  expect(Number(count)).toBeGreaterThanOrEqual(1000)
})

test('below the threshold nothing changes: every row, no window', async ({ page }) => {
  await open(page, '?n=50')
  await expect(dataRows(page)).toHaveCount(50)
  await expect(page.locator('.data-table__spacer')).toHaveCount(0)
})
