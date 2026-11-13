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

// A grouped list may also hold plain options (system_3 #10712, design_agent
// c66693): "All categories" sits above In and Out, in no group and under no
// heading, and its trigger reads the bare label.
test.describe('a plain option above the groups', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/e2e/fixtures/select-groups.html?mixed=1', { waitUntil: 'networkidle' })
  })

  test('renders outside every group, first, with no heading', async ({ page }) => {
    await trigger(page).click()
    await expect(page.getByRole('option')).toHaveText(['All categories', 'Paid work', 'Gift', 'Other', 'travel', 'other'])
    await expect(page.getByRole('group')).toHaveCount(2)
    await expect(page.getByRole('group').getByRole('option', { name: 'All categories' })).toHaveCount(0)
    // It is a direct child of the listbox, like a flat-list option.
    await expect(panel(page).locator(':scope > .select__option')).toHaveText(['All categories'])
    await expect(page.locator('.select__group-label')).toHaveText(['In', 'Out'])
  })

  test('choosing it reads the bare label; ArrowDown from it reaches In', async ({ page }) => {
    await trigger(page).click()
    await page.getByRole('option', { name: 'All categories' }).click()
    await expect(page.locator('#value')).toHaveText('all')
    await expect(trigger(page).locator('.select__value')).toHaveText('All categories')

    await trigger(page).focus()
    await page.keyboard.press('ArrowDown') // opens on the selected plain option
    const active = async () => page.locator(`#${await trigger(page).getAttribute('aria-activedescendant')}`)
    await expect(await active()).toHaveText('All categories')
    await page.keyboard.press('ArrowDown')
    await expect(await active()).toHaveText('Paid work')
    await expect(await active()).toHaveAttribute('role', 'option')
    await expect(page.getByRole('group', { name: 'In' }).getByRole('option', { name: 'Paid work' })).toHaveAttribute('data-active', 'true')
  })

  test("Out's other still names its group", async ({ page }) => {
    await trigger(page).click()
    await page.getByRole('group', { name: 'Out' }).getByRole('option', { name: 'other' }).click()
    await expect(trigger(page).locator('.select__value')).toHaveText('Out · other')
  })

  test('the plain run and the first group are divided like two groups', async ({ page }) => {
    await trigger(page).click()
    const top = (sel) => page.locator(sel).first().evaluate((el) => getComputedStyle(el).borderTopWidth)
    expect(await top('.select__group')).toBe('1px') // In, after All categories
    expect(await top('.select__group + .select__group')).toBe('1px') // Out, after In
  })
})

test('a group with no label lends nothing to the trigger', async ({ page }) => {
  await page.goto('/tests/e2e/fixtures/select-groups.html?unlabelled=1', { waitUntil: 'networkidle' })
  await trigger(page).click()
  await page.getByRole('option', { name: 'Stray' }).click()
  await expect(trigger(page).locator('.select__value')).toHaveText('Stray')
})
