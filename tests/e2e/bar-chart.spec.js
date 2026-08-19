import { expect, test } from '@playwright/test'

import { MEASURE } from './contrast-measure.js'
import {
  AA,
  AA_NON_TEXT,
  contrastRatio,
  deriveInk,
  parseColor,
} from '../../src/utils/color_contrast.js'
import {
  BAR_THICKNESS,
  BASELINE_HEIGHT,
  HEIGHTS,
  MIN_TICK_FONT_PX,
  RECURRING_LABELS,
  STATE_TOKENS,
  TICKS,
  TICK_GUTTER,
  TICK_LADDER,
  TIME_AXIS_END_PADDING,
  VARIANTS,
  WIDEST_LABELS,
  bandFor,
  buildBarOptions,
  buildLineOptions,
  computeExtremeMarks,
  formatExtremeValue,
  selectTimeTicks,
  timeAxisEndPadding,
} from '../../src/utils/bar_chart_options.js'

const THEMES = ['light', 'dark']

const OPTS = () =>
  buildBarOptions({
    variant: 'regular',
    axisInk: 'rgb(0, 0, 0)',
    axisLine: 'rgb(0, 0, 0)',
    tooltipBg: 'rgb(66, 66, 66)',
    tooltipInk: 'rgb(255, 255, 255)',
    fontFamily: 'monospace',
    unit: 'ms',
  })

// ---------------------------------------------------------------------------
// P8. The operator's round-2 feedback was three claims about numbers: charts
// are too tall, the hover should expose x AND y, and there should be more axis
// labels. Each is asserted here as a number, not as a screenshot opinion — an
// off-by-one in tick density is invisible in a picture and wrong on a page.
// ---------------------------------------------------------------------------
test.describe('P8: shorter', () => {
  test('regular is materially shorter than the baseline it replaces', () => {
    expect(HEIGHTS.regular).toBeLessThan(BASELINE_HEIGHT)
    // "Materially" pinned to a number so a future 310px does not quietly
    // satisfy a bare less-than and call P8 addressed.
    expect(HEIGHTS.regular / BASELINE_HEIGHT).toBeLessThanOrEqual(0.7)
  })

  test('compact fits the ~180x48 Health cell the spec sizes', () => {
    expect(HEIGHTS.compact).toBeLessThanOrEqual(48)
  })

  test('the RENDERED component is shorter, labels included', async ({ page }) => {
    // The number above sizes the canvas; this measures what the operator
    // actually sees. The unit and range labels are DOM around the canvas, so
    // asserting only the canvas height would let the chrome give the saving
    // back without a single test turning red.
    await page.goto('/tests/e2e/fixtures/bar-chart.html', { waitUntil: 'networkidle' })
    await page.waitForFunction(() => window.__aspBarChartReady === true)
    const box = await page.locator('.asp-bar-chart').first().boundingBox()
    expect(box.height).toBeLessThan(BASELINE_HEIGHT)
    expect(box.height / BASELINE_HEIGHT).toBeLessThanOrEqual(0.75)
  })
})

test.describe('P8: hover exposes x AND y', () => {
  const tooltip = () => OPTS().plugins.tooltip.callbacks

  test('the title names the x value', () => {
    expect(tooltip().title([{ label: '14h' }])).toBe('x: 14h')
  })

  test('the body names the y value and its unit', () => {
    expect(tooltip().label({ parsed: { y: 480 } })).toBe('y: 480 ms')
  })

  test('a unitless chart still names y rather than trailing a space', () => {
    const cb = buildBarOptions({ unit: '' }).plugins.tooltip.callbacks
    expect(cb.label({ parsed: { y: 7 } })).toBe('y: 7')
  })

  test('an empty hover does not throw', () => {
    expect(tooltip().title([])).toBe('')
  })

  test('the tooltip is reachable without hitting the bar itself', () => {
    // A compact cell's bars are a few px tall; requiring a direct hit would
    // make the P8 reading unreachable on exactly the surface it was asked for.
    expect(OPTS().interaction).toMatchObject({ mode: 'index', intersect: false })
  })
})

test.describe('P8: denser axis labels', () => {
  // Asserted on what RENDERS, not on the flag. The first version of this suite
  // asserted `autoSkip === false` and passed while the 30-category chart drew
  // `0h1h2h3h4h…29h` as one unreadable smear — the assertion encoded the
  // implementation choice instead of the operator's goal, so it could not tell
  // the difference between "denser" and "illegible".
  test('regular renders MORE x labels than a plain AspChart, and none overlap', async ({
    page,
  }) => {
    await page.goto('/tests/e2e/fixtures/tick-density.html', { waitUntil: 'networkidle' })
    await page.waitForFunction(() => window.__tickDensityReady === true, null, { timeout: 10_000 })
    const m = await page.evaluate(() => window.__tickDensity)

    // Denser than the treatment P8 objected to.
    expect(
      m.preset.count,
      `preset drew ${m.preset.count} x labels, baseline drew ${m.baseline.count}`
    ).toBeGreaterThan(m.baseline.count)

    // And still readable: collision avoidance is ON, so no two adjacent labels
    // may share pixels. This is the half the flag assertion could not see.
    expect(m.preset.overlaps, `${m.preset.overlaps} overlapping x label pairs`).toBe(0)
  })

  test('collision avoidance stays enabled', () => {
    // The specific regression: turning this off is what produced the smear.
    expect(TICKS.regular.x.autoSkip).toBe(true)
    expect(OPTS().scales.x.ticks.autoSkip).toBe(true)
  })

  test('regular gives y a real tick ramp, not just the extremes', () => {
    expect(TICKS.regular.y.maxTicksLimit).toBeGreaterThanOrEqual(4)
  })

  test('compact keeps at least the min/max pair the spec calls the floor', () => {
    expect(TICKS.compact.y.maxTicksLimit).toBeGreaterThanOrEqual(2)
  })
})

// ---------------------------------------------------------------------------
// §3.19 time-axis tick grammar.
//
// Asserted the same way P8's density was, and for the same recorded reason: on
// what RENDERS, not on the flag. A flag assertion cannot tell a landmark axis
// from an arbitrary-instant one — both set `maxRotation: 0` — so every test
// here reads back the label text AND the pixel it landed on.
//
// The unit half injects a deterministic measurer (7px per character) so the
// ladder arithmetic is pinned independent of the font the browser resolves.
// The rendered half then checks the real canvas agrees. Neither alone is
// enough: the unit tests cannot see a scale that never laid out, and the
// browser tests cannot isolate which rule produced a given interval.
// ---------------------------------------------------------------------------
const MIN = 60_000
const HR = 60 * MIN

/** Local wall-clock series, so the boundary maths is tested in the zone it runs in. */
const at = (h, m = 0) => new Date(2026, 6, 20, h, m, 0, 0).getTime()
const hourly = (count, startHour = 0) =>
  Array.from({ length: count }, (_, i) => at(startHour) + i * HR)

/** 7px/char — wide enough to be realistic, fixed enough to compute against. */
const measure7 = (s) => s.length * 7
const pick = (labels) =>
  labels.map((label, index) => ({ index, label })).filter((e) => e.label !== '')

