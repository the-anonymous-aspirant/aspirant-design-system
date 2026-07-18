import { expect, test } from '@playwright/test'

// Behaviour, not appearance — the contrast suite covers appearance. Keyboard
// and ARIA are asserted by driving real events against the live DOM, because a
// dropdown that measures beautifully and cannot be operated by keyboard is not
// shipped.

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/e2e/fixtures/select.html', { waitUntil: 'networkidle' })
})

const trigger = (page) => page.locator('.select__trigger')
const panel = (page) => page.locator('.select__panel')
const options = (page) => page.locator('.select__option')

test('opens on click and exposes combobox/listbox roles', async ({ page }) => {
  await expect(trigger(page)).toHaveAttribute('aria-expanded', 'false')
  await trigger(page).click()
  await expect(panel(page)).toBeVisible()
  await expect(trigger(page)).toHaveAttribute('aria-expanded', 'true')
  await expect(trigger(page)).toHaveRole('combobox')
  await expect(panel(page)).toHaveRole('listbox')
  await expect(options(page).first()).toHaveRole('option')
})

test('arrow keys move the active option and skip disabled ones', async ({ page }) => {
  await trigger(page).focus()
  await page.keyboard.press('ArrowDown') // opens
  await expect(panel(page)).toBeVisible()

  // 'option c' is disabled; ArrowDown from b must land on d, not c.
  await page.keyboard.press('ArrowDown') // -> b
  await page.keyboard.press('ArrowDown') // -> d, skipping disabled c
  const activeId = await trigger(page).getAttribute('aria-activedescendant')
  await expect(page.locator(`#${activeId}`)).toHaveText('option d')
})

test('aria-activedescendant tracks the active option', async ({ page }) => {
  await trigger(page).focus()
  await page.keyboard.press('ArrowDown')
  const id = await trigger(page).getAttribute('aria-activedescendant')
  expect(id).toBeTruthy()
  await expect(page.locator(`#${id}`)).toHaveAttribute('data-active', 'true')
})

test('Enter selects the active option and closes', async ({ page }) => {
  await trigger(page).focus()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown') // -> option b
  await page.keyboard.press('Enter')
  await expect(panel(page)).toBeHidden()
  await expect(page.locator('#value')).toHaveText('b')
  await expect(trigger(page)).toHaveText(/option b/)
})

test('Escape closes without selecting and returns focus to the trigger', async ({ page }) => {
  await trigger(page).focus()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Escape')
  await expect(panel(page)).toBeHidden()
  await expect(page.locator('#value')).toHaveText('null')
  await expect(trigger(page)).toBeFocused()
})

test('clicking outside closes without selecting', async ({ page }) => {
  await trigger(page).click()
  await expect(panel(page)).toBeVisible()
  await page.mouse.click(5, 5)
  await expect(panel(page)).toBeHidden()
  await expect(page.locator('#value')).toHaveText('null')
})

test('a disabled option cannot be chosen by click', async ({ page }) => {
  await trigger(page).click()
  await options(page).nth(2).click({ force: true }) // 'option c', disabled
  await expect(page.locator('#value')).toHaveText('null')
  await expect(panel(page)).toBeVisible()
})
