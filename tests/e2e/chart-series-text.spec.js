import { expect, test } from '@playwright/test'

import { AA, contrastRatio, deriveInk, parseColor, toRgbString } from '../../src/utils/color_contrast.js'

// §3.131 (system_3 #9939/#9941): "which line is which?" On a chart with two or
// more distinct series colours, the legend word that names a series wears that
// series' hue, derived to the 4.5:1 text floor against the surface it sits on.
// Fixture: tests/e2e/fixtures/chart-series-text.js (one slot per case).

const hex = (c) => '#' + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')

// The two text tokens are what deriveInk returns for their mark sibling on the
// worst sanctioned dark setter (#424242). Pinning them to the function means a
// hand edit of either value, or a change to deriveInk, fails here.
test.describe('§3.131 series text tokens', () => {
  const card = parseColor('#424242')

  test('deriveInk pins: series-1 clears unchanged, series-2 lightens to #7fb8d8', () => {
    expect(hex(deriveInk(parseColor('#ffb300'), card, AA))).toBe('#ffb300')
    expect(hex(deriveInk(parseColor('#4a9bc8'), card, AA))).toBe('#7fb8d8')
  })

  test('the built tokens equal deriveInk of their mark tokens, and clear 4.5:1 on #424242', async ({ page }) => {
    await page.goto('/tests/e2e/fixtures/chart-series-text.html')
    await page.waitForFunction(() => typeof window.__token === 'function')
    for (const n of [1, 2]) {
      const mark = await page.evaluate((v) => window.__token(v), `--chart-series-${n}-on-dark`)
      const text = await page.evaluate((v) => window.__token(v), `--chart-series-${n}-text-on-dark`)
      expect(text, `--chart-series-${n}-text-on-dark is missing from build/tokens.css`).not.toBe('')
      expect(text.toLowerCase()).toBe(hex(deriveInk(parseColor(mark), card, AA)))
      expect(contrastRatio(parseColor(text), card)).toBeGreaterThanOrEqual(AA)
    }
  })
})

for (const theme of ['light', 'dark']) {
  test.describe(`§3.131 AspChart legend ink (${theme})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/tests/e2e/fixtures/chart-series-text.html${theme === 'dark' ? '?theme=dark' : ''}`)
      await expect(page.locator('.asp-chart[data-rendered="true"]')).toHaveCount(7)
    })

    const legend = (page, id) => page.evaluate((i) => window.__legend(i), id)
    const bg = async (page, id) => parseColor(await page.evaluate((i) => window.__bg(i), id))

    for (const id of ['two-page', 'two-card', 'bar-card']) {
      test(`${id}: each label wears its own series' derived ink and clears 4.5:1; the swatch is untouched`, async ({ page }) => {
        const { items, borderColors } = await legend(page, id)
        const surface = await bg(page, id)
        expect(items).toHaveLength(2)
        for (const [i, it] of items.entries()) {
          const expected = toRgbString(deriveInk(parseColor(it.strokeStyle), surface, AA))
          expect(it.fontColor, `${it.text}`).toBe(expected)
          expect(contrastRatio(parseColor(it.fontColor), surface)).toBeGreaterThanOrEqual(AA)
          // The swatch is Chart.js's own: the stroke is the dataset's colour.
          expect(it.strokeStyle).toBe(borderColors[i])
        }
        expect(items[0].fontColor).not.toBe(items[1].fontColor)
      })
    }

    for (const id of ['one-page', 'same-colour']) {
      test(`${id}: no second colour to match, so every label keeps the neutral ink`, async ({ page }) => {
        const { items } = await legend(page, id)
        expect(items.length).toBeGreaterThan(0)
        const coloured = (await legend(page, 'two-page')).items // positive control below
        for (const it of items) {
          // Chart.js's generator sets fontColor to labels.color; AspChart leaves
          // it alone here, so it is the resolved neutral (alpha-bearing) ink.
          expect(it.fontColor).toMatch(/^rgba\(/)
          expect(it.fontColor).not.toBe(toRgbString(deriveInk(parseColor(it.strokeStyle), await bg(page, id), AA)))
        }
        // Positive control: the same probe reads a coloured label on the two-series chart.
        expect(coloured[0].fontColor).toMatch(/^rgb\(/)
      })
    }

    test('consumer: a consumer-set legend label colour wins over the series ink', async ({ page }) => {
      const { items, labelsColor } = await legend(page, 'consumer')
      expect(labelsColor).toBe('rgb(1, 2, 3)')
      for (const it of items) expect(it.fontColor).toBe('rgb(1, 2, 3)')
    })

    test('unparsed: an unparseable colour keeps the neutral ink; the parseable two are coloured', async ({ page }) => {
      const { items } = await legend(page, 'unparsed')
      const surface = await bg(page, 'unparsed')
      expect(items.map((i) => i.text)).toEqual(['Created', 'Done', 'Raw var'])
      for (const it of items.slice(0, 2)) {
        expect(it.fontColor).toBe(toRgbString(deriveInk(parseColor(it.strokeStyle), surface, AA)))
      }
      expect(parseColor(items[2].strokeStyle)).toBeNull()
      expect(items[2].fontColor).toMatch(/^rgba\(/)
    })
  })
}
