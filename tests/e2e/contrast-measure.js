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
 */
export const MEASURE = () => {
  const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true })

  const norm = (c) => {
    cv.fillStyle = '#000'
    cv.fillStyle = c
    const r = cv.fillStyle
    if (r.startsWith('#')) {
      return [parseInt(r.slice(1, 3), 16), parseInt(r.slice(3, 5), 16), parseInt(r.slice(5, 7), 16), 1]
    }
    const n = r.match(/[\d.]+/g).map(Number)
    // color() carries 0-1 components; rgb()/rgba() carry 0-255. Detect, never assume.
    const scale = r.startsWith('color(') ? 255 : 1
    return [n[0] * scale, n[1] * scale, n[2] * scale, n.length > 3 ? n[3] : 1]
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
