<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { formatTimeSince, tickInterval, toMillis } from '../utils/time_since.js'

// AspTimeSince — one component for every "how long" read on the frontend
// (system_3 #2272). Renders a <time> element, so the machine-readable instant
// is in the DOM rather than only in a tooltip.
//
// The format rule itself lives in src/utils/time_since.js as a pure function:
// it is exact arithmetic with four boundaries, and it is far better asserted
// directly at every boundary than inferred from a rendered string.

const props = defineProps({
  /** The reference instant: ISO string, Date, or epoch ms. */
  datetime: { type: [String, Number, Date], default: null },
  /**
   * Explicit magnitude in seconds, for `duration` readings that are already a
   * length rather than a pair of instants (time-in-lane arriving pre-computed).
   * Takes precedence over `datetime` when both are given.
   */
  seconds: { type: Number, default: null },
  variant: {
    type: String,
    default: 'elapsed',
    validator: (v) => ['elapsed', 'duration', 'countdown'].includes(v),
  },
  /** Re-render as the reading goes stale. */
  live: { type: Boolean, default: false },
  /**
   * Inject the current instant. For tests and SSR — a component that reads the
   * wall clock internally cannot be asserted at a boundary, and would hydrate
   * against a different second than it rendered on.
   */
  now: { type: [Number, Date], default: null },
})

const millis = computed(() => toMillis(props.datetime))
const injectedNow = computed(() => toMillis(props.now))

// Only consulted when `now` is not injected.
const clock = ref(Date.now())

const reading = computed(() =>
  formatTimeSince({
    variant: props.variant,
    millis: millis.value,
    seconds: props.seconds,
    now: injectedNow.value ?? clock.value,
  })
)

// --- live re-tick ------------------------------------------------------------

let timer = null

const stop = () => {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

// setTimeout re-armed each tick rather than setInterval: the correct cadence
// changes as the reading ages (1s while it is seconds old, then a minute, then
// an hour), and an interval fixed at mount would keep the fast rate forever.
const schedule = () => {
  stop()
  if (!props.live || injectedNow.value != null) return
  const delay = tickInterval(reading.value?.seconds ?? 0)
  timer = setTimeout(() => {
    clock.value = Date.now()
    schedule()
  }, delay)
}

onMounted(schedule)
onBeforeUnmount(stop)
watch(() => [props.live, props.datetime, props.seconds, props.variant], schedule)
</script>

<template>
  <time
    v-if="reading"
    class="time-since"
    :datetime="reading.iso || undefined"
    :title="reading.iso || undefined"
  >
    {{ reading.text }}
  </time>
  <!-- An unparseable or absent instant renders an em dash rather than an empty
       cell, so a table column keeps its shape and the gap reads as "no value"
       rather than as a layout bug. -->
  <span v-else class="time-since time-since--empty" aria-label="no timestamp">—</span>
</template>

<style scoped>
/*
 * Sets no background, so it inherits the ambient ink; --text-muted derives from
 * currentColor (#2418), which keeps it legible on the light page and on a dark
 * card alike.
 */
.time-since {
  font-family: var(--font-family-base);
  font-size: var(--text-xs);
  color: var(--text-muted);
  white-space: nowrap;
  /* These sit in table columns; a proportional reading would make the column
     ragged as the value ticks. */
  font-variant-numeric: tabular-nums;
}
</style>
