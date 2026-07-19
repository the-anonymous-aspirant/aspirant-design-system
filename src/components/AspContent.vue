<script setup>
// AspContent — the artifact/report body renderer.
//
// Renders an artifact body that arrives as opaque text: a markdown report, a
// source file, a log dump. It exists because the three things that go wrong
// with such a body all go wrong in the RENDER, not in the styling — so unlike
// AspProse (which styles descendants it is handed pre-rendered), this component
// owns the parse.
//
// The three defects it was filed against (#2382, verified 2026-07-18):
//   1. fenced code rendered with no syntax highlighting;
//   2. raw, un-fenced source was fed to a markdown parser and came out as
//      mangled paragraphs — indentation eaten, `*` read as emphasis;
//   3. the body had no max-height, so a large artifact expanded to the full
//      page height and pushed every surrounding control off-screen.
//
// Contrast role: MIXED (spec amendment #2382 comment 9767, and the setter-vs-
// inheritor rule in system_3_design_conventions.md §3.18).
//   - PROSE INHERITS. It sets no colour and no background, so it is legible on
//     the light page and on a dark card without knowing which it is on.
//   - CODE BLOCKS PAINT. A fenced block declares its background and its ink
//     together, which is what makes the highlight ramp's contrast provable
//     once instead of once per theme. See the <style> block for the measured
//     ratios and for why a stock highlight.js theme is NOT vendored.

import { computed } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js/lib/core'

// Curated language set rather than `highlight.js/lib/common`. The full common
// bundle registers ~40 grammars; these are the ones an aspirant artifact
// actually carries, and each one is ~2-8KB of the consumer's bundle.
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import yaml from 'highlight.js/lib/languages/yaml'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import sql from 'highlight.js/lib/languages/sql'
import diff from 'highlight.js/lib/languages/diff'
import markdownLang from 'highlight.js/lib/languages/markdown'

const LANGUAGES = {
  javascript,
  typescript,
  python,
  bash,
  json,
  yaml,
  xml,
  css,
  sql,
  diff,
  markdown: markdownLang,
}
for (const [name, grammar] of Object.entries(LANGUAGES)) {
  if (!hljs.getLanguage(name)) hljs.registerLanguage(name, grammar)
}

const props = defineProps({
  /** The artifact body, as text. */
  content: { type: String, default: '' },
  /**
   * How to read `content`.
   *   'markdown'  — parse as markdown (fenced code is highlighted)
   *   'code'      — verbatim source; highlighted, never reflowed
   *   'text'      — verbatim plain text; preserved, never highlighted
   *   'auto'      — sniff (see `sniffType`)
   *
   * The consumer's content-type model (#2304 / #2306) is expected to pass this
   * explicitly. 'auto' is the default because the defect this component fixes
   * is precisely a body of UNKNOWN type being assumed to be markdown.
   */
  type: {
    type: String,
    default: 'auto',
    validator: (v) => ['auto', 'markdown', 'code', 'text'].includes(v),
  },
  /** Language hint for `type="code"`. Ignored in markdown mode, where each
   *  fence carries its own info string. */
  language: { type: String, default: '' },
  /**
   * Cap on the body's height — number (px) or any CSS length. Overflow scrolls
   * INSIDE the component. `null` removes the cap for the rare caller that has
   * its own scroll container and would otherwise nest two.
   */
  maxHeight: { type: [String, Number, null], default: 480 },
  /** Cap the prose measure. Off by default: an artifact body is usually read
   *  in a panel that is already narrow. */
  measure: { type: Boolean, default: false },
})

