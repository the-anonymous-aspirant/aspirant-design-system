import { expect, test } from '@playwright/test'

// The identity-floor switch (system_3 #11626, design_conventions §3.165): at
// 640px and wider, a table with a declared identity shows its card list when,
// after its secondary columns have yielded, the identity cell is narrower than
// its 24ch floor or the table is wider than its box. The fixture's columns are
// 700px of fixed widths plus the identity, as on the Invoices app's
// Transactions tab; #box is the table's container.

const open = (page, q = '') =>
  page.goto(`/tests/e2e/fixtures/data-table-crush.html${q}`, { waitUntil: 'networkidle' })
const table = (page) => page.locator('#box table')
const setBox = async (page, w) => {
  await page.locator('#box').evaluate((el, px) => (el.style.width = `${px}px`), w)
  // The ResizeObserver runs before paint; give the switch two frames to settle.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
}
const mode = async (page) => ((await table(page).getAttribute('class')).includes('data-table--cards') ? 'cards' : 'table')
const identityFit = (page) =>
  page.locator('#box td.data-table__td--identity').first().evaluate((el) => ({
    width: el.getBoundingClientRect().width,
    floor: parseFloat(getComputedStyle(el).minWidth),
  }))
const overflow = (page) => page.locator('#box .data-table__scroll, #box table').first().evaluate((el) => {
  const s = el.closest('.data-table__scroll') || el.parentElement
  return s.scrollWidth - s.clientWidth
})

test.describe('fixed layout, a declared identity, 700px of fixed columns', () => {
  test('at an 800px box it shows the cards', async ({ page }) => {
    await open(page, '?width=800')
    expect(await mode(page)).toBe('cards')
  })

  test('at a 950px box it shows the table, with the identity at least 24ch wide', async ({ page }) => {
    await open(page, '?width=950')
    expect(await mode(page)).toBe('table')
    const fit = await identityFit(page)
    expect(fit.floor).toBeGreaterThan(100)
    expect(fit.width).toBeGreaterThanOrEqual(fit.floor - 0.5)
    expect(await overflow(page)).toBeLessThanOrEqual(1)
  })

  test('under 640px it shows the cards, as before', async ({ page }) => {
    await open(page, '?width=600')
    expect(await mode(page)).toBe('cards')
  })

  for (const [from, to, steps] of [
    [1100, 640, -10],
    [640, 1100, 10],
  ]) {
    test(`dragged from ${from} to ${to}px it changes mode at most once`, async ({ page }) => {
      await open(page, `?width=${from}`)
      const seen = [await mode(page)]
      for (let w = from + steps; steps < 0 ? w >= to : w <= to; w += steps) {
        await setBox(page, w)
        const m = await mode(page)
        if (m !== seen[seen.length - 1]) seen.push(m)
      }
      expect(seen.length, `modes in order: ${seen.join(' → ')}`).toBeLessThanOrEqual(2)
      // And it ends in the mode its width calls for.
      expect(seen[seen.length - 1]).toBe(to < 800 ? 'cards' : 'table')
    })
  }

  test('a drag back and forth across the switch, then a stop, shows each width in its own mode', async ({ page }) => {
    await open(page, '?width=1000')
    for (const w of [820, 980, 830, 990, 840, 1000]) await setBox(page, w)
    expect(await mode(page)).toBe('table')
    const fit = await identityFit(page)
    expect(fit.width).toBeGreaterThanOrEqual(fit.floor - 0.5)
    await setBox(page, 800)
    expect(await mode(page)).toBe('cards')
  })
})

test.describe('what is left alone', () => {
  test('the same columns in auto layout, where the table fits, stay a table', async ({ page }) => {
    for (const w of [800, 950, 1024]) {
      await open(page, `?layout=auto&width=${w}`)
      expect(await mode(page), `${w}px`).toBe('table')
      expect(await overflow(page), `${w}px`).toBeLessThanOrEqual(1)
    }
  })

  test('a table with no declared identity stays a table at 700, 800 and 1024px', async ({ page }) => {
    for (const w of [700, 800, 1024]) {
      await open(page, `?identity=0&width=${w}`)
      expect(await mode(page), `${w}px`).toBe('table')
    }
  })

  test('narrow="scroll" stays a table at 700, 800 and 1024px, and at 600px', async ({ page }) => {
    for (const w of [600, 700, 800, 1024]) {
      await open(page, `?narrow=scroll&width=${w}`)
      expect(await mode(page), `${w}px`).toBe('table')
    }
  })
})

test.describe('an empty field in a card is not drawn', () => {
  const card = (page, i) => page.locator('#box tbody tr.data-table__row').nth(i)
  const labels = async (page, i) =>
    (await card(page, i).locator('.data-table__card-label').allInnerTexts()).map((t) => t.trim())

  test('a slot that renders nothing for the row, over an empty value, draws no label', async ({ page }) => {
    await open(page, '?slots=1&width=390')
    expect(await mode(page)).toBe('cards')
    // Row 1 is money in: "In" is drawn and "Out" is not.
    expect(await labels(page, 0)).toEqual(['Date', 'In', 'Note', 'Pick'])
    await expect(card(page, 0).locator('.amount-in')).toHaveText('€60.00')
    // Row 2 is money out: the other way round.
    expect(await labels(page, 1)).toEqual(['Date', 'Out', 'Note', 'Pick'])
    await expect(card(page, 1).locator('.amount-out')).toHaveText('-€89.90')
  })

  test('an empty wrapper element and a checkbox with no text keep their labels', async ({ page }) => {
    await open(page, '?slots=1&width=390')
    for (const i of [0, 1, 2, 3]) {
      const l = await labels(page, i)
      expect(l, `row ${i + 1}`).toContain('Note')
      expect(l, `row ${i + 1}`).toContain('Pick')
    }
    await expect(card(page, 0).getByRole('checkbox', { name: 'Pick 1' })).toBeVisible()
  })
})
