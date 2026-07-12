# Tokens

Design tokens for `@aspirant/design-system`. Source of truth lives here in
JSON; Style Dictionary generates the language-specific outputs on demand.

## Layout

```
tokens/
├── base.json       — verbatim :root from aspirant-client/src/App.vue
│                     (color / typography / spacing / radius / transitions /
│                     shadows). Do not edit values in isolation — this is the
│                     back-compat contract with aspirant-client until every
│                     consumer switches to build/tokens.css.
├── aspirant.json   — v0 additions closing the 8 gaps flagged in
│                     ../docs/TOKENS.md §Gaps:
│                       1. dark-mode surface + text inversions
│                       2. semantic color ramps (brand.primary-50..900,
│                          brand.accent-50..900)
│                       3. chart palette (10 categorical colors,
│                          color-blind-safe Okabe-Ito + brand amber)
│                       4. motion primitives (ease curves)
│                       5. breakpoint tokens
│                       6. z-index scale
│                       7. font weights / line-heights / letter-spacing / mono
│                          family
│                       8. warning feedback color + focus-ring
└── README.md       — this file
```

`base.json` and `aspirant.json` are consumed together by Style Dictionary
(`source: ['tokens/**/*.json']`); when the same path exists in both, the last
file wins per Style Dictionary's file-order merge. In practice `aspirant.json`
only **adds** paths that don't exist in `base.json`, so there are no silent
overrides at this layer today.

## Regenerate

```sh
npm run tokens:build
```

Produces three files under `build/` (which is git-ignored):

