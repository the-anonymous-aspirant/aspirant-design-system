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
  STATE_TOKENS,
  TICKS,
  TICK_LADDER,
  bandFor,
  buildBarOptions,
  selectTimeTicks,
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

    const slot = Math.max(...['Wed 00:00'].map(measure7)) + 12
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
    const slot = Math.max(...['Wed 00:00'].map(measure7)) + 12
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
    const slot = Math.max(...['Wed 00:00'].map(measure7)) + 12
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
