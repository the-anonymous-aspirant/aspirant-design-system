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
  STATE_TOKENS,
  TICKS,
  buildBarOptions,
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
  test('regular labels every x category rather than thinning them', () => {
    expect(TICKS.regular.x.autoSkip).toBe(false)
    expect(OPTS().scales.x.ticks.autoSkip).toBe(false)
  })

  test('regular gives y a real tick ramp, not just the extremes', () => {
    expect(TICKS.regular.y.maxTicksLimit).toBeGreaterThanOrEqual(4)
  })

  test('compact keeps at least the min/max pair the spec calls the floor', () => {
    expect(TICKS.compact.y.maxTicksLimit).toBeGreaterThanOrEqual(2)
  })
})

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

  test('an unknown variant falls back rather than rendering an empty scale', () => {
    expect(buildBarOptions({ variant: 'nonsense' }).scales.x.ticks.autoSkip).toBe(false)
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
