import { expect, test } from '@playwright/test'

// Option groups on AspSelect (system_3 #10701, design_agent c66290 on #10630):
// each group is a labelled role="group"; its label is never an option, and the
// keyboard walks options across groups exactly as on a flat list.

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/e2e/fixtures/select-groups.html', { waitUntil: 'networkidle' })
})

const trigger = (page) => page.locator('.select__trigger')
const panel = (page) => page.locator('.select__panel')

test('each group is a labelled role="group", and its label is not an option', async ({ page }) => {
  await trigger(page).click()
  await expect(panel(page)).toHaveRole('listbox')
  await expect(page.getByRole('group', { name: 'In' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Out' })).toBeVisible()
  await expect(page.getByRole('option')).toHaveText(['Paid work', 'Gift', 'Other', 'travel', 'other'])
  await expect(page.getByRole('group', { name: 'In' }).getByRole('option')).toHaveCount(3)
  await expect(page.getByRole('group', { name: 'Out' }).getByRole('option')).toHaveCount(2)
  await expect(page.getByRole('option', { name: 'In', exact: true })).toHaveCount(0)
  // A click on a group label selects nothing and keeps the panel open.
  await page.locator('.select__group-label', { hasText: 'Out' }).click()
  await expect(panel(page)).toBeVisible()
  await expect(page.locator('#value')).toHaveText('null')
})

test('the arrows walk across groups, skip a disabled option, and Enter selects', async ({ page }) => {
  await trigger(page).focus()
  await page.keyboard.press('ArrowDown') // opens on the first option
  const active = async () => page.locator(`#${await trigger(page).getAttribute('aria-activedescendant')}`)
  await expect(await active()).toHaveText('Paid work')
  await page.keyboard.press('ArrowDown') // Gift
  await page.keyboard.press('ArrowDown') // Other (last of In)
  await page.keyboard.press('ArrowDown') // across the group, skipping disabled travel
  await expect(await active()).toHaveText('other')
  await page.keyboard.press('Enter')
  await expect(panel(page)).toBeHidden()
  await expect(page.locator('#value')).toHaveText('out:other')
  // The closed trigger names the group (design_agent c66607).
  await expect(trigger(page).locator('.select__value')).toHaveText('Out · other')
})

test('a click on an option in a group selects it', async ({ page }) => {
  await trigger(page).click()
  await page.getByRole('group', { name: 'In' }).getByRole('option', { name: 'Gift' }).click()
  await expect(page.locator('#value')).toHaveText('in:gift')
  await expect(trigger(page).locator('.select__value')).toHaveText('In · Gift')
  // The open panel keeps its options bare.
  await trigger(page).click()
  await expect(page.getByRole('option', { name: 'Gift', exact: true })).toHaveCount(1)
})
