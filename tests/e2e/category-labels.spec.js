/**
 * §3.120 Q10 / system_3 #9180 — a chart label never rotates. A category label
 * wider than its slot wraps to two lines at a word boundary; a chart whose
 * labels cannot fit two lines turns its bars horizontal, labels on the y axis
 * at full length. Decided once per render in `buildBarOptions`; the two modes
 * never mix. The rendered half reads Chart.js's own `labelRotation` and tick
 * labels off the live scale.
 */
import { expect, test } from '@playwright/test'

import {
  BAR_GAP,
  BAR_THICKNESS,
  Y_TICK_ALLOWANCE,
  buildBarOptions,
  categoryLabelLayout,
  fitCategoryLabels,
} from '../../src/utils/bar_chart_options.js'

// A fixed-pitch stand-in for canvas measureText: 7px per character.
const measure = (t) => t.length * 7
const COMPLEXITY = ['trivial', 'small', 'medium', 'large', 'epic', 'unattributed']
const PATHS = ['fast path', 'slow path', 'cold start', 'warm start', 'retry path']
const data = (labels) => ({ labels, datasets: [{ label: 's', data: labels.map((_, i) => (i + 1) * 10) }] })

test.describe('fitCategoryLabels', () => {
  test('a label that fits stays a single string', () => {
    expect(fitCategoryLabels({ labels: ['small'], slotWidth: 40, measureLabel: measure })).toEqual({
      lines: ['small'],
      fits: true,
    })
  })

  test('a wider label splits at the boundary that minimises the wider line', () => {
    // "cold start" is 70px; "cold" / "start" is 28 / 35.
    const r = fitCategoryLabels({ labels: ['cold start'], slotWidth: 40, measureLabel: measure })
    expect(r).toEqual({ lines: [['cold', 'start']], fits: true })
    const three = fitCategoryLabels({ labels: ['a bb cccc dd'], slotWidth: 50, measureLabel: measure })
    expect(three.lines[0]).toEqual(['a bb', 'cccc dd'])
  })

  test('no word break, or a line still too wide, does not fit', () => {
    expect(fitCategoryLabels({ labels: ['unattributed'], slotWidth: 40, measureLabel: measure }).fits).toBe(false)
    expect(fitCategoryLabels({ labels: ['observability pipeline'], slotWidth: 60, measureLabel: measure }).fits).toBe(
      false,
    )
  })
})

test.describe('categoryLabelLayout — decided once, from the plot width', () => {
  test('wide enough: flat labels, vertical bars', () => {
    const r = categoryLabelLayout({ labels: PATHS, plotWidth: 1000, measureLabel: measure })
    expect(r.horizontal).toBe(false)
    expect(r.lines).toEqual(PATHS)
  })

  test('narrow, every label breaks into two that fit: wrapped, still vertical', () => {
    // slot = (300 − 0 − 12) / 5 = 57.6px; every label (63–70px) wraps under it.
    const r = categoryLabelLayout({ labels: PATHS, plotWidth: 300, measureLabel: measure })
    expect(r.horizontal).toBe(false)
    expect(r.lines.every(Array.isArray)).toBe(true)
  })

  test('narrow, a label cannot fit two lines: horizontal', () => {
    const r = categoryLabelLayout({ labels: COMPLEXITY, plotWidth: 330, measureLabel: measure })
    expect(r).toMatchObject({ horizontal: true, lines: null })
  })

  test('the y-label column comes out of the slot', () => {
    const plain = categoryLabelLayout({ labels: PATHS, plotWidth: 400, measureLabel: measure })
    const withY = categoryLabelLayout({ labels: PATHS, plotWidth: 400, measureLabel: measure, yLabelWidth: 50 })
    expect(plain.slotWidth - withY.slotWidth).toBeCloseTo(10)
    expect(plain.slotWidth).toBeCloseTo((400 - Y_TICK_ALLOWANCE) / 5)
  })

  test('too many rows for the plot height stays vertical (autoskipped, unrotated)', () => {
    const many = Array.from({ length: 30 }, (_, i) => `unattributed${i}`)
    expect(many.length * (BAR_THICKNESS + BAR_GAP)).toBeGreaterThan(180)
    expect(categoryLabelLayout({ labels: many, plotWidth: 340, measureLabel: measure }).horizontal).toBe(false)
  })

  test('no width or no measurer: no decision, labels as they are', () => {
    expect(categoryLabelLayout({ labels: PATHS, plotWidth: 0, measureLabel: measure })).toEqual({
      horizontal: false,
      lines: null,
    })
    expect(categoryLabelLayout({ labels: PATHS, plotWidth: 340 })).toEqual({ horizontal: false, lines: null })
  })
})

