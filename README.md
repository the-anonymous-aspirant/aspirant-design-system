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
| Component prefix | `Asp*` (e.g. `<AspCard>`) |
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
│   ├── components/             Asp* Vue components — TBD
│   ├── composables/            useTheme, useMobile, etc.
│   └── index.js                barrel export
├── stories/                    Histoire stories per component
├── build/                      generated CSS / JS / Penpot JSON — gitignored
└── package.json                TBD when we start implementing
```

## Installing (consumers)

```
npm install git+https://github.com/the-anonymous-aspirant/aspirant-design-system.git
```

```js
import '@aspirant/design-system/tokens.css'   // custom properties on :root
import '@aspirant/design-system/styles.css'   // component styles
import { AspButton, AspCard } from '@aspirant/design-system'
```

That is the whole procedure. No second build command, no sibling checkout, no
step that only works if someone already ran something here. `prepare` runs the
token build and the library build at install time, so the two artefacts the
`exports` map points at — `dist/` and `build/` — exist by the time the install
finishes. Both stay gitignored: they are generated, and tracking generated
output invites drift between the source and the artefact. What guarantees they
exist is the lifecycle script, not the repository.

`scripts/verify-install.sh` proves it end to end — clean clone, scratch
consumer, real install, real browser, computed styles. Run it after touching
anything in this section.

### Peer dependencies

`vue`, `chart.js`, `marked` and `highlight.js` are peers and npm installs them
for you. None is marked optional, and that is deliberate: the barrel
(`src/index.js`) re-exports `AspChart` and `AspContent`, which import those
three at module scope, so *any* named import from the package pulls them in.
They were declared optional until #2567, which made a bare consumer build fail
with `"marked" is not exported by "__vite-optional-peer-dep:marked"` — the
metadata described an optionality the code does not have.

Making it true rather than merely stated means teaching those two components to
load their heavy dependency lazily; that is system_3 #2636, and out of scope
here. Until then the honest declaration is a required peer.

### Which install specifiers work

| Specifier | Builds? | |
|---|---|---|
| `git+https://…`, `git+file://…` | yes | npm packs the ref and runs `prepare`. **Use this.** |
| a published tarball / registry version | yes | `prepare` ran at pack time. |
| `file:../aspirant-design-system` | **no** | npm *symlinks* a local directory dependency and runs no lifecycle scripts for it. `prepare` cannot fire. |
| `file:` + `--install-links` | yes | the flag makes npm pack the directory instead of linking it. |

The `file:` row is npm behaviour, not something this repo can fix from the
inside — a symlinked dependency is the checkout, so it is built exactly when
the checkout is. If you need a local path during development, either pass
`--install-links` or run `npm install` once inside this repo (which fires
`prepare`) before installing it elsewhere.

### For contributors

`npm install` here runs `prepare` too, so a fresh clone is ready after one
command. `npm run build` always builds tokens first — the ordering lives in the
script, not in anyone's memory, because the failure it prevents is silent:
components whose CSS resolves to nothing still import, still mount, and still
render.

## Histoire on the cell (publish pipeline)

The component workbench is served in production at
`https://the-aspirant.com/admin/histoire/` (admin-gated; system_3 #2218).
Publishing is a side effect of pushing `main` — no manual rebuild step:

1. `scripts/git-hooks/pre-push` runs `scripts/build-and-push-image.sh` on
   any push to `main`, which builds `Dockerfile.histoire` (multi-stage:
   `npm ci` + `histoire build` inside the image → nginx serving the static
   output) and pushes `ghcr.io/the-anonymous-aspirant/aspirant-histoire`
   (`:latest` + `:sha-<short>`).
2. The cell's auto-pull cron (aspirant-deploy) picks up `:latest` within
   ~5 minutes and restarts the `histoire` service.

**Fresh-checkout setup — the complete list** (no sibling checkout, no host
node version requirement; the image build is self-contained):

```
git config core.hooksPath scripts/git-hooks   # once per clone
gh auth refresh -s write:packages,read:packages  # once per machine, for GHCR pushes
```

To build/serve locally without publishing:
`docker build -f Dockerfile.histoire -t aspirant-histoire . && docker run --rm -p 8080:80 aspirant-histoire`
then browse `http://localhost:8080/admin/histoire/` (`/` redirects there).
The image serves the app at its real public path, so local runs are
byte-identical to what the production edge proxies — no prefix rewriting
anywhere.

If a push lands on `main` with `--no-verify`, the failure mode is a stale
but still-serving Histoire — rerun `scripts/build-and-push-image.sh` to
catch up.

## Status

Seed docs only. No code yet.

- [x] Decisions captured
- [x] `docs/TOKENS.md` extracted from aspirant-client
- [x] `docs/COMPONENTS.md` — 10-list prioritized
- [ ] Vite + Histoire scaffold
- [ ] Style Dictionary pipeline
- [ ] First 3 components (AspCard, AspButton, AspSidebar) as proof
- [ ] Penpot round-trip spike
- [ ] `aspirant-icon-pipeline` repo (parallel track)

## Next step (proposed)

Hand off to `aspirant_engineer` to scaffold the Vite + Histoire skeleton and land the token pipeline. Then iterate on components one at a time against a live aspirant surface for feedback.
