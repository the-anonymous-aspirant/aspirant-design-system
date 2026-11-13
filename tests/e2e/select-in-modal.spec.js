import { expect, test } from '@playwright/test'

// Escape on an open AspSelect inside an AspModal closes the list only; a
// second Escape, with the list closed, closes the modal (system_3 #10761).
for (const [mode, q] of [['plain', ''], ['searchable', '?search=1']]) {
  test(`${mode}: Escape with the list open closes only the list`, async ({ page }) => {
    await page.goto(`/tests/e2e/fixtures/select-in-modal.html${q}`, { waitUntil: 'networkidle' })
    await expect(page.locator('#modal')).toHaveText('open')
    await page.locator('.select__trigger').click()
    await expect(page.getByRole('option')).toHaveCount(3)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('option')).toHaveCount(0)
    await expect(page.locator('#modal')).toHaveText('open')
    await expect(page.locator('#value')).toHaveText('null')
    // The list is closed now, so the next Escape is the modal's.
    await page.keyboard.press('Escape')
    await expect(page.locator('#modal')).toHaveText('closed')
  })
}
