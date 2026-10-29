import { ref, onMounted, onBeforeUnmount } from 'vue'

/**
 * The shell's ONE breakpoint (§3.119 decision 2, system_3 #9135): mobile
 * is below 768px, desktop is 768px and up. `useMobile()`'s default query and
 * every DS `@media (min-width: 768px)` rule cite these, so the two can never
 * both claim the same width again. They used to: `(max-width: 768px)` here and
 * `(min-width: 768px)` in AspAppShell both included 768, so at exactly 768px
 * the sidebar was off-canvas AND the menu button was hidden — no navigation.
 * The mobile bound is 767.98px, not 767px, so a fractional viewport width
 * (zoom, devicePixelRatio) between 767 and 768 is still mobile.
 */
export const SHELL_BREAKPOINT_PX = 768
export const SHELL_MOBILE_QUERY = `(max-width: ${SHELL_BREAKPOINT_PX - 0.02}px)`
export const SHELL_DESKTOP_QUERY = `(min-width: ${SHELL_BREAKPOINT_PX}px)`

/**
 * useMobile — reactive boolean tracking whether the viewport is below the
 * shell breakpoint (SHELL_MOBILE_QUERY; 768px matches the `--breakpoint-md`
 * token, which is where desktop starts).
 *
 * Uses `matchMedia` with a change listener — no polling, no resize handler.
 * Falls back to `false` in SSR / non-window contexts so consuming components
 * render the desktop layout during hydration and correct on mount.
 *
 * Ported from aspirant-client/src/global_state_manager.js `checkMobile`, minus
 * the polling loop.
 */
export function useMobile(breakpoint = SHELL_MOBILE_QUERY) {
  const isMobile = ref(false)
  let mql = null

  const handler = (event) => {
    isMobile.value = event.matches
  }

  onMounted(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    mql = window.matchMedia(breakpoint)
    isMobile.value = mql.matches
    mql.addEventListener('change', handler)
  })

  onBeforeUnmount(() => {
    if (mql) mql.removeEventListener('change', handler)
  })

  return { isMobile }
}
