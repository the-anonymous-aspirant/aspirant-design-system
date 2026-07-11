import { ref, onMounted, onBeforeUnmount } from 'vue'

/**
 * useMobile — reactive boolean tracking whether the viewport is at or below
 * the `md` breakpoint (768px, matching the `--breakpoint-md` token).
 *
 * Uses `matchMedia` with a change listener — no polling, no resize handler.
 * Falls back to `false` in SSR / non-window contexts so consuming components
 * render the desktop layout during hydration and correct on mount.
 *
 * Ported from aspirant-client/src/global_state_manager.js `checkMobile`, minus
 * the polling loop.
 */
export function useMobile(breakpoint = '(max-width: 768px)') {
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
