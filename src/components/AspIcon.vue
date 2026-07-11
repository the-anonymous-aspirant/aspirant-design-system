<script setup>
import { computed, ref, watch } from 'vue'
import { registryFallback } from '../icons/registry.js'
import { useIconBase } from '../composables/useIconBase.js'

const props = defineProps({
  name: { type: String, required: true },
  fallback: { type: String, default: null },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
  variant: {
    type: String,
    default: 'functional',
    validator: (v) => ['functional', 'illustrative'].includes(v),
  },
  label: { type: String, default: null },
})

const resolvedFallback = computed(
  () => props.fallback ?? registryFallback(props.name) ?? '?'
)

const svgMarkup = ref(null)

const iconCache = /* @__PURE__ */ new Map()

// Defense-in-depth sanitizer: strip <script>, <foreignObject>, event-handler
// attributes, and javascript: URLs. Not a full sanitizer (that would need
// DOMParser + allowlist) but blocks the most obvious injection paths. The
// aspirant-icon-pipeline serves same-origin under operator control, so this
// is a belt-and-braces guard for a MITM or a misconfigured VITE_ICON_BASE.
const sanitizeSvg = (svg) =>
  svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|xlink:href)\s*=\s*("javascript:[^"]*"|'javascript:[^']*')/gi, '')

const fetchIcon = async (name) => {
  if (iconCache.has(name)) return iconCache.get(name)
  const promise = (async () => {
    if (typeof window === 'undefined' || typeof fetch !== 'function') return null
    const base = useIconBase().replace(/\/+$/, '')
    const controller =
      typeof AbortController !== 'undefined' ? new AbortController() : null
    const timeout = controller ? setTimeout(() => controller.abort(), 1000) : null
    try {
      const res = await fetch(`${base}/${encodeURIComponent(name)}.svg`, {
        signal: controller?.signal,
      })
      if (!res.ok) return null
      const text = await res.text()
      if (!/^\s*<svg[\s>]/i.test(text)) return null
      return sanitizeSvg(text)
    } catch {
      return null
    } finally {
      if (timeout) clearTimeout(timeout)
    }
  })()
  iconCache.set(name, promise)
  const result = await promise
  if (result === null) {
    // eslint-disable-next-line no-console
    console.debug(`[AspIcon] fallback rendering "${name}" (SVG unavailable)`)
  }
  return result
}

watch(
  () => props.name,
  async (name) => {
    svgMarkup.value = null
    const svg = await fetchIcon(name)
    if (svg && props.name === name) svgMarkup.value = svg
  },
  { immediate: true }
)

const a11yAttrs = computed(() =>
  props.label
    ? { role: 'img', 'aria-label': props.label }
    : { 'aria-hidden': 'true' }
)
</script>

<template>
  <span
    :class="['asp-icon', `asp-icon--${size}`, `asp-icon--${variant}`]"
    v-bind="a11yAttrs"
  >
    <!-- svgMarkup is fetched from useIconBase() and passed through sanitizeSvg() -->
    <!-- eslint-disable-next-line vue/no-v-html -->
    <span v-if="svgMarkup" class="asp-icon__svg" v-html="svgMarkup" />
    <span v-else class="asp-icon__glyph">{{ resolvedFallback }}</span>
  </span>
</template>

<style scoped>
.asp-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  vertical-align: middle;
}

.asp-icon--sm { width: var(--icon-size-sm); height: var(--icon-size-sm); font-size: var(--icon-size-sm); }
.asp-icon--md { width: var(--icon-size-md); height: var(--icon-size-md); font-size: var(--icon-size-md); }
.asp-icon--lg { width: var(--icon-size-lg); height: var(--icon-size-lg); font-size: var(--icon-size-lg); }

.asp-icon--functional { color: currentColor; }

/*
 * Illustrative variant is a placeholder shell: hand-drawn assets from the
 * aspirant-icon-pipeline pick their own ink colour per light/dark surface
 * (README strategy option 2). Nothing to override at the token layer yet.
 */
.asp-icon--illustrative { color: currentColor; }

.asp-icon__svg,
.asp-icon__glyph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.asp-icon__svg :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
