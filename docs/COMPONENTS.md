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

### 6. `AspList` + `AspListItem` — ✅ shipped

Replaces `<v-list>` on MessageBoardView. Vertical stack with divider option, hover states,
optional leading icon and trailing meta.

`variant` and `spacing` are **provided down** rather than repeated on each item: every item
in a list shares them by definition, so a per-item prop would just be a per-call-site
opportunity to make them inconsistent.

An interactive row is a real `<button>` inside the `<li>`, not an `<li>` carrying `tabindex`
and a keydown handler. `AspDataTable` does the latter because a `<tr>` cannot contain a
row-spanning button without breaking table semantics; a list has no such constraint, so it
gets the element that already has Enter *and* Space, the right implicit role, and real
`disabled` semantics. The `<li>` stays a listitem either way.

Selection is an amber inset bar plus weight, **not** a background tint, and pairs with
`aria-current` so it is not colour-only. Amber behind text is the #2419 trap. A neutral tint
was no safer: the first version used `currentColor 6%` and the contrast matrix measured the
row's muted meta at 4.49:1 — under AA by a hundredth, because `--text-muted` is already 80%
of the ink and has no margin to spend.

Hover tints from `currentColor` rather than `--surface-card-inner`, for the reason recorded
in §10 — that token is a white wash that lightens every surface, including light ones.

Props (List): `variant` (`default` | `divided` | `interactive`), `spacing` (`sm` | `md` |
`lg`), `ariaLabel`.
Props (Item): `icon` (registry name or raw glyph), `label`, `meta`, `active`, `disabled`.
Slots (Item): default (overrides `label`). Emits: `click`.

### 7. `AspChart` — ✅ shipped

Chart.js v4 wrapper — pre-configures series colors from the `--chart-series-1..10` palette tokens, axes from `--text-muted`, grid from `--border-subtle`, a dark-card tooltip, and a `data-theme` dark swap (re-themes via a `MutationObserver` on the root, no prop toggle). Not a full charting library, just a themed shell. `chart.js` is an **optional peer dependency** — the consuming app installs it.

Props: `type` (line | bar | pie | doughnut | scatter), `data`, `options` (deep-merged over defaults), `height` (number px or CSS length), `ariaLabel` (canvas `role="img"` text alternative).

Datasets that omit their own colors are auto-assigned from the palette (by dataset for cartesian charts, by slice for pie/doughnut). Respects `prefers-reduced-motion`.

Reference: `aspirant-client/src/components/RangeChart.vue` for the current shape.

### 8. `AspModal` — ✅ shipped

Overlay dialog for create-task, edit and confirm flows. Focus-trap, escape-to-close,
optional click-outside-to-close, ref-counted body scroll-lock. Mobile is a
full-screen sheet, and that is the **base** style — the sized, centred, rounded
dialog appears from the `md` breakpoint up via `min-width`, per the mobile-first
rule.

**Teleported to `<body>`.** A dialog authored inside a card or any ancestor with
`overflow: hidden`, `transform` or `filter` would be clipped or positioned
against that ancestor rather than the viewport, and its call sites are exactly
that shape.

**Surface.** The panel sets `--surface-card` — dark even in the light theme — so
it sets the paired ink (`--text-on-dark`) rather than inheriting the ambient one;
the title takes the same amber as `AspCard`. Children inherit from the panel.
This is the #2415 distinction: a component that sets a background must set the
ink with it.

The scrim uses the new `--surface-scrim` token, which is the literal
`AspSidebar`'s mobile overlay had hardcoded; the sidebar now reads the token
too, at the same value.

Props: `open` (v-model), `title`, `size` (`sm` | `md` | `lg` | `fullscreen`),
`dismissible`, `showClose`, `closeLabel`, `ariaLabel`.
Slots: default (body), `footer`.
Emits: `update:open`, `open`, `close`.

Behaviour worth knowing: the scrim closes only when the press both *starts and
ends* on it, so a text selection dragged out of the panel does not discard a
draft. A dialog with nothing focusable in it still takes focus on its own panel
(`tabindex="-1"`) so Tab cannot walk out to the page behind.