test.describe('§3.19: ticks land on calendar boundaries', () => {
  test('a window opening off-boundary still ticks ON the boundary', () => {
    // The rule that makes a tick worth labelling. Starting at 00:17 must not
    // produce 00:17 / 01:17 / 02:17 — those are instants, not landmarks. This
    // is the assertion that would fail if the ticks were ever computed as
    // equal divisions of the window, which is the natural wrong implementation.
    const start = at(0, 17)
    const timestamps = Array.from({ length: 25 }, (_, i) => start + i * HR)
    const chosen = pick(selectTimeTicks({ timestamps, plotWidth: 1000, measureLabel: measure7 }))

    const interior = chosen.slice(1, -1)
    expect(interior.length).toBeGreaterThan(0)
    for (const { label } of interior) {
      expect(label, `${label} is an arbitrary instant, not a wall-clock landmark`).toMatch(
        /(^|\s)\d{2}:00$/
      )
    }
  })

  test('the finest ladder interval that fits is the one chosen', () => {
    // Decision 2 resolves ties UPWARD in density — the complaint was too few
    // labels. Coarsest-available would satisfy "fits" and miss the point, so
    // the test pins that the next finer rung genuinely would NOT have fit.
    const timestamps = hourly(25)
    const plotWidth = 1000
    const chosen = pick(selectTimeTicks({ timestamps, plotWidth, measureLabel: measure7 }))

    const spanH = 24
    const stepH = (chosen[1].index - chosen[0].index) * 1
    const interval = stepH * HR
    expect(TICK_LADDER).toContain(interval)

    const slot = Math.max(...RECURRING_LABELS.dayClock.map(measure7)) + 12
    const budget = Math.floor(plotWidth / slot)
    expect(Math.floor((spanH * HR) / interval) + 1).toBeLessThanOrEqual(budget)

    const finer = TICK_LADDER[TICK_LADDER.indexOf(interval) - 1]
    expect(
      Math.floor((spanH * HR) / finer) + 1,
      'a finer rung also fitted the budget — the ladder walk is not taking the finest'
    ).toBeGreaterThan(budget)
  })

  test('ticks are evenly spaced in category index, not merely present', () => {
    const chosen = pick(
      selectTimeTicks({ timestamps: hourly(25), plotWidth: 1000, measureLabel: measure7 })
    )
    const gaps = chosen.slice(1).map((c, i) => c.index - chosen[i].index)
    expect(new Set(gaps).size, `uneven tick spacing: ${gaps}`).toBe(1)
  })
})

test.describe('§3.19: density is a budget, and the floor is derived', () => {
  test('budget < 3 renders endpoints only', () => {
    // Criterion 2. Asserted as the OUTCOME of the budget arithmetic: the width
    // is chosen to drive budget under 3, and nothing in the implementation
    // branches on "is this narrow" directly.
    const timestamps = hourly(25)
    const slot = Math.max(...RECURRING_LABELS.dayClock.map(measure7)) + 12
    const plotWidth = slot * 2 // budget == 2, one under the floor
    expect(Math.floor(plotWidth / slot)).toBeLessThan(3)

    const chosen = pick(selectTimeTicks({ timestamps, plotWidth, measureLabel: measure7 }))
    expect(chosen.map((c) => c.index)).toEqual([0, 24])
  })

  test('budget < 2 labels nothing rather than colliding the endpoints', () => {
    // The rung past §3.19's stated floor, derived from the same rule: with no
    // room for a landmark the range label is the whole reading. Reproduces
    // compact's `display: false` by arithmetic instead of by variant.
    const timestamps = hourly(25)
    const slot = Math.max(...RECURRING_LABELS.dayClock.map(measure7)) + 12
    const chosen = pick(selectTimeTicks({ timestamps, plotWidth: slot, measureLabel: measure7 }))
    expect(chosen).toHaveLength(0)
  })

  test('a wider plot earns strictly more labels on the same data', () => {
    // The budget is a function of width, so widening must not leave density
    // unchanged. A hard-coded tick count would pass every test above and fail
    // this one.
    const timestamps = hourly(25)
    const narrow = pick(selectTimeTicks({ timestamps, plotWidth: 300, measureLabel: measure7 }))
    const wide = pick(selectTimeTicks({ timestamps, plotWidth: 1200, measureLabel: measure7 }))
    expect(wide.length).toBeGreaterThan(narrow.length)
  })

  test('an empty or single-point series does not throw', () => {
    expect(selectTimeTicks({ timestamps: [], plotWidth: 400 })).toEqual([])
    expect(pick(selectTimeTicks({ timestamps: [at(0)], plotWidth: 400 }))).toHaveLength(1)
  })

  test('unparseable timestamps yield no labels rather than Invalid Date', () => {
    // The failure this prevents is cosmetic-looking and total: `new Date(NaN)`
    // formats as "Invalid Date" and would paint that string across the axis.
    const labels = selectTimeTicks({ timestamps: ['not-a-time', 'also-not'], plotWidth: 400 })
    expect(labels.every((l) => l === '')).toBe(true)
  })
})

test.describe('§3.19: format follows the span, in three bands', () => {
  test('a span at or under 6h reads as a bare 24-hour clock', () => {
    expect(bandFor(6 * HR)).toBe('clock')
    const timestamps = Array.from({ length: 13 }, (_, i) => at(0) + i * (HR / 2))
    const chosen = pick(selectTimeTicks({ timestamps, plotWidth: 600, measureLabel: measure7 }))
    for (const { label } of chosen) expect(label).toMatch(/^\d{2}:\d{2}$/)
  })

  test('a span over 72h reads as a date', () => {
    expect(bandFor(96 * HR)).toBe('date')
    const timestamps = Array.from({ length: 25 }, (_, i) => at(0) + i * (6 * HR))
    const chosen = pick(selectTimeTicks({ timestamps, plotWidth: 900, measureLabel: measure7 }))
    for (const { label } of chosen) expect(label).toMatch(/^\d{1,2} [A-Z][a-z]{2}$/)
  })

  test('the middle band names the day only where the day changes', () => {
    // The repetition rule, and the reason it exists: a day name on every tick
    // is noise that pushes the clock reading out of the slot. Midnight always
    // carries its day so the flip is visible without counting.
    const chosen = pick(
      selectTimeTicks({ timestamps: hourly(25), plotWidth: 1000, measureLabel: measure7 })
    )
    expect(chosen.length).toBeGreaterThan(2)

    const named = chosen.filter((c) => /^[A-Z][a-z]{2} /.test(c.label))
    const bare = chosen.filter((c) => /^\d{2}:\d{2}$/.test(c.label))
    expect(named.length + bare.length).toBe(chosen.length)

    // Exactly the two midnights in a 24h window opening at midnight.
    expect(named.map((c) => c.label)).toEqual([
      expect.stringMatching(/^[A-Z][a-z]{2} 00:00$/),
      expect.stringMatching(/^[A-Z][a-z]{2} 00:00$/),
    ])
    expect(named[0].index).toBe(0)
    expect(named[1].index).toBe(24)
    // And the day actually advanced between them, rather than repeating.
    expect(named[0].label).not.toBe(named[1].label)
  })
})

