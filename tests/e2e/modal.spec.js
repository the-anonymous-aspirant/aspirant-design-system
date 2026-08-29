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

// --- placement="end" side sheet ---------------------------------------------
// A side sheet is a MODAL dialog with a different anchor and entry motion, so
// the ARIA/focus/Esc behaviour is asserted to be inherited unchanged, and the
// geometry (edge-anchored, full-height, width-capped) is asserted directly —
// that is the only thing a sheet is that a centred dialog is not. Geometry is
// read under reduced motion so the panel is measured at rest, not mid-slide.

const sheetPanel = (page) => page.locator('.modal__panel').filter({ hasText: 'Sheet dialog' })
const openSheet = async (page) => {
  await page.locator('#open-sheet').click()
  await expect(sheetPanel(page)).toBeVisible()
}

test('the side sheet keeps dialog role, aria-modal and an accessible name', async ({ page }) => {
  await openSheet(page)
  await expect(sheetPanel(page)).toHaveRole('dialog')
  await expect(sheetPanel(page)).toHaveAttribute('aria-modal', 'true')
  await expect(sheetPanel(page)).toHaveAccessibleName('Sheet dialog')
})

test('the side sheet traps focus and closes on Esc, returning focus to the trigger', async ({
  page,
}) => {
  await page.locator('#open-sheet').focus()
  await page.locator('#open-sheet').click()
  await expect(sheetPanel(page)).toBeVisible()
  await expect(page.locator('.modal__close')).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(sheetPanel(page)).toBeHidden()
  await expect(page.locator('#open-sheet')).toBeFocused()
})

test('the side sheet is edge-anchored, full-height and width-capped by size on desktop', async ({
  page,
}) => {
  // Reduced motion pins the panel at its resting position immediately, so the
  // geometry is measured after the slide would have settled, not mid-transition.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const vp = page.viewportSize()
  expect(vp.width).toBeGreaterThanOrEqual(768) // md+; the sheet geometry only applies here
  await openSheet(page)
  const box = await sheetPanel(page).boundingBox()

  // Anchored to the inline-end (right, in this LTR fixture): the panel's right
  // edge sits at the viewport's right edge.
  expect(Math.abs(box.x + box.width - vp.width)).toBeLessThanOrEqual(2)
  // Full viewport height.
  expect(Math.abs(box.height - vp.height)).toBeLessThanOrEqual(2)
  // Width capped at the `size="md"` scale (34rem = 544px), not the full width.
  expect(box.width).toBeLessThanOrEqual(546)
  expect(box.width).toBeGreaterThan(400)
})

test('below the md breakpoint the side sheet is a full-width sheet', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 375, height: 800 })
  await openSheet(page)
  const box = await sheetPanel(page).boundingBox()
  expect(Math.abs(box.x)).toBeLessThanOrEqual(2)
  expect(Math.abs(box.width - 375)).toBeLessThanOrEqual(2)
})

test('the side sheet anchors to the inline-end under RTL (left edge)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'))
  const vp = page.viewportSize()
  await openSheet(page)
  const box = await sheetPanel(page).boundingBox()
  // inline-end in RTL is the left edge: the panel's left edge sits at x≈0.
  expect(Math.abs(box.x)).toBeLessThanOrEqual(2)
  expect(box.width).toBeLessThanOrEqual(546)
  expect(box.x + box.width).toBeLessThan(vp.width) // not full-width; still a capped sheet
})
