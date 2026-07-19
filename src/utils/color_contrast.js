/**
 * sRGB contrast math, as pure functions over numeric colours.
 *
 * This exists in `src/` rather than in the test tree because AspBarChart needs
 * it AT RUNTIME: a Chart.js chart paints its axis and tick text onto a canvas,
 * so the ink cannot be expressed as a CSS custom property that inherits and
 * re-resolves per surface. The component has to resolve a concrete colour
 * itself, and the only honest way to choose one is to measure it.
 *
 * The compositing rules mirror `tests/e2e/contrast-measure.js` — translucent
 * layers composite onto the first opaque ancestor, and the FOREGROUND alpha
 * composites too. That file documents why each of those is load-bearing; the
 * short version is that skipping either silently inverts verdicts. The probe
 * measures rendered pixels via canvas; these are the same rules as arithmetic,
 * which is what a component can run and what a test can assert at a boundary.
 */

/** WCAG 2.1 AA, normal-size text. */
export const AA = 4.5

/**
 * WCAG 2.1 AA for non-text (axis lines, threshold rules, bar fills against the
 * plot background). A 1px axis line is a graphical object, not text.
 */
export const AA_NON_TEXT = 3.0

/**
 * Parse a colour string to `[r, g, b, a]` with 0-255 components.
 *
 * Deliberately narrow: it handles `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb()` and
 * `rgba()`, and returns null for anything else. Callers resolve colours through
 * `getComputedStyle`, which normalises every modern syntax — `color-mix()`,
 * `oklch()`, named colours — down to `rgb()`/`rgba()` before this ever sees it.
 *
 * Returning null rather than guessing is the point. `contrast-measure.js`
 * documents a defect where an unparseable colour fell back to opaque black and
 * reported a false sub-AA failure; a null forces the caller to decide.
 */
export const parseColor = (input) => {
  if (typeof input !== 'string') return null
  const s = input.trim()
  if (!s) return null

  const hex = /^#([a-f\d]{3,8})$/i.exec(s)
  if (hex) {
    const h = hex[1]
    const expand = (c) => parseInt(c.length === 1 ? c + c : c, 16)
    if (h.length === 3 || h.length === 4) {
      const parts = h.split('').map(expand)
      return [parts[0], parts[1], parts[2], (parts[3] ?? 255) / 255]
    }
    if (h.length === 6 || h.length === 8) {
      const parts = (h.match(/../g) || []).map((c) => parseInt(c, 16))
      return [parts[0], parts[1], parts[2], (parts[3] ?? 255) / 255]
    }
    return null
  }

  const fn = /^rgba?\(([^)]+)\)$/i.exec(s)
  if (fn) {
    // Both the legacy comma syntax and the modern space syntax (`rgb(0 0 0 / .5)`).
    const parts = fn[1].split(/[\s,/]+/).filter(Boolean).map(Number)
    if (parts.length < 3 || parts.some(Number.isNaN)) return null
    return [parts[0], parts[1], parts[2], parts[3] ?? 1]
  }

  return null
}

/** Relative luminance per WCAG 2.1. Alpha is ignored — composite first. */
export const luminance = ([r, g, b]) => {
  const f = (v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

/** Composite a possibly-translucent `fg` over an opaque `bg`. */
export const compositeOver = (fg, bg) => {
  const a = fg[3] ?? 1
  return [
    fg[0] * a + bg[0] * (1 - a),
    fg[1] * a + bg[1] * (1 - a),
    fg[2] * a + bg[2] * (1 - a),
    1,
  ]
}

/**
 * Contrast ratio between two colours. `fg` composites onto `bg` first, so a
 * translucent ink is measured as it renders rather than as it is authored.
 */
export const contrastRatio = (fg, bg) => {
  const base = compositeOver(bg, [255, 255, 255, 1])
  const ink = compositeOver(fg, base)
  const [hi, lo] = [luminance(ink), luminance(base)].sort((a, b) => b - a)
  return (hi + 0.05) / (lo + 0.05)
}

export const toRgbString = ([r, g, b, a = 1]) => {
  const round = (v) => Math.round(Math.max(0, Math.min(255, v)))
  return a >= 1
    ? `rgb(${round(r)}, ${round(g)}, ${round(b)})`
    : `rgba(${round(r)}, ${round(g)}, ${round(b)}, ${Math.round(a * 1000) / 1000})`
}

/**
 * Derive a legible ink from a preferred colour and the background it lands on.
 *
 * NOT a two-ink pick. The design-of-record (system_3 conventions §3.18) rules
 * that choosing between a light ink and a dark ink is insufficient, and the
 * concrete counter-example is on record: `#c063c0` fails against BOTH ends, so
 * a two-way pick returns a failing colour and reports success. The rule is
 * derive-and-adjust — start from the intended hue, then move it until it
 * actually clears the threshold on the background it actually lands on.
 *
 * The walk is a lightness ramp toward whichever end of the range is further
 * from the background, preserving hue as far as it can and only reaching pure
 * white or black if nothing short of it passes. `steps` bounds the work; the
 * final step is the endpoint itself, so this cannot return a sub-threshold
 * colour when a passing one exists.
 */
export const deriveInk = (preferred, background, target = AA, steps = 24) => {
  const bg = compositeOver(background, [255, 255, 255, 1])
  const ink = compositeOver(preferred, bg)

  if (contrastRatio(ink, bg) >= target) return ink

  // Move away from the background: toward white on a dark surface, toward
  // black on a light one. `luminance` (not raw channel values) picks the
  // direction, because a mid-grey background is not decided by any one channel.
  const towardWhite = luminance(bg) < 0.5
  const endpoint = towardWhite ? [255, 255, 255, 1] : [0, 0, 0, 1]

  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps
    const mixed = [
      ink[0] + (endpoint[0] - ink[0]) * t,
      ink[1] + (endpoint[1] - ink[1]) * t,
      ink[2] + (endpoint[2] - ink[2]) * t,
      1,
    ]
    if (contrastRatio(mixed, bg) >= target) return mixed
  }

  // Unreachable for any real target below 21:1, but returning the endpoint is
  // the maximally-legible answer rather than silently handing back the failing
  // preferred colour.
  return endpoint
}
