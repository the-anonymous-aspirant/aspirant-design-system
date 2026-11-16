import { fileURLToPath } from 'node:url'

import { expect, test } from '@playwright/test'

import { iconRegistry } from '../../src/icons/registry.js'
import { woff2Codepoints } from './woff2-cmap.js'

// Every registered icon glyph must be in the house typeface, Iosevka 400 latin,
// read from the shipped font's own cmap (system_3 #11151). A glyph outside it
// draws in the device font or as a box, which is how ✉ ⌕ ⌀ ⟳ shipped.

const FONT = fileURLToPath(new URL('../../src/fonts/iosevka-latin-400-normal.woff2', import.meta.url))

// Variation selectors (U+FE00 to U+FE0F) only pick a presentation; the font
// need not map them. `improvement` is ↗ + U+FE0E: U+2197 is in the font and
// U+FE0E is not, and the glyph renders fine, so they are stripped before the
// lookup (design ack c70197 on #11151).
const isVariationSelector = (cp) => cp >= 0xfe00 && cp <= 0xfe0f

// Known misses, each keyed by name AND code point so a swap to a different
// glyph that is also off-font still fails. This list may only shrink: system_3
// #11420 replaces all four and deletes it.
const KNOWN_MISSES = {
  aspiring_hand: [0x270b], // ✋ #11420
  support: [0x2615], // ☕ #11420
  attach: [0x1f4ce], // 📎 #11420
  responsibilities: [0x2696], // ⚖ (+U+FE0E) #11420
}

const hex = (cp) => `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`

const missesOf = (cmap) =>
  Object.fromEntries(
    Object.entries(iconRegistry)
      .map(([name, { glyph }]) => [
        name,
        [...glyph].map((ch) => ch.codePointAt(0)).filter((cp) => !isVariationSelector(cp) && !cmap.has(cp)),
      ])
      .filter(([, cps]) => cps.length)
  )

test('the cmap reader reads the shipped Iosevka', () => {
  const cmap = woff2Codepoints(FONT)
  expect(cmap.size).toBe(5706)
  // Controls either side: ASCII and ↻ are in; the glyphs #11151 replaced are out.
  for (const ch of 'A@◎⊘↻') expect(cmap.has(ch.codePointAt(0)), ch).toBe(true)
  for (const ch of '✉⌕⌀⟳') expect(cmap.has(ch.codePointAt(0)), ch).toBe(false)
})

test('every registered glyph is in Iosevka 400 latin, apart from the pinned known misses', () => {
  const misses = missesOf(woff2Codepoints(FONT))
  const readable = (m) => Object.fromEntries(Object.entries(m).map(([n, cps]) => [n, cps.map(hex)]))
  expect(readable(misses)).toEqual(readable(KNOWN_MISSES))
})

test('the four names #11151 fixed carry the glyphs design ruled', () => {
  expect(iconRegistry.messages.glyph).toBe('@')
  expect(iconRegistry.search.glyph).toBe('◎')
  expect(iconRegistry.disabled.glyph).toBe('⊘')
  expect(iconRegistry.processes.glyph).toBe('↻')
})
