/**
 * Rendered-contrast measurement, injected into the page.
 *
 * Every non-obvious line here exists because an earlier version of this probe
 * was wrong in that exact way. They are documented rather than tidied away,
 * because each one silently inverted a verdict:
 *
 *  1. Colour is normalised through a canvas AND the component scale is
 *     detected. Computed colour comes back as `rgb()`, `rgba()`, or
 *     `color(srgb r g b / a)` with 0-1 components -- and canvas round-trips
 *     `color()` unchanged. A parser assuming 0-255 read `color(srgb 1 1 1/.8)`
 *     as near-black and reported a regression on a correct fix.
 *  2. Translucent layers are composited onto the first opaque ancestor.
 *     Measuring an `rgba(...,0.1)` tint as if opaque understated contrast ~2x.
 *  3. The FOREGROUND alpha is composited too. Translucent text (color-mix,
 *     opacity) is not its raw colour on screen.
 *  4. Only leaf text nodes are measured. An ancestor's `color` is not what
 *     renders; `innerText` reads the DOM, not the screen.
 *  5. Colour is read as a RASTERISED PIXEL, not parsed from the string canvas
 *     returns. Parsing needed a per-syntax scale heuristic, and a colour caught
 *     mid-`transition` comes back as `oklab(...)` -- 0-1 components with a
 *     prefix the heuristic did not know -- which read as near-black and
 *     reported a false sub-AA failure. See the comment on `norm`.
 */
