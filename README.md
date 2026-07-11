# aspirant-design-system

A design system for the aspirant ecosystem — reusable Vue 3 components, hand-drawn iconography, and design tokens with Penpot round-tripping.

## Vision

Extend the existing aspirant-client visual language — dark-cards-on-light-page, amber-gold accent, hand-drawn warmth — into a formalized, reusable component library. Optimize for a small team (operator + family), portfolio-quality polish, and cross-project reuse (aspirant-server, aspirant-browser, future portfolio + blog). The DS itself is a showpiece.

## Decisions locked in (Round 1 interview)

| Decision | Value |
|---|---|
| Scope (v0, 6 months) | Tokens + 10 core components + one aspirant surface redesigned end-to-end |
| Visual anchor | aspirant-client `App.vue :root` — dark cards `#424242`, page `#e4e4e4`, brand amber `#ffb300`, accent blue `#82b1ff` |
| Moodboard | teenage.engineering (minimal grid + hand-drawn warmth), mistral.ai (playful interactivity + pixel icons), benjamincreative.me (high-contrast restraint) |
| Modes | Light canonical, dark supported |
| Framework | Vue 3 + Vite (drop Vuetify — trivial removal, ~8 tag instances total) |
| Layout | Mobile-first |
| Component prefix | `As*` (e.g. `<AsCard>`) |
| Token format | JSON source (Style Dictionary–style) → generate CSS custom properties + JS module + Penpot Design Tokens JSON |
| Docs / demo | Histoire |
| Icon source | reMarkable Pro → SVG → transperator → manual retouch. Stored on aspirant S3-simulated FS |
| Icon package | Separate repo (`aspirant-icon-pipeline` — TBD), consumed as dependency |
| Cross-project | Layered — neutral token core + opinionated aspirant theme (skinnable later) |
| Repo location | `~/git/aspirant-design-system` (local-only for now, GitHub later) |

## Deferred (decide as we build)

- Motion policy (defaults: 150ms/200ms/300ms/500ms scale already in aspirant-client)
- Accessibility target (default: WCAG AA — public-facing requirement)
- Copy tone for empty states / errors
- Testing shape (visual regression, unit, e2e)
- License (private for now)
- Blog / portfolio surface component set (part of scope-c, not v0)

## Repository layout (planned)

```
aspirant-design-system/
├── README.md                   this file
├── docs/
│   ├── TOKENS.md               extracted tokens + gaps + roadmap
│   └── COMPONENTS.md           the 10 v0 components with brief specs
├── tokens/                     Style Dictionary source (JSON) — TBD
│   ├── base.json               neutral primitives
│   └── aspirant.json           opinionated theme
├── src/
│   ├── components/             As* Vue components — TBD
│   ├── composables/            useTheme, useMobile, etc.
│   └── index.js                barrel export
├── stories/                    Histoire stories per component
├── build/                      generated CSS / JS / Penpot JSON — gitignored
└── package.json                TBD when we start implementing
```

## Status

Seed docs only. No code yet.

- [x] Decisions captured
- [x] `docs/TOKENS.md` extracted from aspirant-client
- [x] `docs/COMPONENTS.md` — 10-list prioritized
- [ ] Vite + Histoire scaffold
- [ ] Style Dictionary pipeline
- [ ] First 3 components (AsCard, AsButton, AsSidebar) as proof
- [ ] Penpot round-trip spike
- [ ] `aspirant-icon-pipeline` repo (parallel track)

## Next step (proposed)

Hand off to `aspirant_engineer` to scaffold the Vite + Histoire skeleton and land the token pipeline. Then iterate on components one at a time against a live aspirant surface for feedback.
