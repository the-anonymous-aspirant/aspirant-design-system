<script setup>
// Folds in the former Foundations/Typography showcase (task #2376 acceptance):
// the webfont/token verification variants now sit alongside the components that
// enforce the same scale, so there is one place to look rather than two that
// can disagree.
import AspHeading from '../src/components/AspHeading.vue'
import AspProse from '../src/components/AspProse.vue'
import AspCard from '../src/components/AspCard.vue'

const rows = [
  { agent: 'aspirant_engineer', tasks: 12, actions: 384, p95_ms: 128 },
  { agent: 'system_3_engineer', tasks: 7, actions: 2951, p95_ms: 43 },
  { agent: 'system_3_manager', tasks: 3, actions: 1207, p95_ms: 17 },
  { agent: 'design_agent', tasks: 5, actions: 89, p95_ms: 512 },
]

const LEVELS = [1, 2, 3, 4, 5, 6]
</script>

<template>
  <Story title="Foundations/Typography">
    <template #docs>
      <p>
        <strong>Purpose:</strong> <code>AspHeading</code> and <code>AspProse</code> enforce the
        type scale so per-view drift cannot start. Also verifies the Iosevka webfont registers and
        that <code>--font-family-base</code> / <code>--font-family-mono</code> resolve.
      </p>
      <p>
        <strong><code>level</code> and <code>size</code> are independent, deliberately.</strong>
        Document outline and visual hierarchy genuinely disagree — a card's title is an
        <code>&lt;h2&gt;</code> in the page outline while reading smaller than the
        <code>&lt;h1&gt;</code> above it. Coupling them pushes authors into choosing a level for
        its font size, which is how heading outlines get broken (WCAG 1.3.1 / 2.4.6).
      </p>
      <p>
        <strong>Colour options are surface-derived, with one named exception.</strong>
        <code>inherit</code> (the default) and <code>muted</code> take the ambient ink and are
        correct on any surface. <code>heading</code> is the signature amber and is
        <strong>for card surfaces only</strong> — it measures 5.60:1 on
        <code>--surface-card</code> and 1.41:1 on the light page (#2419).
      </p>
      <p>
        There is deliberately <strong>no <code>body</code> option</strong>. It was in the first
        draft; the contrast matrix measured it at <strong>1:1 on a dark card</strong> in the light
        theme, because <code>--text-body</code> is an absolute dark ink. <code>inherit</code>
        already yields the body ink on any correctly-set surface, so it was redundant as well as
        unsafe.
      </p>
      <p>
        <strong>Prose tints derive from the ink, not from a surface token.</strong> Inline code,
        code blocks and rules were first drawn on <code>--surface-card-inner</code>, which is
        <code>rgba(255,255,255,0.06)</code> — a white wash that <em>lightens</em> every surface,
        including the light page, where it pushed the chip toward the ink and measured 3.8:1.
        Mixing <code>currentColor</code> follows the surface's polarity instead. Prose links are
        blue per corpus §1.3, but not raw <code>--text-hint</code> (#82b1ff measures 1.71:1 on the
        light page) — same <code>color-mix</code> resolution as <code>AspButton</code>'s ghost
        label, with the accent ramp.
      </p>
    </template>

    <Variant title="Heading levels (semantic tag follows level)">
      <div class="pane">
        <AspHeading v-for="l in LEVELS" :key="l" :level="l"> Heading level {{ l }} </AspHeading>
      </div>
    </Variant>

    <Variant title="Level and size decoupled">
      <div class="pane">
        <AspHeading :level="2" size="base">
          An h2 sized `base` — correct outline, quiet visual
        </AspHeading>
        <AspHeading :level="4" size="2xl">
          An h4 sized `2xl` — loud visual, still an h4
        </AspHeading>
      </div>
    </Variant>

    <Variant title="Colours (inherit / muted / signature amber on a card)">
      <div class="pane">
        <AspHeading :level="3">inherit — safe on any surface</AspHeading>
        <AspHeading :level="3" color="muted">muted — derives from the ambient ink</AspHeading>
      </div>
      <AspCard>
        <AspHeading :level="3" color="heading">signature amber — card surfaces only</AspHeading>
      </AspCard>
    </Variant>

    <Variant title="Alignment">
      <div class="pane">
        <AspHeading :level="3" align="start">start</AspHeading>
        <AspHeading :level="3" align="center">center</AspHeading>
        <AspHeading :level="3" align="end">end</AspHeading>
      </div>
    </Variant>

    <Variant title="Prose — long-form">
      <div class="pane">
        <AspProse>
          <AspHeading :level="2">Prose spacing comes from the token scale</AspHeading>
          <p>
            Body copy at <code>--text-base</code> with
            <code>--font-line-height-relaxed</code>. The measure caps at
            <code>70ch</code>, which tracks the font's own advance width, so it stays about
            seventy characters at every step of the scale.
          </p>
          <p>
            Rhythm uses one margin direction only. Mixing top and bottom margins is what produces
            the double-gap-here / no-gap-there drift this component exists to prevent, and it is
            the reason <code>AspHeading</code> ships no margin of its own.
          </p>
          <ul>
            <li>List items sit on the same rhythm</li>
            <li>with a tighter gap between siblings</li>
          </ul>
          <blockquote>
            A quote carries a rule as well as italics, so it still reads as a quote without
            colour.
          </blockquote>
          <pre><code>const tint = 'color-mix(in srgb, currentColor 10%, transparent)'</code></pre>
          <p>
            A <a href="#">link</a> is blue and underlined — the underline carries it if the colour
            cannot.
          </p>
        </AspProse>
      </div>
    </Variant>

    <Variant title="Prose on a dark card (inherits the card's ink)">
      <AspCard>
        <AspProse size="sm">
          <p>
            The same component on the opposite polarity. It sets no colour and no background, so
            the ink follows the card, and the <code>inline code</code> tint follows the ink.
          </p>
          <p>A <a href="#">link here</a> derives from this surface too.</p>
        </AspProse>
      </AspCard>
    </Variant>

    <Variant title="Prose sizes">
      <div class="pane">
        <AspProse size="sm"><p>sm — dense surfaces, secondary copy.</p></AspProse>
        <AspProse><p>base — the default for long-form reading.</p></AspProse>
        <AspProse size="lg"><p>lg — lead paragraphs and empty-state copy.</p></AspProse>
      </div>
    </Variant>

    <Variant title="Weight ladder (regular / medium / bold)">
      <div class="pane weights">
        <div style="font-weight: var(--font-weight-regular)">
          400 — regular — the quick brown fox jumps over the lazy dog
        </div>
        <div style="font-weight: var(--font-weight-medium)">
          500 — medium — the quick brown fox jumps over the lazy dog
        </div>
        <div style="font-weight: var(--font-weight-bold)">
          700 — bold — the quick brown fox jumps over the lazy dog
        </div>
      </div>
    </Variant>

    <Variant title="Tabular data (Iosevka's home turf)">
      <div class="pane">
        <table class="specimen-table">
          <thead>
            <tr>
              <th>agent</th>
              <th class="num">tasks</th>
              <th class="num">actions</th>
              <th class="num">p95_ms</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.agent">
              <td>{{ r.agent }}</td>
              <td class="num">{{ r.tasks }}</td>
              <td class="num">{{ r.actions }}</td>
              <td class="num">{{ r.p95_ms }}</td>
            </tr>
          </tbody>
        </table>
        <p class="note">
          Every character occupies one grid cell, so digits align by column without
          <code>font-variant-numeric: tabular-nums</code>.
        </p>
      </div>
    </Variant>

    <Variant title="Character sample">
      <div class="pane sample">
        <div>ABCDEFGHIJKLMNOPQRSTUVWXYZ</div>
        <div>abcdefghijklmnopqrstuvwxyz</div>
        <div>0123456789 !@#$%^&amp;*()_+-=[]{}</div>
        <div>Il1 O0 rn m ,. :; -_ +&lt;=&gt;</div>
      </div>
    </Variant>

    <Variant title="Dark theme">
      <div data-theme="dark" class="pane">
        <AspHeading :level="2">Iosevka on dark ground</AspHeading>
        <AspProse>
          <p>
            The same tokens under <code>[data-theme='dark']</code> —
            <code>--surface-page</code> remaps to <code>#1a1a1a</code>. The typeface is unchanged;
            only the ground swaps, and every derived colour follows it.
          </p>
        </AspProse>
      </div>
    </Variant>
  </Story>
</template>

<style scoped>
.pane {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-lg);
  background: var(--surface-page);
  font-family: var(--font-family-base);
}

.weights {
  gap: var(--space-xs);
}

.sample {
  font-size: var(--text-lg);
  line-height: var(--font-line-height-relaxed);
}

.specimen-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.specimen-table th,
.specimen-table td {
  padding: var(--space-xs) var(--space-sm);
  text-align: left;
  border-bottom: 1px solid var(--border-subtle);
}

.specimen-table th {
  font-weight: var(--font-weight-medium);
}

.specimen-table .num {
  text-align: right;
}

.note {
  font-size: var(--text-sm);
  color: var(--text-muted);
}
</style>
