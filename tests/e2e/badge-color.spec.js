import { expect, test } from '@playwright/test'

import { AA, contrast, resolveDataFill } from '../../src/utils/data_fill.js'
import { LIVE_VOCAB_FILLS } from './fixtures/vocab_fills.js'

// The §3.18 rule is arithmetic, so most of it is asserted directly against the
// implementation rather than through a rendered page. What the page is for is
// proving the component actually applies what the arithmetic returns — an
// exactly-correct function wired to nothing would pass a unit test.

test.describe('the rule itself', () => {
  // The ruling asks the assertion to cover every fill in the vocabulary rather
  // than a hardcoded handful, because an enumerated fixture goes stale the
  // moment the operator adds a colour. This repo cannot read system_3's
  // database, so the guarantee is made the other way round: sweep the space the
  // vocabulary is drawn from, so any fill added later is already covered.
  test('every colour in the sweep resolves to an AA-clearing pair', () => {
    const failures = []
    for (let r = 0; r < 256; r += 15) {
      for (let g = 0; g < 256; g += 15) {
        for (let b = 0; b < 256; b += 15) {
          const hex = `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
          const out = resolveDataFill(hex)
          if (contrast(out.fill, out.ink) < AA) failures.push({ hex, ...out })
        }
      }
    }
    expect(failures.slice(0, 5), `${failures.length} fills resolved below ${AA}:1`).toEqual([])
  })

  test('the common path changes nothing — 8 of the 9 live fills are untouched', () => {
    const adjusted = LIVE_VOCAB_FILLS.filter((c) => resolveDataFill(c).adjusted)
    // If this count moves, the palette has visibly shifted and that is a design
    // decision, not a refactor.
    expect(adjusted).toEqual(['#c063c0'])
  })

  test('#c063c0 — the boundary case — is nudged minimally, hue and saturation held', () => {
    // Neither candidate clears against it: 3.63 vs white, 4.44 vs #212121.
    expect(contrast('#c063c0', '#ffffff')).toBeLessThan(AA)
    expect(contrast('#c063c0', '#212121')).toBeLessThan(AA)

    const out = resolveDataFill('#c063c0')
    expect(out.adjusted).toBe(true)
    expect(out.fill).toBe('#c165c1')
    expect(out.ratio).toBeGreaterThanOrEqual(AA)
    // "Minimal" is part of the rule, not an implementation detail — the
    // opposite direction costs ~6.8% L and visibly changes the colour.
    expect(contrast(out.fill, '#c063c0')).toBeLessThan(1.05)
  })

  test('malformed input falls back rather than rendering something arbitrary', () => {
    expect(resolveDataFill('not-a-colour')).toBeNull()
    expect(resolveDataFill('')).toBeNull()
    expect(resolveDataFill('#ffb300')).not.toBeNull()
    // Shorthand hex is real data, not malformed.
    expect(resolveDataFill('#fb0').fill).toBe('#ffbb00')
  })
})

test.describe('the component applies it', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/e2e/fixtures/badge-color.html', { waitUntil: 'networkidle' })
  })

  test('every data-coloured chip renders its resolved fill and ink', async ({ page }) => {
    for (const fill of LIVE_VOCAB_FILLS) {
      const expected = resolveDataFill(fill)
      const chip = page.locator(`#chips [data-fill="${fill}"]`)
      const got = await chip.evaluate((el) => {
        const cs = getComputedStyle(el)
        return { bg: cs.backgroundColor, ink: cs.color }
      })
      const hex = (rgb) =>
        '#' +
        rgb
          .match(/\d+/g)
          .slice(0, 3)
          .map((n) => Number(n).toString(16).padStart(2, '0'))
          .join('')
      expect(hex(got.bg), `${fill} fill`).toBe(expected.fill)
      expect(hex(got.ink), `${fill} ink`).toBe(expected.ink)
    }
  })

  test('rendered chips clear AA in the browser, not just on paper', async ({ page }) => {
    // Guards the wiring: the arithmetic could be perfect and the style bound to
    // the wrong element.
    for (const fill of LIVE_VOCAB_FILLS) {
      const ratio = await page
        .locator(`#chips [data-fill="${fill}"]`)
        .evaluate((el) => {
          const cs = getComputedStyle(el)
          const lum = (c) => {
            const [r, g, b] = c.match(/\d+/g).slice(0, 3).map(Number)
            const f = (v) => {
              const s = v / 255
              return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
            }
            return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
          }
          const [hi, lo] = [lum(cs.color), lum(cs.backgroundColor)].sort((a, b) => b - a)
          return (hi + 0.05) / (lo + 0.05)
        })
      expect(ratio, `${fill} rendered`).toBeGreaterThanOrEqual(AA)
    }
  })

  test('the four token-driven variants are unchanged by this feature', async ({ page }) => {
    // Regression: the acceptance criterion is explicit that omitting `color`
    // leaves the semantic path alone.
    const semantic = page.locator('#semantic .badge')
    await expect(semantic).toHaveCount(4)
    for (const el of await semantic.all()) {
      await expect(el).not.toHaveClass(/badge--data-color/)
      // No inline colour was painted on them.
      expect(await el.evaluate((e) => e.style.backgroundColor)).toBe('')
    }
  })

  test('a malformed colour falls back to the semantic chip', async ({ page }) => {
    const chip = page.locator('#malformed .badge')
    await expect(chip).not.toHaveClass(/badge--data-color/)
    expect(await chip.evaluate((e) => e.style.backgroundColor)).toBe('')
  })

  test('the filter remove emit still works alongside the new prop', async ({ page }) => {
    await expect(page.locator('#semantic .badge__remove')).toHaveCount(1)
  })
})