| Output | Format | Consumer |
|---|---|---|
| `build/tokens.css` | CSS custom properties on `:root` + `[data-theme='dark']` | any browser context — import once at the app entry (`@import '@aspirant/design-system/tokens.css';`) |
| `build/tokens.js` | ES module (`export const ColorBrandPrimary = '#ffb300'`) | JS runtime — Chart.js palette wiring, computed style comparisons in tests |
| `build/tokens.penpot.json` | W3C DTCG format (`{ $value, $type }`) | Penpot 2.x import — see [Penpot round-trip](#penpot-round-trip) |

### Naming across platforms

Source JSON is grouped by category (`color.surface.page`, `font.size.xs`) so
Penpot can infer `$type` and JS consumers get unambiguous `ColorSurfacePage`
identifiers. The **CSS platform preserves aspirant-client's `:root` names
verbatim** — the `name/aspirant-css-preserve` transform in
`../style-dictionary.config.js` collapses `color.*` to the leaf name and maps
`font.size.*` to `text-*`:

| Source path (JSON) | CSS variable | JS export |
|---|---|---|
| `color.surface.page` | `--surface-page` | `ColorSurfacePage` |
| `color.brand.primary` | `--brand-primary` | `ColorBrandPrimary` |
| `font.size.xs` | `--text-xs` | `FontSizeXs` |
| `space.md` | `--space-md` | `SpaceMd` |
| `color.chart.series-1` | `--chart-series-1` | `ColorChartSeries1` |

Every custom property that lives in `aspirant-client/src/App.vue`'s `:root`
block emits with the identical name from `tokens/base.json`, so `tokens.css`
is a drop-in replacement — no consumer renames required to swap from the
inline `:root` in `App.vue` to `@import '@aspirant/design-system/tokens.css'`.

## Dark mode

`aspirant.json` carries `color.surface.dark.*` and `color.text.dark.*` subtrees.
The `css/variables-with-dark-theme` format in `../style-dictionary.config.js`
emits them under `[data-theme='dark']`, remapping their names to the light
equivalents (`--color-surface-dark-page` → `--color-surface-page`), so consumer
components use one variable name and get the correct value based on the
`data-theme` attribute on `<html>` or `<body>`:

```css
.card {
  background: var(--surface-card);  /* light: #424242 / dark: #2a2a2a */
}
```

The strategy follows README option 1 (light stroke on dark ground) for
functional UI. Hand-drawn asset dark-mode (option 2 — dark ink on light paper)
is asset-level and not tokenized here.

`prefers-reduced-motion` is intentionally **not** a token — the CSS-side check
is a media query, not a value substitution:

```css
@media (prefers-reduced-motion: reduce) {
  * { transition-duration: 0.001s !important; }
}
```

## Penpot round-trip

`build/tokens.penpot.json` is emitted in the W3C DTCG format
(https://tr.designtokens.org/format/), which Penpot 2.x consumes as its
`Import Design Tokens` payload.

Round-trip target: change amber in Penpot → export the DTCG JSON → drop into
`tokens/aspirant.json` (or `base.json` if the change belongs to the
back-compat layer) → `npm run tokens:build` regenerates `tokens.css` /
`tokens.js` / `tokens.penpot.json` from the updated source.

**Penpot format status:** the emitter targets DTCG spec-compliant
`$value` / `$type` on every leaf, grouped by category. The empirical round-trip
was run against Penpot 2.16.2's own `parse-decoded-json` / `export-dtcg-json`
(#1980 spike): every emitted token survives import→export.

One retyping is required — Penpot 2.16.2 **rejects the DTCG `duration` type**
and silently drops any token carrying it. So `style-dictionary.config.js`
retypes the `motion` and `transition` groups on the Penpot output only (the CSS
values in `tokens.css` are untouched — the full `0.2s ease` / `cubic-bezier(…)`
strings still ship there):

- `transition.*` (`"0.2s ease"`) → `$type: "number"`, value = duration in **ms**
  (`0.2s` → `200`). The easing keyword is CSS-only.
- `motion.ease.*` (`cubic-bezier(…)`) → `$type: "other"` (preserved-but-inert —
  DTCG/Penpot have no easing/bezier type).

If a future import round-trip surfaces gaps, adjust `inferDtcgType` /
`penpotLeaf` in `style-dictionary.config.js` and re-emit — no source-of-truth
change needed. (system_3 task #1991.)

**Shadows are emitted as DTCG composite objects.** The `shadow.*` tokens hold a
CSS box-shadow shorthand at source (`"0 4px 8px rgba(0,0,0,0.12)"`); the `css`
and `js` platforms keep that string verbatim, but the `penpot` platform parses
it into the DTCG composite `$value`
(`{ offsetX, offsetY, blur, spread, color, inset }`) that Penpot's importer maps
onto its internal shadow model. A string `$value` survives the round-trip but
stays **inert** — it cannot be applied to a shape's drop-shadow in the Penpot
UI. Emitting the composite makes shadows first-class, editable Penpot tokens.
The `inset` keyword (`shadow.inset`) becomes `"inset": true`; a missing
`blur`/`spread` defaults to `"0"`. The `cssShadowToDtcg` parser in
`style-dictionary.config.js` owns the conversion and also handles
comma-separated multi-layer shadows (emitted as an array). Verified against
Penpot 2.16.2's `convert-dtcg-shadow-composite` — all 5 shadow tokens round-trip
as composite objects (system_3 task #1992).

**Font tokens (canonical plural forms):** Penpot 2.16.2 accepts the singular
DTCG `$type`s `fontFamily`/`fontWeight` on import but always re-exports the
plural canonical forms `fontFamilies`/`fontWeights`, and splits a
comma-separated `fontFamily` stack into a string array. So the emitter targets
those canonical forms directly — `font.family.*` → `$type: "fontFamilies"` with
an array `$value`, `font.weight.*` → `$type: "fontWeights"` — so
`tokens.penpot.json` is byte-stable through an import→export from pass one
rather than drifting on the first round-trip. Verified against the backend
`app.common.types.tokens-lib` transform (task #1993 / #1980 spike).

## Consumer example

```js
// Chart.js palette wiring
import {
  ColorChartSeries1,
  ColorChartSeries2,
  ColorChartSeries3,
  ColorChartSeries4,
} from '@aspirant/design-system/tokens'

new Chart(ctx, {
  data: {
    datasets: [
      { data: series1, backgroundColor: ColorChartSeries1 },
      { data: series2, backgroundColor: ColorChartSeries2 },
      { data: series3, backgroundColor: ColorChartSeries3 },
      { data: series4, backgroundColor: ColorChartSeries4 },
    ],
  },
})
```

```vue
<!-- component consumers use var(--...) via tokens.css -->
<template>
  <button class="btn">Save</button>
</template>

<style scoped>
.btn {
  background: var(--brand-primary);
  color: var(--text-on-light);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  transition: var(--transition-fast);
}

.btn:hover {
  background: var(--brand-primary-hover);
}

.btn:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}
</style>
```
