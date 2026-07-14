<script setup>
// Fake data for the tabular-figures demo — the point is that a monospace
// face aligns columns naturally without needing font-variant-numeric.
const rows = [
  { agent: 'aspirant_engineer', tasks: 12, actions: 384, p95_ms: 128 },
  { agent: 'system_3_engineer', tasks: 7,  actions: 2951, p95_ms: 43 },
  { agent: 'system_3_manager', tasks: 3,  actions: 1207, p95_ms: 17 },
  { agent: 'design_agent',     tasks: 5,  actions: 89,  p95_ms: 512 },
]
</script>

<template>
  <Story
    title="Foundations/Typography"
    :layout="{ type: 'single', iframe: false }"
  >
    <template #docs>
      <p><strong>Purpose:</strong> Verify the Iosevka webfont registers and that <code>--font-family-base</code> / <code>--font-family-mono</code> resolve to it across body, headings, and tabular data.</p>
      <p><strong>Fallback chain:</strong> <code>Iosevka, "Iosevka Web", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace</code> — first paint stays on the system-mono chain while <code>font-display: swap</code> awaits the woff2.</p>
    </template>

    <Variant title="Type scale + weights">
      <div style="font-family: var(--font-family-base); color: var(--text-on-light); background: var(--surface-page); padding: var(--space-lg); max-width: 720px;">
        <h1 style="font-size: var(--text-3xl); line-height: var(--font-line-height-tight); font-weight: var(--font-weight-bold); margin: 0 0 var(--space-md);">Terminal-native headings</h1>
        <h2 style="font-size: var(--text-2xl); line-height: var(--font-line-height-tight); font-weight: var(--font-weight-bold); margin: 0 0 var(--space-md);">The typeface is Iosevka</h2>
        <h3 style="font-size: var(--text-xl); line-height: var(--font-line-height-tight); font-weight: var(--font-weight-medium); margin: 0 0 var(--space-sm);">Medium weight — subheads</h3>

        <p style="font-size: var(--text-base); line-height: var(--font-line-height-normal); font-weight: var(--font-weight-regular); margin: 0 0 var(--space-md);">
          Body text at <code>--text-base</code> (1rem) with <code>--font-line-height-normal</code>. Every character occupies one grid cell — the same grid the monospaced code around it uses. The 0 is slashed, the l is unambiguous, and the digits align by column without <code>font-variant-numeric: tabular-nums</code>.
        </p>

        <p style="font-size: var(--text-sm); line-height: var(--font-line-height-normal); color: var(--text-muted); margin: 0 0 var(--space-md);">
          Small text at <code>--text-sm</code> (0.85rem) — muted for meta lines and captions. Contrast against <code>--surface-page</code> holds at WCAG AA (7.02:1 for <code>--text-on-light</code>; 4.72:1 for <code>--text-muted</code>).
        </p>

        <p style="font-size: var(--text-xs); line-height: var(--font-line-height-normal); color: var(--text-muted); margin: 0;">
          Extra-small at <code>--text-xs</code> (0.75rem) — tags, timestamps, unit suffixes.
        </p>
      </div>
    </Variant>

    <Variant title="Weight ladder (regular / medium / bold)">
      <div style="font-family: var(--font-family-base); color: var(--text-on-light); background: var(--surface-page); padding: var(--space-lg); display: grid; gap: var(--space-sm);">
        <div style="font-weight: var(--font-weight-regular);">400 — regular — the quick brown fox jumps over the lazy dog</div>
        <div style="font-weight: var(--font-weight-medium);">500 — medium — the quick brown fox jumps over the lazy dog</div>
        <div style="font-weight: var(--font-weight-bold);">700 — bold — the quick brown fox jumps over the lazy dog</div>
      </div>
    </Variant>

    <Variant title="Tabular data (Iosevka's home turf)">
      <div style="font-family: var(--font-family-base); color: var(--text-on-light); background: var(--surface-page); padding: var(--space-lg);">
        <table style="width: 100%; border-collapse: collapse; font-size: var(--text-sm);">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-subtle);">
              <th style="text-align: left; padding: var(--space-xs) var(--space-sm); font-weight: var(--font-weight-medium);">agent</th>
              <th style="text-align: right; padding: var(--space-xs) var(--space-sm); font-weight: var(--font-weight-medium);">tasks</th>
              <th style="text-align: right; padding: var(--space-xs) var(--space-sm); font-weight: var(--font-weight-medium);">actions</th>
              <th style="text-align: right; padding: var(--space-xs) var(--space-sm); font-weight: var(--font-weight-medium);">p95_ms</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.agent" style="border-bottom: 1px solid var(--border-subtle);">
              <td style="padding: var(--space-xs) var(--space-sm);">{{ r.agent }}</td>
              <td style="text-align: right; padding: var(--space-xs) var(--space-sm);">{{ r.tasks }}</td>
              <td style="text-align: right; padding: var(--space-xs) var(--space-sm);">{{ r.actions }}</td>
              <td style="text-align: right; padding: var(--space-xs) var(--space-sm);">{{ r.p95_ms }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Variant>

    <Variant title="Character sample">
      <div style="font-family: var(--font-family-base); color: var(--text-on-light); background: var(--surface-page); padding: var(--space-lg);">
        <div style="font-size: var(--text-lg); font-weight: var(--font-weight-regular); line-height: var(--font-line-height-relaxed);">
          <div>ABCDEFGHIJKLMNOPQRSTUVWXYZ</div>
          <div>abcdefghijklmnopqrstuvwxyz</div>
          <div>0123456789 !@#$%^&amp;*()_+-=[]{}</div>
          <div>Il1 O0 rn m ,. :; -_ +&lt;=&gt;</div>
        </div>
      </div>
    </Variant>

    <Variant title="Dark theme">
      <div data-theme="dark" style="font-family: var(--font-family-base); color: var(--text-on-light); background: var(--surface-page); padding: var(--space-lg);">
        <h2 style="font-size: var(--text-2xl); font-weight: var(--font-weight-bold); margin: 0 0 var(--space-sm);">Iosevka on dark ground</h2>
        <p style="font-size: var(--text-base); line-height: var(--font-line-height-normal); margin: 0;">
          The same tokens under <code>[data-theme='dark']</code> — <code>--surface-page</code> remaps to <code>#1a1a1a</code>, <code>--text-on-light</code> to <code>#e0e0e0</code>. The typeface is unchanged; only the ground swaps.
        </p>
      </div>
    </Variant>
  </Story>
</template>
