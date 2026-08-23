# Chart series palette — color-blind (CVD) re-check (#4187)

§3.78 item 2 gives the charts two derived series sets, selected by the resolved
background luminance: a **light-surface** set (`--chart-series-*-on-light`, drawn on
`#e4e4e4`) and a **dark-surface** set (`--chart-series-*-on-dark`, drawn on
`#424242`/`#1a1a1a`/`#2a2a2a`), because no single flat set clears the 3:1 non-text
floor on both a light page and a dark card (disjoint worst cases — design_agent
ruling on #4175). The bare `--chart-series-*` set is left as the Okabe-Ito base —
it is also consumed by AspContent's syntax-highlight ramp on the code surface, so it
is not repurposed here. This is the CVD re-check evidence required by acceptance
criterion 3.

## Method

- Contrast: WCAG relative luminance, `(L1+0.05)/(L2+0.05)` (`src/utils/color_contrast.js`).
- Perceptual distance: **CIEDE2000** (ΔE00), sRGB→linear→XYZ(D65)→CIELAB.
- CVD simulation: **Machado 2009** severity-1.0 matrices (deuteranopia, protanopia,
  tritanopia), applied in linear RGB, then ΔE00 recomputed under each.
- Accepted-safe bar = the Okabe-Ito **base** palette's own worst pairwise ΔE00
  (its members are the accepted CVD-safe reference): **3.363** (s6–s10, deuteranopia).

## Result

| Palette | min ΔE00 (normal) | min ΔE00 (deuteran / protan / tritan) | verdict |
|---|---|---|---|
| Base (Okabe-Ito) | 5.771 | 3.363 / 3.528 / 4.172 | reference |
| Light-surface set | 3.502 | ≥ 3.502 | **≥ bar — pass** |
| Dark-surface set | 5.771 | 3.363 / 3.528 / 4.172 | **= base — pass** |

The **dark set** keeps the base hues on its tightest pairs (s6/s10 unchanged), so it
inherits the base's margin exactly. The **light set**, before adjustment, collapsed
s1 amber (`#a17100`) and s8 orange (`#a37100`) to **ΔE00 0.000 under deuteranopia**
(the two darkened to near-identical twins). Three in-family, contrast-clearing moves
restore separation:

| slot | family | value | contrast vs `#e4e4e4` |
|---|---|---|---|
| s1 | amber (brand) | `#8d6101` | 4.30:1 |
| s8 | orange | `#936b2c` | 3.77:1 |
| s10 | periwinkle-blue | `#5a7dbc` | 3.24:1 |

Post-fix the light set's minimum ΔE00 rises 0.000 → **3.502** (now bounded by
s6–s10 under tritanopia), above the 3.363 base bar, under normal vision and all
three CVD simulations, while every series holds ≥3.2:1 contrast on `#e4e4e4`.

## Contrast (each series vs its set's target surface)

- Light set vs `#e4e4e4`: all ≥3.24:1 (min s10 3.24; brand s1 4.30).
- Dark set vs `#424242` (tightest): all ≥3.21:1; also ≥4.59:1 on `#1a1a1a`/`#2a2a2a`.

Rendered-pixel assertion of these floors: `tests/e2e/asp-chart-contrast.spec.js`
(per-series canvas sampling on both a page-mounted and a card-mounted AspChart).
