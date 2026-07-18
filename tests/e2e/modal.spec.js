import { expect, test } from '@playwright/test'

// Behaviour, not appearance — the contrast suite covers appearance. The
// acceptance criteria for #2374 are focus-in / focus-return, ARIA, Esc,
// click-outside and scroll-lock, so each is driven against the live DOM rather
// than inspected. A focus trap asserted by reading source is not asserted.

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/e2e/fixtures/modal.html', { waitUntil: 'networkidle' })
})

const panel = (page) => page.locator('.modal__panel').filter({ hasText: 'Main dialog' })
const scrim = (page) => page.locator('.modal__scrim').first()
const openMain = async (page) => {
  await page.locator('#open-main').click()
  await expect(panel(page)).toBeVisible()
}

test('exposes dialog role, aria-modal and a name from the title', async ({ page }) => {
  await openMain(page)
  await expect(panel(page)).toHaveRole('dialog')
  await expect(panel(page)).toHaveAttribute('aria-modal', 'true')
  await expect(panel(page)).toHaveAccessibleName('Main dialog')
})

test('focus enters the dialog on open and returns to the trigger on close', async ({ page }) => {
  await page.locator('#open-main').focus()
  await page.locator('#open-main').click()
  await expect(panel(page)).toBeVisible()

  // First focusable inside the panel is the ✕.
  await expect(page.locator('.modal__close')).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(panel(page)).toBeHidden()
  await expect(page.locator('#open-main')).toBeFocused()
})

test('Tab cycles inside the dialog and never reaches the page behind it', async ({ page }) => {
  await openMain(page)

  // Walk further than the dialog has focusable elements. If the trap leaks,
  // one of these lands on #behind, which is outside every dialog.
  for (let i = 0; i < 8; i += 1) {
    await page.keyboard.press('Tab')
    await expect(page.locator('#behind')).not.toBeFocused()
    expect(await panel(page).evaluate((el) => el.contains(document.activeElement))).toBe(true)
  }
})

test('Shift+Tab wraps backwards from the first element to the last', async ({ page }) => {
  await openMain(page)
  await expect(page.locator('.modal__close')).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(page.locator('#confirm')).toBeFocused()
})

test('a dialog with nothing focusable still holds focus on its panel', async ({ page }) => {
  await page.locator('#open-bare').click()
  const bare = page.locator('.modal__panel').filter({ hasText: 'Bare dialog' })
  await expect(bare).toBeVisible()
  await expect(bare).toBeFocused()

  await page.keyboard.press('Tab')
  await expect(page.locator('#behind')).not.toBeFocused()
  await expect(bare).toBeFocused()
})

test('clicking the scrim closes a dismissible dialog', async ({ page }) => {
  await openMain(page)
  // Top-left of the viewport is scrim in every size below fullscreen.
  await scrim(page).click({ position: { x: 4, y: 4 } })
  await expect(panel(page)).toBeHidden()
  await expect(page.locator('#closes')).toHaveText('1')
})

test('a press that starts inside the panel and ends on the scrim does not close', async ({
  page,
}) => {
  await openMain(page)
  const box = await panel(page).boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(4, 4)
  await page.mouse.up()
  // A drag-select out of the dialog must not discard the draft.
  await expect(panel(page)).toBeVisible()
})

test('a non-dismissible dialog ignores Esc and scrim clicks', async ({ page }) => {
  await page.locator('#open-sticky').click()
  const sticky = page.locator('.modal__panel').filter({ hasText: 'Sticky dialog' })
  await expect(sticky).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(sticky).toBeVisible()
  await scrim(page).click({ position: { x: 4, y: 4 } })
  await expect(sticky).toBeVisible()
  await expect(page.locator('#closes')).toHaveText('0')
})

test('the ✕ closes and is labelled', async ({ page }) => {
  await openMain(page)
  await expect(page.locator('.modal__close')).toHaveAccessibleName('Close dialog')
  await page.locator('.modal__close').click()
  await expect(panel(page)).toBeHidden()
})

test('body scroll is locked while open and restored on close', async ({ page }) => {
  const overflow = () => page.evaluate(() => getComputedStyle(document.body).overflow)
  expect(await overflow()).not.toBe('hidden')

  await openMain(page)
  expect(await overflow()).toBe('hidden')

  // Locked means locked: scrolling the page behind is the classic leak.
  await page.mouse.wheel(0, 500)
  expect(await page.evaluate(() => window.scrollY)).toBe(0)

  await page.keyboard.press('Escape')
  await expect(panel(page)).toBeHidden()
  expect(await overflow()).not.toBe('hidden')
})

test('the panel is teleported to <body>, not left at the call site', async ({ page }) => {
  await openMain(page)
  // Clipping by an overflow/transform ancestor is the reason for the Teleport;
  // assert the placement rather than the symptom.
  expect(await scrim(page).evaluate((el) => el.parentElement === document.body)).toBe(true)
})
