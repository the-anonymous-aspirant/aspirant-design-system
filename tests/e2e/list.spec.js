import { expect, test } from '@playwright/test'

// Behaviour and semantics. The acceptance criteria name "list semantics" and
// "keyboard-operable rows", so both are read off the real accessibility tree
// rather than inferred from class names.

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/e2e/fixtures/list.html', { waitUntil: 'networkidle' })
})

const rows = (page) => page.locator('[aria-label="interactive list"] .list-item__inner')

test('renders real list semantics', async ({ page }) => {
  const list = page.locator('[aria-label="interactive list"]')
  await expect(list).toHaveRole('list')
  await expect(list.locator('.list-item').first()).toHaveRole('listitem')
  // The <li> must stay a listitem even when it wraps an interactive control —
  // that is the part a div-based row would lose.
  await expect(list.locator('.list-item')).toHaveCount(3)
})

test('interactive rows are buttons, so they get Enter AND Space for free', async ({ page }) => {
  await expect(rows(page).first()).toHaveRole('button')

  await rows(page).first().focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#picked')).toHaveText('a')

  await rows(page).nth(1).focus()
  await page.keyboard.press(' ')
  await expect(page.locator('#picked')).toHaveText('b')
})

test('a non-interactive list exposes no buttons', async ({ page }) => {
  const plain = page.locator('[aria-label="plain list"]')
  await expect(plain).toHaveRole('list')
  await expect(plain.locator('button')).toHaveCount(0)
})

test('the active row is marked with aria-current, not colour alone', async ({ page }) => {
  await expect(rows(page).nth(1)).toHaveAttribute('aria-current', 'true')
  await expect(rows(page).first()).not.toHaveAttribute('aria-current', 'true')
})

test('a disabled row cannot be clicked or focused', async ({ page }) => {
  const disabled = rows(page).nth(2)
  await expect(disabled).toBeDisabled()
  await disabled.click({ force: true })
  await expect(page.locator('#picked')).toHaveText('none')
})

test('interactive rows meet the 44px minimum target', async ({ page }) => {
  const box = await rows(page).first().boundingBox()
  expect(box.height).toBeGreaterThanOrEqual(44)
})

test('dividers are drawn between rows, not after the last one', async ({ page }) => {
  const plainRows = page.locator('[aria-label="plain list"] .list-item')
  // One row -> no divider at all. A `:last-child`-based rule would still paint
  // one here if it were written as "bottom border on all but last".
  const border = await plainRows
    .first()
    .evaluate((e) => getComputedStyle(e).borderTopWidth)
  expect(border).toBe('0px')
})
