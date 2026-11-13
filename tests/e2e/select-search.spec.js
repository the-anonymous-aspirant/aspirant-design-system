import { expect, test } from '@playwright/test'

// An opt-in search field in AspSelect's open panel (system_3 #10748,
// design_conventions §3.149). The letters (a)-(i) are the task's acceptance.

const open = (page, q = '') => page.goto(`/tests/e2e/fixtures/select-search.html${q}`, { waitUntil: 'networkidle' })
const trigger = (page) => page.locator('.select__trigger')
const field = (page) => page.locator('.select__search-input')
const options = (page) => page.getByRole('option')
const value = (page) => page.locator('#value')
const activeText = async (page) => {
  const id = await field(page).getAttribute('aria-activedescendant')
  return id ? (await page.locator(`#${id}`).innerText()).trim() : null
}

test('(a) without searchable there is no field, and the panel is the listbox as before', async ({ page }) => {
  await open(page, '?plain=1')
  await trigger(page).click()
  await expect(page.locator('.select__panel')).toHaveRole('listbox')
  await expect(field(page)).toHaveCount(0)
  await expect(page.locator('.select__live')).toHaveCount(0)
  await expect(options(page)).toHaveCount(30)
})

test('(b) typing narrows by label, by search text and by two words in reverse order, ignoring case', async ({ page }) => {
  await open(page)
  await trigger(page).click()
  await expect(field(page)).toBeFocused()
  await expect(field(page)).toHaveAttribute('placeholder', 'Number or title')
  // By the label's number.
  await field(page).fill('#8337')
  await expect(options(page)).toHaveText([/^#8337 /])
  // By a word only in the search text, past the 40-character label cut.
  await field(page).fill('GERMAN')
  await expect(options(page)).toHaveText([/^#8300 Retroactive invoice app/])
  // Two words, reversed, mixed case.
  await field(page).fill('Paypal INVOICE')
  await expect(options(page)).toHaveText([/^#8300 /])
  // Order is kept: two matches stay in list order.
  await field(page).fill('import')
  await expect(options(page)).toHaveText([/^#8300 /, /^#8744 N26 import/])
})

test('(c) Enter picks the first match and closes, focus back on the trigger', async ({ page }) => {
  await open(page)
  await trigger(page).click()
  await field(page).fill('temperature')
  expect(await activeText(page)).toMatch(/^#8966 Cell temperature/)
  await page.keyboard.press('Enter')
  await expect(page.locator('.select__panel')).toBeHidden()
  await expect(value(page)).toHaveText('e8966')
  await expect(trigger(page)).toBeFocused()
  // The text was dropped: reopening shows the full list.
  await trigger(page).click()
  await expect(field(page)).toHaveValue('')
  await expect(options(page)).toHaveCount(30)
})

test('(d) no match shows the line, is announced, and the arrows reach no option', async ({ page }) => {
  await open(page)
  await trigger(page).click()
  await field(page).fill('zebra quantum')
  await expect(options(page)).toHaveCount(0)
  await expect(page.locator('.select__empty--nomatch')).toHaveText('No match for "zebra quantum"')
  await expect(page.locator('.select__live')).toHaveText('No match for "zebra quantum"')
  await expect(page.locator('.select__live')).toHaveAttribute('aria-live', 'polite')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowUp')
  expect(await field(page).getAttribute('aria-activedescendant')).toBeNull()
  await page.keyboard.press('Enter')
  await expect(page.locator('.select__panel')).toBeVisible()
  await expect(value(page)).toHaveText('null')
})

test('the arrows walk only the matches and skip a disabled one', async ({ page }) => {
  await open(page)
  await trigger(page).click()
  // #8411 (Changelog, disabled) matches "per" too, and is skipped.
  await field(page).fill('per')
  expect(await activeText(page)).toMatch(/^#8337 Admin page: per-service/)
  await page.keyboard.press('ArrowDown')
  const next = await activeText(page)
  expect(next).not.toMatch(/^#8411 /)
  await page.keyboard.press('ArrowUp')
  expect(await activeText(page)).toMatch(/^#8337 /)
})

test('(e) Escape and an outside press leave the value unchanged', async ({ page }) => {
  await open(page)
  await trigger(page).click()
  await field(page).fill('temperature')
  await page.keyboard.press('Escape')
  await expect(page.locator('.select__panel')).toBeHidden()
  await expect(value(page)).toHaveText('null')
  await expect(trigger(page)).toBeFocused()
  await trigger(page).click()
  await field(page).fill('temperature')
  await page.locator('#outside').click()
  await expect(page.locator('.select__panel')).toBeHidden()
  await expect(value(page)).toHaveText('null')
})

test('(f) a printable key on the closed trigger opens the panel with that character in the field', async ({ page }) => {
  await open(page)
  await trigger(page).focus()
  await page.keyboard.press('g')
  await expect(page.locator('.select__panel')).toBeVisible()
  await expect(field(page)).toBeFocused()
  await expect(field(page)).toHaveValue('g')
  await page.keyboard.type('erman')
  await expect(options(page)).toHaveText([/^#8300 /])
})

test('(h) a grouped list hides a group whose options all miss', async ({ page }) => {
  await open(page, '?grouped=1')
  await trigger(page).click()
  await expect(page.getByRole('group')).toHaveCount(2)
  await field(page).fill('verify lane')
  await expect(page.getByRole('group', { name: 'Platform' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Invoicing' })).toHaveCount(0)
  await expect(options(page)).toHaveText([/Verify lane/])
})

test('(i) at most one element carries aria-activedescendant while the panel is open', async ({ page }) => {
  await open(page)
  await trigger(page).click()
  const pointers = () => page.locator('[aria-activedescendant]').count()
  expect(await pointers()).toBe(1)
  await field(page).fill('import')
  expect(await pointers()).toBe(1)
  await page.keyboard.press('ArrowDown')
  expect(await pointers()).toBe(1)
  // The field names itself after the select and owns the listbox.
  await expect(field(page)).toHaveAttribute('role', 'combobox')
  await expect(field(page)).toHaveAttribute('aria-label', 'Filter Epic')
  await expect(field(page)).toHaveAttribute('aria-autocomplete', 'list')
  const listbox = await field(page).getAttribute('aria-controls')
  await expect(page.locator(`#${listbox}`)).toHaveRole('listbox')
  await expect(trigger(page)).toHaveAttribute('aria-expanded', 'true')
})

test.describe('on a touch screen', () => {
  test.use({ hasTouch: true })

  test('(g) a touch open leaves focus off the field, and a tap on the field focuses it', async ({ page }) => {
    await open(page)
    await trigger(page).tap()
    await expect(page.locator('.select__panel')).toBeVisible()
    await expect(field(page)).not.toBeFocused()
    await field(page).tap()
    await expect(field(page)).toBeFocused()
  })
})

test('placement: the field and a narrowed list stay in the 15rem cap, and the panel is placed again', async ({ page }) => {
  await open(page)
  await trigger(page).click()
  const box = async () => page.locator('.select__panel').boundingBox()
  const full = await box()
  expect(full.height).toBeLessThanOrEqual(15 * 16 + 1)
  await field(page).fill('temperature')
  await expect(options(page)).toHaveCount(1)
  const narrowed = await box()
  expect(narrowed.height).toBeLessThan(full.height)
  const t = await trigger(page).boundingBox()
  // Opens downward: the panel starts just below the trigger.
  expect(narrowed.y).toBeGreaterThanOrEqual(t.y + t.height - 1)
  expect(narrowed.y).toBeLessThan(t.y + t.height + 16)
})

// design_agent c67019 on #10748 (§3.149 Decision 3): the side is chosen at open
// and holds, and narrowing never moves the field she types into, even when the
// panel opened above the trigger.
test('(j) a panel opened above keeps its side, and the field does not move while she types', async ({ page }) => {
  await open(page, '?bottom=1')
  await trigger(page).click()
  await expect(field(page)).toBeFocused()
  const t = await trigger(page).boundingBox()
  const above = async () => (await page.locator('.select__panel').boundingBox()).y + (await page.locator('.select__panel').boundingBox()).height <= t.y + 1
  expect(await above(), 'the panel opens above a trigger near the bottom').toBe(true)
  const top0 = await field(page).evaluate((el) => el.getBoundingClientRect().top)
  await field(page).fill('import')
  await expect(options(page)).toHaveCount(2)
  const top2 = await field(page).evaluate((el) => el.getBoundingClientRect().top)
  expect(Math.abs(top2 - top0), `field moved ${top2 - top0}px at two matches`).toBeLessThanOrEqual(1)
  expect(await above(), 'still above at two matches').toBe(true)
  await field(page).fill('zebra quantum')
  await expect(page.locator('.select__empty--nomatch')).toBeVisible()
  const top3 = await field(page).evaluate((el) => el.getBoundingClientRect().top)
  expect(Math.abs(top3 - top0), `field moved ${top3 - top0}px at no match`).toBeLessThanOrEqual(1)
  expect(await above(), 'still above at no match').toBe(true)
})
