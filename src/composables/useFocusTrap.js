import { nextTick } from 'vue'

/**
 * useFocusTrap — confine Tab/Shift-Tab to a container, and put focus back where
 * it came from on release.
 *
 * Written for `AspModal` (docs/COMPONENTS.md §Cross-cutting names it), but kept
 * free of any modal specifics: it takes a ref to an element and manages focus,
 * nothing else. `AspSidebar`'s mobile overlay is the other named candidate.
 *
 * Two behaviours that are easy to get wrong and are therefore explicit here:
 *
 * 1. **The return target is captured at activation, not at release.** By the
 *    time a dialog closes, the trigger may have been re-rendered or removed;
 *    reading `document.activeElement` then gives the scrim or `<body>`. We
 *    remember the element that was focused *before* the trap took over, and
 *    fall back to a caller-supplied element if it has since left the document.
 *
 * 2. **The container itself is the fallback focus target.** A dialog whose body
 *    holds no focusable element must still take focus, or Tab escapes to the
 *    page behind it immediately. The container gets `tabindex="-1"` from the
 *    caller for exactly this.
 */

// `:not([disabled])` is not enough on its own — a visually hidden control is
// still matched by the selector but cannot be focused, so the list is filtered
// by offsetParent/rects afterwards.
const FOCUSABLE = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

const isVisible = (el) =>
  !el.hasAttribute('inert') &&
  el.getAttribute('aria-hidden') !== 'true' &&
  (el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0)

export function useFocusTrap(containerRef) {
  let previouslyFocused = null
  let active = false

  const focusable = () => {
    const root = containerRef.value
    if (!root) return []
    return Array.from(root.querySelectorAll(FOCUSABLE)).filter(isVisible)
  }

  const onKeydown = (event) => {
    if (event.key !== 'Tab' || !active) return

    const items = focusable()
    if (!items.length) {
      // Nothing to cycle between — hold focus on the container rather than
      // letting Tab walk out into the page behind the overlay.
      event.preventDefault()
      containerRef.value?.focus()
      return
    }

    const first = items[0]
    const last = items[items.length - 1]
    const current = document.activeElement

    // Focus can sit on the container itself (the fallback above, or the initial
    // focus when the dialog has no autofocus target), in which case neither
    // branch below matches and we steer it to an end explicitly.
    if (!containerRef.value?.contains(current) || current === containerRef.value) {
      event.preventDefault()
      ;(event.shiftKey ? last : first).focus()
      return
    }

    if (event.shiftKey && current === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && current === last) {
      event.preventDefault()
      first.focus()
    }
  }

  /**
   * @param {object} [options]
   * @param {HTMLElement|null} [options.initialFocus] element to focus instead of
   *   the first focusable one (e.g. a destructive dialog focusing Cancel).
   */
  const activate = async ({ initialFocus = null } = {}) => {
    if (active) return
    previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    active = true
    document.addEventListener('keydown', onKeydown, true)

    // The container is typically rendered in the same tick that opened it.
    await nextTick()
    const target = initialFocus || focusable()[0] || containerRef.value
    target?.focus()
  }

  /**
   * @param {object} [options]
   * @param {boolean} [options.restoreFocus=true]
   * @param {HTMLElement|null} [options.fallback] where to send focus if the
   *   original element is gone from the document.
   */
  const deactivate = ({ restoreFocus = true, fallback = null } = {}) => {
    if (!active) return
    active = false
    document.removeEventListener('keydown', onKeydown, true)

    if (!restoreFocus) return
    const target =
      previouslyFocused && document.contains(previouslyFocused) ? previouslyFocused : fallback
    previouslyFocused = null
    target?.focus()
  }

  return { activate, deactivate, focusable }
}