// --- content-type sniffing --------------------------------------------------
// Deliberately conservative and biased AWAY from markdown. Mis-sniffing source
// as markdown is the logged defect (mangled paragraphs, eaten indentation);
// mis-sniffing markdown as code is merely plain-looking. The costs are not
// symmetric, so neither is the test: markdown must be affirmatively evidenced.
const CODE_SIGNALS = [
  /^\s*(?:import|from|export|package|using|#include)\s/m,
  /^\s*(?:def|class|func|fn|function|public|private|const|let|var)\s+\w/m,
  /^\s*(?:#!\/|<\?php|<!DOCTYPE)/i,
  /[;{}]\s*$/m,
  /^\s{2,}\S/m, // leading indentation: markdown would read 4+ as a code block
]
const MARKDOWN_SIGNALS = [
  /^#{1,6}\s+\S/m, // ATX heading
  /^\s*[-*+]\s+\S/m, // bullet list
  /^\s*\d+\.\s+\S/m, // ordered list
  /^>\s+\S/m, // blockquote
  /^```/m, // fence
  /\[[^\]]+\]\([^)]+\)/, // link
  /\*\*\S/, // bold
  /^\s*\|.+\|\s*$/m, // table row
]

const sniffType = (text) => {
  if (!text.trim()) return 'text'
  // A fence is decisive: nothing but markdown has one, and a code file that
  // contains one is a markdown file about code.
  if (/^```/m.test(text)) return 'markdown'
  const md = MARKDOWN_SIGNALS.filter((r) => r.test(text)).length
  const code = CODE_SIGNALS.filter((r) => r.test(text)).length
  if (code > md) return 'code'
  return md > 0 ? 'markdown' : 'text'
}

const resolvedType = computed(() => (props.type === 'auto' ? sniffType(props.content) : props.type))

// --- highlighting -----------------------------------------------------------
const highlight = (code, language) => {
  const lang = (language || '').toLowerCase()
  if (lang && hljs.getLanguage(lang)) {
    // `ignoreIllegals` — a grammar that hits an illegal construct throws by
    // default, which would blank the whole artifact over one odd line. An
    // artifact body is untrusted input; a best-effort highlight beats an
    // exception.
    return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
  }
  // No hint, or a grammar we did not register: escape and render unhighlighted
  // rather than guessing. hljs.highlightAuto on a short snippet guesses badly,
  // and a wrong grammar mis-colours code that reads fine uncoloured.
  return escapeHtml(code)
}

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// --- markdown ---------------------------------------------------------------
// Raw HTML in the source is ESCAPED, not passed through. marked has shipped no
// sanitiser since v5 (it defers to the caller), and an artifact body is written
// by an agent or a tool — i.e. it is untrusted. Escaping at the renderer is the
// narrow fix: markdown still renders, `<script>` renders as visible text.
//
// This is also what makes the template's two `v-html` sites safe, and they are
// the reason this component exists at all — it renders a body it must first
// parse. Neither interpolates unescaped input: the markdown branch goes through
// the `html()` hook below, and the code branch emits only highlight.js span
// markup over text `highlight()` has already escaped. The `vue/no-v-html` rule
// is disabled for this file in `.eslintrc.cjs` rather than by an in-template
// comment, because a template comment is emitted into the rendered DOM as a
// comment node in every consumer's app.
const renderer = {
  html(token) {
    return escapeHtml(typeof token === 'string' ? token : token.raw)
  },
  code(token) {
    const lang = (token.lang || '').split(/\s+/)[0]
    const cls = lang ? ` class="language-${escapeHtml(lang)}"` : ''
    return `<pre class="asp-content__code"><code${cls}>${highlight(token.text, lang)}</code></pre>`
  },
}

marked.use({ renderer, gfm: true, breaks: false })

const renderedHtml = computed(() => {
  if (resolvedType.value !== 'markdown') return ''
  return marked.parse(props.content)
})

const highlightedSource = computed(() => {
  if (resolvedType.value !== 'code') return ''
  return highlight(props.content, props.language)
})

const bodyStyle = computed(() => {
  if (props.maxHeight === null) return {}
  const h = typeof props.maxHeight === 'number' ? `${props.maxHeight}px` : props.maxHeight
  return { maxHeight: h }
})

// A scrollable region must be reachable by keyboard, or its content is
// unreachable for anyone not using a mouse (WCAG 2.1.1). tabindex="0" makes the
// scroller focusable; the role/label give it a name when it is focused.
const scrollable = computed(() => props.maxHeight !== null)
</script>

<template>
  <div
    class="asp-content"
    :class="[`asp-content--${resolvedType}`, { 'asp-content--measured': measure }]"
    :style="bodyStyle"
    :tabindex="scrollable ? 0 : undefined"
    :role="scrollable ? 'region' : undefined"
    :aria-label="scrollable ? 'Artifact body' : undefined"
  >
    <div v-if="resolvedType === 'markdown'" class="asp-content__prose" v-html="renderedHtml" />

    <pre v-else-if="resolvedType === 'code'" class="asp-content__code"><code
      :class="language ? `language-${language}` : undefined"
      v-html="highlightedSource"
    /></pre>

    <pre v-else class="asp-content__plain">{{ content }}</pre>
  </div>
</template>

<style scoped>
/*
 * The container INHERITS. No colour, no background — see the MIXED role note in
 * the script block. Only the code block below paints.
 */
.asp-content {
  overflow-y: auto;
  font-family: var(--font-family-base);
  font-size: var(--text-base);
  line-height: var(--font-line-height-relaxed);
}

.asp-content:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}

.asp-content--measured .asp-content__prose {
  max-width: 70ch;
}

