/**
 * Resolve the base URL that AspIcon queries for hand-drawn SVGs.
 *
 * Reads Vite's build-time env var `VITE_ICON_BASE` (set to the
 * aspirant-icon-pipeline CDN once that pipeline exists). Falls back to
 * a placeholder path that 404s in v0 — every AspIcon then keeps its
 * fallback glyph and no consumer breaks. The 404 path is deliberately
 * silent (see AspIcon.vue — console.debug, not console.warn).
 */

export const useIconBase = () => {
  const raw =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_ICON_BASE
      : undefined
  return typeof raw === 'string' && raw.length > 0 ? raw : '/aspirant-icons'
}
