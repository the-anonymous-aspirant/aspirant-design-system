import { expect, test } from '@playwright/test'

// `labelHint` (#9927): a per-field "what is this" affordance, opt-in across
// the whole field-control family (AspInput, AspSelect, AspTextarea), same
// shape as the family's existing label/hint/required contract (§3.95).

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/e2e/fixtures/label-hint.html', { waitUntil: 'networkidle' })
})

test('a field with no labelHint renders no trigger', async ({ page }) => {
  await expect(page.locator('#input-without-hint .field__label-hint')).toHaveCount(0)
})

test('AspInput: the trigger shows the hint on focus', async ({ page }) => {
  const trigger = page.locator('#input-with-hint .field__label-hint')
  await expect(trigger).toBeVisible()
  await expect(page.getByRole('tooltip')).toHaveCount(0)

  await trigger.focus()
  await expect(page.getByRole('tooltip')).toHaveText('When you create the invoice.')
})

test('AspTextarea: the trigger shows the hint on focus', async ({ page }) => {
  const trigger = page.locator('#textarea-with-hint .field__label-hint')
  await trigger.focus()
  await expect(page.getByRole('tooltip')).toHaveText('Shown on the cancelled invoice record.')
})

test('AspSelect: the trigger shows the hint on focus', async ({ page }) => {
  const trigger = page.locator('#select-with-hint .select__label-hint')
  await trigger.focus()
  await expect(page.getByRole('tooltip')).toHaveText('How the payment arrived.')
})

// The trigger is reachable, and dismissible, by keyboard alone — the same
// bar AspTooltip's own suite holds every other trigger to.
test('Escape dismisses a focus-opened hint tooltip', async ({ page }) => {
  const trigger = page.locator('#input-with-hint .field__label-hint')
  await trigger.focus()
  await expect(page.getByRole('tooltip')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('tooltip')).toHaveCount(0)
})
