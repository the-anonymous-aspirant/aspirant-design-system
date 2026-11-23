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

// There is no allowlist. The four misses #11151 pinned (aspiring_hand,
// support, attach, responsibilities) were replaced by system_3 #11420, so any
// registered glyph outside the font now fails by name and code point.

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

test('every registered glyph is in Iosevka 400 latin', () => {
  const misses = missesOf(woff2Codepoints(FONT))
  const readable = (m) => Object.fromEntries(Object.entries(m).map(([n, cps]) => [n, cps.map(hex)]))
  expect(readable(misses)).toEqual({})
})

test('the check still catches a glyph outside the font', () => {
  // The four glyphs #11420 replaced are the positive control: none is in the
  // font, so a registry that still held one would be reported.
  const cmap = woff2Codepoints(FONT)
  for (const ch of ['\u270B', '\u2615', '\u{1F4CE}', '\u2696']) expect(cmap.has(ch.codePointAt(0)), hex(ch.codePointAt(0))).toBe(false)
})

test('the four names #11151 fixed carry the glyphs design ruled', () => {
  expect(iconRegistry.messages.glyph).toBe('@')
  expect(iconRegistry.search.glyph).toBe('◎')
  expect(iconRegistry.disabled.glyph).toBe('⊘')
  expect(iconRegistry.processes.glyph).toBe('↻')
})

test('the four names #11420 fixed carry the glyphs design ruled', () => {
  expect(iconRegistry.aspiring_hand.glyph).toBe('☝')
  expect(iconRegistry.support.glyph).toBe('⊔')
  expect(iconRegistry.attach.glyph).toBe('+')
  expect(iconRegistry.responsibilities.glyph).toBe('⊜')
})

test('prs carries the glyph design ruled for the console PR list', () => {
  // system_3 #12230, design ack c75887 on #12076: ⇄ (U+21C4), used by no other name.
  expect(iconRegistry.prs.glyph).toBe('\u21C4')
  const users = Object.entries(iconRegistry).filter(([, { glyph }]) => glyph === '\u21C4').map(([n]) => n)
  expect(users).toEqual(['prs'])
})