test.describe('§3.19: the preset wiring', () => {
  test('time mode does not rotate, and category mode still does', () => {
    // Decision 2 rules rotation out for time. The paired assertion is the
    // guard on criterion 3: the categorical treatment must be untouched, so
    // both halves are stated together and a diff that "fixed" rotation
    // globally turns this red.
    const timeX = buildBarOptions({ xAxis: 'time', timestamps: hourly(25) }).scales.x.ticks
    expect(timeX.maxRotation).toBe(0)
    expect(timeX.autoSkip).toBe(false)

    expect(TICKS.regular.x.maxRotation).toBe(90)
    expect(buildBarOptions({}).scales.x.ticks).toMatchObject(TICKS.regular.x)
  })

  test('compact keeps its hidden x axis even in time mode', () => {
    // §3.19 derives this from the budget floor: a 48px cell has no interior
    // landmark to offer, and the range label carries the reading. Reaching in
    // to add ticks here would break the rule this mode implements.
    const x = buildBarOptions({
      variant: 'compact',
      xAxis: 'time',
      timestamps: hourly(25),
    }).scales.x.ticks
    expect(x.display).toBe(false)
  })

  test('time mode without timestamps falls back rather than drawing nothing', () => {
    // A caller who sets the mode and forgets the data gets today's axis, not
    // a blank one. Silently blank is the worse failure: it looks deliberate.
    expect(buildBarOptions({ xAxis: 'time' }).scales.x.ticks).toMatchObject(TICKS.regular.x)
  })

  test('tick text stays at or above the 10px readable floor', () => {
    // §3.19 sets 10px as the floor. Nothing here RAISES a size — canvas ticks
    // take Chart.js's 12px default and the DOM chrome takes --text-xs (12px),
    // so both already clear it. This pins the floor so a future token retune
    // cannot drop under it silently, which is the failure §3.19 describes.
    expect(MIN_TICK_FONT_PX).toBe(10)
    const size = buildBarOptions({ fontFamily: 'monospace' }).scales.x.ticks.font.size ?? 12
    expect(size).toBeGreaterThanOrEqual(MIN_TICK_FONT_PX)
  })
})

// The rendered half: the real canvas, the real font, the real layout.
async function timeAxis(page, theme = 'light') {
  const q = theme === 'dark' ? '?theme=dark' : ''
  await page.goto(`/tests/e2e/fixtures/time-axis.html${q}`, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__timeAxisReady === true, null, { timeout: 15_000 })
  return page.evaluate(() => window.__timeAxis)
}

for (const theme of THEMES) {
  test.describe(`§3.19 rendered (${theme})`, () => {
    test('no time axis is rotated, on either surface', async ({ page }) => {
      const m = await timeAxis(page, theme)
      const rotated = Object.entries(m)
        .filter(([k]) => !k.endsWith('_category'))
        .filter(([, v]) => v && v.rotation !== 0)
      expect(
        rotated.map(([k, v]) => `${k}: ${v.rotation.toFixed(1)}deg`),
        'a time axis rotated its labels — §3.19 Decision 2 rules that out'
      ).toEqual([])
    })

    test('the category control still rotates, proving the split is real', async ({ page }) => {
      // Criterion 3's teeth. If this ever reads 0 the diff has reached
      // categorical behaviour, and every "time is unrotated" assertion above
      // would still pass while the component silently changed for everyone.
      const m = await timeAxis(page, theme)
      expect(m.day24_340_category.rotation).toBeGreaterThan(0)
    })

    test('at two slots the chart renders endpoints only, by budget not by branch', async ({
      page,
    }) => {
      const m = await timeAxis(page, theme)
      const v = m.day24_endpoints
      expect(v.labelled).toHaveLength(2)
      expect(v.labelled[0].index).toBe(0)
      expect(v.labelled[1].index).toBe(v.tickCount - 1)
    })

    test('below two slots it labels nothing and lets the range label carry it', async ({ page }) => {
      // The narrower limiting case, and the one a label COUNT could not see:
      // two endpoints at 96px drew `Mon 0Tue 00:00`, a right-sized axis that
      // was still an unreadable smear.
      const m = await timeAxis(page, theme)
      expect(m.day24_narrow.labelled).toHaveLength(0)
    })

    test('every adjacent pair clears the 12px gutter, not merely zero overlap', async ({ page }) => {
      // The corrected §3.19 formulation: the gutter is checked between labels
      // that can ACTUALLY be adjacent, not against a uniform worst case. The
      // pair that made the old arithmetic reject a 6h ladder — two
      // day-prefixed labels side by side — cannot occur, because the
      // repetition rule puts the day name on the first tick of a calendar day
      // only, so those are >=24h apart while ticks are 6h apart.
      const m = await timeAxis(page, theme)
      const tight = []
      for (const [key, v] of Object.entries(m)) {
        if (!v || key.endsWith('_category')) continue
        for (let i = 1; i < v.labelled.length; i += 1) {
          const prev = v.labelled[i - 1]
          const cur = v.labelled[i]
          const gap = cur.px - cur.w / 2 - (prev.px + prev.w / 2)
          if (gap < TICK_GUTTER) {
            tight.push(`${key}: "${prev.label}"/"${cur.label}" gap ${Math.round(gap)}px`)
          }
        }
      }
      expect(tight, `adjacent labels closer than the ${TICK_GUTTER}px floor`).toEqual([])
    })

    test('the wide day-prefixed form never lands next to another wide one', () => {
      // States the property the budget now relies on, so a future change to the
      // repetition rule cannot silently invalidate the sizing. If two wide
      // labels could be adjacent, budgeting on the recurring form would be
      // unsound and the old worst-case reading would be right after all.
      const chosen = pick(
        selectTimeTicks({ timestamps: hourly(25), plotWidth: 1000, measureLabel: measure7 })
      )
      const isWide = (l) => /^[A-Z][a-z]{2} /.test(l)
      for (let i = 1; i < chosen.length; i += 1) {
        expect(
          isWide(chosen[i - 1].label) && isWide(chosen[i].label),
          `"${chosen[i - 1].label}" and "${chosen[i].label}" are adjacent and both wide`
        ).toBe(false)
      }
      // And the recurring form really is the narrower one, or the budget is
      // measuring the wrong string.
      expect(Math.max(...RECURRING_LABELS.dayClock.map(measure7))).toBeLessThan(
        Math.max(...WIDEST_LABELS.dayClock.map(measure7))
      )
    })

    test('end labels are not clamped, truncated, or shoved off their tick', async ({ page }) => {
      // Asked for explicitly by design_agent on #2482. At a 6h ladder the first
      // and last ticks carry the wide form and overhang their tick by ~32px. If
      // Chart.js clamped or shifted that text the label would no longer sit on
      // the instant it names — the `06:17` defect arriving from the other side.
      const m = await timeAxis(page, theme)
      const v = m.day24_340
      const first = v.labelled[0]
      const last = v.labelled[v.labelled.length - 1]

      // Full text, not an ellipsis or a stub.
      expect(first.label).toMatch(/^[A-Z][a-z]{2} \d{2}:\d{2}$/)
      expect(last.label).toMatch(/^[A-Z][a-z]{2} \d{2}:\d{2}$/)

      // And their painted extent stays inside the canvas.
      expect(Math.round(first.px - first.w / 2), 'first label overflows the canvas left').toBeGreaterThanOrEqual(0)
      expect(Math.round(last.px + last.w / 2), 'last label overflows the canvas right').toBeLessThanOrEqual(
        v.canvasWidth
      )
    })

    test('no two rendered labels overlap, on any case or surface', async ({ page }) => {
      // The assertion the density suite already learned it needed once. Every
      // rule above is about choosing an interval that FITS; this is the one
      // that checks the choice was right, in pixels, on the painted axis.
      const m = await timeAxis(page, theme)
      const collisions = []
      for (const [key, v] of Object.entries(m)) {
        if (!v || key.endsWith('_category')) continue
        const boxes = v.labelled.map((t) => [t.px - t.w / 2, t.px + t.w / 2, t.label])
        for (let i = 1; i < boxes.length; i += 1) {
          if (boxes[i][0] < boxes[i - 1][1]) {
            collisions.push(`${key}: "${boxes[i - 1][2]}" / "${boxes[i][2]}"`)
          }
        }
      }
      expect(collisions, 'adjacent x labels share pixels — the smear defect').toEqual([])
    })

    test('rendered labels are wall-clock landmarks, never arbitrary instants', async ({ page }) => {
      const m = await timeAxis(page, theme)
      const bad = []
      for (const [key, v] of Object.entries(m)) {
        if (!v || key.endsWith('_category')) continue
        for (const t of v.labelled) {
          // Every band's output is a boundary form: HH:00, Ddd HH:00, or D Mon.
          if (!/^(\d{1,2} [A-Z][a-z]{2}|([A-Z][a-z]{2} )?\d{2}:(00|30))$/.test(t.label)) {
            bad.push(`${key}: "${t.label}"`)
          }
        }
      }
      expect(bad, 'a rendered tick is not on a calendar boundary').toEqual([])
    })

    test('tick positions are evenly spaced across the plot', async ({ page }) => {
      // Labels on boundaries but positions bunched would mean the label was
      // attached to the wrong bucket. Only a position assertion catches it.
      const m = await timeAxis(page, theme)
      const v = m.day24_340
      const gaps = v.labelled.slice(1).map((t, i) => t.px - v.labelled[i].px)
      const spread = Math.max(...gaps) - Math.min(...gaps)
      expect(spread, `tick spacing varies by ${spread}px: ${gaps}`).toBeLessThanOrEqual(2)
    })

    test('the same data on a dark card renders the same axis as the page', async ({ page }) => {
      // §3.18: AspCard is a dark surface even in the light theme. The GRAMMAR
      // must not vary with the surface — only the derived ink does.
      const m = await timeAxis(page, theme)
      expect(m.day24_340_card.labelled.map((t) => t.label)).toEqual(
        m.day24_340.labelled.map((t) => t.label)
      )
    })
  })
}

