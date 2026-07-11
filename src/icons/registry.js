/**
 * Canonical registry: icon `name` → Unicode fallback glyph.
 *
 * Any AspIcon rendered without an explicit `fallback` prop looks its glyph up
 * here. When the aspirant-icon-pipeline (separate repo) begins serving
 * hand-drawn SVGs under `${VITE_ICON_BASE}/${name}.svg`, consumers automatically
 * upgrade — the fallback disappears silently once the SVG becomes reachable.
 *
 * Nine current entries cover the AspSidebar story surface. Extend as the
 * codebase grows; new entries do not require a component change.
 */

export const iconRegistry = {
  home: '⌂',
  applications: '◇',
  trusted: '✧',
  admin: '⚙',
  support: '?',
  active: '●',
  default: '○',
  badge: '◐',
  disabled: '⌀',
}

export const registryFallback = (name) => iconRegistry[name] ?? null