/*
 * Subtle scrollbar. Tinted from currentColor so the thumb follows the surface's
 * polarity like the rest of the inherited layer.
 *
 * The two blocks are a fallback pair, not a belt-and-braces duplicate, and the
 * precedence runs one way: where the standard `scrollbar-width` /
 * `scrollbar-color` properties are supported, the engine IGNORES the
 * `::-webkit-scrollbar` pseudo-element entirely. Modern Chromium and Firefox
 * therefore take the standard block; only older WebKit falls through to the
 * pseudo-element one.
 *
 * A consequence worth knowing before someone "fixes" it: under the standard
 * properties the scrollbar is an OVERLAY and occupies no layout width
 * (measured gutter = 0), so a capped body shows no persistent scroll
 * affordance at rest — the cut edge is the only cue until the pointer enters
 * or the region is scrolled. That is the platform's behaviour, not a missing
 * rule, and the `width` in the pseudo-element block does not override it.
 */
.asp-content {
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, currentColor 25%, transparent) transparent;
}
.asp-content::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
.asp-content::-webkit-scrollbar-track {
  background: transparent;
}
.asp-content::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, currentColor 25%, transparent);
  border-radius: var(--radius-full);
}
.asp-content::-webkit-scrollbar-thumb:hover {
  background: color-mix(in srgb, currentColor 40%, transparent);
}

/* --- prose (inherits) ----------------------------------------------------- */
/*
 * Same one-direction vertical rhythm as AspProse, and for the same reason: the
 * reset must stay element-agnostic or its specificity beats the rhythm rule and
 * every block renders flush against the next.
 */
.asp-content__prose :deep(> *) {
  margin: 0;
}
.asp-content__prose :deep(> * + *) {
  margin-top: var(--space-md);
}

.asp-content__prose :deep(h1),
.asp-content__prose :deep(h2),
.asp-content__prose :deep(h3),
.asp-content__prose :deep(h4),
.asp-content__prose :deep(h5),
.asp-content__prose :deep(h6) {
  margin-bottom: 0;
  line-height: var(--font-line-height-tight);
}
.asp-content__prose :deep(* + h1),
.asp-content__prose :deep(* + h2),
.asp-content__prose :deep(* + h3),
.asp-content__prose :deep(* + h4),
.asp-content__prose :deep(* + h5),
.asp-content__prose :deep(* + h6) {
  margin-top: var(--space-lg);
}

.asp-content__prose :deep(ul),
.asp-content__prose :deep(ol) {
  padding-left: var(--space-lg);
}
.asp-content__prose :deep(li + li) {
  margin-top: var(--space-2xs);
}

/* Inline code is a CHIP on the inherited surface, so it tints from the ink
   rather than painting: `--surface-card-inner` is a white wash in dark theme
   and would lighten the light page toward the ink (measured 3.8:1 — the defect
   AspProse already carries a note about). */
.asp-content__prose :deep(code) {
  padding: 0.1em 0.3em;
  background: color-mix(in srgb, currentColor 10%, transparent);
  border-radius: var(--radius-sm);
  font-family: var(--font-family-mono);
  /* Mono runs large next to the base face at the same nominal size. */
  font-size: 0.9em;
}

.asp-content__prose :deep(a) {
  /* Blue = links, per corpus §1.3 — but mixed into currentColor, not raw
     --text-hint (#82b1ff measures 1.71:1 on the light page). The underline
     carries the link on its own, so meaning survives the mix (WCAG 1.4.1). */
  color: color-mix(in srgb, var(--brand-accent-800) 30%, currentColor);
  text-decoration: underline;
}

.asp-content__prose :deep(blockquote) {
  padding-left: var(--space-md);
  border-left: 3px solid var(--brand-primary);
  font-style: italic;
}

.asp-content__prose :deep(hr) {
  height: 1px;
  background: color-mix(in srgb, currentColor 20%, transparent);
  border: 0;
}

.asp-content__prose :deep(table) {
  border-collapse: collapse;
  width: 100%;
}
.asp-content__prose :deep(th),
.asp-content__prose :deep(td) {
  padding: var(--space-2xs) var(--space-xs);
  border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
  text-align: left;
}

/* --- code (paints) -------------------------------------------------------- */
/*
 * This is the SETTER half of the MIXED role. It declares background and ink
 * together, so the highlight ramp below has one known surface to be legible
 * against rather than two theme-dependent ones.
 *
 * The background is `--surface-card-inner` (per the spec's token list)
 * composited over the OPAQUE `--surface-card`. That matters: the inner token is
 * translucent in both themes — rgba(0,0,0,0.3) light, rgba(255,255,255,0.06)
 * dark — so used alone it would inherit whatever sits beneath and defeat the
 * point of painting. Over the card it resolves to #2e2e2e in the light theme
 * and #373737 in the dark one. Both dark, which is why one ramp serves both.
 *
 * Targeted through `:deep(pre)` rather than by class. The markdown branch emits
 * its <pre> through v-html, and v-html content does NOT carry the scoped-style
 * data attribute — so a plain `.asp-content__code` selector styles the
 * `type="code"` block (real template, scoped) and silently misses every fenced
 * block inside rendered markdown. Matching the element from the scoped root
 * covers both branches.
 */
