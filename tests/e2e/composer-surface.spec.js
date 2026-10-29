/**
 * §3.119 / system_3 #9134 — AspComposer's field resolves its fill and ink
 * against its setter. On every setter, in both themes, the typed text and the
 * placeholder clear 4.5:1 against the field's own fill, and the field's edge
 * (its border, or failing that its fill) clears 3:1 against the surface behind
 * it. Measured ratios from rendered colours, never the presence of a rule.
 */
import { expect, test } from '@playwright/test'

import { AA, AA_NON_TEXT, compositeOver, contrastRatio } from '../../src/utils/color_contrast.js'

const MOUNTS = ['page', 'card', 'ghost', 'forced-card', 'forced-page']

// Each colour is read back as a rasterised pixel with its alpha recovered from
// two underlays (the control-boundary.spec.js method), so color-mix() and
// translucent tokens resolve to what is painted.
const READ = (ids) => {
  const px = (c) => {
    const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
    const paint = (under) => {
      cv.fillStyle = under
      cv.fillRect(0, 0, 1, 1)
      cv.fillStyle = c
      cv.fillRect(0, 0, 1, 1)
      return cv.getImageData(0, 0, 1, 1).data
    }
    const onBlack = paint('#000')
    const onWhite = paint('#fff')
    const a = 1 - (onWhite[0] - onBlack[0]) / 255
    if (a < 0.004) return null
    return [...[0, 1, 2].map((i) => Math.round(onBlack[i] / a)), +a.toFixed(3)]
  }
  const behind = (el) => {
    for (let n = el.parentElement; n; n = n.parentElement) {
      const p = px(getComputedStyle(n).backgroundColor)
      if (p && p[3] > 0.99) return p
    }
    return px(getComputedStyle(document.body).backgroundColor)
  }
  return ids.map((id) => {
    const el = document.querySelector(`#${id} .asp-composer__input`)
    const cs = getComputedStyle(el)
    const ph = getComputedStyle(el, '::placeholder')
    const placeholder = px(ph.color)
    if (placeholder) placeholder[3] = +(placeholder[3] * parseFloat(ph.opacity || '1')).toFixed(3)
    return {
      id,
      text: px(cs.color),
      placeholder,
      fill: px(cs.backgroundColor),
      border: px(cs.borderTopColor),
      behind: behind(el),
    }
  })
}

const read = async (page, theme) => {
  await page.goto(`/tests/e2e/fixtures/composer-surface.html${theme === 'dark' ? '?theme=dark' : ''}`, {
    waitUntil: 'networkidle',
  })
  await page.locator('#forced-page .asp-composer__input').waitFor()
  return page.evaluate(READ, MOUNTS)
}

for (const theme of ['light', 'dark']) {
  test(`the field clears text, placeholder and edge contrast on every setter (${theme})`, async ({
    page,
  }) => {
    const rows = await read(page, theme)
    expect(rows).toHaveLength(MOUNTS.length)
    for (const r of rows) {
      const fill = r.fill ? compositeOver(r.fill, r.behind) : r.behind
      const text = contrastRatio(compositeOver(r.text, fill), fill)
      const ph = contrastRatio(compositeOver(r.placeholder, fill), fill)
      const edge = Math.max(
        r.border ? contrastRatio(compositeOver(r.border, r.behind), r.behind) : 1,
        contrastRatio(fill, r.behind),
      )
      const at = `#${r.id} (${theme}): fill ${fill}, behind ${r.behind}`
      expect(text, `${at}: text ${text.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA)
      expect(ph, `${at}: placeholder ${ph.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA)
      expect(edge, `${at}: edge ${edge.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_NON_TEXT)
    }
  })

  test(`the setter decides the treatment (${theme})`, async ({ page }) => {
    const rows = Object.fromEntries((await read(page, theme)).map((r) => [r.id, r]))
    // Page-like setters share the page field; card setters share the card field.
    expect(rows.ghost.fill).toEqual(rows.page.fill)
    expect(rows['forced-page'].fill).toEqual(rows.page.fill)
    expect(rows['forced-card'].fill).toEqual(rows.card.fill)
    expect(rows.card.fill).not.toEqual(rows.page.fill)
  })
}

test('on the light page the field is no longer the #9f9f9f overlay', async ({ page }) => {
  const [r] = (await read(page, 'light')).filter((x) => x.id === 'page')
  const fill = r.fill ? compositeOver(r.fill, r.behind) : r.behind
  // Composited channels are fractional (159.14…), so compare within a step.
  const is9f = fill.slice(0, 3).every((c) => Math.abs(c - 0x9f) < 1.5)
  expect(is9f, `light page fill ${fill}`).toBe(false)
})