test.describe('axes are drawn, not implied', () => {
  for (const axis of ['x', 'y']) {
    test(`the ${axis} axis line is on and its grid is off`, () => {
      const scale = OPTS().scales[axis]
      expect(scale.border.display).toBe(true)
      expect(scale.border.width).toBe(1)
      // The old treatment had this backwards — faint grid across the plot and
      // no axis line, which is what "we don't clearly see the x-axis and
      // y-axis" was describing.
      expect(scale.grid.display).toBe(false)
    })
  }

  test('bar geometry matches the Performance treatment the spec adopts', () => {
    expect(OPTS().datasets.bar.barThickness).toBe(BAR_THICKNESS)
  })
})

test.describe('it is a preset, not a fork', () => {
  test('every preset value stays overridable by the consumer', () => {
    // The property that distinguishes a preset from a fork. If AspBarChart
    // merged its own options LAST, this would fail and the component would be
    // a fork wearing a preset's name.
    expect(buildBarOptions({ variant: 'regular' }).scales.y.beginAtZero).toBe(true)
    const overridden = { ...OPTS(), scales: { ...OPTS().scales, y: { beginAtZero: false } } }
    expect(overridden.scales.y.beginAtZero).toBe(false)
  })

  test('an unknown variant falls back to regular rather than an empty scale', () => {
    // Compared against TICKS.regular rather than a literal, so retuning the
    // density policy cannot leave this asserting a value nothing uses.
    expect(buildBarOptions({ variant: 'nonsense' }).scales.x.ticks).toMatchObject(TICKS.regular.x)
  })
})

// ---------------------------------------------------------------------------
// §3.60. The value-axis normalization is computed at THIS choke point from the
// data, so every AspBarChart consumer inherits the headroom. A bar is a
// magnitude encoding: the baseline stays at 0 and only a TOP suggestedMax is
// added; lifting the min would be the §3.23 truncated-axis lie. The diverging
// two-series sparkline keeps zero INTERIOR and gains headroom on both ends.
// ---------------------------------------------------------------------------
test.describe('§3.60 value-axis headroom', () => {
  const withData = (data, extra = {}) =>
    buildBarOptions({ variant: 'regular', axisInk: '#000', axisLine: '#000', unit: '', data, ...extra })
  const d = (...arrays) => ({ datasets: arrays.map((data) => ({ data })) })

  test('the baseline stays at zero — beginAtZero unchanged, no min set', () => {
    const y = withData(d([10, 20, 30])).scales.y
    // The existing :538 invariant: bars never lift the baseline off zero.
    expect(y.beginAtZero).toBe(true)
    expect(y.min).toBeUndefined()
  })

  test('a suggestedMax of ~1.1x the observed max is emitted as top headroom', () => {
    const y = withData(d([10, 20, 30])).scales.y
    expect(y.suggestedMax).toBe(33)
  })

  test('a diverging two-series window pads BOTH ends outward from zero', () => {
    // The Overview task-flow card: the second (done) series is passed negated.
    const y = buildBarOptions({
      variant: 'sparkline',
      axisInk: '#000',
      axisLine: '#000',
      unit: '',
      zeroBaseline: true,
      data: d([5, 12], [-3, -8]),
    }).scales.y
    expect(y.beginAtZero).toBe(true)
    expect(y.suggestedMin).toBeLessThan(-8)
    expect(y.suggestedMax).toBeGreaterThan(12)
  })

  test('no data supplied → the y scale auto-fits exactly as before (no bounds)', () => {
    const y = buildBarOptions({ variant: 'regular' }).scales.y
    expect(y.beginAtZero).toBe(true)
    expect(y.suggestedMax).toBeUndefined()
    expect(y.suggestedMin).toBeUndefined()
    expect(y.min).toBeUndefined()
  })

  test('a consumer explicit y:{max} still wins over the computed suggestedMax', () => {
    // The preset emits suggestedMax; the merge in AspBarChart lets a consumer's
    // options win. Emulate that final layer: an explicit max overrides.
    const preset = withData(d([10, 20, 30]))
    const merged = { ...preset, scales: { ...preset.scales, y: { ...preset.scales.y, max: 100 } } }
    expect(merged.scales.y.max).toBe(100)
  })
})

