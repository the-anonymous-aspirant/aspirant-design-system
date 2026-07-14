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

Solid anchors, tinted-bg variants, text-on-tinted-bg variants, and AA-tuned bold-surface variants:

| Token | Light value | Dark value | Origin | Usage |
|---|---|---|---|---|
| `--feedback-error` | `#ff3739` | — | aspirant-client | Solid error red — icons, borders, badges |
| `--feedback-success` | `#00b74a` | — | aspirant-client | Solid success green |
| `--feedback-info` | `#00d3ee` | — | aspirant-client | Solid info cyan |
| `--feedback-warning` | `#ff8f00` | — | v0 gap 8 | Solid warning amber-orange (distinct from brand amber) |
| `--feedback-neutral` | `#6c757d` | — | #1970 audit | Solid neutral grey — n/a / disabled / no-data status |
| `--feedback-error-bg` | `rgba(255, 55, 57, 0.10)` | — | #1970 audit | Tinted alert bg (mode-agnostic) |
| `--feedback-success-bg` | `rgba(0, 183, 74, 0.10)` | — | #1970 audit | Tinted alert bg |
| `--feedback-info-bg` | `rgba(0, 211, 238, 0.10)` | — | #1970 audit | Tinted alert bg |
| `--feedback-warning-bg` | `rgba(255, 143, 0, 0.10)` | — | #1970 audit | Tinted alert bg |
| `--feedback-neutral-bg` | `rgba(108, 117, 125, 0.10)` | — | #1970 audit | Tinted alert bg for neutral status |
| `--feedback-error-text` | `#8b0f10` | `#ff7a7c` | #1970 audit | Text on tinted `error-bg` (WCAG AA) |
| `--feedback-success-text` | `#005d26` | `#4de292` | #1970 audit | Text on tinted `success-bg` |
| `--feedback-info-text` | `#005566` | `#6be3f2` | #1970 audit | Text on tinted `info-bg` |
| `--feedback-warning-text` | `#703e00` | `#ffb75f` | #1970 audit | Text on tinted `warning-bg` |
| `--feedback-neutral-text` | `#4a5057` | `#b8bec5` | #1970 audit | Text on tinted `neutral-bg` |
| `--feedback-error-solid` | `#c62828` | — | #2089 | Bold error surface — pair with `--text-on-dark` (contrast 5.62:1) |
| `--feedback-success-solid` | `#2e7d32` | — | #2089 | Bold success surface — pair with `--text-on-dark` (contrast 5.13:1) |
| `--feedback-info-solid` | `#00677c` | — | #2089 | Bold info surface — pair with `--text-on-dark` (contrast 6.50:1) |
| `--feedback-warning-solid` | `#b45309` | — | #2089 | Bold warning surface — pair with `--text-on-dark` (contrast 5.02:1) |
| `--feedback-neutral-solid` | `#495057` | — | #2089 | Bold neutral surface — pair with `--text-on-dark` (contrast 8.18:1) |

`-bg` variants use `rgba` alpha so a single value works on both light and dark surfaces; `-text` variants need a per-mode override to keep WCAG AA contrast on tinted regions.

`-solid` variants are opaque fills tuned for **white body text** (`--text-on-dark`, `#ffffff`) at WCAG-AA (≥4.5:1 for normal text, ≥3:1 for large). Use them for full-bleed status bands, solid alert surfaces, and bold-treatment tiles — not for small text on light surfaces (use `-text` for that). Every value is mode-agnostic because the pairing (bold color + white text) reads the same in light and dark themes.

### Borders

| Token | Value | Usage |
|---|---|---|
| `--border-card` | `#ffb300` | Amber border matching heading color |
| `--border-subtle` | `#cccccc` | Neutral divider |

## Typography

Iosevka, self-hosted. Base and mono resolve to the same face — the design system is monospace end-to-end.

```css
--font-family-base: Iosevka, "Iosevka Web", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
--font-family-mono: Iosevka, "Iosevka Web", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
```

