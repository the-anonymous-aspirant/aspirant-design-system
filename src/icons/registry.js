/**
 * Canonical registry: DS icon `name` → { Unicode fallback glyph, aspirant
 * asset key }.
 *
 * `glyph` is the Unicode character AspIcon renders when no networked asset is
 * reachable (the base URL is unset, or the fetch 404s / CORS-fails). Any
 * AspIcon rendered without an explicit `fallback` prop looks its glyph up here.
 *
 * `asset` is the semantic key into `asset_map.json` (a curated copy of the
 * aspirant-client asset map — provenance: `aspirant-client/src/asset_manager.js`).
 * When set and `VITE_ICON_BASE` points at a reachable asset server, AspIcon
 * renders the hand-drawn PNG at `${VITE_ICON_BASE}/${hash}` as an `<img>`; a DS
 * name (e.g. `home`) can alias an aspirant asset key (e.g. `home_icon`). A
 * `null` asset means glyph-only until the reMarkable SVG pipeline serves a
 * `${VITE_ICON_BASE}/${name}.svg`.
 *
 * Extend as the codebase grows; new entries do not require a component change.
 * If the aspirant asset map changes, re-sync `asset_map.json` (manual sync task
 * — the copy is deliberately decoupled from aspirant-client).
 */

export const iconRegistry = {
  // Named icons that alias an existing hand-drawn aspirant PNG.
  // ☝ (U+261D), not ✋: ✋ is outside the house typeface, so it drew in the
  // device font or as a box. ☝ is a hand reaching up, and Iosevka carries it
  // (system_3 #11420; design ack c70242).
  aspiring_hand: { glyph: '☝', asset: 'aspiring_hand' },
  home: { glyph: '⌂', asset: 'home_icon' },
  applications: { glyph: '◇', asset: 'applications' },
  admin: { glyph: '⚙', asset: 'admin' },
  // ⊔ (U+2294, SQUARE CUP), not ☕: the font has no mug, and a cup's outline
  // is the nearest it has (system_3 #11420; design ack c70242).
  support: { glyph: '⊔', asset: 'coffemug' },
  family: { glyph: '♥', asset: 'family' },
  // `@`, not ✉: ✉ is outside the house typeface. The console's Inbox (this
  // name's one consumer) lists mentions, which are written `@name`, so `@`
  // names what it holds (system_3 #11151; design ack c70197).
  messages: { glyph: '@', asset: 'messages' },
  default: { glyph: '○', asset: 'default' },

  // Glyph-only names — no aspirant asset yet; upgrade silently once the
  // reMarkable SVG pipeline serves `${VITE_ICON_BASE}/${name}.svg`.
  back: { glyph: '←', asset: null },
  // A path separator glyph. Registered rather than hard-coded so it takes the
  // same progressive-enhancement path as every other icon: the glyph renders
  // immediately and upgrades silently once the SVG pipeline serves it.
  // Decorative — rendered without a `label`, which is what makes AspIcon mark
  // it aria-hidden.
  separator: { glyph: '›', asset: null },
  // ◎ (U+25CE), not ⌕: ⌕ (TELEPHONE RECORDER) is outside the house typeface,
  // and the font has no magnifier (system_3 #11151; design ack c70197).
  search: { glyph: '◎', asset: null },
  // The conversation toolbar's config-door trigger (system_3 §3.77, operator
  // ruling on #3617). Not an alias of `admin`: that entry's asset is the
  // admin nav icon, and aliasing a nav identity onto a per-surface control is
  // the §3.69 "the name evokes the wrong entity" trap. Glyph-only until the
  // reMarkable SVG pipeline serves `settings.svg`.
  settings: { glyph: '⚙', asset: null },
  // The composer's attach affordance (system_3 #3112). Glyph-only: no
  // hand-drawn paperclip exists yet, and registering the name here is what lets
  // it upgrade silently when the SVG pipeline serves `attach.svg`, which a
  // glyph hard-coded in AspComposer would never take.
  // `+`, not a paperclip: the font has none, and the old one drew as a colour
  // emoji. Beside the text field, on a button named "Attach file", `+` reads
  // as "add a file" (system_3 #11420; design ack c70242).
  attach: { glyph: '+', asset: null },
  trusted: { glyph: '✧', asset: null },
  active: { glyph: '●', asset: null },
  badge: { glyph: '◐', asset: null },
  // ⊘ (U+2298), not ⌀: ⌀ is outside the house typeface, so it drew in the
  // device font or as a box (system_3 #11151; design c68713 on #10973).
  disabled: { glyph: '⊘', asset: null },
  // The system_3 console's nav set (conventions §4.2; system_3 #8018).
  // Registered rather than passed to AspSidebarLink as raw strings, which
  // render verbatim and never take the hand-drawn upgrade (§1.4). None of these
  // names is an asset_map.json key, so AspIcon's image arm stays off and only
  // the `${name}.svg` arm can ever upgrade them.
  agents: { glyph: '◉', asset: null },
  tasks: { glyph: '☑', asset: null },
  // The console's full PR list, `/prs`, directly after Tasks in its sidebar.
  // ⇄ (U+21C4) is in Iosevka 400 latin, and no other name uses it
  // (system_3 #12230; design ack c75887 on #12076, §3.171).
  prs: { glyph: '⇄', asset: null },
  // ↻ (U+21BB), not ⟳: ⟳ is outside the house typeface (system_3 #11151;
  // design c68713 on #10973).
  processes: { glyph: '↻', asset: null },
  corpus: { glyph: '§', asset: null },
  artifacts: { glyph: '▤', asset: null },
  // The console's agent-page subpage links (system_3 #9303, #9412; §3.113 names
  // a registered name, never a raw glyph, so the §1.4 upgrade can reach them).
  // ↗ has an emoji form, so it carries U+FE0E (text presentation) and renders
  // in the inherited ink like the rest. ☰ was rejected (reads as a menu on
  // every platform) and ▣ sits too close to `artifacts` ▤ in the same bar.
  // `responsibilities` is ⊜ (U+229C, a balance kept as a closed shape), not
  // the scales it was: U+2696 is outside the house typeface (system_3 #11420;
  // design ack c70242).
  responsibilities: { glyph: '⊜', asset: null },
  improvement: { glyph: '\u2197\uFE0E', asset: null },
  owns: { glyph: '◈', asset: null },
  activity: { glyph: '∿', asset: null },

  // aspirant-explorer's nav (system_3 #10973, UX walk E5). Its icons were
  // typed characters, two of them (a folder and a stacked page) outside the
  // house typeface, so they took the device font's shape or a box. Each glyph
  // here is one Iosevka carries, checked against the font's own cmap.
  overview: { glyph: '◱', asset: null },
  browse: { glyph: '▦', asset: null },
  datasets: { glyph: '▤', asset: null },
  documents: { glyph: '▯', asset: null },
  upload: { glyph: '⇧', asset: null },
  // The explorer's Browse rows: a folder and each file kind (a document row
  // uses `documents`). The old glyphs were emoji the house typeface lacks.
  folder: { glyph: '◫', asset: null },
  image: { glyph: '◪', asset: null },
  audio: { glyph: '♪', asset: null },
  'message-export': { glyph: '▭', asset: null },
}

/** Unicode fallback glyph for `name`, or `null` if unregistered. */
export const registryFallback = (name) => iconRegistry[name]?.glyph ?? null

/**
 * The aspirant asset key `name` maps to. Falls back to `name` itself so a raw
 * asset key (e.g. `sql_icon`) resolves directly without a registry entry.
 */
export const registryAsset = (name) => iconRegistry[name]?.asset ?? name
