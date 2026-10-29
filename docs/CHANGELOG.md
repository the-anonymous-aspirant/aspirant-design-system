# Changelog

Changes to `@aspirant/design-system` that a consumer can see. Consumers pin a
commit of `main`, so entries are listed under the change that introduces them,
newest first. Each entry names the design ruling it implements.

## Unreleased

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
