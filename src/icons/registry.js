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
  aspiring_hand: { glyph: '✋', asset: 'aspiring_hand' },
  home: { glyph: '⌂', asset: 'home_icon' },
  applications: { glyph: '◇', asset: 'applications' },
  admin: { glyph: '⚙', asset: 'admin' },
  support: { glyph: '☕', asset: 'coffemug' },
  family: { glyph: '♥', asset: 'family' },
  messages: { glyph: '✉', asset: 'messages' },
  default: { glyph: '○', asset: 'default' },

  // Glyph-only names — no aspirant asset yet; upgrade silently once the
  // reMarkable SVG pipeline serves `${VITE_ICON_BASE}/${name}.svg`.
  search: { glyph: '⌕', asset: null },
  trusted: { glyph: '✧', asset: null },
  active: { glyph: '●', asset: null },
  badge: { glyph: '◐', asset: null },
  disabled: { glyph: '⌀', asset: null },
}

/** Unicode fallback glyph for `name`, or `null` if unregistered. */
export const registryFallback = (name) => iconRegistry[name]?.glyph ?? null

/**
 * The aspirant asset key `name` maps to. Falls back to `name` itself so a raw
 * asset key (e.g. `sql_icon`) resolves directly without a registry entry.
 */
export const registryAsset = (name) => iconRegistry[name]?.asset ?? name
