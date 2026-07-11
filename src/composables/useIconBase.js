/**
 * Resolve the base URL that AspIcon queries for icon assets.
 *
 * Reads Vite's build-time env var `VITE_ICON_BASE`. Two consumers point it at
 * different surfaces:
 *
 *   - Interim (this repo, today): the existing aspirant asset server, e.g.
 *     `https://the-aspirant.com/api/fetch-object`. Named icons that map to a
 *     hand-drawn PNG in `../icons/asset_map.json` are fetched as
 *     `${VITE_ICON_BASE}/${hash}` and rendered as `<img>`.
 *   - Future: the `aspirant-icon-pipeline` CDN serving reMarkable-drawn SVGs
 *     under `${VITE_ICON_BASE}/${name}.svg`.
 *
 * When `VITE_ICON_BASE` is unset, `useIconBase()` returns a placeholder path
 * that 404s and `isIconBaseConfigured()` returns false — every AspIcon then
 * keeps its Unicode fallback glyph and no consumer breaks. The 404 path is
 * deliberately silent (see AspIcon.vue — console.debug, not console.warn).
 */

const rawIconBase = () =>
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.VITE_ICON_BASE
    : undefined

export const useIconBase = () => {
  const raw = rawIconBase()
  return typeof raw === 'string' && raw.length > 0 ? raw : '/aspirant-icons'
}

/**
 * True only when `VITE_ICON_BASE` is explicitly set to a non-empty string.
 * AspIcon uses this to decide whether to even attempt a network fetch: with no
 * base configured it goes straight to the glyph, avoiding a broken-image flash.
 */
export const isIconBaseConfigured = () => {
  const raw = rawIconBase()
  return typeof raw === 'string' && raw.length > 0
}
