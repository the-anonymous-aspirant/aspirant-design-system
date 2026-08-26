import { expect, test } from '@playwright/test'

import { AA, MEASURE } from './contrast-measure.js'

// AspSegmented (§3.89, #4329): a single-select strip. v-model selection, correct
// radiogroup/tablist semantics + roving-focus keyboard nav, a token-backed
// selected emphasis that stays AA on the page and on a dark card.

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/e2e/fixtures/segmented.html', { waitUntil: 'networkidle' })
})

const selVal = (page, key) => page.evaluate((k) => window.__seg[k].value, key)
const items = (page, id) => page.locator(`#${id} button`)

test('v-model single-select: exactly one selected; clicking emits update (AC1)', async ({
  page,
}) => {
  // Seeded 'active'.
  expect(await selVal(page, 'filter')).toBe('active')
  await expect(page.locator('#filter button[aria-checked="true"]')).toHaveCount(1)

  await items(page, 'filter').first().click() // 'All'
  expect(await selVal(page, 'filter')).toBe('all')
  await expect(page.locator('#filter button[aria-checked="true"]')).toHaveCount(1)
  await expect(items(page, 'filter').first()).toHaveAttribute('aria-checked', 'true')
})

test('radiogroup semantics + one roving tab-stop (AC2)', async ({ page }) => {
  const group = page.locator('#filter > div')
  await expect(group).toHaveAttribute('role', 'radiogroup')
  await expect(group).toHaveAttribute('aria-label', 'Filter')
  for (const b of await items(page, 'filter').all()) {
    await expect(b).toHaveAttribute('role', 'radio')
  }
  // Exactly one member is in the tab order (roving tabindex).
  await expect(page.locator('#filter button[tabindex="0"]')).toHaveCount(1)
})

test('tabs semantics: role=tab + aria-selected + aria-controls (AC2)', async ({ page }) => {
  const group = page.locator('#tabs > div')
  await expect(group).toHaveAttribute('role', 'tablist')
  const first = items(page, 'tabs').first()
  await expect(first).toHaveAttribute('role', 'tab')
  await expect(first).toHaveAttribute('aria-selected', 'true')
  await expect(first).toHaveAttribute('aria-controls', 'panel-list')
})

test('keyboard: arrows move+select (skipping disabled), Home/End, Enter (AC2)', async ({ page }) => {
  const its = items(page, 'filter')
  await its.nth(1).focus() // 'Active' (selected)
  await page.keyboard.press('ArrowRight')
  expect(await selVal(page, 'filter')).toBe('done')
  await expect(its.nth(2)).toBeFocused()

  // ArrowRight from 'Done' skips the disabled 'Archived' and wraps to 'All'.
  await page.keyboard.press('ArrowRight')
  expect(await selVal(page, 'filter')).toBe('all')
  await expect(its.nth(0)).toBeFocused()

  // ArrowLeft from 'All' wraps backwards, skipping disabled 'Archived' → 'Done'.
  await page.keyboard.press('ArrowLeft')
  expect(await selVal(page, 'filter')).toBe('done')

  await page.keyboard.press('Home')
  expect(await selVal(page, 'filter')).toBe('all')
  await page.keyboard.press('End') // last ENABLED is 'Done' (Archived disabled)
  expect(await selVal(page, 'filter')).toBe('done')

  await its.nth(1).focus()
  await page.keyboard.press('Enter')
  expect(await selVal(page, 'filter')).toBe('active')
})

test('disabled member is not selectable (AC2)', async ({ page }) => {
  const archived = items(page, 'filter').nth(3)
  await expect(archived).toBeDisabled()
  await archived.click({ force: true }).catch(() => {})
  expect(await selVal(page, 'filter')).not.toBe('archived')
})

test('selected member is a token-backed emphasis, distinct from unselected (AC3)', async ({
  page,
}) => {
  const selected = page.locator('#filter button[aria-checked="true"]')
  const selBg = await selected.evaluate((el) => getComputedStyle(el).backgroundColor)
  const selShadow = await selected.evaluate((el) => getComputedStyle(el).boxShadow)
  expect(selBg).not.toBe('rgba(0, 0, 0, 0)') // the currentColor-mix fill painted
  expect(selShadow).not.toBe('none') // the brand underline
  const other = page.locator('#filter button[aria-checked="false"]').first()
  const otherBg = await other.evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(otherBg).not.toBe(selBg) // unselected stays calm/transparent
})

for (const surface of ['filter', 'filter-dark']) {
  test(`members stay AA on the ${surface} surface (AC3)`, async ({ page }) => {
    const sites = await page.evaluate(MEASURE, `#${surface}`)
    expect(sites.length).toBeGreaterThan(0)
    const failures = sites.filter((s) => s.ratio < AA)
    expect(
      failures,
      failures.map((f) => `"${f.text}" ${f.ratio}:1`).join(', '),
    ).toHaveLength(0)
  })
}
