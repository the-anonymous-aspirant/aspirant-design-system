/**
 * Ink selection for data-driven fills — corpus §3.18 (system_3 #2378).
 *
 * A label chip or agent dot is filled with a colour that comes from DATA
 * (`vocab_labels.color`, a per-agent assigned colour), not from the token set.
 * So its ink cannot be a fixed token, and it cannot be a theme-flipping one
 * either: the fill is theme-independent, so its ink must be too.
 *
 * The rule, from the design ruling on #2378, is three steps:
 *
 *   1. Pick whichever candidate ink scores higher against the fill.
 *   2. If it clears 4.5:1, render unchanged.
 *   3. If not, nudge the FILL's lightness minimally — hue and saturation held —
 *      in the direction that raises that ink's contrast, stopping at 4.5:1.
 *
 * Step 3 matters because a two-ink pick alone is not sufficient: `#c063c0`
 * (`feature-request`, `severity=critical`, `severity=medium`) fails against
 * both candidates, so no choice-of-ink rule can save it.
 *
 * The adjustment is a pure function of the fill computed at render time. The
 * stored vocabulary value is never mutated, so the operator's chosen colour
 * round-trips intact and the guarantee extends to colours added later.
 *
 * Note on 11px/700 chips: that is NOT WCAG "large text" (which needs >=18.66px
 * bold), so the 3:1 large-text allowance does not apply. The threshold here is
 * 4.5:1 and must stay there.
 */

export const AA = 4.5

/**
 * The dark pole is NOT `--text-on-light`.
 *
 * That token is `#424242` here, and it flips to `#e0e0e0` under
 * `[data-theme='dark']` — which would hand step 1 two light candidates in dark
 * mode and break the rule outright. Beyond that, the choice of pole decides how
 * often step 3 fires and how far it moves the palette:
 *
 *   against #212121 (the ruling's value):  1 of 9 live fills needs adjusting
 *   against #424242 (--text-on-light):     8 of 9 do
 *
 * The ruling's stated outcome is that the common path adjusts nothing and "the
 * palette looks exactly as it does today", with `#c063c0` the single boundary
 * case at +0.6% L. That outcome only holds against #212121, and the designer's
 * published table was computed against it — so that is the value implemented,
 * and it reproduces their verified numbers exactly.
 *
 * Flagged to @design_agent on #2378: this deserves a token of its own rather
 * than a constant here, and the divergence from --text-on-light should be
 * ratified rather than inherited from a comment.
 */
const INK_DARK = '#212121'
const INK_LIGHT = '#ffffff'

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))

export const parseHex = (hex) => {
  const h = String(hex).trim().replace(/^#/, '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16))
}

const toHex = ([r, g, b]) =>
  `#${[r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('')}`

const relativeLuminance = ([r, g, b]) => {
  const f = (v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

export const contrast = (a, b) => {
  const [la, lb] = [relativeLuminance(parseHex(a)), relativeLuminance(parseHex(b))]
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

// --- HSL round trip, so step 3 can hold hue and saturation ------------------

const rgbToHsl = ([r, g, b]) => {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255]
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return [0, 0, l]
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
  else if (max === gn) h = ((bn - rn) / d + 2) / 6
  else h = ((rn - gn) / d + 4) / 6
  return [h, s, l]
}

const hslToRgb = ([h, s, l]) => {
  if (s === 0) return [l * 255, l * 255, l * 255]
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const channel = (t) => {
    let tt = t
    if (tt < 0) tt += 1
    if (tt > 1) tt -= 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }
  return [channel(h + 1 / 3), channel(h), channel(h - 1 / 3)].map((c) => c * 255)
}

/**
 * Resolve a data fill to the pair actually rendered.
 *
 * @param {string} hex fill from data (`vocab_labels.color`, agent colour)
 * @returns {{fill: string, ink: string, adjusted: boolean, ratio: number}|null}
 *   `null` for an unparseable input, so the caller can fall back to the
 *   semantic token path rather than rendering something arbitrary.
 */
export const resolveDataFill = (hex) => {
  const rgb = parseHex(hex)
  if (!rgb) return null

  const fill = toHex(rgb)

  // Step 1 — the better of the two candidates.
  const dark = contrast(fill, INK_DARK)
  const light = contrast(fill, INK_LIGHT)
  const ink = dark >= light ? INK_DARK : INK_LIGHT
  const ratio = Math.max(dark, light)

  // Step 2 — good enough, change nothing. This is the common path.
  if (ratio >= AA) return { fill, ink, adjusted: false, ratio }

  // Step 3 — minimal lightness shift, hue and saturation held. A dark ink wants
  // a lighter fill; a light ink wants a darker one.
  const [h, s, l0] = rgbToHsl(rgb)
  const direction = ink === INK_DARK ? 1 : -1
  const STEP = 0.001 // 0.1% L — fine enough that "minimal" is honest.

  for (let i = 1; i <= 1000; i += 1) {
    const l = clamp(l0 + direction * i * STEP, 0, 1)
    const candidate = toHex(hslToRgb([h, s, l]))
    const r = contrast(candidate, ink)
    if (r >= AA) return { fill: candidate, ink, adjusted: true, ratio: r }
    if (l === 0 || l === 1) break
  }

  // Unreachable for any real fill: pure white clears 4.5:1 against #212121 and
  // pure black clears it against white, so one end always satisfies. Returned
  // rather than thrown so a pathological input degrades instead of blanking a
  // page.
  const fallback = direction === 1 ? '#ffffff' : '#000000'
  return { fill: fallback, ink, adjusted: true, ratio: contrast(fallback, ink) }
}
