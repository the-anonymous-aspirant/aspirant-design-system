<script setup>
import AspButton from '../src/components/AspButton.vue'
import AspCard from '../src/components/AspCard.vue'
import AspTooltip from '../src/components/AspTooltip.vue'

const LONG =
  'Median time from a task entering in_progress to its PR merging, over the ' +
  'trailing 7 days. Tasks still open are excluded from the median.'
</script>

<template>
  <Story title="Components/AspTooltip">
    <template #docs>
      <p>
        <strong>Purpose:</strong> the standardized tooltip — a short dark chip explaining the
        control it is attached to. It is the app-wide promotion of the system_3 health page's
        <code>[data-tip]</code> treatment, which the operator asked to standardize.
      </p>
      <p>
        <strong>When to use:</strong> a metric definition behind a <code>?</code>, the full text of
        a truncated cell, the meaning of an icon-only button, the x/y reading under a chart hover.
        <strong>When not to use:</strong> anything the user must act on or select from — a tooltip
        is <code>pointer-events: none</code> and cannot hold a link or a button. That is a popover,
        and it is a different component. Do not put essential information here that appears nowhere
        else: hover is unavailable on touch.
      </p>
      <p>
        <strong>Contrast role: PAINTS.</strong> The chip declares <code>--surface-card</code>, which
        is dark in <em>both</em> themes, so it declares <code>--text-on-dark</code> as its ink
        rather than inheriting the ambient one. That is why it looks identical in light and dark —
        it is the same surface either way, and the light/dark variants below exist to prove it
        rather than to show a difference.
      </p>
      <p>
        <strong>Why it is teleported.</strong> The original was a
        <code>::after</code> pseudo-element, which is trapped in its trigger's overflow and stacking
        context and cannot flip away from a viewport edge. The chip renders on
        <code>&lt;body&gt;</code> and is positioned in JS against the trigger's rect, so it escapes
        clipping ancestors and can flip and slide to stay on screen. See the edge variants.
      </p>
      <p>
        <strong>Accessibility.</strong> Hover <em>and</em> keyboard focus open it, and the anchor
        carries <code>aria-describedby</code> while it is up, so a screen reader announces the chip
        as the description of the focused control. Esc dismisses without moving focus. The open
        delay applies to hover only — a deliberate Tab is not an accidental traverse.
      </p>
    </template>

    <Variant title="Default (top)">
      <AspCard>
        <div class="row">
          <AspTooltip content="Tasks merged in the last 7 days.">
            <AspButton>Throughput</AspButton>
          </AspTooltip>
        </div>
      </AspCard>
    </Variant>

    <Variant title="Positions">
      <AspCard>
        <div class="grid">
          <AspTooltip
            v-for="p in ['top', 'right', 'bottom', 'left']"
            :key="p"
            :content="`Opens to the ${p}.`"
            :position="p"
          >
            <AspButton variant="ghost">{{ p }}</AspButton>
          </AspTooltip>
        </div>
        <p class="note">
          Each button prefers the side it is labelled with. Narrow the Histoire pane until one of
          them runs out of room — it flips to the opposite side rather than being clipped.
        </p>
      </AspCard>
    </Variant>

    <Variant title="Long content wraps">
      <AspCard>
        <div class="row">
          <AspTooltip :content="LONG">
            <AspButton variant="ghost">Cycle time ?</AspButton>
          </AspTooltip>
        </div>
        <p class="note">Capped at 16rem and wrapped, matching the health-page chip.</p>
      </AspCard>
    </Variant>

    <Variant title="Rich content slot">
      <AspCard>
        <div class="row">
          <AspTooltip position="right">
            <AspButton variant="ghost">Chart point</AspButton>
            <template #content>
              <strong>2026-07-18</strong>
              <div>14 merged · 3 open</div>
            </template>
          </AspTooltip>
        </div>
        <p class="note">
          The <code>content</code> slot carries the P8 chart-hover x/y reading. Keep it to text —
          the chip cannot receive the pointer.
        </p>
      </AspCard>
    </Variant>

    <Variant title="Edge flip">
      <AspCard>
        <div class="edges">
          <AspTooltip
            content="Prefers the left, but there is no room — it flips right."
            position="left"
          >
            <AspButton variant="ghost">at the left edge</AspButton>
          </AspTooltip>
          <AspTooltip
            content="Prefers the top, but there is no room — it flips down."
            position="top"
          >
            <AspButton variant="ghost">at the top edge</AspButton>
          </AspTooltip>
        </div>
      </AspCard>
    </Variant>

    <Variant title="Keyboard only">
      <AspCard>
        <div class="row">
          <AspButton variant="ghost">before</AspButton>
          <AspTooltip content="Reached by Tab, dismissed by Esc.">
            <AspButton variant="ghost">Tab to me</AspButton>
          </AspTooltip>
          <AspButton variant="ghost">after</AspButton>
        </div>
        <p class="note">
          Tab into the middle button without touching the mouse: the chip appears immediately, with
          no open delay. Esc hides it and focus stays put.
        </p>
      </AspCard>
    </Variant>

    <Variant title="Disabled">
      <AspCard>
        <div class="row">
          <AspTooltip content="You should never see this." disabled>
            <AspButton variant="ghost">No tooltip</AspButton>
          </AspTooltip>
        </div>
        <p class="note">
          For call sites that only sometimes have something to say — a truncated cell that happens
          to fit, say — without unwrapping the trigger.
        </p>
      </AspCard>
    </Variant>

    <Variant title="Inside a clipping ancestor">
      <AspCard>
        <div class="clipper">
          <AspTooltip content="Rendered on <body>, so the scroller cannot clip it.">
            <AspButton variant="ghost">In an overflow:hidden box</AspButton>
          </AspTooltip>
        </div>
        <p class="note">
          The regression this component was filed for. A <code>::after</code> chip would be cut off
          at the box edge.
        </p>
      </AspCard>
    </Variant>

    <Variant title="Light and dark">
      <div class="light-pane">
        <AspCard>
          <div class="row">
            <AspTooltip content="The chip is the same dark surface in both themes.">
              <AspButton variant="ghost">light theme</AspButton>
            </AspTooltip>
          </div>
        </AspCard>
      </div>
      <div data-theme="dark" class="dark-pane">
        <AspCard>
          <div class="row">
            <AspTooltip content="The chip is the same dark surface in both themes.">
              <AspButton variant="ghost">dark theme</AspButton>
            </AspTooltip>
          </div>
        </AspCard>
      </div>
    </Variant>
  </Story>
</template>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-md);
}

.grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-md);
  justify-content: center;
  padding: var(--space-xl) 0;
}

/* Pushes its triggers hard against the viewport edges so the flip is visible
   without resizing the pane. */
.edges {
  display: flex;
  justify-content: space-between;
  margin: 0 calc(var(--space-md) * -1);
}

.clipper {
  max-height: 5rem;
  overflow: hidden;
  padding: var(--space-md);
  border: 1px dashed var(--text-muted);
  border-radius: var(--radius-md);
}

.dark-pane,
.light-pane {
  padding: var(--space-lg);
  background: var(--surface-page);
}

.note {
  margin: var(--space-sm) 0 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
}
</style>
