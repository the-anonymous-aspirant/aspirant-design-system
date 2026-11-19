import { expect, test } from '@playwright/test'

// A select column (system_3 #11747, design_conventions §3.132 Decision 6): in
// a card the row's checkbox leads the first line, before the identity, in a
// column of one width on every card, so every identity starts on one edge,
// also where the cell renders nothing. A click in it never reaches the row,
// in either mode. The fixture is Transactions' shape; #box is the table's
// container.

const open = (page, q = '') =>
  page.goto(`/tests/e2e/fixtures/data-table-select.html${q}`, { waitUntil: 'networkidle' })
const table = (page) => page.locator('#box table')
const isCards = async (page) => (await table(page).getAttribute('class')).includes('data-table--cards')
const cards = (page) => page.locator('#box tr.data-table__row')
const rectOf = (loc) => loc.evaluate((el) => {
  const r = el.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right }
})

for (const [label, width] of [['a 504px box', 504], ['a 656px box, wider than 640, where the identity cannot keep 24ch', 656]]) {
  test(`in ${label} the checkbox leads each card's first line, before the identity`, async ({ page }) => {
    await open(page, `?width=${width}`)
    expect(await isCards(page)).toBe(true)
    const n = await cards(page).count()
    expect(n).toBe(4)
    const lefts = []
    for (let i = 0; i < n; i++) {
      const card = cards(page).nth(i)
      const select = card.locator('td.data-table__card-cell--select')
      const identity = card.locator('td.data-table__card-cell--identity')
      const figure = card.locator('td.data-table__card-cell--figure')
      await expect(select, `card ${i + 1} keeps its select cell`).toHaveCount(1)
      // No label is drawn for it, and it is not stacked below.
      await expect(select.locator('.data-table__card-label')).toHaveCount(0)
      const [s, id, f] = [await rectOf(select), await rectOf(identity), await rectOf(figure)]
      expect(s.right, `card ${i + 1}: the checkbox is left of the identity`).toBeLessThanOrEqual(id.x + 0.5)
      expect(Math.abs(s.y - id.y), `card ${i + 1}: on the identity's first line`).toBeLessThanOrEqual(1)
      expect(Math.abs(f.y - id.y), `card ${i + 1}: the figure stays top-right`).toBeLessThanOrEqual(1)
      expect(f.x).toBeGreaterThan(id.x)
      // The select cell is the declared 40px wide on every card.
      expect(Math.round(s.w)).toBe(40)
      lefts.push(Math.round(id.x))
    }
    // Every identity starts on one edge, also row 2's, whose cell is empty.
    await expect(cards(page).nth(1).locator('td.data-table__card-cell--select input')).toHaveCount(0)
    expect(new Set(lefts).size, `identity left edges: ${lefts.join(', ')}`).toBe(1)
    // Row 3's identity wraps; the checkbox stays with its first line.
    const long = cards(page).nth(2)
    const id3 = long.locator('td.data-table__card-cell--identity')
    // One line is a single-line identity's height (line-height is `normal`).
    const lh = (await rectOf(cards(page).first().locator('td.data-table__card-cell--identity'))).h
    const r3 = await rectOf(id3)
    expect(r3.h, 'row 3 wraps to two lines or more').toBeGreaterThan(lh * 1.5)
    const box = await rectOf(long.locator('td.data-table__card-cell--select .checkbox, td.data-table__card-cell--select input').first())
    expect(box.y + box.h, 'the checkbox ends within the first line').toBeLessThanOrEqual(r3.y + lh + 1)
    // Nothing scrolls sideways.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
}

test('a click on the checkbox ticks it and opens nothing, in a card and in the table', async ({ page }) => {
  for (const width of [504, 1100]) {
    await open(page, `?width=${width}`)
    expect(await isCards(page)).toBe(width === 504)
    await page.getByRole('checkbox', { name: 'Select row 1' }).click()
    await expect(page.locator('#ticked')).toHaveText('1')
    await expect(page.locator('#clicks')).toHaveText('0')
    // The keyboard too: Space on the focused checkbox ticks it, not the row.
    await page.getByRole('checkbox', { name: 'Select row 3' }).focus()
    await page.keyboard.press('Space')
    await expect(page.locator('#ticked')).toHaveText('1,3')
    await expect(page.locator('#clicks')).toHaveText('0')
    // A click elsewhere on the row still opens it.
    await page.getByText('Bahn · Leipzig and back').click()
    await expect(page.locator('#clicks')).toHaveText('1')
  }
})

test('the card sort bar never offers the select column', async ({ page }) => {
  await open(page, '?width=504&sortable=1')
  expect(await isCards(page)).toBe(true)
  const select = page.locator('.data-table__card-sort-select')
  await expect(select).toBeVisible()
  await select.click()
  const options = (await page.getByRole('option').allTextContents()).map((t) => t.trim())
  expect(options).not.toContain('')
  expect(options).toEqual(expect.arrayContaining(['Date paid', 'Category', 'Invoice', 'Amount']))
})

test('in the table nothing changes: the select column is the first column, at its width', async ({ page }) => {
  await open(page, '?width=1100')
  expect(await isCards(page)).toBe(false)
  const first = page.locator('#box tbody tr.data-table__row').first().locator('td').first()
  await expect(first.getByRole('checkbox', { name: 'Select row 1' })).toBeVisible()
  expect(Math.round((await rectOf(first)).w)).toBe(40)
  await expect(page.locator('#box table')).not.toHaveClass(/data-table--cards-select/)
})

test('undeclared, the first column is a secondary cell, as before this role', async ({ page }) => {
  await open(page, '?width=504&select=0')
  expect(await isCards(page)).toBe(true)
  await expect(table(page)).not.toHaveClass(/data-table--cards-select/)
  await expect(cards(page).first().locator('td.data-table__card-cell--select')).toHaveCount(0)
  await expect(cards(page).first().locator('td.data-table__card-cell--secondary').first().getByRole('checkbox')).toBeVisible()
})