**Rationale (task #2120, operator taste decision 2026-07-14):** Iosevka carries the teenage.engineering terminal aesthetic across body, headings, and tabular data — a nerdy/retro grid where every digit occupies one cell and columns align without `font-variant-numeric: tabular-nums`. Replaces the earlier Inter stack. Confirmed against a live Iosevka render of the Agents page (`docs/design/2026-07-13-overview-mockup/agents-iosevka-preview.png`).

**Delivery:** three latin-subset woff2 files (weights 400 / 500 / 700, ≈985 KB each) live under `src/fonts/` and are sourced from `@fontsource/iosevka` v5.2.5. `@font-face` declarations with `font-display: swap` ship in `src/fonts/fonts.css`; consumers import it via:

```js
import '@aspirant/design-system/fonts.css'
import '@aspirant/design-system/tokens.css'
import '@aspirant/design-system/styles.css'
```

First paint stays on the system-mono fallback chain (`ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`) until Iosevka arrives — no layout shift beyond the swap tick, because every fallback in the stack is also monospace at the same nominal metrics.

To refresh the bundled woff2 files after an upstream Iosevka release: `npm install @fontsource/iosevka@latest && cp node_modules/@fontsource/iosevka/files/iosevka-latin-{400,500,700}-normal.woff2 src/fonts/`.

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

## Source coverage

Every token in `tokens/base.json` + `tokens/aspirant.json` traces back to one of four sources. The audit under system_3 task #1970 added the third row after diffing the DS against `system_3/frontend/static/system3.css`; entries classified `SKIP-artificial`, `SKIP-app-specific`, or `DEFER` in that audit are intentionally absent here. Task #2089 added the fourth row when the aspirant Overview redesign (#2080) needed a bold full-bleed status band.

| Source | What it covers | Where |
|---|---|---|
| `aspirant-client :root` (verbatim) | Surface, brand, text (4-tier), solid feedback anchors (error / success / info), border, base font-size scale, radius scale, spacing scale, transitions, shadows | `tokens/base.json` |
| aspirant-client gap-fill (v0 gaps 1–8) | Dark-mode surface + text inversions, brand semantic ramps (`primary-50..900`, `accent-50..900`), chart palette (Okabe-Ito + brand amber), motion ease curves, breakpoints, z-index scale, font weights / line-heights / letter-spacing / mono family, warning solid + focus ring | `tokens/aspirant.json` |
| system_3 frontend (task #1970 audit) | Tinted feedback backgrounds (`error-bg` / `success-bg` / `info-bg` / `warning-bg` / `neutral-bg`), text-on-tinted-bg per mode (`{error,success,info,warning,neutral}-text` in `:root` and under `color.feedback.dark.*`), neutral status anchor | `tokens/base.json` + `tokens/aspirant.json` |
| Overview redesign (task #2089) | AA-tuned bold-surface variants for full-bleed status bands: `{error,success,info,warning,neutral}-solid`. Each opaque value ≥4.5:1 vs `#ffffff` so white body text passes WCAG-AA. | `tokens/base.json` |

Values under the third row are **not** verbatim from system_3. system_3's semantic status tokens (`--color-success`, `--color-warn`, ...) are HSL-derived and part of the "artificial" aesthetic the DS explicitly rejects (task #1955 decisions). The `-bg` and `-text` shapes are the genuinely-useful patterns that got ported; values are re-derived from aspirant's own `feedback.*` anchors so the aspirant identity carries through.

Audit classifications the DS declined to import:

- `SKIP-artificial`: `--color-warn-bg-fill`, `--color-neutral-bg-fill` (85%-lightness solid, redundant with alpha `-bg`); `--color-strong-warn`, `--color-strong-warn-bg` (over-differentiation on top of `feedback.warning`).
- `SKIP-app-specific`: `--color-live-waiting-{bg,text}` (agent-status-badge mapping — belongs in s3's app-shell); `--color-accent-border` (aspirant `brand.accent` + `focus-ring.color` already cover blue-accent surfaces).
- `DEFER`: `--color-text-tertiary` — a 3rd low-emphasis text tier beyond `muted` + `hint`. No aspirant consumer demands it yet; file as follow-up if one does.