// `root` optionally scopes the sweep to one subtree (a CSS selector, passed
// through page.evaluate). Callers that need the ramp inside a single specimen
// use it instead of re-implementing the colour maths; see content.spec.js.
export const MEASURE = (root) => {
  const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true })

  // PAINT the colour and read the pixel back, rather than parsing the string
  // canvas hands back. Defect 5 (see header): the old parser round-tripped
  // fillStyle to a string and inferred the component scale from its prefix,
  // special-casing `color()` as 0-1 and assuming everything else was 0-255.
  //
  // Chromium reports a colour mid-`transition` as `oklab(L a b / alpha)`, whose
  // components are ALSO 0-1 and whose prefix is not `color(`. So every hovered
  // element sampled before its transition settled parsed as near-black and
  // measured ~1.2:1 against a dark surface -- a false sub-AA verdict on a
  // component whose settled hover measures 9.41:1. Found on AspBackButton
  // (#2375); it would have fired on any component with a colour transition.
  //
  // The scale heuristic cannot be patched by adding `oklab` to it: the same
  // trap waits in lab(), lch(), oklch() and every future colour syntax. Reading
  // the rasterised pixel is format-agnostic by construction -- the browser does
  // the conversion, and there is no string to misjudge.
  const norm = (c) => {
    cv.clearRect(0, 0, 1, 1)
    cv.fillStyle = '#000'
    cv.fillStyle = c
    // An unparseable colour leaves fillStyle at #000; painting it would report
    // opaque black, which is the very failure this replaced. Detect it instead.
    if (cv.fillStyle === '#000000' && !/^(#000000|#000|black|rgba?\(0, ?0, ?0)/.test(c.trim())) {
      return [0, 0, 0, 0]
    }
    cv.fillRect(0, 0, 1, 1)
    const [r, g, b, a] = cv.getImageData(0, 0, 1, 1).data
    return [r, g, b, a / 255]
  }

  const luminance = ([r, g, b]) => {
    const f = (v) => {
      const s = v / 255
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  }

  const over = (fg, bg) => {
    const a = fg[3]
    return [
      fg[0] * a + bg[0] * (1 - a),
      fg[1] * a + bg[1] * (1 - a),
      fg[2] * a + bg[2] * (1 - a),
      1,
    ]
  }

  // Alpha-preserving source-over. `over` above flattens to alpha 1, which is
  // right for the final composite onto an opaque surface but wrong while
  // stacking one node's own layers: a translucent wash over a transparent
  // background is still translucent, and must keep its alpha so the ancestor
  // walk knows to keep going.
  const overKeepAlpha = (fg, bg) => {
    const a = fg[3] + bg[3] * (1 - fg[3])
    if (a === 0) return [0, 0, 0, 0]
    const ch = (i) => (fg[i] * fg[3] + bg[i] * bg[3] * (1 - fg[3])) / a
    return [ch(0), ch(1), ch(2), a]
  }

  // Split on top-level separators only, ignoring any nested inside parens.
  // `linear-gradient(rgb(1, 2, 3), rgb(1, 2, 3))` is ONE layer; a naive split
  // on "," would read it as four.
  const splitTop = (s, byComma) => {
    const out = []
    let depth = 0
    let cur = ''
    for (const chr of s) {
      if (chr === '(') depth++
      else if (chr === ')') depth--
      if (depth === 0 && (byComma ? chr === ',' : /\s/.test(chr))) {
        if (cur.trim()) out.push(cur.trim())
        cur = ''
        continue
      }
      cur += chr
    }
    if (cur.trim()) out.push(cur.trim())
    return out
  }

  // The distinct colours a single gradient layer paints.
  //
  // Defect 6 (this task, #2467): `effectiveBg` composited backgroundColor only
  // and never read background-image, so any component painting a translucent
  // wash as a gradient layer was measured against the wrong surface. The
  // direction is what made it dangerous: in the light theme the wash is black,
  // so the probe read a lighter surface than reality and was merely
  // conservative; in the dark theme the wash is WHITE, so it read #2a2a2a where
  // the screen shows #373737 and OVERSTATED contrast, passing colours that are
  // sub-AA on screen.
  //
  // Structure is parsed here; colour never is. Every extracted substring goes
  // through `norm()` and is rasterised, so this stays format-agnostic per
  // defect 5 — there is no scale heuristic and no syntax list to fall behind.
  // Non-colour parts (`to right`, `45deg`, `in oklab`) simply fail to rasterise
  // and fall out through norm()'s existing unparseable sentinel.
  //
  // Colours are de-duplicated per layer. `linear-gradient(c, c)` — the flat-wash
  // idiom this codebase uses — names the same colour at both stops, and
  // compositing it twice would paint an 0.06 alpha as ~0.12 and overstate
  // darkness. One composite per layer, not one per stop.
  const gradientStops = (layer) => {
    const open = layer.indexOf('(')
    if (open < 0 || !layer.endsWith(')')) return []
    const seen = new Map()
    for (const part of splitTop(layer.slice(open + 1, -1), true)) {
      // A stop is `<color> <position>?`. Try the whole part, then drop trailing
      // tokens until something rasterises, so `rgba(0,0,0,.3) 50%` still reads.
      const toks = splitTop(part, false)
      for (let n = toks.length; n > 0; n--) {
        const c = norm(toks.slice(0, n).join(' '))
        if (c[3] > 0) {
          seen.set(c.join(','), c)
          break
        }
      }
    }
    return [...seen.values()]
  }

  const dedupe = (surfaces) => {
    const seen = new Map()
    for (const s of surfaces) seen.set(s.map((v) => Math.round(v * 1000)).join(','), s)
    return [...seen.values()]
  }

  // What one node actually paints: its backgroundColor with its background-image
  // gradient layers composited on top.
  //
  // Paint order matters and is easy to get backwards. In `background-image: A, B`
  // layer **A is topmost**, so compositing runs base -> B -> A. That is invisible
  // while every layer is the same colour (true across this DS today) and wrong
  // the moment one is not.
  //
  // Returns an ARRAY: a gradient whose stops differ has no single effective
  // background, it has a range. Rather than averaging into a false pass — the
  // exact fault class this comment block exists to fix — each distinct stop
  // becomes a candidate surface and the caller measures the WORST of them. Flat
  // washes collapse to one candidate, so today's numbers are unchanged.
  //
  // `url()` and other non-gradient images yield no stops and are skipped: they
  // cannot be rasterised from here, so they are ignored rather than guessed at.
  // background-blend-mode is likewise not modelled; nothing in this DS uses it.
  const paintOf = (n) => {
    const cs = getComputedStyle(n)
    const base = norm(cs.backgroundColor)
    const img = cs.backgroundImage
    if (!img || img === 'none') return [base]
    let surfaces = [base]
    for (const layer of splitTop(img, true).reverse()) {
      const stops = gradientStops(layer)
      if (!stops.length) continue
      const next = []
      for (const s of surfaces) for (const stop of stops) next.push(overKeepAlpha(stop, s))
      surfaces = dedupe(next)
    }
    return surfaces
  }

  // Candidate painted surfaces beneath `el`, nearest ancestor first.
  const effectiveBgs = (el) => {
    let surfaces = [[0, 0, 0, 0]]
    for (let n = el; n; n = n.parentElement) {
      const next = []
      for (const acc of surfaces) for (const p of paintOf(n)) next.push(overKeepAlpha(acc, p))
      surfaces = dedupe(next)
      if (surfaces.every((s) => s[3] === 1)) break
    }
    // Anything still translucent at the root composites onto the canvas white.
    return surfaces.map((s) => (s[3] === 1 ? s : over(s, [255, 255, 255, 1])))
  }

  const surfaceOf = (el) => {
    for (let n = el; n; n = n.parentElement) if (n.dataset && n.dataset.surface) return n.dataset.surface
    return 'sidebar/shell'
  }

  const out = []
  for (const el of document.querySelectorAll(root ? `${root} *` : 'body *')) {
    const text = [...el.childNodes]
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent.trim())
      .join('')
    if (!text) continue
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none') continue

    // Worst candidate wins: a varying gradient must not average into a pass.
    let ratio = Infinity
    let worstBg = null
    for (const bg of effectiveBgs(el)) {
      const fg = over(norm(cs.color), bg)
      const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a)
      const r = (hi + 0.05) / (lo + 0.05)
      if (r < ratio) {
        ratio = r
        worstBg = bg
      }
    }
    out.push({
      surface: surfaceOf(el),
      selector: String(el.className || el.tagName),
      text: text.slice(0, 24),
      ratio: +ratio.toFixed(2),
      // The surface the ratio was actually measured against. Reported so a
      // failure names the painted colour rather than leaving the reader to
      // re-derive it — and so a wrong composite is visible in the message.
      bg: worstBg.slice(0, 3).map(Math.round),
    })
  }
  return out
}

/** WCAG 2.1 AA, normal-size text. */
export const AA = 4.5
