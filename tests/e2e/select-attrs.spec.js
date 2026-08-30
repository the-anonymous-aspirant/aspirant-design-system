import { expect, test } from '@playwright/test'

// §3.95, criteria 3 + 4: a consumer's fall-through attrs reach the labelable
// trigger <button>, not the wrapper <div>. The wrapper is not a labelable
// element, so an external <label for="x"> pointing at a wrapper id names
// nothing — the #4477 defect that forced an aria-label workaround. The id is
// label-conditional: the component's own <label for> keeps the trigger id when
// a `label` prop is present so the internal association is never broken.

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/e2e/fixtures/select-attrs.html', { waitUntil: 'networkidle' })
})

test('with no label prop, a consumer id (and data-*) forwards to the trigger button', async ({
  page,
}) => {
  const scope = page.locator('#no-label')
  const trigger = scope.locator('button.select__trigger')

  // The id landed on the labelable <button>, not the wrapper <div>.
  await expect(trigger).toHaveAttribute('id', 'ext-agent')
  await expect(scope.locator('div.select')).not.toHaveAttribute('id', 'ext-agent')

  // ...so the external <label for="ext-agent"> resolves to a labelable control:
  // activating the label focuses the trigger.
  await scope.locator('label[for="ext-agent"]').click()
  await expect(trigger).toBeFocused()

  // A non-reserved data-* attr rides the same fall-through onto the trigger.
  await expect(trigger).toHaveAttribute('data-probe', 'x')
})

test('with a label prop, the internal association owns the trigger id', async ({ page }) => {
  const scope = page.locator('#with-label')
  const trigger = scope.locator('button.select__trigger')

  // A consumer id does not override the generated trigger id when `label` is set.
  await expect(trigger).not.toHaveAttribute('id', 'should-not-win')
  const id = await trigger.getAttribute('id')
  expect(id).toMatch(/^asp-select-.+-trigger$/)

  // The component's own caption <label for> still targets that generated id.
  await expect(scope.locator(`label.select__label[for="${id}"]`)).toBeVisible()
})
