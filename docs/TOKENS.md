# Tokens

Source of truth: JSON files under `tokens/` (once scaffolded), processed by Style Dictionary into CSS custom properties (`build/tokens.css`), a JS ES module (`build/tokens.js`), and Penpot Design Tokens JSON (`build/tokens.penpot.json`) for the design ↔ code round trip.

Everything below is **extracted verbatim** from `aspirant-client/src/App.vue` `:root` (07-11), plus **gaps** flagged for v0.

## Color

The palette follows a 60/30/10 rule: neutral surfaces dominate, brand accent carries identity, blue accent handles links + hints.

### Surfaces (60%)

| Token | Light | Dark (TBD) | Usage |
|---|---|---|---|
| `--surface-page` | `#e4e4e4` | | Page background |
| `--surface-card` | `#424242` | | Card body — dark on light (signature contrast) |
| `--surface-card-inner` | `rgba(0,0,0,0.3)` | | Nested surfaces inside cards |
| `--surface-elevated` | `#f9f9f9` | | Elevated panels (modals, popovers) |

### Brand (30%)

| Token | Value | Usage |
|---|---|---|
| `--brand-primary` | `#ffb300` | Amber-gold primary — headings, CTAs, active states |
| `--brand-primary-alpha` | `#ffb30082` | 51% opacity variant |
| `--brand-primary-hover` | `#e07800` | Deeper orange hover |
| `--brand-accent` | `#82b1ff` | Soft blue accent — links, hints |

### Text

| Token | Value | Usage |
|---|---|---|
| `--text-on-light` | `#424242` | Body text on light surfaces |
| `--text-on-dark` | `#ffffff` | Body text on dark cards |
| `--text-heading-card` | `#ffb300` | Card headings (amber) |
| `--text-muted` | `#6c757d` | Secondary text, page subtitles |
| `--text-hint` | `#82b1ff` | Hint text (matches accent) |

### Feedback

| Token | Value |
|---|---|
| `--feedback-error` | `#ff3739` |
| `--feedback-success` | `#00b74a` |
| `--feedback-info` | `#00d3ee` |

Warning is missing (only error / success / info exist). Add `--feedback-warning` in v0.

### Borders

| Token | Value | Usage |
|---|---|---|
| `--border-card` | `#ffb300` | Amber border matching heading color |
| `--border-subtle` | `#cccccc` | Neutral divider |

## Typography

Single family, system-optimized:

```css
--font-family-base: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
```

Monospace stack is not tokenized yet but used ad-hoc in admin/system-health views (`ui-monospace, SFMono-Regular, Menlo, monospace`). Add `--font-family-mono` in v0.

### Scale

| Token | Value | Approx px |
|---|---|---|
| `--text-xs` | `0.75rem` | 12 |
| `--text-sm` | `0.85rem` | 14 |
| `--text-base` | `1rem` | 16 |
| `--text-md` | `1.05rem` | 17 |
| `--text-lg` | `1.2rem` | 19 |
| `--text-xl` | `1.4rem` | 22 |
| `--text-2xl` | `1.8rem` | 29 |
| `--text-3xl` | `2.5rem` | 40 |

Ratio between steps is uneven (`1.05` between base/md is odd). v0 should decide: keep as-is for backward compat, or normalize to a modular scale (`1.125` minor third, `1.25` major third).

Weight tokens missing. Add `--font-weight-regular: 400`, `--font-weight-medium: 500`, `--font-weight-bold: 700` in v0.

Line-height missing outside `line-height: 1.5` in body + `line-height: 1.1` on h1. Add `--line-height-tight`, `--line-height-normal`, `--line-height-relaxed` in v0.

## Spacing

Rem-based, roughly 8-point-ish but not strict:

| Token | Value | px |
|---|---|---|
| `--space-2xs` | `0.25rem` | 4 |
| `--space-xs` | `0.5rem` | 8 |
| `--space-sm` | `0.75rem` | 12 |
| `--space-md` | `1rem` | 16 |
| `--space-lg` | `1.5rem` | 24 |
| `--space-xl` | `2rem` | 32 |
| `--space-2xl` | `3rem` | 48 |
| `--space-3xl` | `4rem` | 64 |

Clean scale, keep.

## Border radius

| Token | Value |
|---|---|
| `--radius-sm` | `4px` |
| `--radius-md` | `8px` |
| `--radius-lg` | `12px` |
| `--radius-xl` | `16px` |
| `--radius-2xl` | `20px` |
| `--radius-pill` | `40px` |
| `--radius-full` | `50%` |

## Shadows

| Token | Value |
|---|---|
| `--shadow-sm` | `0 2px 4px rgba(0,0,0,0.1)` |
| `--shadow-md` | `0 4px 8px rgba(0,0,0,0.12)` |
| `--shadow-lg` | `0 10px 20px rgba(0,0,0,0.15)` |

Consider adding `--shadow-inset` and `--shadow-focus` in v0.

## Transitions

| Token | Value |
|---|---|
| `--transition-fast` | `0.15s ease` |
| `--transition-base` | `0.2s ease` |
| `--transition-moderate` | `0.3s ease` |
| `--transition-layout` | `0.5s ease` |

Ease curve is uniform `ease` — v0 should decide whether to split into `--ease-in-out`, `--ease-out`, `--ease-spring` for interactive feedback.

## Gaps to fill in v0

1. **Dark mode inversions** for every surface + text token — the invert strategy for hand-drawn assets is under-decided (see README): option 2 (dark ink on light paper cards) is default for illustrations, option 1 (light stroke) for functional icons.
2. **Semantic color ramps** — currently single-value tokens. Add `-50` through `-900` ramps for surface + brand so hover/focus/disabled/pressed states are systematic, not ad-hoc.
3. **Chart palette** — Chart.js is loaded but no data-viz palette exists. Need 8–12 categorical colors (color-blind safe if targeting WCAG AA), plus sequential + diverging scales.
4. **Motion primitives** — durations exist but ease curves + reduced-motion tokens are missing.
5. **Breakpoint tokens** — mobile-first was picked but no breakpoint constants exist (`--bp-sm`, `--bp-md`, `--bp-lg`).
6. **Z-index scale** — magic numbers `1000`, `1001` in sidebar — tokenize.
7. **Font weight + line-height + letter-spacing** — listed above.
8. **Warning feedback color + focus-ring color** — listed above.

## Roadmap

- [ ] Copy `:root` into `tokens/base.json` (Style Dictionary format)
- [ ] Fill each gap above in `tokens/aspirant.json` (overrides/additions)
- [ ] Style Dictionary build → `build/tokens.css`, `build/tokens.js`, `build/tokens.penpot.json`
- [ ] Import `build/tokens.css` at Vite entry; components consume via `var(--token)`
- [ ] Prove Penpot round-trip on 1 token (change amber in Penpot → export → git commit → CSS regenerates)