test.describe('buildBarOptions — one mode per chart', () => {
  const opts = (labels, extra = {}) =>
    buildBarOptions({ data: data(labels), plotWidth: 300, measureLabel: measure, ...extra })

  test('horizontal swaps the scales: categories on y, the value axis on x', () => {
    const o = opts(COMPLEXITY)
    expect(o.indexAxis).toBe('y')
    expect(o.scales.x.beginAtZero).toBe(true)
    expect(o.scales.y.beginAtZero).toBeUndefined()
    expect(o.scales.y.ticks.maxRotation).toBe(0)
    expect(o.scales.x.ticks).toMatchObject({ autoSkip: true, maxRotation: 0, minRotation: 0 })
    // The tooltip reads the value from the value axis.
    expect(o.plugins.tooltip.callbacks.label({ parsed: { x: 7, y: 2 } })).toBe('y: 7')
  })

  test('wrapped vertical: the x tick callback returns the two-line label', () => {
    const o = opts(PATHS)
    expect(o.indexAxis).toBeUndefined()
    const cb = o.scales.x.ticks.callback
    expect(cb.call({ getLabelForValue: (v) => PATHS[v] }, 2, 2)).toEqual(['cold', 'start'])
  })

  test('autoHorizontal: false (threshold, extremes, consumer indexAxis) never switches', () => {
    expect(opts(COMPLEXITY, { autoHorizontal: false }).indexAxis).toBeUndefined()
  })

  test('compact, sparkline and time mode are untouched', () => {
    expect(opts(COMPLEXITY, { variant: 'compact' }).indexAxis).toBeUndefined()
    expect(opts(COMPLEXITY, { variant: 'sparkline' }).indexAxis).toBeUndefined()
    const ts = COMPLEXITY.map((_, i) => Date.UTC(2026, 9, 30, i))
    expect(opts(COMPLEXITY, { xAxis: 'time', timestamps: ts }).indexAxis).toBeUndefined()
  })
})

// The rendered half: real canvas, real font, real layout.
const read = async (page, width, theme) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(`/tests/e2e/fixtures/category-labels.html?w=${width}${theme === 'dark' ? '&theme=dark' : ''}`, {
    waitUntil: 'networkidle',
  })
  await page.waitForFunction(() => window.__catLabelsReady === true, null, { timeout: 15_000 })
  return page.evaluate(() => window.__catLabels)
}

for (const theme of ['light', 'dark']) {
  for (const width of [340, 1000]) {
    test(`no category label rotates, and each is drawn whole (${width}px, ${theme})`, async ({ page }) => {
      const m = await read(page, width, theme)
      for (const [id, c] of Object.entries(m)) {
        expect(c.rotation, `${id}: category labelRotation`).toBe(0)
        expect(c.maxRotation, `${id}: largest labelRotation on any scale`).toBe(0)
        // Every label fully drawn on at most two lines within its slot, or the
        // chart is horizontal (where `allWhole` checks the full-length labels).
        expect(c.allWhole, `${id}: ${JSON.stringify(c.ticks.map((t) => t.lines))} in ${c.slot}px`).toBe(true)
      }
    })
  }

  test(`340px: complexity turns horizontal, two-word labels wrap (${theme})`, async ({ page }) => {
    const m = await read(page, 340, theme)
    expect(m.complexity.horizontal).toBe(true)
    expect(m.paths.horizontal).toBe(false)
    expect(m.paths.ticks.every((t) => t.lines.length === 2)).toBe(true)
  })

  test(`a consumer's value-axis bounds follow the value axis when horizontal (${theme})`, async ({ page }) => {
    // options.scales.y {0, 100} is written for the value axis; at 340px the
    // chart turns horizontal and the bounds land on x, not on the categories.
    const narrow = await read(page, 340, theme)
    expect(narrow.accuracy.horizontal).toBe(true)
    expect(narrow.accuracy.valueRange).toEqual([0, 100])
    const wide = await read(page, 1000, theme)
    expect(wide.accuracy.horizontal).toBe(false)
    expect(wide.accuracy.valueRange).toEqual([0, 100])
  })

  test(`1000px: every chart is vertical with single-line labels (${theme})`, async ({ page }) => {
    const m = await read(page, 1000, theme)
    for (const c of Object.values(m)) {
      expect(c.horizontal).toBe(false)
      expect(c.ticks.every((t) => t.lines.length === 1)).toBe(true)
    }
  })
}