// ---------------------------------------------------------------------------
// §3.66. The sparkline variant had no coverage distinguishing a STOCK
// (position/line) series from a FLOW (magnitude/bar) one — this is that gap.
// A stock's y domain must be FOCUSED (a non-zero min, padded on both ends); a
// flow's must stay ZERO-BASED (beginAtZero, no min set). Same input shape
// (a single-series 24-hour window hovering well above zero, as the real
// tasks_backlog/agents_active series do), two different builders, two
// different honest domains.
// ---------------------------------------------------------------------------
test.describe('§3.66 sparkline mark selection: stock/position line vs flow/magnitude bar', () => {
  const stockSeries = { datasets: [{ data: [40, 41, 43, 44, 42, 45, 44, 43] }] }

  test('a stock/position sparkline gets a focused, non-zero, both-ends-padded domain', () => {
    const y = buildLineOptions({ axisInk: '#000', axisLine: '#000', unit: '', data: stockSeries }).scales.y
    expect(y.min).toBeDefined()
    expect(y.min).not.toBe(0)
    expect(y.min).toBeGreaterThan(0)
    expect(y.min).toBeLessThan(40)
    expect(y.max).toBeGreaterThan(45)
  })

  test('the same series as a flow/magnitude bar sparkline stays zero-based', () => {
    const y = buildBarOptions({
      variant: 'sparkline',
      axisInk: '#000',
      axisLine: '#000',
      unit: '',
      data: stockSeries,
    }).scales.y
    expect(y.beginAtZero).toBe(true)
    expect(y.min).toBeUndefined()
    expect(y.suggestedMax).toBeGreaterThan(45)
  })

  test('the sparkline line domain is axis-less like the sparkline bar', () => {
    const y = buildLineOptions({ axisInk: '#000', axisLine: '#000', unit: '', data: stockSeries }).scales.y
    const x = buildLineOptions({ axisInk: '#000', axisLine: '#000', unit: '', data: stockSeries }).scales.x
    expect(y.border.display).toBe(false)
    expect(y.grid.display).toBe(false)
    expect(y.ticks.display).toBe(false)
    expect(x.border.display).toBe(false)
    expect(x.grid.display).toBe(false)
    expect(x.ticks.display).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// The end reservation, asserted as a derivation rather than as two numbers.
//
// The values are only half the claim. The other half is WHY the left is zero —
// because the y-axis column is wider than the overhang, not because the left
// edge is special. Asserting `{left: 0, right: 33}` alone would pass just as
// happily if someone hard-coded a zero, and would keep passing after the y axis
// is hidden, which is exactly when the left stops being safe.
// ---------------------------------------------------------------------------
test.describe('time-axis end reservation', () => {
  test('today: the y-axis column absorbs the left overhang, the right pays in full', () => {
    // ceil(65/2) = 33. Left: max(0, 33-36) = 0. Right: max(0, 33-0) = 33.
    expect(TIME_AXIS_END_PADDING).toEqual({ left: 0, right: 33 })
  })

  test('the applied layout padding is the derivation, not a separate literal', () => {
    const opts = buildBarOptions({
      variant: 'regular',
      xAxis: 'time',
      timestamps: [0, 3600e3, 7200e3],
    })
    expect(opts.layout.padding).toEqual(TIME_AXIS_END_PADDING)
  })

  test('category mode reserves nothing — its labels rotate and autoskip', () => {
    expect(buildBarOptions({ variant: 'regular' }).layout).toBeUndefined()
  })

  // The case the previous hard-coded 33 could not express. A hidden y axis
  // allocates no tick column, so the left overhang has nothing absorbing it and
  // the reservation must appear there. Under the old constant the left stayed
  // 0 and the first label clipped, with no test able to notice.
  test('a hidden y axis moves the reservation to the left rather than clipping', () => {
    expect(timeAxisEndPadding({ yAxisColumnWidth: 0 })).toEqual({ left: 33, right: 33 })
  })

  test('a narrowed y-axis column is paid for proportionally', () => {
    // A single-digit maximum narrows the column; 33-20 = 13 is owed on the left.
    expect(timeAxisEndPadding({ yAxisColumnWidth: 20 })).toEqual({ left: 13, right: 33 })
  })

  test('structure on the right reduces the right side the same way', () => {
    // Symmetric treatment: neither side is privileged by the expression.
    expect(timeAxisEndPadding({ rightStructureWidth: 40 })).toEqual({ left: 0, right: 0 })
  })

  test('a wider label in another locale raises both sides, not just the right', () => {
    // ceil(81/2) = 41. Left: 41-36 = 5. This is the locale case the borrowed
    // Chart.js margin used to swallow silently.
    expect(timeAxisEndPadding({ wideLabelWidth: 81 })).toEqual({ left: 5, right: 41 })
  })
})

// ---------------------------------------------------------------------------
// The contrast math, asserted directly. deriveInk is the rule §3.18 rules a
// two-ink pick insufficient for, so the counter-example is the test.
// ---------------------------------------------------------------------------
test.describe('deriveInk', () => {
  test('leaves an already-passing ink alone', () => {
    const bg = [255, 255, 255, 1]
    const black = [0, 0, 0, 1]
    expect(deriveInk(black, bg)).toEqual(black)
  })

  test('the #c063c0 case: a colour that fails against BOTH ends', () => {
    // The recorded counter-example behind the derive-and-adjust rule. On a
    // mid-grey it fails against white AND against black, so a two-way pick
    // returns a failing colour and reports success.
    const mid = [128, 128, 128, 1]
    const problem = parseColor('#c063c0')
    expect(contrastRatio(problem, mid)).toBeLessThan(AA)
    expect(contrastRatio(deriveInk(problem, mid), mid)).toBeGreaterThanOrEqual(AA)
  })

  test('composites a translucent ink before judging it', () => {
    // --text-muted ships as a color-mix with alpha; measuring it as if opaque
    // overstates contrast and passes ink that renders illegible.
    const bg = [255, 255, 255, 1]
    const faint = [120, 120, 120, 0.2]
    expect(contrastRatio(faint, bg)).toBeLessThan(AA)
    expect(contrastRatio(deriveInk(faint, bg), bg)).toBeGreaterThanOrEqual(AA)
  })

  test('drives toward white on dark and black on light', () => {
    const onDark = deriveInk([60, 60, 60, 1], [20, 20, 20, 1])
    const onLight = deriveInk([200, 200, 200, 1], [250, 250, 250, 1])
    expect(onDark[0]).toBeGreaterThan(60)
    expect(onLight[0]).toBeLessThan(200)
  })

  test('an unparseable colour returns null rather than guessing black', () => {
    expect(parseColor('not-a-colour')).toBeNull()
    expect(parseColor('')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// The rendered surfaces. Everything above is arithmetic; this is what the
// component actually derived, on the containers it was actually dropped into.
// ---------------------------------------------------------------------------
async function derivedPaint(page, theme) {
  const q = theme === 'dark' ? '?theme=dark' : ''
  await page.goto(`/tests/e2e/fixtures/bar-chart.html${q}`, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__aspBarChartReady === true, null, { timeout: 10_000 })
  return Object.values(await page.evaluate(() => window.__aspBarChart))
}

for (const theme of THEMES) {
  test.describe(`rendered surfaces (${theme})`, () => {
    test('tick and legend ink clears AA on every container', async ({ page }) => {
      const cases = await derivedPaint(page, theme)
      const failures = cases
        .map((c) => ({ ...c, ratio: contrastRatio(parseColor(c.axisInk), c.background) }))
        .filter((c) => c.ratio < AA)
      expect(
        failures.map((f) => `${f.surface}/${f.state}: ${f.ratio.toFixed(2)}:1`),
        'axis ink below AA on a real container surface'
      ).toEqual([])
    })

    test('axis lines clear the non-text threshold on every container', async ({ page }) => {
      const cases = await derivedPaint(page, theme)
      const failures = cases
        .map((c) => ({ ...c, ratio: contrastRatio(parseColor(c.axisLine), c.background) }))
        .filter((c) => c.ratio < AA_NON_TEXT)
      expect(
        failures.map((f) => `${f.surface}/${f.state}: ${f.ratio.toFixed(2)}:1`),
        'axis line below the non-text threshold — the axis is there but not visible'
      ).toEqual([])
    })

    test('every state fill is distinguishable from its plot background', async ({ page }) => {
      const cases = await derivedPaint(page, theme)
      // Bars are painted marks, so the non-text threshold governs. This is the
      // one that catches --brand-primary-alpha (an ALPHA token) disappearing
      // into a surface whose luminance is close to the amber underneath.
      const failures = cases
        .map((c) => ({ ...c, ratio: contrastRatio(parseColor(c.barFill), c.background) }))
        .filter((c) => c.ratio < AA_NON_TEXT)
      expect(
        failures.map((f) => `${f.surface}/${f.state}: ${f.ratio.toFixed(2)}:1`),
        'bar fill below the non-text threshold against its own container'
      ).toEqual([])
    })

    test('tooltip ink clears AA against the tooltip surface, not the page', async ({ page }) => {
      const cases = await derivedPaint(page, theme)
      const failures = cases
        .map((c) => ({
          ...c,
          ratio: contrastRatio(parseColor(c.tooltipInk), parseColor(c.tooltipBg)),
        }))
        .filter((c) => c.ratio < AA)
      expect(failures.map((f) => `${f.surface}: ${f.ratio.toFixed(2)}:1`)).toEqual([])
    })

    test('the axis unit and range labels are real DOM text', async ({ page }) => {
      const q = theme === 'dark' ? '?theme=dark' : ''
      await page.goto(`/tests/e2e/fixtures/bar-chart.html${q}`, { waitUntil: 'networkidle' })
      // The whole reason they are not Chart.js scale titles. If these become
      // canvas paint, the ordinary contrast matrix stops seeing them and this
      // component's chrome goes unmeasured everywhere.
      await expect(page.locator('.asp-bar-chart__unit').first()).toHaveText('ms')
      await expect(page.locator('.asp-bar-chart__range').first()).toHaveText('last 6 hours')
    })

    test('and those DOM labels are legible on every surface', async ({ page }) => {
      // The payoff for moving them out of the canvas, and the assertion whose
      // absence let a real defect through: the labels rendered near-invisible
      // on the dark page surface while all 34 other assertions stayed green,
      // because every one of them measured a colour the component DERIVED and
      // none measured the ones it inherited from CSS.
      //
      // Reuses the shipped probe rather than reimplementing it. AspBarChart is
      // deliberately not in specimens.js (the matrix cannot see a canvas), so
      // this is where its DOM chrome gets measured.
      const q = theme === 'dark' ? '?theme=dark' : ''
      await page.goto(`/tests/e2e/fixtures/bar-chart.html${q}`, { waitUntil: 'networkidle' })
      await page.waitForFunction(() => window.__aspBarChartReady === true)

      const failures = (await page.evaluate(MEASURE)).filter(
        (r) => r.ratio < AA && String(r.selector).includes('asp-bar-chart')
      )
      expect(
        failures.map((f) => `${f.selector} "${f.text}": ${f.ratio}:1`),
        'AspBarChart DOM chrome below AA'
      ).toEqual([])
    })
  })
}

// ---------------------------------------------------------------------------
// The teeth. Without these, a derivation that silently did nothing would pass
// everything above forever — the contrast suite's own known-bad discipline,
// applied to this component.
// ---------------------------------------------------------------------------
test.describe('the probe itself', () => {
  test('the fixture actually measured every surface and state', async ({ page }) => {
    const cases = await derivedPaint(page, 'light')
    // 3 surfaces x 4 state values. A fixture that mounted nothing would leave
    // this at 0 and every assertion above would pass on an empty array.
    expect(cases.length).toBe(12)
    expect(new Set(cases.map((c) => c.surface)).size).toBe(3)
    expect(new Set(cases.map((c) => c.state)).size).toBe(4)
  })

  test('the derivation is load-bearing — the raw token would FAIL somewhere', async ({ page }) => {
    // The control. If the spec's preferred ink already cleared AA on every
    // surface unaided, the whole derive-and-adjust path would be decoration and
    // these tests would prove nothing about it. Assert that at least one real
    // surface genuinely needs the adjustment.
    await page.goto('/tests/e2e/fixtures/bar-chart.html', { waitUntil: 'networkidle' })
    await page.waitForFunction(() => window.__aspBarChartReady === true)

    const raw = await page.evaluate(() => {
      const el = document.querySelector('.asp-bar-chart')
      return getComputedStyle(el).getPropertyValue('--border-subtle').trim()
    })
    const cases = await derivedPaint(page, 'light')
    const undrived = cases.filter(
      (c) => contrastRatio(parseColor(raw), c.background) < AA_NON_TEXT
    )
    expect(
      undrived.length,
      `the raw --border-subtle (${raw}) cleared the threshold on every surface unaided — ` +
        'either the surfaces got easier or the fixture stopped covering the hard one'
    ).toBeGreaterThan(0)
  })

  test('every state maps to a token that actually resolves', async ({ page }) => {
    await page.goto('/tests/e2e/fixtures/bar-chart.html', { waitUntil: 'networkidle' })
    const unresolved = await page.evaluate((tokens) => {
      const el = document.querySelector('.asp-bar-chart')
      const cs = getComputedStyle(el)
      return Object.entries(tokens)
        .filter(([, name]) => !cs.getPropertyValue(name).trim())
        .map(([state]) => state)
    }, STATE_TOKENS)
    // A typo'd token name resolves to '' and Chart.js falls back to its own
    // default colour — the bars still render, in the wrong colour, silently.
    expect(unresolved, 'state tokens that do not exist in build/tokens.css').toEqual([])
  })
})

// ---------------------------------------------------------------------------
// §3.12's metric-state colour map is a COLOUR-IDENTITY contract, and every
// assertion above measures a DERIVED colour — so a token that is wrong but
// still legible (green for great, a translucent amber for normal) passes all of
// them. That is exactly how #2752's green-for-good defect survived: the fills
// cleared every contrast threshold while painting the state the operator did
// not ratify. These pin the token NAMES so the identity itself is under test.
// ---------------------------------------------------------------------------
test.describe('§3.12 metric-state colour map (operator round-2, comment 8784)', () => {
  test('great is the soft-blue accent, not feedback-success green', () => {
    // §1.3 reserves soft-blue for links/hints; §3.12 elevates it to the
    // great-state signal (its one explicit deviation) because amber cannot also
    // read "great" and green-for-good fights the 60/30/10 amber identity.
    expect(STATE_TOKENS.great).toBe('--brand-accent')
  })

  test('normal is the solid brand amber, not the translucent alpha', () => {
    // The stateless default stays --brand-primary-alpha (§3.10); a chart making
    // a metric-state claim reads at full strength.
    expect(STATE_TOKENS.normal).toBe('--brand-primary')
  })

  test('unhealthy is feedback red', () => {
    expect(STATE_TOKENS.unhealthy).toBe('--feedback-error')
  })
})

// ---------------------------------------------------------------------------
// #3129 — the sparkline variant. The at-a-glance card trend glyph: a 48px cell
// with ALL axis furniture suppressed, single- and dual-series (diverging)
// support, and the per-bar hover retained. Design-of-record §3.53.
//
// Two halves, each asserted where it is honest: the option SHAPE is a pure
// function (borders off, ticks off, tooltip on) and lives here; the per-dataset
// FILL is a component choice against a real surface and is measured through the
// bar-chart-sparkline fixture, the same "assert at the source" rule the paint
// contract already follows.
// ---------------------------------------------------------------------------
const SPARK = (over = {}) =>
  buildBarOptions({
    variant: 'sparkline',
    axisInk: 'rgb(0, 0, 0)',
    axisLine: 'rgb(0, 0, 0)',
    tooltipBg: 'rgb(66, 66, 66)',
    tooltipInk: 'rgb(255, 255, 255)',
    fontFamily: 'monospace',
    ...over,
  })

test.describe('#3129 sparkline: a furniture-free trend glyph', () => {
  test('it is a real variant at the 48px cell', () => {
    expect(HEIGHTS.sparkline).toBe(48)
    expect(VARIANTS).toContain('sparkline')
  })

  test('neither axis line is drawn — the inversion of the regular treatment', () => {
    // regular/compact draw both borders (asserted in "axes are drawn"); the
    // sparkline is the one variant that draws none, so the cell is bars only.
    expect(SPARK().scales.x.border.display).toBe(false)
    expect(SPARK().scales.y.border.display).toBe(false)
  })

  test('no tick text on either axis', () => {
    expect(SPARK().scales.x.ticks.display).toBe(false)
    expect(SPARK().scales.y.ticks.display).toBe(false)
  })

  test('the per-bar hover tooltip survives — a sparkline still owes the drill', () => {
    const tip = SPARK().plugins.tooltip
    expect(tip).toBeTruthy()
    expect(tip.callbacks.title([{ label: '14:00' }])).toBe('x: 14:00')
    expect(tip.callbacks.label({ parsed: { y: 3 } })).toBe('y: 3')
  })

  test('the bars still sit on a real zero baseline — an empty hour is a gap, not a shift', () => {
    // beginAtZero is what makes a zero-count hour render as an empty slot at the
    // baseline rather than rescaling the whole chart around the non-zero hours.
    expect(SPARK().scales.y.beginAtZero).toBe(true)
  })

  test('a single-series sparkline keeps the grid off, exactly as every other variant', () => {
    expect(SPARK().scales.y.grid.display).toBe(false)
  })

  test('regular and compact are byte-untouched by the new variant', () => {
    // The one border the sparkline turns off must not leak into the variants
    // the operator already reads on Performance and Health.
    expect(OPTS().scales.x.border.display).toBe(true)
    expect(OPTS().scales.y.border.display).toBe(true)
    expect(buildBarOptions({ variant: 'compact' }).scales.x.border.display).toBe(true)
  })
})

test.describe('#3129 sparkline: the diverging zero rule', () => {
  test('a diverging card paints exactly the zero gridline and nothing else', () => {
    const grid = SPARK({ zeroBaseline: true }).scales.y.grid
    expect(grid.display).toBe(true)
    // Scriptable: the zero tick takes the axis line, every other tick is
    // transparent — so the reader gets one up/down reference, not a full grid.
    expect(grid.color({ tick: { value: 0 } })).toBe('rgb(0, 0, 0)')
    expect(grid.color({ tick: { value: 4 } })).toBe('transparent')
    expect(grid.lineWidth({ tick: { value: 0 } })).toBe(1)
    expect(grid.lineWidth({ tick: { value: -2 } })).toBe(0)
  })

  test('without the flag there is no gridline — the rule is opt-in for diverging only', () => {
    expect(SPARK({ zeroBaseline: false }).scales.y.grid.display).toBe(false)
  })
})

test.describe('#3129 sparkline (rendered): per-dataset fills on the card surface', () => {
  const read = async (page, theme) => {
    const q = theme === 'dark' ? '?theme=dark' : ''
    await page.goto(`/tests/e2e/fixtures/bar-chart-sparkline.html${q}`, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => window.__sparklineReady === true)
    return page.evaluate(() => window.__sparkline)
  }

  for (const theme of THEMES) {
    test(`single-series takes one fill, clearing AA vs the card surface (${theme})`, async ({ page }) => {
      const s = (await read(page, theme)).single
      expect(s.barFills).toHaveLength(1)
      const ratio = contrastRatio(parseColor(s.barFills[0]), s.background)
      expect(ratio).toBeGreaterThanOrEqual(AA_NON_TEXT)
    })

    test(`diverging takes TWO distinct fills, each clearing AA vs the card surface (${theme})`, async ({
      page,
    }) => {
      const d = (await read(page, theme)).diverging
      expect(d.barFills).toHaveLength(2)
      // The two series must read as different hues — a diverging card whose
      // created and done bars are the same colour is not diverging.
      expect(d.barFills[0]).not.toBe(d.barFills[1])
      for (const fill of d.barFills) {
        expect(contrastRatio(parseColor(fill), d.background)).toBeGreaterThanOrEqual(AA_NON_TEXT)
      }
    })

    test(`the min marker never shares a paint with a series on the same chart (${theme})`, async ({
      page,
    }) => {
      // §3.66b / #4050. The defect this guards is not "two tokens share a hex"
      // but "both are PAINTED on the same card": a two-dataset chart inks its
      // second series from --chart-series-2, and while --chart-extreme-min was
      // also #0072b2 the ▼ on that series was drawn its own series' colour —
      // collapsing the colour channel c20597 made PRIMARY and leaving only the
      // shape it named as the colourblind FALLBACK. Measured on the DERIVED
      // paints, not the token values, because deriveInk is what actually lands
      // on the canvas (two different hexes could still derive together).
      const d = (await read(page, theme)).diverging
      expect(d.barFills).toHaveLength(2)
      for (const fill of d.barFills) {
        expect(d.extremeInks.min).not.toBe(fill)
        expect(d.extremeInks.max).not.toBe(fill)
      }
      // ...and the two markers stay distinguishable from each other, which is
      // the whole point of two hues rather than one glyph in two shapes.
      expect(d.extremeInks.min).not.toBe(d.extremeInks.max)
      // Both still clear the non-text floor against the real card surface —
      // moving a token must not buy separation at the cost of legibility.
      for (const ink of [d.extremeInks.min, d.extremeInks.max]) {
        expect(contrastRatio(parseColor(ink), d.background)).toBeGreaterThanOrEqual(AA_NON_TEXT)
      }
    })

    test(`the diverging card configures the y=0 rule; the single card does not (${theme})`, async ({
      page,
    }) => {
      const all = await read(page, theme)
      expect(all.diverging.hasZeroRule).toBe(true)
      expect(all.single.hasZeroRule).toBe(false)
      // design_agent #3129: the rule is configured for EVERY two-series window,
      // not only ones that straddle zero. A one-sided window that gated the rule
      // out would imply "bottom = zero", which is a lie for an all-done hour.
      expect(all.divergingAllCreated.hasZeroRule).toBe(true)
      expect(all.divergingAllDone.hasZeroRule).toBe(true)
    })

    test(`the zero rule PAINTS a full-width line — even in a one-sided window (${theme})`, async ({
      page,
    }) => {
      // The teeth behind "always drawn". Configured is not painted: a rule that
      // rode a zero tick the library declined to generate would leave hasZeroRule
      // true and the canvas blank. So this measures ink on the canvas row at y=0
      // — a full-width 1px rule lights ~every column; sparse bars light far
      // fewer. The two one-sided windows are the cases that matter: their zero
      // sits on the very top (all-done) or bottom (all-created) edge, and the
      // line must still paint there rather than clip to nothing.
      const all = await read(page, theme)
      for (const key of ['diverging', 'divergingAllCreated', 'divergingAllDone']) {
        expect(
          all[key].zeroLineInkFrac,
          `${key}: zero rule did not paint a full-width line (ink fraction ${all[key].zeroLineInkFrac})`
        ).toBeGreaterThanOrEqual(0.95)
      }
      // And the single-series card, which draws NO rule, has no such full-width
      // line — only its sparse bars — so the assertion above is measuring the
      // rule, not an artefact every chart would show.
      expect(
        all.single.zeroLineInkFrac,
        `single-series showed a full-width line at y=0 (ink fraction ${all.single.zeroLineInkFrac}) — it should have none`
      ).toBeLessThan(0.9)
    })
  }

  test('the rendered sparkline occupies the 48px cell, not the taller regular chart', async ({
    page,
  }) => {
    await page.goto('/tests/e2e/fixtures/bar-chart-sparkline.html', { waitUntil: 'networkidle' })
    await page.waitForFunction(() => window.__sparklineReady === true)
    const box = await page.locator('.asp-bar-chart').first().boundingBox()
    // No unit/range DOM lines, so the whole component is the ~48px canvas plus a
    // hair of sub-pixel rounding. Generous ceiling; the point is it is NOT the
    // 180px regular chart.
    expect(box.height).toBeLessThanOrEqual(56)
  })
})

// ---------------------------------------------------------------------------
// #4021 (system_3, operator ruling c20597) — min/max extreme marks: pure math.
// ---------------------------------------------------------------------------
test.describe('computeExtremeMarks (#4021)', () => {
  test('a varied series yields one max ▲ and one min ▼ at the right slots', () => {
    const marks = computeExtremeMarks([{ data: [3, 9, 1, 4] }])
    expect(marks).toEqual([
      { datasetIndex: 0, index: 1, kind: 'max', negative: false },
      { datasetIndex: 0, index: 2, kind: 'min', negative: false },
    ])
  })

  test('flat and short series yield NO marks — silence, never a lying marker', () => {
    expect(computeExtremeMarks([{ data: [4, 4, 4] }])).toEqual([])
    expect(computeExtremeMarks([{ data: [7] }])).toEqual([])
    expect(computeExtremeMarks([{ data: [] }])).toEqual([])
    expect(computeExtremeMarks([])).toEqual([])
  })

  test('nulls are skipped, not treated as zeros', () => {
    const marks = computeExtremeMarks([{ data: [null, 5, null, 2] }])
    expect(marks).toEqual([
      { datasetIndex: 0, index: 1, kind: 'max', negative: false },
      { datasetIndex: 0, index: 3, kind: 'min', negative: false },
    ])
  })

  test('an all-negative (diverging) dataset swaps the semantic labels', () => {
    // The negated "done" half: -7 is the MOST done → semantic max, below axis.
    const marks = computeExtremeMarks([{ data: [-2, -7, -1] }])
    expect(marks).toEqual([
      { datasetIndex: 0, index: 1, kind: 'max', negative: true },
      { datasetIndex: 0, index: 2, kind: 'min', negative: true },
    ])
  })

  test('multi-dataset (diverging pair): marks per dataset, indexes independent', () => {
    const marks = computeExtremeMarks([
      { data: [1, 6, 2] },
      { data: [-3, 0, -5] },
    ])
    expect(marks).toHaveLength(4)
    const d1 = marks.filter((m) => m.datasetIndex === 1)
    // Mixed-sign second dataset (a zero hour): NOT all ≤ 0 swaps only when
    // every value is non-positive — zero IS non-positive, so it swaps here.
    expect(d1).toEqual([
      { datasetIndex: 1, index: 2, kind: 'max', negative: true },
      { datasetIndex: 1, index: 1, kind: 'min', negative: false },
    ])
  })
})

test.describe('formatExtremeValue (§3.66c / #4080)', () => {
  test('an integer count renders bare', () => {
    expect(formatExtremeValue(9)).toBe('9')
    expect(formatExtremeValue(0)).toBe('0')
  })

  test('the MAGNITUDE is drawn — a negated diverging half shows the count, not the sign', () => {
    // computeExtremeMarks maps the "done" half's semantic max to its most
    // negative slot (-7 == 7 done); the reader wants "7", never "-7".
    expect(formatExtremeValue(-7)).toBe('7')
    expect(formatExtremeValue(-1)).toBe('1')
  })

  test('a fractional value keeps one decimal — no 12-digit float on a 48px card', () => {
    expect(formatExtremeValue(3.14159)).toBe('3.1')
    expect(formatExtremeValue(-2.75)).toBe('2.8')
  })

  test('a non-finite / non-number slot yields null — the caller draws the triangle only', () => {
    expect(formatExtremeValue(null)).toBeNull()
    expect(formatExtremeValue(undefined)).toBeNull()
    expect(formatExtremeValue(NaN)).toBeNull()
    expect(formatExtremeValue(Infinity)).toBeNull()
    expect(formatExtremeValue('5')).toBeNull()
  })
})
