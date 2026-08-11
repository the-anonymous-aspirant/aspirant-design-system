import { expect, test } from '@playwright/test'

// AspBadge `chip` + `removable` (system_3 #3677 AC5): additive, no new
// component, no change to existing call sites — omitted (or explicit false)
// renders today's DOM byte-for-byte; `removable` buys the × and the `remove`
// emit, reusing the `filter` variant's × treatment.

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/e2e/fixtures/badge-chip.html', { waitUntil: 'networkidle' })
})

test('a chip with no removable prop carries no remove button', async ({ page }) => {
  await expect(page.locator('#plain-chip .badge__remove')).toHaveCount(0)
})

test('a chip with removable explicitly false is identical to omitted', async ({ page }) => {
  await expect(page.locator('#default-chip .badge__remove')).toHaveCount(0)
  // Byte-for-byte: same outerHTML modulo nothing (no removable-only class/attr).
  const plainHtml = await page.locator('#plain-chip .badge').innerHTML()
  const defaultHtml = await page.locator('#default-chip .badge').innerHTML()
  expect(defaultHtml).toBe(plainHtml)
})

test('removable chip carries the × and emits remove', async ({ page }) => {
  const button = page.locator('#removable-chip .badge__remove')
  await expect(button).toHaveCount(1)
  await expect(page.locator('#remove-events')).toHaveText('0')
  await button.click()
  await expect(page.locator('#remove-events')).toHaveText('1')
})
