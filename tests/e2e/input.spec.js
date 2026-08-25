import { expect, test } from '@playwright/test'

// The exposed imperative surface (#4303). A component that swallows `.focus()`
// breaks every open-and-type affordance in a consumer, and breaks it in the one
// way a suite does not notice: the field still renders, still binds, still
// submits — the caret simply never arrives. So the assertion is on focus
// itself, driven through the same `ref` a consumer uses.

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/e2e/fixtures/input.html', { waitUntil: 'networkidle' })
})

const field = (page) => page.locator('.field__input')

test('focus() through a template ref lands the caret in the inner input', async ({ page }) => {
  await expect(field(page)).not.toBeFocused()
  await page.locator('#do-focus').click()
  await expect(field(page)).toBeFocused()
})

test('select() highlights the existing value so the first keystroke replaces it', async ({
  page,
}) => {
  await page.locator('#do-select').click()
  await expect(field(page)).toBeFocused()

  // Assert the behaviour a rename affordance actually depends on, not the
  // selection offsets: typing over a selected value replaces it.
  await page.keyboard.type('new name')
  await expect(field(page)).toHaveValue('new name')
  await expect(page.locator('#value')).toHaveText('new name')
})

test('el exposes the inner input element itself', async ({ page }) => {
  await expect(page.locator('#el-tag')).toHaveText('INPUT')
})
