/**
 * §3.121 / system_3 #9189 — the required `*` is part of the field, so it
 * resolves against the field's setter (§3.119). On aspirant-client's dark
 * sidebar the page token #8b0f10 measured 1.04:1 on #424242. On every setter,
 * in both themes, the mark now clears 4.5:1 against what is painted behind it;
 * an explicit `surface` beats the DOM reading. Measured from rendered pixels.
 */
import { expect, test } from '@playwright/test'

import { AA, compositeOver, contrastRatio } from '../../src/utils/color_contrast.js'

const SETTERS = ['page', 'card', 'ghost', 'forced-card']

// The composer-surface.spec.js reader: each colour is a rasterised pixel with
// its alpha recovered from two underlays, and the backdrop is the first opaque
// ancestor.
const READ = (selectors) => {
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
  return selectors.map((sel) => {
    const el = document.querySelector(sel)
    if (!el) return { sel, missing: true }
    return { sel, mark: px(getComputedStyle(el).color), behind: behind(el), visible: el.offsetParent !== null }
  })
}

const open = async (page, theme) => {
  await page.goto(`/tests/e2e/fixtures/field-required-mark.html${theme === 'dark' ? '?theme=dark' : ''}`, {
    waitUntil: 'networkidle',
  })
  await page.locator('#states .probe-disabled').waitFor()
}

const ratio = (r) => contrastRatio(compositeOver(r.mark, r.behind), r.behind)

const marks = (id) => [`#${id} .probe-input .field__required`, `#${id} .probe-textarea .field__required`]

for (const theme of ['light', 'dark']) {
  test(`the required mark clears 4.5:1 on every setter (${theme})`, async ({ page }) => {
    await open(page, theme)
    const rows = await page.evaluate(READ, SETTERS.flatMap(marks))
    expect(rows).toHaveLength(SETTERS.length * 2)
    for (const r of rows) {
      expect(r.missing, `${r.sel} rendered`).toBeUndefined()
      const c = ratio(r)
      console.log(`MARK ${theme} ${r.sel} on ${r.behind} = ${c.toFixed(2)}:1`)
      expect(c, `${r.sel} (${theme}): ${c.toFixed(2)}:1 on ${r.behind}`).toBeGreaterThanOrEqual(AA)
    }
  })

  test(`an explicit surface beats the DOM reading (${theme})`, async ({ page }) => {
    await open(page, theme)
    const [page_, card, forcedPage, forcedCard] = await page.evaluate(READ, [
      '#page .probe-input .field__required',
      '#card .probe-input .field__required',
      '#forced-page .probe-input .field__required',
      '#forced-card .probe-input .field__required',
    ])
    // surface="page" inside a card keeps the page ink; surface="card" off any
    // card takes the dark-setter ink.
    expect(forcedPage.mark).toEqual(page_.mark)
    expect(forcedCard.mark).toEqual(card.mark)
    expect(forcedCard.mark).not.toEqual(page_.mark)
  })

  test(`the 'auto' arm reads the card, and a ghost card is a page setter (${theme})`, async ({ page }) => {
    await open(page, theme)
    const [page_, card, ghost] = await page.evaluate(READ, [
      '#page .probe-input .field__required',
      '#card .probe-input .field__required',
      '#ghost .probe-input .field__required',
    ])
    expect(ghost.mark).toEqual(page_.mark)
    expect(card.mark).not.toEqual(page_.mark)
  })

  test(`the mark shows, and keeps its ink, in focus, error and disabled (${theme})`, async ({ page }) => {
    await open(page, theme)
    await page.locator('#card .probe-input input').focus()
    const [focused, errored, disabled] = await page.evaluate(READ, [
      '#card .probe-input .field__required',
      '#states .probe-error .field__required',
      '#states .probe-disabled .field__required',
    ])
    for (const r of [focused, errored, disabled]) {
      expect(r.missing, `${r.sel} rendered`).toBeUndefined()
      expect(r.visible, `${r.sel} visible`).toBe(true)
    }
    // Disabled dims the label (opacity 0.6) and is exempt from the text floor
    // (WCAG 1.4.3); focus and error must still clear it.
    for (const r of [focused, errored]) {
      const c = ratio(r)
      expect(c, `${r.sel} (${theme}): ${c.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA)
    }
    expect(disabled.mark).toEqual(errored.mark)
  })
}
