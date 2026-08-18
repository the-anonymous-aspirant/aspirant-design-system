/**
 * §3.72 / system_3 task #4061 — a control's REST boundary is what identifies it
 * as operable, so it carries the WCAG 1.4.11 non-text 3:1 floor.
 *
 * These assert MEASURED RATIOS on the rendered page, never the presence of a
 * CSS rule: the acceptance criterion is "a future token edit that reintroduces
 * the failure must go red", and a rule-shaped assertion passes while the value
 * behind the rule rots.
 *
 * The boundary has TWO sides and both matter. The shipped defect was not only
 * border-vs-page (1.26:1) — border-vs-its-own-fill was 1.53:1, so on the light
 * theme the control had no visible edge on either side. A spec that checked
 * only the outer side would have called a half-fix green.
 */
import { expect, test } from '@playwright/test'

import { AA_NON_TEXT, compositeOver, contrastRatio, parseColor } from '../../src/utils/color_contrast.js'

const THEMES = ['light', 'dark']
const CONTROLS = ['.field__control', '.select__trigger', '.textarea__control']

// Read each control's rendered rest boundary, its own fill, and the first
// OPAQUE ancestor background behind it. Alpha is recovered from two underlays:
// painting a candidate over black alone makes a fully transparent colour read
// back as opaque black, which reports every backing surface as #000 — a defect
// this probe had in its first draft.
const READ = (selectors) => {
  const px = (c) => {
    const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
    cv.fillStyle = '#000'
    cv.fillRect(0, 0, 1, 1)
    cv.fillStyle = c
    cv.fillRect(0, 0, 1, 1)
    const onBlack = cv.getImageData(0, 0, 1, 1).data
    cv.fillStyle = '#fff'
    cv.fillRect(0, 0, 1, 1)
    cv.fillStyle = c
    cv.fillRect(0, 0, 1, 1)
    const onWhite = cv.getImageData(0, 0, 1, 1).data
    const a = 1 - (onWhite[0] - onBlack[0]) / 255
    if (a < 0.004) return null
    return [...[0, 1, 2].map((i) => Math.round(onBlack[i] / a)), +a.toFixed(3)]
  }
  const behind = (el) => {
    let n = el.parentElement
    while (n) {
      const p = px(getComputedStyle(n).backgroundColor)
      if (p && p[3] > 0.99) return p
      n = n.parentElement
    }
    return px(getComputedStyle(document.body).backgroundColor)
  }
  const out = []
  for (const sel of selectors) {
    document.querySelectorAll(sel).forEach((el) => {
      const cs = getComputedStyle(el)
      out.push({ sel, border: px(cs.borderTopColor), fill: px(cs.backgroundColor), behind: behind(el) })
    })
  }
  return out
}

const read = async (page, theme) => {
  await page.goto(`/tests/e2e/fixtures/matrix.html${theme === 'dark' ? '?theme=dark' : ''}`, {
    waitUntil: 'networkidle',
  })
  return page.evaluate(READ, CONTROLS)
}

for (const theme of THEMES) {
  test(`a control's rest boundary clears 3:1 against its own fill (${theme})`, async ({ page }) => {
    const rows = await read(page, theme)
    expect(rows.length, 'the fixture mounted no controls — the probe measured nothing').toBeGreaterThan(0)
    for (const r of rows) {
      const ratio = contrastRatio(compositeOver(r.border, r.fill), r.fill)
      expect(
        ratio,
        `${r.sel}: border ${r.border} vs its own fill ${r.fill} is ${ratio.toFixed(2)}:1`
      ).toBeGreaterThanOrEqual(AA_NON_TEXT)
    }
  })

  test(`a control's rest boundary clears 3:1 against the surface behind it (${theme})`, async ({
    page,
  }) => {
    const rows = await read(page, theme)
    // The dark card in the LIGHT theme is knowingly excluded: page and card
    // straddle mid-luminance there, so no flat boundary ink can clear 3:1
    // against both (best possible flat grey tops out at 2.80:1 — see §3.72 and
    // task #4061). On a card the control's near-white fill carries the boundary
    // at 8.6:1 instead, so the control is still identifiable. If that reading is
    // ever overturned, this filter is the line to delete.
    const cardish = (bg) => theme === 'light' && contrastRatio(bg, parseColor('#f9f9f9')) > 3
    for (const r of rows.filter((x) => !cardish(x.behind))) {
      const ratio = contrastRatio(compositeOver(r.border, r.behind), r.behind)
      expect(
        ratio,
        `${r.sel}: border ${r.border} vs backing surface ${r.behind} is ${ratio.toFixed(2)}:1`
      ).toBeGreaterThanOrEqual(AA_NON_TEXT)
    }
  })
}

test('rest and focus boundaries stay visibly distinct (light)', async ({ page }) => {
  // Criterion 3: raising the rest floor must not collapse rest into focus.
  await page.goto('/tests/e2e/fixtures/matrix.html', { waitUntil: 'networkidle' })
  const control = page.locator('.field__control').first()
  const rest = await control.evaluate((el) => getComputedStyle(el).borderTopColor)
  await control.locator('input, textarea').first().focus()
  await page.waitForTimeout(250) // longer than --transition-fast
  const focus = await control.evaluate((el) => getComputedStyle(el).borderTopColor)
  expect(focus, 'focus border is identical to rest — the states have collapsed').not.toBe(rest)
})
