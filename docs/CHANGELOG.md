# Changelog

Changes to `@aspirant/design-system` that a consumer can see. Consumers pin a
commit of `main`, so entries are listed under the change that introduces them,
newest first. Each entry names the design ruling it implements.

## Unreleased

- **24px minimum targets on DS controls; AspBackButton keeps its own box**
  (`system_3_design_conventions.md` §3.99 Tier 1, §3.119 decision 5; task #9139).
  - `AspButton size="sm"` (and so `AspFreshness`'s trigger), the `AspDataTable`
    sort button and the `AspBadge` remove × now clear 24 × 24px. The badge pill
    keeps its size.
  - `AspBackButton` no longer stretches across a column flex parent.

- **No `[object Object]` reveal; meaningful hovers through AspTooltip**
  (`system_3_design_conventions.md` §3.119 R6; task #9138).
  - `AspDataTable`: a truncated cell's `title` comes from a column's
    `title(row)`, or else is a scalar's text or an object's compact JSON.
  - `AspBadge`'s legend and `AspTimeSince`'s absolute instant show in
    `AspTooltip` instead of a native `title`. The badge is described through
    `aria-describedby`, with no new tab stop.
  - A link in a collapsed `AspSidebar` rail shows its label in a tooltip on
    hover and focus, and keeps it as its accessible name.
  - **Consumer note.** In these cases the component's root is now an
    `.asp-tooltip-anchor` wrapper: `AspBadge` with a `legend`, `AspTimeSince`
    with a readable instant, and `AspSidebarLink` in a collapsed rail. A passed
    `class` (and every other attribute) still lands on the inner element.
    Vue puts your scoped `data-v-*` attribute on the root, though, so:
    - a scoped rule `.my-class { … }` on that class stops matching. Write
      `:deep(.my-class)` under a route-owned ancestor instead.
    - layout properties on that class (flex or grid item sizing, truncation)
      no longer reach the item, because the anchor is the item now. Put them
      on a route-owned wrapper around the component.
    - `AspTimeSince` already sets `--text-muted`. A consumer colour rule
      re-applied through a wrapper mixes the muted ink twice; use
      `:deep(.time-since) { color: inherit }` there.
    - a badge already inside your own `AspTooltip` now opens two tooltips.
      Pass that text as `legend` and drop the outer tooltip.
    (Found adopting this on the system_3 console, #9145.)

- **AspDataTable: alignment modifiers win; a content-sized breakdown table**
  (`system_3_design_conventions.md` §3.119 R4; task #9136).
  - `align: 'right' | 'center'` now applies to the header and every cell. The
    base `text-align: left` used to outrank the modifiers, so declared alignment
    did nothing.
  - The new `fit: 'fill' | 'content'` (default `fill`): `content` sizes a
    breakdown table to its columns, so a figure sits beside its label.

- **AspContent: a markdown link's colour yields to the setter rule**
  (`system_3_design_conventions.md` §3.119 decision 4; task #9137). The link
  colour moved under `:where()`, which compiles to zero specificity, so a
  consumer's rule decides: in the console, a markdown link inside a card now
  takes the card's link ink like any other link there. With no consumer rule,
  the DS formula still applies.

- **One shell breakpoint; a hidden sidebar sheds its shadow**
  (`system_3_design_conventions.md` §3.119 decision 2; task #9135).
  - `useMobile()` now defaults to `(max-width: 767.98px)`. The bound is exported
    once as `SHELL_BREAKPOINT_PX`, `SHELL_MOBILE_QUERY` and `SHELL_DESKTOP_QUERY`.
    At exactly 768px the shell used to show neither the rail nor the menu.
  - A hidden off-canvas sidebar no longer casts its shadow into the page.

- **AspComposer: the field resolves its fill and ink against its setter**
  (`system_3_design_conventions.md` §3.119 decision 3; task #9134).
  - On the page, the field is now the page field `AspInput` and `AspTextarea`
    use. It used to paint the dark-card treatment there: #9f9f9f with white
    text at 2.64:1.
  - Inside an `AspCard` (except the transparent ghost variant), the field keeps
    the card fill and ink, and gains an edge mixed from the card ink.
  - The new `surface: 'auto' | 'page' | 'card'` forces either treatment.

- **AspDataTable: phone card list, column roles and an identity floor**
  (`system_3_design_conventions.md` §3.119, which extends §3.114 D6; task #9133).
  - Below a 640px container, a table of more than three columns renders one card
    per row, with the identity top-left, the figure top-right and the rest as
    label-value pairs. This is the default for every consumer.
  - A homogeneous matrix opts out with the new `narrow="scroll"`, which keeps
    today's sideways scroll and edge fade.
  - Columns take an optional `role: 'identity' | 'figure' | 'secondary'`.
  - At 640px and wider, a declared identity keeps a 24ch floor. If that would
    push the table sideways, the widest secondary columns truncate by exactly
    the overflow. A table that declares no roles is unchanged at those widths.
