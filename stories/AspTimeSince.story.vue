<script setup>
import AspTimeSince from '../src/components/AspTimeSince.vue'
import AspDataTable from '../src/components/AspDataTable.vue'
import AspCard from '../src/components/AspCard.vue'

// Fixed so the story reads the same on every open — a live clock would make
// the documented values drift away from the prose describing them.
const NOW = Date.parse('2026-07-19T12:00:00.000Z')
const at = (s) => new Date(NOW + s * 1000).toISOString()

const BOUNDARIES = [
  { s: 0, note: 'zero' },
  { s: 45, note: 'seconds' },
  { s: 59, note: 'last second before the minute boundary' },
  { s: 60, note: 'first minute' },
  { s: 3599, note: 'last minute before the hour boundary' },
  { s: 3600, note: 'first hour' },
  { s: 86399, note: 'last hour before the day boundary' },
  { s: 86400, note: 'first day' },
  { s: 9 * 86400, note: 'days' },
]

const COLUMNS = [
  { key: 'task', label: 'Task' },
  { key: 'lane', label: 'Time in lane' },
  { key: 'seen', label: 'Last seen' },
]
const ROWS = [
  { task: '#2379', lane: 1320, seen: -120 },
  { task: '#2378', lane: 5400, seen: -3600 },
  { task: '#2377', lane: 91000, seen: -86400 * 2 },
]
</script>

<template>
  <Story title="Components/AspTimeSince">
    <template #docs>
      <p>
        <strong>Purpose:</strong> one component for every "how long" read on the frontend
        (system_3 #2272) — freshness, time-in-lane, cron next-fire.
      </p>
      <p>
        <strong>Format rule (exact):</strong> single largest unit, floored —
        <code>&lt;60s → Xs</code>, <code>&lt;60m → Xm</code>, <code>&lt;24h → Xh</code>, else
        <code>Xd</code>. <strong>Never compound.</strong> <code>1h 22m</code> reads as prose;
        <code>1h</code> reads as a terminal field, and these sit in dense columns that have to
        scan (§2.7). A formatter that grows a second unit "just for the near cases" breaks the
        alignment it exists to keep.
      </p>
      <p>
        <strong>Renders a <code>&lt;time&gt;</code></strong> with a real
        <code>datetime</code> attribute, so the machine-readable instant is in the DOM rather
        than only in a tooltip. The <code>title</code> carries the full ISO string.
      </p>
      <p>
        <strong>Two edge cases decided rather than left to chance.</strong> A countdown past its
        instant reads <code>due</code>, not <code>next -3m</code> — negative time in a cron table
        is worse than useless. A missing or unparseable instant renders an em dash with an
        accessible label, so a table column keeps its shape and the gap reads as "no value"
        rather than as a layout bug.
      </p>
      <p>
        <strong>Live re-tick scales with magnitude</strong> — 1s while the reading is seconds
        old, then a minute, then an hour. A table of 200 nine-day-old timestamps must not wake
        the main thread 200 times a second to redraw text that changes daily. It re-arms a
        <code>setTimeout</code> each tick rather than fixing an interval at mount, because the
        correct cadence changes as the reading ages.
      </p>
      <p>
        <code>now</code> is injectable for tests and SSR: a component that reads the wall clock
        internally cannot be asserted at a boundary, and would hydrate against a different second
        than it rendered on. These variants use it so the documented values stay put.
      </p>
    </template>

    <Variant title="The three variants">
      <div class="pane rows">
        <div><AspTimeSince :datetime="at(-120)" :now="NOW" /> <span class="cap">elapsed</span></div>
        <div>
          <AspTimeSince variant="duration" :datetime="at(-1320)" :now="NOW" />
          <span class="cap">duration</span>
        </div>
        <div>
          <AspTimeSince variant="countdown" :datetime="at(180)" :now="NOW" />
          <span class="cap">countdown</span>
        </div>
      </div>
    </Variant>

    <Variant title="Every boundary in the rule">
      <div class="pane rows">
        <div v-for="b in BOUNDARIES" :key="b.s">
          <AspTimeSince variant="duration" :seconds="b.s" :now="NOW" />
          <span class="cap">{{ b.s }}s — {{ b.note }}</span>
        </div>
      </div>
    </Variant>

    <Variant title="Decided edge cases">
      <div class="pane rows">
        <div>
          <AspTimeSince variant="countdown" :datetime="at(-180)" :now="NOW" />
          <span class="cap">countdown past its instant — "due", not negative time</span>
        </div>
        <div>
          <AspTimeSince :datetime="at(300)" :now="NOW" />
          <span class="cap">future instant under `elapsed` — stays truthful</span>
        </div>
        <div>
          <AspTimeSince :datetime="null" :now="NOW" />
          <span class="cap">missing instant — em dash keeps the column shape</span>
        </div>
        <div>
          <AspTimeSince datetime="not a date" :now="NOW" />
          <span class="cap">unparseable — same fallback</span>
        </div>
      </div>
    </Variant>

    <Variant title="In a table (the shape it was built for)">
      <div class="pane">
        <AspDataTable :columns="COLUMNS" :rows="ROWS">
          <template #cell-lane="{ row }">
            <AspTimeSince variant="duration" :seconds="row.lane" :now="NOW" />
          </template>
          <template #cell-seen="{ row }">
            <AspTimeSince :datetime="at(row.seen)" :now="NOW" />
          </template>
        </AspDataTable>
        <p class="note">
          Tabular figures keep the column from going ragged as values tick.
        </p>
      </div>
    </Variant>

    <Variant title="Live (re-ticks against the real clock)">
      <div class="pane rows">
        <div><AspTimeSince :datetime="new Date().toISOString()" live /> <span class="cap">live elapsed</span></div>
      </div>
      <p class="note">The only variant without an injected <code>now</code> — watch it count.</p>
    </Variant>

    <Variant title="On a dark card">
      <AspCard>
        <AspTimeSince :datetime="at(-7200)" :now="NOW" />
      </AspCard>
    </Variant>

    <Variant title="Dark theme">
      <div data-theme="dark" class="pane rows">
        <div><AspTimeSince :datetime="at(-120)" :now="NOW" /> <span class="cap">elapsed</span></div>
      </div>
    </Variant>
  </Story>
</template>

<style scoped>
.pane {
  padding: var(--space-lg);
  background: var(--surface-page);
  font-family: var(--font-family-base);
}

.rows {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.cap {
  margin-left: var(--space-sm);
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.note {
  margin-top: var(--space-sm);
  font-size: var(--text-sm);
  color: var(--text-muted);
}
</style>
