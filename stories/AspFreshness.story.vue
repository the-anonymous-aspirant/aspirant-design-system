<script setup>
import { ref } from 'vue'

import AspFreshness from '../src/components/AspFreshness.vue'
import AspCard from '../src/components/AspCard.vue'

// Fixed so the story reads the same on every open — a live clock would make the
// documented values drift away from the prose describing them. The interactive
// variant is the one exception: it omits `now` so you can watch a real cycle.
const NOW = Date.parse('2026-07-19T12:00:00.000Z')
const at = (s) => new Date(NOW + s * 1000).toISOString()

// Interactive demo: the caller owns the fetch. Clicking refresh flips `pending`,
// then resolves to either a new timestamp (success) or the `failed` glyph while
// keeping the prior timestamp — the contract the component enforces.
const lastAt = ref(new Date(Date.now() - 8 * 60 * 1000).toISOString())
const pending = ref(false)
const failed = ref(false)
const failNext = ref(false)

function onRefresh() {
  pending.value = true
  failed.value = false
  setTimeout(() => {
    pending.value = false
    if (failNext.value) {
      // Failure: DO NOT advance lastAt — the displayed time keeps last-known-good.
      failed.value = true
    } else {
      lastAt.value = new Date().toISOString()
    }
  }, 900)
}
</script>

<template>
  <Story title="Components/AspFreshness">
    <template #docs>
      <p>
        <strong>Purpose:</strong> one owned control for every "last updated + refresh" read
        (system_3 #3015). It composes <code>AspTimeSince</code> with an icon-only refresh
        trigger so every surface renders the pairing identically — the inconsistency the
        operator asked to remove was each caller assembling spacing/order/button-variant itself.
      </p>
      <p>
        <strong>Presentational.</strong> It emits <code>refresh</code> and expects the
        <em>caller</em> to run the fetch and toggle <code>pending</code>/<code>failed</code> +
        update <code>last-successful-at</code>. It does not own the fetch (every surface's data
        source differs) — it owns the display contract, matching the DS "primitives don't know
        about app data" boundary.
      </p>
      <p>
        <strong>The prop is named <code>last-successful-at</code>, not <code>datetime</code></strong>,
        to make the contract unmissable: a caller MUST NOT advance it optimistically before a
        refresh resolves. A failed refresh keeps the prior value, so the displayed time never
        claims data the fetch did not actually return.
      </p>
      <p>
        <strong>States are the component's job.</strong> <code>pending</code> reuses
        <code>AspButton</code>'s spinner/disabled machinery (no new spinner, reduced-motion
        inherited). <code>failed</code> is a small in-place warning glyph — never a toast or
        blocking banner — that keeps the last-known timestamp and auto-clears on the next
        success. It is suppressed while a retry is pending so the operator is never told
        "failed" and "loading" at once.
      </p>
    </template>

    <Variant title="Interactive (the caller owns the fetch)">
      <div class="pane rows">
        <AspFreshness
          :last-successful-at="lastAt"
          :pending="pending"
          :failed="failed"
          @refresh="onRefresh"
        />
        <label class="cap">
          <input v-model="failNext" type="checkbox">
          make the next refresh fail (watch the timestamp stay put + the glyph appear)
        </label>
      </div>
    </Variant>

    <Variant title="Normal">
      <div class="pane">
        <AspFreshness :last-successful-at="at(-480)" :now="NOW" />
      </div>
    </Variant>

    <Variant title="Pending (spinner on the trigger, disabled)">
      <div class="pane">
        <AspFreshness :last-successful-at="at(-480)" :now="NOW" pending />
      </div>
    </Variant>

    <Variant title="Failed (warning glyph, timestamp unchanged)">
      <div class="pane rows">
        <AspFreshness :last-successful-at="at(-480)" :now="NOW" failed />
        <p class="note">
          The time still reads <code>8m ago</code> — the same value a successful control would
          show for this instant. A failed refresh never blanks or advances it.
        </p>
      </div>
    </Variant>

    <Variant title="Long-idle (coarse magnitude, no forced 'stale' styling)">
      <div class="pane">
        <AspFreshness :last-successful-at="at(-3 * 3600)" :now="NOW" />
      </div>
    </Variant>

    <Variant title="No label (icon + time only)">
      <div class="pane">
        <AspFreshness :last-successful-at="at(-480)" :now="NOW" label="" />
      </div>
    </Variant>

    <Variant title="On a dark AspCard">
      <AspCard>
        <AspFreshness :last-successful-at="at(-480)" :now="NOW" />
        <AspFreshness :last-successful-at="at(-480)" :now="NOW" failed />
      </AspCard>
    </Variant>

    <Variant title="Dark theme">
      <div data-theme="dark" class="pane rows">
        <AspFreshness :last-successful-at="at(-480)" :now="NOW" />
        <AspFreshness :last-successful-at="at(-480)" :now="NOW" pending />
        <AspFreshness :last-successful-at="at(-480)" :now="NOW" failed />
      </div>
    </Variant>
  </Story>
</template>

<style scoped>
.pane {
  padding: var(--space-lg);
  /* Surface-setter (§3.18): bg + ink declared together — the color-mix failure
     glyph derives from this currentColor, so the ink must match the surface. */
  background: var(--surface-page);
  color: var(--text-body);
  font-family: var(--font-family-base);
}
.rows {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  align-items: flex-start;
}
.cap {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2xs);
  font-size: var(--text-xs);
  color: var(--text-muted);
}
.note {
  margin-top: var(--space-sm);
  font-size: var(--text-sm);
  color: var(--text-muted);
}
</style>
