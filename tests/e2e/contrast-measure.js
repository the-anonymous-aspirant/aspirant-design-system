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
export const MEASURE = () => {
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

  const effectiveBg = (el) => {
    const stack = []
    for (let n = el; n; n = n.parentElement) {
      const c = norm(getComputedStyle(n).backgroundColor)
      if (c[3] === 0) continue
      stack.push(c)
      if (c[3] === 1) break
    }
    let base = stack.pop() || [255, 255, 255, 1]
    while (stack.length) base = over(stack.pop(), base)
    return base
  }

  const surfaceOf = (el) => {
    for (let n = el; n; n = n.parentElement) if (n.dataset && n.dataset.surface) return n.dataset.surface
    return 'sidebar/shell'
  }

  const out = []
  for (const el of document.querySelectorAll('body *')) {
    const text = [...el.childNodes]
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent.trim())
      .join('')
    if (!text) continue
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none') continue

    const bg = effectiveBg(el)
    const fg = over(norm(cs.color), bg)
    const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a)
    out.push({
      surface: surfaceOf(el),
      selector: String(el.className || el.tagName),
      text: text.slice(0, 24),
      ratio: +((hi + 0.05) / (lo + 0.05)).toFixed(2),
    })
  }
  return out
}

/** WCAG 2.1 AA, normal-size text. */
export const AA = 4.5
