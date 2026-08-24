import { expect, test } from '@playwright/test'

import {
  AA,
  AA_NON_TEXT,
  compositeOver,
  contrastRatio,
  parseColor,
} from '../../src/utils/color_contrast.js'

// #4209 §3.82 — a status MARK must clear its contrast floor on both a light page
// and a dark card, in both themes (disjoint worst cases). An arithmetic proof
// is not enough here: the whole bug was "validated on one surface, mounted on
// another", so this measures the REAL component on the REAL surface token it is
// mounted over, for every status × {page,card} × {light,dark} cell. A forgotten
// surface="card" (or a broken selector) surfaces as a failing cell, not silence.

const CELLS = ['light-page', 'light-card', 'dark-page', 'dark-card']
const STATUSES = ['positive', 'caution', 'negative', 'neutral']
// status → the --feedback-<token> family that backs it.
const TOKEN = { positive: 'success', caution: 'warning', negative: 'error', neutral: 'neutral' }

const ratio = (a, b) => contrastRatio(parseColor(a), parseColor(b))
// Pull the first rgb(...)/rgba(...) out of a computed box-shadow string.
const shadowColor = (boxShadow) => {
  const m = /rgba?\([^)]+\)/.exec(boxShadow)
  return m ? m[0] : null
}

test.describe('#4209 AspBadge surface × theme matrix', () => {
  let cells

  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/e2e/fixtures/badge-surface.html', { waitUntil: 'networkidle' })

    cells = await page.evaluate(
      ({ CELLS, STATUSES, TOKEN }) => {
        const out = {}
        for (const cell of CELLS) {
          const quad = document.querySelector(`[data-cell="${cell}"]`)
          const qcs = getComputedStyle(quad)
          const surface = qcs.backgroundColor
          out[cell] = { surface, statuses: {} }
          for (const s of STATUSES) {
            const dot = quad.querySelector(
              `[data-kind="dot"][data-status="${s}"] .badge__dot`
            )
            const pill = quad.querySelector(`[data-kind="pill"][data-status="${s}"]`)
            const pcs = getComputedStyle(pill)
            const fam = TOKEN[s]
            out[cell].statuses[s] = {
              dotFill: getComputedStyle(dot).backgroundColor,
              pillBoxShadow: pcs.boxShadow,
              pillInk: pcs.color,
              // Resolve the pill's composited fill from the tokens as they
              // actually resolve in THIS theme quadrant.
              feedbackBg: qcs.getPropertyValue(`--feedback-${fam}-bg`).trim(),
              surfaceElevated: qcs.getPropertyValue('--surface-elevated').trim(),
            }
          }
        }
        return out
      },
      { CELLS, STATUSES, TOKEN }
    )
  })

  test('every dot fill clears 3:1 against its mounted surface', () => {
    const failures = []
    for (const cell of CELLS) {
      const { surface, statuses } = cells[cell]
      for (const s of STATUSES) {
        const r = ratio(statuses[s].dotFill, surface)
        if (r < AA_NON_TEXT) {
          failures.push(`${cell}/${s}: dot ${statuses[s].dotFill} vs ${surface} = ${r.toFixed(2)}`)
        }
      }
    }
    expect(failures, failures.join('\n')).toEqual([])
  })

  test('every status pill text clears 4.5:1 against its composited fill', () => {
    const failures = []
    for (const cell of CELLS) {
      for (const s of STATUSES) {
        const { pillInk, feedbackBg, surfaceElevated } = cells[cell].statuses[s]
        // pill fill = the 10% feedback tint composited over --surface-elevated.
        const fill = compositeOver(parseColor(feedbackBg), parseColor(surfaceElevated))
        const r = contrastRatio(parseColor(pillInk), fill)
        if (r < AA) {
          failures.push(`${cell}/${s}: ink ${pillInk} vs pill fill = ${r.toFixed(2)}`)
        }
      }
    }
    expect(failures, failures.join('\n')).toEqual([])
  })

  test('on a card the status pill carries a ≥3:1 ring against the card', () => {
    const failures = []
    for (const cell of ['light-card', 'dark-card']) {
      const { surface, statuses } = cells[cell]
      for (const s of STATUSES) {
        const ring = shadowColor(statuses[s].pillBoxShadow)
        if (!ring) {
          failures.push(`${cell}/${s}: no ring box-shadow`)
          continue
        }
        const r = ratio(ring, surface)
        if (r < AA_NON_TEXT) {
          failures.push(`${cell}/${s}: ring ${ring} vs ${surface} = ${r.toFixed(2)}`)
        }
      }
    }
    expect(failures, failures.join('\n')).toEqual([])
  })

  test('the page/default status pill takes no ring — the card treatment is opt-in', () => {
    for (const cell of ['light-page', 'dark-page']) {
      for (const s of STATUSES) {
        // "none" is the computed box-shadow when the surface="card" rule did not apply.
        expect(cells[cell].statuses[s].pillBoxShadow, `${cell}/${s}`).toBe('none')
      }
    }
  })
})
