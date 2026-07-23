<script setup>
import { ref } from 'vue'
import AspSplitPane from '../src/components/AspSplitPane.vue'
import AspList from '../src/components/AspList.vue'
import AspListItem from '../src/components/AspListItem.vue'
import AspCard from '../src/components/AspCard.vue'
import AspHeading from '../src/components/AspHeading.vue'

const ITEMS = [
  { id: 1, label: 'quarterly-revenue.csv', meta: '2.1 MB' },
  { id: 2, label: 'customer-churn.parquet', meta: '18 MB' },
  { id: 3, label: 'signups-by-region.json', meta: '640 KB' },
  { id: 4, label: 'model-eval-runs.csv', meta: '4.4 MB' },
]

// A long list, so the long-scrolling variant has something to scroll.
const LONG = Array.from({ length: 40 }, (_, i) => ({
  id: i + 1,
  label: `row-${String(i + 1).padStart(2, '0')}.dataset`,
  meta: `${(i + 1) * 7} KB`,
}))

// One selection ref per interactive variant, so opening the detail in one does
// not open it in the others.
const pick11 = ref(null)
const pick21 = ref(null)
const pickLong = ref(null)
const pickStack = ref(null)

const select = (state, item) => (state.value = item)
const detailOf = (state) => ITEMS.concat(LONG).find((i) => i.id === state.value) || null
</script>

<template>
  <Story title="Components/AspSplitPane">
    <template #docs>
      <p>
        <strong>Purpose:</strong> the list-plus-detail container
        (<code>docs/COMPONENTS.md</code> §21) — a primary pane the user scans and a secondary pane
        holding the detail for the selected item. Side by side above <code>md</code>, stacked below
        it.
      </p>
      <p>
        <strong>A pane, not a modal or a route</strong> (#2536, §3.22). A modal blocks the list
        being scanned; a route loses the list's scroll position and makes Back the only way home.
        The pane keeps both on screen — which is what "reveal" asks for.
      </p>
      <p>
        <strong>Inheritor (§3.18):</strong> the container paints no background. Each pane's content
        sets its own surface — an <code>AspCard</code> for the secondary here — and separation comes
        from those surfaces and the <code>--border-subtle</code> divider, never from a background
        painted on the container.
      </p>
      <p>
        <strong>Closed, the primary takes the full width</strong> with no reserved gap. Open, the
        two panes split by <code>ratio</code> — a closed set (<code>1:1</code> or <code>2:1</code>),
        because arbitrary widths are how surfaces drift apart.
      </p>
      <p>
        <strong>Not a focus trap.</strong> Both panes stay usable at once, so it does not confine
        Tab. It moves focus into the labelled secondary region on open (so it is announced, not a
        silent DOM insertion) and returns focus to the opener on close. <kbd>Esc</kbd> and the ✕
        both close.
      </p>
    </template>

    <Variant title="Closed — primary full width">
      <div class="sp-demo">
        <AspSplitPane :open="false">
          <template #primary>
            <AspList aria-label="Datasets">
              <AspListItem v-for="i in ITEMS" :key="i.id" :label="i.label" :meta="i.meta" />
            </AspList>
          </template>
        </AspSplitPane>
      </div>
    </Variant>

    <Variant title="Open 1:1">
      <div class="sp-demo">
        <AspSplitPane :open="pick11 !== null" ratio="1:1" @close="pick11 = null">
          <template #primary>
            <AspList variant="interactive" aria-label="Datasets">
              <AspListItem
                v-for="i in ITEMS"
                :key="i.id"
                :label="i.label"
                :meta="i.meta"
                :active="pick11 === i.id"
                @click="select(pick11, i.id)"
              />
            </AspList>
          </template>
          <template #secondary>
            <AspCard>
              <AspHeading :level="2" color="heading">{{ detailOf(pick11)?.label }}</AspHeading>
              <p>Detail for the selected item. Size {{ detailOf(pick11)?.meta }}.</p>
            </AspCard>
          </template>
        </AspSplitPane>
        <p v-if="pick11 === null" class="sp-hint">Pick a row to reveal its detail.</p>
      </div>
    </Variant>

    <Variant title="Open 2:1 — primary-weighted">
      <div class="sp-demo">
        <AspSplitPane :open="pick21 !== null" ratio="2:1" @close="pick21 = null">
          <template #primary>
            <AspList variant="interactive" aria-label="Datasets">
              <AspListItem
                v-for="i in ITEMS"
                :key="i.id"
                :label="i.label"
                :meta="i.meta"
                :active="pick21 === i.id"
                @click="select(pick21, i.id)"
              />
            </AspList>
          </template>
          <template #secondary>
            <AspCard>
              <AspHeading :level="2" color="heading">{{ detailOf(pick21)?.label }}</AspHeading>
              <p>The primary keeps two thirds of the width; the detail takes the last third.</p>
            </AspCard>
          </template>
        </AspSplitPane>
        <p v-if="pick21 === null" class="sp-hint">Pick a row to reveal its detail.</p>
      </div>
    </Variant>

    <Variant title="Long-scrolling primary">
      <p class="sp-note">
        The container is height-bounded, so each pane scrolls on its own. Scroll the list, open a
        row, then close it — the list holds its place.
      </p>
      <div class="sp-demo sp-demo--tall">
        <AspSplitPane :open="pickLong !== null" ratio="1:1" @close="pickLong = null">
          <template #primary>
            <AspList variant="interactive" aria-label="Datasets">
              <AspListItem
                v-for="i in LONG"
                :key="i.id"
                :label="i.label"
                :meta="i.meta"
                :active="pickLong === i.id"
                @click="select(pickLong, i.id)"
              />
            </AspList>
          </template>
          <template #secondary>
            <AspCard>
              <AspHeading :level="2" color="heading">{{ detailOf(pickLong)?.label }}</AspHeading>
              <p>Size {{ detailOf(pickLong)?.meta }}.</p>
            </AspCard>
          </template>
        </AspSplitPane>
      </div>
    </Variant>

    <Variant title="Stacked below md">
      <p class="sp-note">
        Narrow the preview below <code>768px</code> (the responsive control): the row collapses to a
        column, the detail becomes a full-width sheet below the list, and opening it scrolls it into
        view. Mobile-first — this is the base layout, the row is the enhancement.
      </p>
      <div class="sp-demo">
        <AspSplitPane :open="pickStack !== null" @close="pickStack = null">
          <template #primary>
            <AspList variant="interactive" aria-label="Datasets">
              <AspListItem
                v-for="i in ITEMS"
                :key="i.id"
                :label="i.label"
                :meta="i.meta"
                :active="pickStack === i.id"
                @click="select(pickStack, i.id)"
              />
            </AspList>
          </template>
          <template #secondary>
            <AspCard>
              <AspHeading :level="2" color="heading">{{ detailOf(pickStack)?.label }}</AspHeading>
              <p>Below <code>md</code> this card sits under the list, full width.</p>
            </AspCard>
          </template>
        </AspSplitPane>
      </div>
    </Variant>
  </Story>
</template>

<style scoped>
/* The demo box gives the container a bounded height so the ≥md panes can own
   their scroll — a consumer places the split pane in a height-giving cell
   (AspAppShell's main) exactly this way. */
.sp-demo {
  height: 22rem;
  padding: var(--space-md);
  background: var(--surface-page);
}

.sp-demo--tall {
  height: 26rem;
}

.sp-hint,
.sp-note {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.sp-note {
  margin-bottom: var(--space-sm);
}
</style>