### 9. `AspBackButton` — ✅ shipped

Persistent back navigation on detail pages — a signature aspirant-client interaction.
Router-agnostic: `$router` is detected at runtime off `globalProperties` (same trick as
`AspSidebarLink`), and it degrades to the History API when no router is installed.

**"No history" is not `history.length > 1`.** The original tested that, but it counts
forward entries and is `> 1` on a fresh tab that merely navigated inside the app, so
popping on it can walk the user out to the referring site. This reads
`history.state.back` — which vue-router 4 maintains — and only falls back to the length
heuristic when it is paired with a same-origin `document.referrer`. Failing both, it
navigates to `to`.

**Hover ink deviates from the spec deliberately.** The brief said `--text-muted` →
`--brand-primary`. Raw brand amber cannot be the ink: the button sets no background, so
it lands on whatever surface the page gives it, and `--brand-primary` measures 1.41:1 on
the light page against 5.60:1 on a dark card — the #2419 defect the contrast suite's
known-bad control reinstates on purpose. It reuses the `color-mix` resolution
`AspButton`'s ghost variant already landed on. The arrow also nudges left on hover, so
the affordance is not carried by colour alone.

**Placement is provisional.** Fixed position follows the aspirant-client original
(top-right, `--space-lg` inset). The spec cites corpus §3.12 as the detail-frame rule,
but §3.12 introduces the three detail frames *without* specifying a back affordance, and
is itself unmerged (system_3 PR #1147). Ratify before treating this as settled.

Props: `to` (fallback route, default `/`), `label` (default `Back`), `position`
(`inline` | `fixed`), `iconOnly` (clips the label but keeps the accessible name).
Emits: `back`.

Adds a `back` entry (`←`) to the icon registry — glyph-only, so it upgrades silently once
the reMarkable SVG pipeline serves `${VITE_ICON_BASE}/back.svg`.

Reference: `aspirant-client/src/components/BackButton.vue`.

### 10. `AspHeading` + `AspProse` — ✅ shipped

Typography primitives that bind text to the token scale so per-view drift cannot start.
(Shipped as two components rather than one `AspTypography`: a heading and a prose block
share no props and no behaviour, and the barrel is the thing consumers import from.)

**`AspHeading`** — `level` (1-6) picks the semantic element; `size` picks the scale step,
**independently**. Document outline and visual hierarchy genuinely disagree — a card title
is an `<h2>` while reading smaller than the page `<h1>` — and coupling them pushes authors
into choosing a level for its font size, which is how heading outlines break
(WCAG 1.3.1 / 2.4.6). Ships no margin: `AspProse` spaces its own children.

Props: `level` (1-6, default 2), `size` (`xs`…`3xl`, defaults per level), `color`
(`inherit` | `muted` | `heading`), `align` (`start` | `center` | `end`), `weight`.

**`AspProse`** — long-form wrapper that styles its descendants (`p`, lists, `code`, `pre`,
`blockquote`, `a`, `hr`). It styles descendants rather than exposing a component per
element because its content is usually *rendered* — an artifact body, a task description —
so there is no authoring moment at which someone could reach for an `<AspParagraph>`.

Props: `size` (`sm` | `base` | `lg`), `measure` (caps the line length at `70ch`).

**Colour rules, all three learned by measurement rather than reasoning:**

- There is **no `body` colour option**. It was in the first draft and measured **1:1 on a
  dark card** in the light theme — `--text-body` is an absolute dark ink. `inherit` already
  yields the body ink on any correctly-set surface, so it was redundant as well as unsafe.
- Prose links are blue per corpus §1.3 but **not raw `--text-hint`** (#82b1ff measures
  **1.71:1** on the light page; this was its first consumer as ink). Same `color-mix`
  resolution as `AspButton`'s ghost label, with the accent ramp.
- Code chips and rules tint from **`currentColor`, not `--surface-card-inner`**. That token
  is `rgba(255,255,255,0.06)` — a white wash that *lightens* every surface, including light
  ones, where it measured **3.8:1**.

`color="heading"` is the signature amber and is **card surfaces only** — 5.60:1 on
`--surface-card`, 1.41:1 on the light page (#2419). It is opt-in and measured on card
surfaces in the contrast matrix, which is where the design puts it.

The former `Foundations/Typography` showcase (webfont + token verification) is folded into
this component's story, so the scale has one home rather than two that can disagree.

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


**Data-driven fill (`color`), added #2378.** `chip` and `dot` accept a hex `color` — a
`vocab_labels.color` or a per-agent assigned colour — which overrides the semantic `status`
token. Omitting it leaves the semantic path untouched. This is the design-of-record render
path for label chips and agent status dots: **one primitive, data-driven**, not separate
`AspLabelChip` / `AspStatusDot` components (conventions §3.13, §3.11 promote-once).

Ink is derived from the fill at render time per corpus §3.18, in three steps: pick the
better of the two candidate inks; if it clears 4.5:1, render unchanged; otherwise nudge the
**fill's** lightness minimally — hue and saturation held — until it does. The third step is
load-bearing: `#c063c0` clears neither candidate (3.63:1 against white, 4.44:1 against
near-black), so no choice-of-ink rule alone can save it. It resolves to `#c165c1` at 4.52:1.

The stored value is **never** written back — the adjustment is a pure function of the fill,
so the operator's colour round-trips intact and the guarantee extends to colours added
later. 11px/700 is not WCAG "large text" (that needs ≥18.66px bold), so the 3:1 allowance
does not apply and the threshold stays 4.5:1.

The dark pole is `#212121`, **not** `--text-on-light`. That token is `#424242` here and
flips to `#e0e0e0` under `[data-theme='dark']`, which would hand step 1 two light candidates
in dark mode. The choice also decides how much the palette moves: against `#212121` one of
nine live fills needs adjusting; against `#424242`, eight of nine do. See
`src/utils/data_fill.js` — flagged for the designer to ratify and tokenize.

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

### 15. `AspTimeSince` — ✅ shipped

One component for every "how long" read on the frontend (system_3 #2272): freshness
(`elapsed`), time-in-lane (`duration`), cron next-fire (`countdown`).

**Format rule (exact):** single largest unit, floored — `<60s → Xs`, `<60m → Xm`,
`<24h → Xh`, else `Xd`. **Never compound.** `1h 22m` reads as prose; `1h` reads as a
terminal field, and these sit in dense columns that have to scan (§2.7). The rule lives in
`src/utils/time_since.js` as a pure function, asserted at both sides of all three unit
boundaries — it floors before comparing, so `59.7s` is `59s` and never the unreachable
`60s`.

Renders a `<time>` with a real `datetime` attribute, so the machine-readable instant is in
the DOM rather than only in the tooltip.

Two edge cases decided rather than left to chance: a countdown past its instant reads `due`,
not `next -3m`; a missing or unparseable instant renders an em dash with an accessible label
so the column keeps its shape.

Live re-tick scales with magnitude (1s → 1m → 1h) and re-arms a `setTimeout` each tick
rather than fixing an interval at mount, because the correct cadence changes as the reading
ages. A table of 200 nine-day-old timestamps must not wake the main thread 200 times a
second.

Props: `datetime` (ISO | Date | epoch ms), `seconds` (pre-computed magnitude, `duration`
only), `variant` (`elapsed` | `duration` | `countdown`), `live`, `now` (injectable, for
tests and SSR — a component that reads the wall clock internally cannot be asserted at a
boundary).

### 16. `AspChatArea` + `AspChatBubble` — ✅ shipped

The conversation surface (system_3 #2381): the Agents view and the Overview manager embed.

**The component's job is the merge.** The operator's own messages live in the `comments`
table; the agent's live in the session transcript. A view that renders only the transcript
shows the operator a conversation with their own half deleted — that is system_3 **#2348**,
the highest-value defect in the round-1 review. So `messages` and `comments` are *separate
props* and the interleave happens here: a caller cannot forget to merge, or merge wrongly,
because it is not their job. Rows are tagged with their origin (`data-source`) before
sorting, which is what lets a test prove the interleave rather than infer it — a stream in
the right order is not evidence, since a fixture whose comments all sorted last would look
identical under plain concatenation.

Sort is by `created_at`, with two decided edge cases: an entry with no parseable timestamp
sorts **last** (`Date.parse(null)` is `NaN`, and NaN comparisons silently scramble a sort
rather than failing loudly), and ties break on source then id so rows written in the same
millisecond keep a stable order instead of swapping between renders.

`order` ships as a capability, not a default. Newest-first is round-2 P1 and is not yet
operator-confirmed, so the prop exists and the default stays `chronological` rather than
pre-empting the decision.

**Bubble sides** (corpus §3.12, ratified): operator/user → brand tint, right-aligned;
agent/tool/system/cron → recessed inner surface, left-aligned, amber sender tag. Side is
derived from `kind` *inside* the component, so a caller cannot render an agent message as
the operator's by passing the wrong prop.

**Both variants are surface-setters, and neither uses the alpha the ruling names.** This is
the one departure from §3.12 and it is load-bearing. Both tokens the ruling names are
*alphas*: they composite over whatever is beneath, so their contrast becomes a function of a
backdrop the component cannot see. Measured across the six real backdrops, no single ink
survives on the own bubble — black is **4.15:1** on the dark page, white is **1.55:1** on the
light page; the ink would have to flip by backdrop. That is the #2417/#2419 mechanism.
`--brand-primary-200` is that alpha composited over white to within `rgb(255,224,130)` vs
`rgb(255,216,125)` — the ruling's own appearance, but opaque and with no dark override.
Ink is `--text-on-fixed-light`, exactly as `AspButton`'s primary does it (#2417).

The inbound fill *keeps* `--surface-card-inner` as the ruling names it, but the **area**
supplies the opaque surface beneath it — that token is a black 30% wash in light and a white
6% wash in dark, opposite polarities, so over an ambient light page it lands at **3.82:1**
with **2.85:1** timestamps. Over the area's own surface it is 13.54:1 / 9.05:1. This makes
`AspChatBubble` a non-standalone component by design: outside an `AspChatArea` it can land
sub-AA, and the known-bad fixture reinstates the literal ruling tokens so the probe fails if
anyone re-simplifies it back.

The contrast matrix renders the area on the light page **and** inside a dark card and asserts
the two measure **identically** — not merely that both clear AA. Both could pass while still
varying with the backdrop, and that variance *is* the defect.

Props (`AspChatArea`): `messages`, `comments`, `order`, `visibleKinds` (`null` disables
filtering), `filterOptions`, `loading`, `streamingId`, `modelValue`, `composerPlaceholder`,
`sendLabel`, `disabled`, `emptyHeading`, `ariaLabel`. Emits `send`, `update:modelValue`,
`update:visibleKinds`. Slot `message` overrides body rendering per entry.

Props (`AspChatBubble`): `kind`, `sender`, `timestamp`, `streaming`.

An empty stream and a stream emptied *by the filters* get different copy — "No messages" in
front of an active filter reads as a bug in the view. The stream is `role="log"` with
`aria-live="polite"`: announced, never interrupting.

### 17. `AspContent` — ✅ shipped

The artifact/report body renderer: a body that arrives as *opaque text* — a markdown report,
a source file, a log dump — and has to render without mangling and without unbounded growth.

Unlike `AspProse`, which styles descendants it is handed pre-rendered, `AspContent` **owns the
parse**. That is the whole distinction, and it follows from the three defects it was filed
against (#2382): fenced code with no highlighting, raw source fed to a markdown parser and
returned as mangled paragraphs, and no `max-height` so a large body grew to the full page
height. All three happen during the render, so styling alone cannot reach them.

Props: `content`, `type` (`auto` | `markdown` | `code` | `text`), `language`, `maxHeight`
(number/CSS length, `null` opts out), `measure`.

`type="auto"` is **biased away from markdown**. Mis-reading source as markdown is the logged
defect — eaten indentation, `*` read as emphasis; mis-reading markdown as source is merely
plain-looking. The costs are not symmetric, so markdown has to be affirmatively evidenced.

Contrast role is **MIXED**: prose *inherits* the ambient ink, fenced code *paints* its own
background and ink. No stock highlight.js theme is vendored — a third-party theme ships a
palette tuned for its own background and would override token ink with colours chosen against
a different surface. The ramp is re-mapped onto DS tokens and every colour is measured against
both resolved code surfaces in `tests/e2e/content.spec.js`.

Raw HTML in the body is **escaped, not passed through**: `marked` has shipped no sanitiser
since v5 and an artifact body is written by an agent or a tool.

`marked` and `highlight.js` are **optional peer dependencies** — the consuming app installs
them. Bundling them tripled the library (85.64 kB → 262.98 kB), which is not a cost every
consumer should pay for one renderer.

### 18. `AspTooltip` — ✅ shipped

The standardized tooltip: a short dark chip explaining the control it hangs off. Promoted out
of Deferred (#2383) — the operator liked the system_3 health page's `[data-tip]` treatment and
asked for it app-wide, and it is the delivery vehicle for the chart-hover x/y reading.

The styling is that health-page chip in tokens; what changed is the *mechanism*. The original
was a `::after` pseudo-element, and the deferral note ("browsers can carry text tooltips for
now") held only while every trigger sat in open layout. A pseudo-element is trapped in its
trigger's overflow and stacking context, so a chip inside a scroller or a card was clipped,
and it has no way to flip, so a chip near a viewport edge ran off screen. The chip is
therefore teleported to `<body>` and positioned in JS against the trigger's rect — once it
lives there, no CSS rule can see where its trigger is, which is why the arithmetic is not a
stylesheet.

Props: `content`, `position` (`top` | `right` | `bottom` | `left`, flips to the opposite side
when there is no room, then slides along the cross axis to stay on screen), `openDelay`,
`disabled`. Slot `content` overrides the `content` prop for rich bodies.

The open delay is **hover-only**. A pointer crossing a row of icons on its way somewhere else
should not fire a chip under each one, but a deliberate Tab is not an accidental traverse, and
making a keyboard user wait reads as broken. Focus opens immediately; `tests/e2e/tooltip.spec.js`
asserts that on a 600 ms trigger so the two paths cannot be confused.

Not a popover. The chip is `pointer-events: none` — it can overlap its own trigger at clamped
edge positions, and eating that hover would flicker it — so it can hold no link or button.
Nor should it hold information that appears nowhere else: hover does not exist on touch.

Contrast role is **PAINTS**: the chip declares `--surface-card`, which is dark in *both*
themes, so it declares `--text-on-dark` rather than inheriting the ambient ink. Inheriting is
the #2415 failure — dark ink on a dark chip, 1:1. The hairline border is mixed from the chip's
own ink; `--surface-card-inner` was the obvious pick and is wrong, being a *darkening* overlay
in the light theme where the edge then vanishes.

## Deferred (not in v0 10)

- `AsTable` — data table. Defer until we redesign a table-heavy surface.
- `AsTabs` — no clear v0 requirement.
- `AsBreadcrumb` — no current use.
- `AsAvatar` — no user-avatar surface today.
- `AsToast` / `AsNotification` — belongs in v1 alongside a global feedback pattern.
- `AspForm` — collection wrapper around `AspInput` + `AspButton` — defer, use composition.
- `AsDropdown` / `AsMenu` — nice-to-have; check if aspirant-client needs it.

## Cross-cutting

**Composables** (in `src/composables/`):
- `useTheme` — light/dark switch, watches `prefers-color-scheme`, persists to localStorage
- `useMobile` — port `checkMobile` + resize logic from `aspirant-client/src/global_state_manager.js`
- `useFocusTrap` — ✅ shipped with `AspModal`; exported from the barrel. Takes a ref to a
  container, confines Tab/Shift-Tab to it, and restores focus to whatever was focused before
  `activate()` (captured at activation, not read at release — by then the trigger may be gone).
  `AspSidebar`'s mobile overlay is the other named candidate, not yet wired.
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
