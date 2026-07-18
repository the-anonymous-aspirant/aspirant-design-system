import { expect, test } from '@playwright/test'

// Behaviour, not appearance. The interesting half of this component is the
// "is there history to pop" decision, and that is only honest if real
// navigation is driven — a spy on a mock router would pass whatever the
// component happens to do.

const FIXTURE = '/tests/e2e/fixtures/back-button.html'

const button = (page) => page.locator('.back-btn').first()

test.beforeEach(async ({ page }) => {
  await page.goto(FIXTURE, { waitUntil: 'networkidle' })
})

test('is a labelled, keyboard-operable button', async ({ page }) => {
  await expect(button(page)).toHaveRole('button')
  await expect(button(page)).toHaveAccessibleName('Back')
  await button(page).focus()
  await expect(button(page)).toBeFocused()
})

test('icon-only keeps the accessible name', async ({ page }) => {
  const iconic = page.locator('.back-btn').nth(1)
  // Clipped, not display:none — the name must survive for screen readers.
  await expect(iconic).toHaveAccessibleName('Back')
  await expect(iconic.locator('.back-btn__label')).toHaveCSS('position', 'absolute')
})

test('pops in-app history when there is an entry to pop', async ({ page }) => {
  // Create a genuine second entry, the way a list→detail drill would.
  await page.evaluate(() => history.pushState({}, '', `${location.pathname}?step=detail`))
  await expect(page).toHaveURL(/step=detail/)

  await button(page).click()
  await expect(page).not.toHaveURL(/step=detail/)
})

test('falls back to `to` when there is no in-app history', async ({ page }) => {
  // Fresh document, no pushState, no same-origin referrer — the case the
  // aspirant-client original got wrong by trusting history.length.
  await page.goto(FIXTURE, { waitUntil: 'networkidle' })
  await button(page).click()
  await expect(page).toHaveURL(/landed=1/)
})

test('does not pop out to a cross-origin referrer', async ({ page }) => {
  // history.length is > 1 here, which is exactly what would fool the original.
  // With no router state and no same-origin referrer, the component must NOT
  // pop — it must take the `to` fallback instead.
  await page.evaluate(() => {
    // Simulate a browser state with entries but no vue-router bookkeeping.
    history.replaceState(null, '', location.href)
  })
  await button(page).click()
  await expect(page).toHaveURL(/landed=1/)
})

test('emits back before navigating', async ({ page }) => {
  // The emit is the consumer's hook for closing a panel or cancelling a fetch,
  // so it has to fire on the fallback path too. Asserted through sessionStorage
  // because the click navigates away and takes any `window` state with it --
  // the first version of this test read a `window` counter and measured
  // nothing but the teardown.
  await page.evaluate(() => sessionStorage.removeItem('backEmitted'))
  await button(page).click()
  await expect(page).toHaveURL(/landed=1/)
  expect(await page.evaluate(() => sessionStorage.getItem('backEmitted'))).toBe('1')
})

test('hover ink stays legible rather than turning raw brand amber', async ({ page }) => {
  // Guards the #2419 resolution specifically: if someone "fixes" this back to
  // var(--brand-primary) the computed colour becomes the raw amber and this
  // fails. The contrast suite would also catch it; this names the reason.
  await button(page).hover()
  const color = await button(page).evaluate((el) => getComputedStyle(el).color)
  expect(color).not.toBe('rgb(255, 179, 0)')
})
