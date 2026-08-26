import { expect, test } from '@playwright/test'

// The exposed imperative surface (#4303). A component that swallows `.focus()`
// breaks every open-and-type affordance in a consumer, and breaks it in the one
// way a suite does not notice: the field still renders, still binds, still
// submits — the caret simply never arrives. So the assertion is on focus
// itself, driven through the same `ref` a consumer uses.

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/e2e/fixtures/input.html', { waitUntil: 'networkidle' })
})

const field = (page) => page.locator('[data-field="rename"]')

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

// The widened `type` contract (#4303). password/email/tel/url are text-shaped:
// same box, same styles, different keystroke handling. Vue's prop validator
// only WARNS on a rejected value — the field still renders and still binds — so
// reading the rendered attribute is not sufficient on its own. The console is
// the second half of the assertion.
const MODES = ['password', 'email', 'tel', 'url']

test('renders each text-shaped mode with its type and no validator warning', async ({ page }) => {
  const warnings = []
  page.on('console', (msg) => {
    if (msg.type() === 'warning' || msg.type() === 'error') warnings.push(msg.text())
  })
  await page.goto('/tests/e2e/fixtures/input.html', { waitUntil: 'networkidle' })

  for (const mode of MODES) {
    await expect(page.locator(`[data-mode="${mode}"]`)).toHaveAttribute('type', mode)
  }

  expect(warnings.filter((w) => w.includes('Invalid prop'))).toEqual([])
})

test('a password field masks its value while still binding it', async ({ page }) => {
  const pw = page.locator('[data-mode="password"]')
  await pw.fill('hunter2')
  // The DOM value is the real one; the masking is the browser's, which is the
  // entire point of routing the mode through to the native input rather than
  // restyling a text field to look like a password field.
  await expect(pw).toHaveValue('hunter2')
  await expect(pw).toHaveAttribute('type', 'password')
})

test('the widened modes keep the shared 34px control box', async ({ page }) => {
  const base = await page.locator('.field__control').first().boundingBox()
  for (const mode of MODES) {
    const box = await page.locator(`[data-mode="${mode}"]`).locator('..').boundingBox()
    expect(box.height).toBeCloseTo(base.height, 0)
  }
})
