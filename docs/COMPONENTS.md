# Components — v0 (10 core)

Priority: cover ~80% of current `aspirant-client` surface + the shapes needed to redesign one full surface end-to-end. Each has a light + dark variant, mobile-first, and a Histoire story.

Naming: `Asp*` prefix (e.g. `AspCard`, `AspButton`).

## Consuming

The Vite lib build ships the component styles as a **separate** stylesheet (they
are not injected by the JS bundle). A consumer needs three imports, once, at its
entry point:

```js
import '@aspirant/design-system/tokens.css'  // design tokens (:root custom props)
import '@aspirant/design-system/styles.css'  // component styles (.card, .sidebar, …)
import { AspCard, AspButton } from '@aspirant/design-system'
```

Importing the components without `styles.css` renders them structurally correct
but unstyled — this mirrors `vuetify/styles` / element-plus. (Discovered in the
aspirant-client AspCard dogfood, system_3 #1979.)

## The 10

### 1. `AspIcon`

Hand-drawn SVG wrapper. Consumes icons from `aspirant-icon-pipeline` (separate repo). Sizing tokens (`sm`/`md`/`lg`), stroke-vs-fill mode, dark-mode inversion strategy pluggable per icon (light stroke invert vs. dark-ink-on-light-card).

Props: `name`, `size`, `variant` (functional | illustrative), `label` (a11y).

### 2. `AspCard`

Signature component — dark surface (`#424242`) on light page, amber heading color, subtle amber border. Slotted header/body/footer. Handles the "inner surface" nesting pattern from `--surface-card-inner`.

Props: `variant` (default | elevated | ghost), `padding`, `interactive` (bool for hover state).

Reference: `aspirant-client/src/components/ApplicationCard.vue`, `ApiCard.vue`.

### 3. `AspButton`

Replaces plain `<button>` in aspirant-client + `<v-btn>` in MessageBoardView. Consistent focus ring, amber-hover border, disabled state.

Props: `variant` (primary | secondary | ghost | destructive), `size`, `loading`, `disabled`, `icon-left`, `icon-right`. Slot: default (label).

Loading state: spinner or skeleton — decide during implementation.

### 4. `AspSidebar` + `AspSidebarLink`

Fixed left sidebar with mobile collapse. Handles the hamburger toggle + overlay pattern already in `App.vue`. Mobile-first: full-height overlay on small screens, fixed rail on desktop.

Props (Sidebar): `collapsed`, `width`, `hideOnMobile`. Slots: header, links, footer.
Props (SidebarLink): `to`, `icon`, `label`, `badge`.

Reference: `aspirant-client/src/components/sidebar/Sidebar.vue`, `SidebarLink.vue`.

### 5. `AspInput` — built

Text input replacing `<v-text-field>`. Label + hint + error states. Control height is 34px (the §3.10 filter-row canon), overridable per call site via `--asp-input-height`.

Props: `modelValue` (v-model), `label`, `hint`, `error`, `type` (text | search | number), `placeholder`, `required`, `disabled`. Emits `update:modelValue`. Unrecognised attributes (`autocomplete`, `@blur`, …) fall through to the inner `<input>`, not the wrapper.

`error` takes a string (rendered as the message) or a bare `true` (styles the field invalid with no message, for callers that surface the text elsewhere). An error supersedes a hint — only one message line shows at a time. The `search` type renders a leading `AspIcon`.

Focus indicator: `--shadow-focus` (#5a94ff) measures 2.80:1 against `--surface-elevated` and 2.32:1 against `--surface-page`, both under the 3:1 WCAG 1.4.11 non-text minimum. The control therefore pairs the ring with a `--text-on-light` border so the composite indicator has an AA-passing edge in both themes. **The shared token is still sub-AA for every other component that uses it alone** — worth a follow-up at the token layer.

Extend to `AsTextarea` in v0 if free — otherwise defer.

### 6. `AspList` + `AspListItem`

Replaces `<v-list>` on MessageBoardView. Vertical stack with divider option, hover states, optional icon leading.

Props (List): `variant` (default | divided | interactive), `spacing`.
Props (Item): `icon`, `label`, `meta`, `active`, `disabled`.

### 7. `AspChart` — ✅ shipped

Chart.js v4 wrapper — pre-configures series colors from the `--chart-series-1..10` palette tokens, axes from `--text-muted`, grid from `--border-subtle`, a dark-card tooltip, and a `data-theme` dark swap (re-themes via a `MutationObserver` on the root, no prop toggle). Not a full charting library, just a themed shell. `chart.js` is an **optional peer dependency** — the consuming app installs it.

Props: `type` (line | bar | pie | doughnut | scatter), `data`, `options` (deep-merged over defaults), `height` (number px or CSS length), `ariaLabel` (canvas `role="img"` text alternative).

Datasets that omit their own colors are auto-assigned from the palette (by dataset for cartesian charts, by slice for pie/doughnut). Respects `prefers-reduced-motion`.

Reference: `aspirant-client/src/components/RangeChart.vue` for the current shape.

### 8. `AspModal`

Overlay dialog. Focus-trap, escape-to-close, click-outside-to-close (optional), scroll-lock body. Mobile: full-screen sheet.

Props: `open` (v-model), `title`, `size` (sm | md | lg | fullscreen), `dismissible`. Slots: default (body), footer.

### 9. `AspBackButton`

Persistent back navigation — this is a signature interaction pattern in aspirant-client. Fixed position, hand-drawn arrow icon, respects browser history + explicit `to` prop.

Props: `to` (fallback route), `position` (fixed | inline).

Reference: `aspirant-client/src/components/BackButton.vue`.

### 10. `AspTypography` (or heading primitives `AspH1`, `AspH2`, `AspProse`)

Type scale enforcement. Prevents drift where `<h1>` on view A doesn't match view B. `AspProse` handles long-form (paragraph, list, code, blockquote) — matters for blog scope.

Props (Heading): `level` (1..6), `color`, `align`.
Props (Prose): `size` (sm | base | lg), `contrast`.

### 11. `AspAppShell` — ✅ shipped

Standard page scaffold: left `AspSidebar` + optional header + main + optional footer, so every app surface shares one shell. Mobile-first — below `--breakpoint-md` the sidebar auto-collapses to an off-canvas overlay (via `AspSidebar`'s own `useMobile`), a hamburger appears in the header, and content flows full width.

Props: `sidebarCollapsed` (`v-model:sidebar-collapsed`), `hasSidebar` (bool, default true), `contentPadding` (sm | md | lg).
Slots: `sidebar` (nav contents → `AspSidebar` default slot), `header`, default (main), `footer`.

Consumers needing a sidebar header/footer compose `AspSidebar` directly rather than through the shell's single `sidebar` slot.

### 12. `AspEmptyState` — ✅ shipped

Centered placeholder for a view with no data. Ports the system_3
`_partials/empty_state.html` macro (`system_3_ux_conventions.md` §1 primary-action
placement, §4 neutral color for inert states). Two variants distinguish *why*
the view is empty: `empty` (first-run / no data yet) and `filtered` (data
exists but the active filters match nothing) — the variant picks a subtle
default icon (inbox vs funnel, `--text-muted`); the `filtered` icon is lighter
so it reads as transient rather than alarming.

Props: `heading`, `message`, `variant` (`empty` | `filtered`, default `empty`),
`actionLabel` (convenience CTA → renders an `AspButton` emitting `action`).
Slots: `icon` (override default), `heading`, default (message body), `action`
(full control, e.g. a composed `AspButton`). Emits: `action`.

### 13. `AspBadge` — ✅ shipped

The inline status/label family in one component, four variants. Ports the
system_3 `_partials/badge.html` status `<mark>`, `.label-badge`, and
`.status-dot` shapes (see `system_3_ux_conventions.md` §4). Color is
supplementary to a visible text label; `status`/`dot` emit a legend `title` so
the color→meaning mapping is decodable on hover.

Props: `variant` (`status` | `chip` | `filter` | `dot`, default `status`),
`status` (`positive` | `caution` | `negative` | `neutral`, default `neutral` —
drives semantic color on `status` + `dot`), `size` (`sm` | `md`), `tip`
(legend override), `ariaLabel` (accessible label / remove-button label).
Emits: `remove` (the `filter` variant's `×`).
Tokens: the tinted `--feedback-{success,warning,error,neutral}-bg` / `-text`
pairs (#1970), `--radius-pill`.

### 14. `AspDataTable` — ✅ shipped

DS-themed sortable table. Ports the system_3 `_partials/table.html` +
`_sort_header.html` macros (`system_3_frontend_spec.md` criterion 27 column
sorting; `system_3_ux_conventions.md` §8 per-row actionable cells). Unlike the
server-side HTMX macro it sorts **client-side by default** (numeric-aware, nulls
last), emitting `sort` and supporting a controlled `sortBy`/`sortDir` +
`manualSort` so a server-paginating consumer can take over. Sortable headers use
▲/▼ + `aria-sort`; cells truncate with an ellipsis + `title`; the wrapper
horizontal-scrolls on mobile.

Props: `columns` (`[{ key, label, sortable?, align?, truncate?, width? }]`),
`rows`, `density` (`default` | `compact`), `interactive` (hover +
keyboard-operable rows), `sortBy` / `sortDir` (v-model-able), `manualSort`,
`rowKey` (string | fn), `caption`.
Slots: `cell-<key>` (scoped: `{ row, value, index }`), `header-<key>`, `empty`.
Emits: `sort` (`{ key, dir }`), `update:sortBy`, `update:sortDir`, `row-click`
(`row, index`).

## Deferred (not in v0 10)

- `AsTable` — data table. Defer until we redesign a table-heavy surface.
- `AsTabs` — no clear v0 requirement.
- `AsTooltip` — nice-to-have; browsers can carry text tooltips for now.
- `AsBreadcrumb` — no current use.
- `AsAvatar` — no user-avatar surface today.
- `AsToast` / `AsNotification` — belongs in v1 alongside a global feedback pattern.
- `AspForm` — collection wrapper around `AspInput` + `AspButton` — defer, use composition.
- `AsDropdown` / `AsMenu` — nice-to-have; check if aspirant-client needs it.

## Cross-cutting

**Composables** (in `src/composables/`):
- `useTheme` — light/dark switch, watches `prefers-color-scheme`, persists to localStorage
- `useMobile` — port `checkMobile` + resize logic from `aspirant-client/src/global_state_manager.js`
- `useFocusTrap` — used by `AspModal`, potentially `AspSidebar` on mobile
- `useKeyboard` — escape / arrow keys for menus + modals

**Accessibility baseline** (WCAG AA):
- Every interactive component: keyboard-operable, focus-visible with `--shadow-focus`
- Every color pair passes 4.5:1 contrast (verify `#424242` on `#e4e4e4` and amber-on-charcoal)
- `AspIcon` requires `label` prop unless explicitly `aria-hidden`

## Definition of done (per component)

- [ ] Vue 3 `<script setup>` with typed props
- [ ] Uses tokens from `build/tokens.css` — no hardcoded color/spacing/type
- [ ] Light + dark variants render correctly
- [ ] Mobile-first CSS (min-width media queries only)
- [ ] Histoire story covering default + all prop variants + edge cases (empty, loading, error where applicable)
- [ ] Keyboard-navigable + focus-visible
- [ ] Documented in the story: purpose, when to use, when not to