.asp-content :deep(pre) {
  overflow-x: auto;
  margin: 0;
  padding: var(--space-sm) var(--space-md);
  background-color: var(--surface-card);
  background-image: linear-gradient(var(--surface-card-inner), var(--surface-card-inner));
  border-radius: var(--radius-md);
  color: var(--text-on-dark);
  font-family: var(--font-family-mono);
  font-size: var(--text-sm);
  line-height: var(--font-line-height-normal);
  /* Verbatim: raw source keeps its indentation and its line breaks. Reflowing
     it is defect #2 of this component's filing. */
  white-space: pre;
  tab-size: 4;
}

/* A block's `code` child must not also take the inline chip treatment — that
   double-tints it. */
.asp-content__prose :deep(pre code) {
  padding: 0;
  background: none;
  border-radius: 0;
  font-size: inherit;
}

/*
 * Highlight ramp — DS tokens, NOT a vendored highlight.js stylesheet.
 *
 * Per spec amendment #2382 comment 9767: a stock theme ships a palette tuned
 * for ITS OWN background, so dropping one in overrides token ink with colours
 * chosen against a different surface entirely. These are re-mapped onto DS
 * tokens instead.
 *
 * Every colour below was measured against BOTH resolved code surfaces
 * (#2e2e2e light-theme, #373737 dark-theme) and clears WCAG-AA 4.5:1:
 *
 *   #ffffff  --text-on-dark      13.58 / 11.90   base ink
 *   #ffd54f  --brand-primary-300  9.62 /  8.44   keyword
 *   #f0e442  --chart-series-7    10.27 /  9.00   string
 *   #ffb300  --brand-primary      7.57 /  6.63   type, attr
 *   #82b1ff  --brand-accent-300   6.26 /  5.49   title, function
 *   #56b4e9  --chart-series-6     5.89 /  5.16   number, literal
 *   currentColor @ 60%            5.91 /  5.43   comment
 *
 * Four tokens were REJECTED by that measurement and must not be added here:
 * --chart-series-3 #009e73 (3.97/3.48), --chart-series-5 #cc79a7 (4.44/3.89),
 * --chart-series-4 #d55e00 (3.51/3.08), --chart-series-9 #6c757d (2.90/2.54).
 * The green one is the trap — "strings are green" is the reflex, and it is the
 * single largest token class in a highlighted body.
 *
 * Syntax colour is not the sole carrier of meaning (the code reads correctly
 * uncoloured), so WCAG 1.4.1 is satisfied structurally — but the ramp is held
 * to AA anyway, because a token class one cannot read is worse than no ramp.
 */
.asp-content :deep(.hljs-keyword),
.asp-content :deep(.hljs-selector-tag),
.asp-content :deep(.hljs-built_in),
.asp-content :deep(.hljs-section) {
  color: var(--brand-primary-300);
}

.asp-content :deep(.hljs-string),
.asp-content :deep(.hljs-regexp),
.asp-content :deep(.hljs-char),
.asp-content :deep(.hljs-addition) {
  color: var(--chart-series-7);
}

.asp-content :deep(.hljs-title),
.asp-content :deep(.hljs-title.function_),
.asp-content :deep(.hljs-name),
.asp-content :deep(.hljs-link) {
  color: var(--brand-accent-300);
}

.asp-content :deep(.hljs-number),
.asp-content :deep(.hljs-literal),
.asp-content :deep(.hljs-symbol),
.asp-content :deep(.hljs-bullet) {
  color: var(--chart-series-6);
}

.asp-content :deep(.hljs-type),
.asp-content :deep(.hljs-class .hljs-title),
.asp-content :deep(.hljs-attr),
.asp-content :deep(.hljs-attribute),
.asp-content :deep(.hljs-variable),
.asp-content :deep(.hljs-meta),
.asp-content :deep(.hljs-property) {
  color: var(--brand-primary);
}

.asp-content :deep(.hljs-comment),
.asp-content :deep(.hljs-quote) {
  color: color-mix(in srgb, currentColor 60%, transparent);
  font-style: italic;
}

/* A deletion line must not read as a string. Red is unavailable at AA on this
   surface (--chart-series-4 measures 3.51), so the deletion is carried by
   weight and a dimmed ink instead of by hue. */
.asp-content :deep(.hljs-deletion) {
  color: color-mix(in srgb, currentColor 70%, transparent);
  text-decoration: line-through;
}

.asp-content :deep(.hljs-emphasis) {
  font-style: italic;
}
.asp-content :deep(.hljs-strong) {
  font-weight: var(--font-weight-bold);
}

/* --- mobile-first --------------------------------------------------------- */
/* Base is the narrow case. Roomier padding only once there is room for it. */
@media (min-width: 768px) {
  .asp-content :deep(pre) {
    padding: var(--space-md) var(--space-lg);
  }
}
</style>
