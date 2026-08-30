import { expect, test } from '@playwright/test'

// §3.98: `as="menu"` declares the ARIA pattern and each item coordinates its own
// roles off the list context. Asserted in the ACCESSIBILITY TREE (getByRole),
// not just the DOM — a menu whose markup "looks migrated" but whose tree is
// wrong is exactly the §3.23 hazard this declared mode exists to prevent.

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/e2e/fixtures/list-menu.html', { waitUntil: 'networkidle' })
})

const menu = (page) => page.locator('[aria-label="actions menu"]')

test('as="menu" renders a menu of menuitems and neutralizes the <li>', async ({ page }) => {
  await expect(menu(page)).toHaveRole('menu')
  // The interactive inner controls are the menuitems.
  await expect(menu(page).getByRole('menuitem')).toHaveCount(3)
  // A listitem may not remain inside a role="menu": the <li> is presentational.
  await expect(menu(page).locator('.list-item').first()).toHaveAttribute('role', 'none')
  await expect(menu(page).getByRole('listitem')).toHaveCount(0)
})

test('a consumer attr lands on the inner menuitem, not the <li>', async ({ page }) => {
  // data-* forwarded to the inner control (the button), not the wrapper.
  await expect(menu(page).locator('button[data-test="rename"]')).toHaveCount(1)
  await expect(menu(page).locator('li[data-test="rename"]')).toHaveCount(0)
  // A finer aria-* (aria-haspopup on a submenu item) reaches the menuitem too.
  await expect(menu(page).locator('button[aria-haspopup="menu"]')).toHaveCount(1)
})

test('a colliding consumer role does not override the coordinated menuitem', async ({ page }) => {
  // "Move to…" passed role="tab"; the DS-owned menuitem is reserved and wins.
  const move = menu(page).locator('button', { hasText: 'Move to' })
  await expect(move).toHaveRole('menuitem')
  await expect(menu(page).getByRole('tab')).toHaveCount(0)
})
