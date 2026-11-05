/**
 * §3.121 for the error state (system_3 #10026, design_agent c61986). On
 * AspModal's panel the page tokens measured 1.0:1 for the error message
 * (#8b0f10 on #424242) and 1.1:1 for the typed text on --feedback-error-bg
 * (report 850). On every setter, in both themes, an errored AspInput and
 * AspTextarea now clear:
 *   1. the message against its setter, 4.5:1;
 *   2. the typed text against the control's own fill, 4.5:1;
 *   3. the errored edge, 3:1 (WCAG 1.4.11): where it is one colour, against
 *      both the setter and the fill; where it is drawn two-tone (a dark
 *      setter), the outer border against the setter and the inner ring
 *      against the fill;
 * and Input and Textarea paint the state the same way. Measured from
 * rendered colours, with each colour's alpha recovered as in
 * field-required-mark.spec.js.
 */
import { expect, test } from '@playwright/test'

import { AA, compositeOver, contrastRatio } from '../../src/utils/color_contrast.js'

const NON_TEXT = 3

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
  const opaqueBehind = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const p = px(getComputedStyle(n).backgroundColor)
      if (p && p[3] > 0.99) return p
    }
    return px(getComputedStyle(document.body).backgroundColor)
  }
  const out = []
  for (const id of ids) {
    for (const kind of ['input', 'textarea']) {
      const root = document.querySelector(`#${id} .probe-${kind}`)
      if (!root) {
        out.push({ id, kind, missing: true })
        continue
      }
      const message = root.querySelector('.field__message--error')
      const control = root.querySelector(kind === 'input' ? '.field__control' : '.field__textarea')
      const text = root.querySelector(kind === 'input' ? 'input' : 'textarea')
      const cs = getComputedStyle(control)
      // The edge: the border colour, and the inset ring if one is drawn.
      const ring = /inset/.test(cs.boxShadow)
        ? (cs.boxShadow.match(/rgba?\([^)]*\)/) || [null])[0]
        : null
      out.push({
        id,
        kind,
        setter: opaqueBehind(control.parentElement),
        fill: opaqueBehind(control),
        message: px(getComputedStyle(message).color),
        text: px(getComputedStyle(text).color),
        border: px(cs.borderTopColor),
        borderWidth: cs.borderTopWidth,
        ring: ring ? px(ring) : null,
        messageColor: getComputedStyle(message).color,
        shadow: cs.boxShadow,
      })
    }
  }
  return out
}

const open = async (page, theme, modal = false) => {
  const q = new URLSearchParams()
  if (theme === 'dark') q.set('theme', 'dark')
  if (modal) q.set('modal', '1')
  await page.goto(`/tests/e2e/fixtures/field-error-setter.html${q.size ? `?${q}` : ''}`, {
    waitUntil: 'networkidle',
  })
  await page.locator(modal ? '#modal .probe-textarea' : '#forced-card .probe-textarea').waitFor()
}

const ratio = (fg, bg) => contrastRatio(compositeOver(fg, bg), bg)

const check = (r, theme) => {
  const where = `${r.kind} on #${r.id} (${theme})`
  expect(r.missing, `${where} rendered`).toBeUndefined()
  const m = ratio(r.message, r.setter)
  const t = ratio(r.text, r.fill)
  // Two-tone on a dark setter: the outer border meets the setter, the inner
  // ring meets the fill.
  const outer = r.border
  const inner = r.ring || r.border
  const es = ratio(outer, r.setter)
  const ef = ratio(inner, r.fill)
  const edge = r.ring ? `${outer} / ${inner}` : `${outer}`
  console.log(
    `ERR ${where}: message ${m.toFixed(2)} text ${t.toFixed(2)} edge/setter ${es.toFixed(2)} edge/fill ${ef.toFixed(2)}`
  )
  expect(m, `${where}: message ${r.message} on ${r.setter}`).toBeGreaterThanOrEqual(AA)
  expect(t, `${where}: typed text ${r.text} on ${r.fill}`).toBeGreaterThanOrEqual(AA)
  expect(es, `${where}: edge ${edge} on setter ${r.setter}`).toBeGreaterThanOrEqual(NON_TEXT)
  expect(ef, `${where}: edge ${edge} on fill ${r.fill}`).toBeGreaterThanOrEqual(NON_TEXT)
}

for (const theme of ['light', 'dark']) {
  test(`an errored field reads on every setter (${theme})`, async ({ page }) => {
    await open(page, theme)
    const rows = await page.evaluate(READ, ['page', 'card', 'ghost', 'forced-card'])
    expect(rows).toHaveLength(8)
    for (const r of rows) check(r, theme)
  })

  test(`an errored field reads in AspModal (${theme})`, async ({ page }) => {
    await open(page, theme, true)
    const rows = await page.evaluate(READ, ['modal'])
    for (const r of rows) check(r, theme)
  })

  // One treatment across the text-entry family (§3.95-style equality), and
  // on a dark setter the state is thickness as well as hue.
  test(`Input and Textarea paint the error state alike (${theme})`, async ({ page }) => {
    await open(page, theme, true)
    const rows = await page.evaluate(READ, ['page', 'card', 'forced-card', 'modal'])
    for (const id of ['page', 'card', 'forced-card', 'modal']) {
      const [i, t] = ['input', 'textarea'].map((k) => rows.find((r) => r.id === id && r.kind === k))
      expect(t.messageColor, `#${id} message ink`).toBe(i.messageColor)
      expect(t.border, `#${id} edge`).toEqual(i.border)
      expect(t.fill, `#${id} fill`).toEqual(i.fill)
      expect(!!t.ring, `#${id} inset ring`).toBe(!!i.ring)
    }
    for (const id of ['card', 'forced-card', 'modal']) {
      const i = rows.find((r) => r.id === id && r.kind === 'input')
      expect(i.ring, `#${id}: a dark setter thickens the errored edge`).not.toBeNull()
    }
  })
}

// design_agent c61991 names AspSelect in the "asserted equal" set. AspSelect
// has no error state today (no `error` prop, no error styling), so there is
// nothing to paint alike yet. This is the tripwire: the day AspSelect renders
// an error, this fails, and its error state must take the dark-setter
// treatment above and join the equality test.
test('AspSelect renders no error state yet (tripwire for the equality set)', async ({ page }) => {
  await open(page, 'light')
  const probe = page.locator('#select-tripwire .probe-select')
  await expect(probe).toHaveCount(1)
  const errorish = await probe.evaluate(
    (el) =>
      [...el.querySelectorAll('*')].filter((n) =>
        /error/.test(n.className && n.className.baseVal === undefined ? n.className : '')
      ).length
  )
  expect(
    errorish,
    'AspSelect now paints an error state: give it the dark-setter treatment and add it to the equality test'
  ).toBe(0)
  await expect(probe.getByText('Use digits, spaces')).toHaveCount(0)
})
