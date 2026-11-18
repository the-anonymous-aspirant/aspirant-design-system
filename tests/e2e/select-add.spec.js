import { expect, test } from '@playwright/test'

// A searchable AspSelect that takes a new name (system_3 #11577,
// design_conventions §3.161 Decision 1). The fixture's page only records each
// `add` event in #added; it never changes the value or the list, so every
// assertion on #value is about the select alone.

const open = (page, q = '') => page.goto(`/tests/e2e/fixtures/select-add.html${q}`, { waitUntil: 'networkidle' })
const trigger = (page) => page.locator('.select__trigger')
const field = (page) => page.locator('.select__search-input')
const panel = (page) => page.locator('.select__panel')
const options = (page) => page.getByRole('option')
const addRow = (page) => page.locator('.select__option--add')
const noMatch = (page) => page.locator('.select__empty--nomatch')
const live = (page) => page.locator('.select__live')
const value = (page) => page.locator('#value')
const added = async (page) => JSON.parse(await page.locator('#added').innerText())
const activeText = async (page) => {
  const id = await field(page).getAttribute('aria-activedescendant')
  return id ? (await page.locator(`#${id}`).innerText()).trim() : null
}
const optionTexts = async (page) => (await options(page).allInnerTexts()).map((t) => t.trim())

test.describe('the row and where it sits', () => {
  test('nothing matches: the row stands alone in place of the no-match line, and nothing is active', async ({ page }) => {
    await open(page)
    await trigger(page).click()
    await field(page).fill('Bahn')
    await expect(addRow(page)).toHaveText('Add “Bahn”')
    expect(await optionTexts(page)).toEqual(['Add “Bahn”'])
    await expect(noMatch(page)).toHaveCount(0)
    await expect(page.getByText('No match')).toHaveCount(0)
    expect(await activeText(page)).toBeNull()
    // Announced by name, in place of the no-match line, and never as "No match".
    await expect(live(page)).toHaveText('Add “Bahn”')
  })

  test('some options match: the row comes after them, and the first match is active', async ({ page }) => {
    await open(page)
    await trigger(page).click()
    await field(page).fill('and')
    expect(await optionTexts(page)).toEqual([
      'materials and supplies',
      'software and subscriptions',
      'office and postage',
      'phone and internet',
      'rent and utilities',
      'fees and charges',
      'training and books',
      'Add “and”',
    ])
    expect(await activeText(page)).toBe('materials and supplies')
    // Matches are there, so the live region has nothing to say, as before.
    await expect(live(page)).toHaveText('')
  })

  test('typed text equal to a label in another case, or with spaces round it: no row', async ({ page }) => {
    await open(page)
    await trigger(page).click()
    await field(page).fill('TRAVEL')
    expect(await optionTexts(page)).toEqual(['travel'])
    await expect(addRow(page)).toHaveCount(0)
    await field(page).fill('   private ')
    expect(await optionTexts(page)).toEqual(['Private'])
    await expect(addRow(page)).toHaveCount(0)
  })

  test('an empty field, or one holding only spaces: no row', async ({ page }) => {
    await open(page)
    await trigger(page).click()
    await expect(field(page)).toHaveValue('')
    await expect(addRow(page)).toHaveCount(0)
    await expect(options(page)).toHaveCount(11)
    await field(page).fill('    ')
    await expect(addRow(page)).toHaveCount(0)
    await expect(options(page)).toHaveCount(11)
  })

  test('the row shows the text trimmed, inside curly quotes', async ({ page }) => {
    await open(page)
    await trigger(page).click()
    await field(page).fill('   Bahn Leipzig  ')
    await expect(addRow(page)).toHaveText('Add “Bahn Leipzig”')
  })

  test('with no options at all, typing offers the row and not "No options"', async ({ page }) => {
    await open(page, '?empty=1')
    await trigger(page).click()
    await expect(page.locator('.select__empty')).toHaveText('No options')
    await field(page).fill('travel')
    expect(await optionTexts(page)).toEqual(['Add “travel”'])
    await expect(page.locator('.select__empty')).toHaveCount(0)
  })
})

