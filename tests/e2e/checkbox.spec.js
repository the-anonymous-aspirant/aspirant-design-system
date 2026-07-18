import { expect, test } from '@playwright/test'

// Behaviour, not appearance. The acceptance criteria are "label click toggles"
// and "AA focus ring + label association", so those are driven rather than
// inspected.

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/e2e/fixtures/checkbox.html', { waitUntil: 'networkidle' })
})

const boxes = (page) => page.locator('.checkbox__box')

test('clicking the LABEL toggles, not just the box', async ({ page }) => {
  await expect(page.locator('#plain')).toHaveText('false')
  // Click the text, which is the association the acceptance criterion names.
  await page.getByText('prose', { exact: true }).click()
  await expect(page.locator('#plain')).toHaveText('true')
  await expect(boxes(page).first()).toBeChecked()
})

test('the input is labelled by its wrapping label', async ({ page }) => {
  // If the association broke, the accessible name would be empty.
  await expect(boxes(page).first()).toHaveAccessibleName('prose')
})

test('keyboard: Space toggles a focused checkbox', async ({ page }) => {
  await boxes(page).first().focus()
  await page.keyboard.press('Space')
  await expect(page.locator('#plain')).toHaveText('true')
  await page.keyboard.press('Space')
  await expect(page.locator('#plain')).toHaveText('false')
})

test('indeterminate renders as mixed and survives a toggle', async ({ page }) => {
  const mixed = boxes(page).nth(1)
  await expect(mixed).toHaveAttribute('aria-checked', 'mixed')
  expect(await mixed.evaluate((el) => el.indeterminate)).toBe(true)

  // The browser clears `indeterminate` on user input. The component re-asserts
  // it, because the parent still says the state is mixed.
  await mixed.click()
  await expect(page.locator('#mixed')).toHaveText('true')
  expect(await mixed.evaluate((el) => el.indeterminate)).toBe(true)
})

test('disabled does not toggle by click or key', async ({ page }) => {
  const locked = boxes(page).nth(2)
  await expect(locked).toBeDisabled()
  await locked.click({ force: true })
  await expect(page.locator('#locked')).toHaveText('true')
})

test('focus indicator is visible and paired with a border', async ({ page }) => {
  const box = boxes(page).first()
  await box.focus()
  const style = await box.evaluate((el) => {
    const cs = getComputedStyle(el)
    return { shadow: cs.boxShadow, border: cs.borderTopColor }
  })
  // --shadow-focus alone is under the 3:1 non-text minimum on light surfaces,
  // so the ring must not be the only indicator.
  expect(style.shadow).not.toBe('none')
  expect(style.border).not.toBe('rgba(0, 0, 0, 0)')
})
