<script setup>
import { computed, ref, watch } from 'vue'
import { registryFallback, registryAsset } from '../icons/registry.js'
import { useIconBase, isIconBaseConfigured } from '../composables/useIconBase.js'
import assetMap from '../icons/asset_map.json'

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

// --- Image asset path (interim: existing aspirant asset server) --------------
// A name that maps (directly or via a registry alias) to an image entry in
// asset_map.json is served as an `<img>` from `${VITE_ICON_BASE}/${hash}`.
// Only attempted when a base is configured, so an unset VITE_ICON_BASE goes
// straight to the glyph with no broken-image flash.
const assetEntry = computed(() => {
  if (!isIconBaseConfigured()) return null
  const entry = assetMap[registryAsset(props.name)]
  return entry && entry.type === 'image' ? entry : null
})

const assetSrc = computed(() => {
  if (!assetEntry.value) return null
  const base = useIconBase().replace(/\/+$/, '')
  return `${base}/${assetEntry.value.hash}`
})

const imgFailed = ref(false)

const onImgError = () => {
  imgFailed.value = true
  // eslint-disable-next-line no-console
  console.debug(`[AspIcon] fallback rendering "${props.name}" (asset unavailable)`)
}

// --- SVG path (future: reMarkable-drawn icons) -------------------------------
// Reserved for names NOT in the image asset map: fetched as
// `${VITE_ICON_BASE}/${name}.svg`, sanitized, and inlined.
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
    imgFailed.value = false
    svgMarkup.value = null
    // Image assets render via <img>; no SVG fetch needed for them.
    if (assetSrc.value) return
    const svg = await fetchIcon(name)
    if (svg && props.name === name) svgMarkup.value = svg
  },
  { immediate: true }
)

const showImg = computed(() => assetSrc.value && !imgFailed.value)

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
    <!-- Interim: hand-drawn PNG from the aspirant asset server. -->
    <img
      v-if="showImg"
      class="asp-icon__img"
      :src="assetSrc"
      alt=""
      draggable="false"
      @error="onImgError"
    >
    <!-- Future: reMarkable SVG, fetched via useIconBase() + sanitizeSvg(). -->
    <!-- eslint-disable-next-line vue/no-v-html -->
    <span v-else-if="svgMarkup" class="asp-icon__svg" v-html="svgMarkup" />
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

/* Fallback values keep AspIcon sized standalone; define --icon-size-* tokens
   in the token pipeline to override globally. */
.asp-icon--sm { width: var(--icon-size-sm, 1rem); height: var(--icon-size-sm, 1rem); font-size: var(--icon-size-sm, 1rem); }
.asp-icon--md { width: var(--icon-size-md, 1.5rem); height: var(--icon-size-md, 1.5rem); font-size: var(--icon-size-md, 1.5rem); }
.asp-icon--lg { width: var(--icon-size-lg, 2rem); height: var(--icon-size-lg, 2rem); font-size: var(--icon-size-lg, 2rem); }

.asp-icon--functional { color: currentColor; }

/*
 * Illustrative variant is a placeholder shell: hand-drawn assets pick their own
 * ink colour per light/dark surface. Nothing to override at the token layer yet.
 */
.asp-icon--illustrative { color: currentColor; }

.asp-icon__svg,
.asp-icon__glyph,
.asp-icon__img {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.asp-icon__img {
  object-fit: contain;
}

.asp-icon__svg :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