test.describe('choosing it', () => {
  test('Enter with nothing matching emits nothing and keeps the panel open', async ({ page }) => {
    await open(page)
    await trigger(page).click()
    await field(page).fill('Bahn')
    await page.keyboard.press('Enter')
    await expect(panel(page)).toBeVisible()
    expect(await added(page)).toEqual([])
    await expect(value(page)).toHaveText('travel')
  })

  test('↓ reaches the row when nothing matches; Enter on it emits the trimmed text once and closes, the value unchanged', async ({ page }) => {
    await open(page)
    await trigger(page).click()
    await field(page).fill('  Bahn  ')
    await page.keyboard.press('ArrowDown')
    expect(await activeText(page)).toBe('Add “Bahn”')
    await expect(addRow(page)).toHaveClass(/select__option--active/)
    await page.keyboard.press('Enter')
    await expect(panel(page)).toBeHidden()
    expect(await added(page)).toEqual(['Bahn'])
    await expect(value(page)).toHaveText('travel')
    await expect(trigger(page)).toBeFocused()
    // The typed text was dropped with the close.
    await trigger(page).click()
    await expect(field(page)).toHaveValue('')
    await expect(addRow(page)).toHaveCount(0)
  })

  test('with matches, the arrows reach the row after the last match, and ↑ from the first wraps to it', async ({ page }) => {
    await open(page)
    await trigger(page).click()
    await field(page).fill('post')
    expect(await activeText(page)).toBe('office and postage')
    await page.keyboard.press('ArrowDown')
    expect(await activeText(page)).toBe('Add “post”')
    await page.keyboard.press('ArrowDown')
    expect(await activeText(page)).toBe('office and postage')
    await page.keyboard.press('ArrowUp')
    expect(await activeText(page)).toBe('Add “post”')
    await page.keyboard.press('Enter')
    expect(await added(page)).toEqual(['post'])
    await expect(value(page)).toHaveText('travel')
  })

  test('Enter on a match still picks the match, not the row', async ({ page }) => {
    await open(page)
    await trigger(page).click()
    await field(page).fill('post')
    await page.keyboard.press('Enter')
    await expect(value(page)).toHaveText('office and postage')
    expect(await added(page)).toEqual([])
  })

  test('a click on the row emits once and closes, the value unchanged', async ({ page }) => {
    await open(page)
    await trigger(page).click()
    await field(page).fill('Bahn')
    await addRow(page).click()
    await expect(panel(page)).toBeHidden()
    expect(await added(page)).toEqual(['Bahn'])
    await expect(value(page)).toHaveText('travel')
  })

  test('the row is an option named by its text, and the field points at it when it is active', async ({ page }) => {
    await open(page)
    await trigger(page).click()
    await field(page).fill('Bahn')
    const row = page.getByRole('option', { name: 'Add “Bahn”' })
    await expect(row).toHaveCount(1)
    await expect(row).toHaveAttribute('aria-selected', 'false')
    await page.keyboard.press('ArrowDown')
    const id = await row.getAttribute('id')
    await expect(field(page)).toHaveAttribute('aria-activedescendant', id)
    // One element points at the active entry while the panel is open.
    await expect(page.locator('[aria-activedescendant]')).toHaveCount(1)
  })
})

test.describe('size', () => {
  for (const width of [390, 1280]) {
    test(`at ${width}px a 100-character name wraps inside the panel, which keeps its width from open`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await open(page)
      await trigger(page).click()
      const before = (await panel(page).boundingBox()).width
      const name = 'Fortbildung Siebdruck und Risographie im Kulturzentrum Leipzig-Plagwitz, zweitägig mit Material'
      expect(name.length).toBeGreaterThanOrEqual(95)
      await field(page).fill(name)
      await expect(addRow(page)).toHaveText(`Add “${name}”`)
      const box = await panel(page).boundingBox()
      const row = await addRow(page).boundingBox()
      expect(Math.round(box.width), 'the panel did not widen').toBe(Math.round(before))
      expect(row.x + row.width).toBeLessThanOrEqual(box.x + box.width + 0.5)
      // Wrapped, not cut: the row is taller than one option line and shows
      // every character.
      const lines = await addRow(page).evaluate((el) => {
        const range = document.createRange()
        range.selectNodeContents(el)
        return new Set(Array.from(range.getClientRects()).map((r) => Math.round(r.top))).size
      })
      expect(lines).toBeGreaterThan(1)
      const clipped = await addRow(page).evaluate((el) => el.scrollWidth > el.clientWidth + 0.5)
      expect(clipped).toBe(false)
    })
  }

  test('an unbroken long name still wraps inside the panel', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 })
    await open(page)
    await trigger(page).click()
    const before = (await panel(page).boundingBox()).width
    await field(page).fill('x'.repeat(100))
    const box = await panel(page).boundingBox()
    const row = await addRow(page).boundingBox()
    expect(Math.round(box.width)).toBe(Math.round(before))
    expect(row.x + row.width).toBeLessThanOrEqual(box.x + box.width + 0.5)
    expect(await addRow(page).evaluate((el) => el.scrollWidth > el.clientWidth + 0.5)).toBe(false)
  })

  test('the row has an option\'s padding and ink', async ({ page }) => {
    await open(page)
    await trigger(page).click()
    await field(page).fill('ins')
    const look = (loc) =>
      loc.evaluate((el) => {
        const cs = getComputedStyle(el)
        return { pad: cs.padding, color: cs.color, size: cs.fontSize, bg: cs.backgroundColor }
      })
    // "insurance" is active (the first match); compare the row with an
    // inactive option, so the active treatment does not differ.
    await field(page).fill('an')
    const plain = await look(options(page).nth(1))
    const row = await look(addRow(page))
    expect(row).toEqual(plain)
  })
})

test.describe('off by default', () => {
  test('searchable without addable: "No match" as before, and no row', async ({ page }) => {
    await open(page, '?off=1')
    await trigger(page).click()
    await field(page).fill('Bahn')
    await expect(addRow(page)).toHaveCount(0)
    await expect(noMatch(page)).toHaveText('No match for "Bahn"')
    await expect(live(page)).toHaveText('No match for "Bahn"')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    expect(await added(page)).toEqual([])
  })

  test('addable without searchable has no field and no row', async ({ page }) => {
    await open(page, '?nosearch=1')
    await trigger(page).click()
    await expect(field(page)).toHaveCount(0)
    await expect(addRow(page)).toHaveCount(0)
    await expect(options(page)).toHaveCount(11)
  })
})
