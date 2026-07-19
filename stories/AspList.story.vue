<script setup>
import { ref } from 'vue'
import AspList from '../src/components/AspList.vue'
import AspListItem from '../src/components/AspListItem.vue'
import AspCard from '../src/components/AspCard.vue'

const MESSAGES = [
  { id: 1, label: 'system_3_manager', meta: '2m ago', icon: 'messages' },
  { id: 2, label: 'design_agent', meta: '18m ago', icon: 'messages' },
  { id: 3, label: 'system_3_engineer', meta: '1h ago', icon: 'messages' },
]

const selected = ref(2)
const clicks = ref([])
const onPick = (m) => {
  selected.value = m.id
  clicks.value = [`${m.label} at ${m.meta}`, ...clicks.value].slice(0, 3)
}
</script>

<template>
  <Story title="Components/AspList">
    <template #docs>
      <p>
        <strong>Purpose:</strong> the vertical list primitive
        (<code>docs/COMPONENTS.md</code> §6) — the shape that replaces
        <code>&lt;v-list&gt;</code> on MessageBoardView.
      </p>
      <p>
        <strong>When to use:</strong> a stack of peer rows with an optional leading icon and
        trailing meta. <strong>When not to use:</strong> anything with columns that should align
        across rows — that is <code>AspDataTable</code>.
      </p>
      <p>
        <strong><code>variant</code> and <code>spacing</code> are provided down</strong>, not
        repeated on each item. Every item in a list shares them by definition, so requiring them
        per-item would be a per-call-site opportunity to make them inconsistent — the drift these
        primitives exist to stop.
      </p>
      <p>
        <strong>An interactive row is a real <code>&lt;button&gt;</code></strong> inside the
        <code>&lt;li&gt;</code>, not an <code>&lt;li&gt;</code> carrying
        <code>tabindex</code> and a keydown handler. <code>AspDataTable</code> does the latter
        because a <code>&lt;tr&gt;</code> cannot contain a row-spanning button without breaking
        table semantics; a list has no such constraint, so it gets the element that already has
        Enter <em>and</em> Space, the right implicit role, and real
        <code>disabled</code> semantics.
      </p>
      <p>
        <strong>Selection is a bar and a weight, not a background tint.</strong> Amber behind text
        is the #2419 trap (<code>AspSelect</code> hit exactly it). A neutral tint was no safer:
        the first version used <code>currentColor 6%</code> and the contrast matrix measured the
        row's muted meta at <strong>4.49:1</strong> — under AA by a hundredth, because
        <code>--text-muted</code> is already 80% of the ink and has no margin to spend.
        <code>aria-current</code> carries the state for assistive tech, so it is not colour-only.
      </p>
    </template>

    <Variant title="Default">
      <AspList aria-label="Agents">
        <AspListItem v-for="m in MESSAGES" :key="m.id" :label="m.label" :meta="m.meta" />
      </AspList>
    </Variant>

    <Variant title="Divided">
      <AspList variant="divided" aria-label="Agents">
        <AspListItem v-for="m in MESSAGES" :key="m.id" :label="m.label" :meta="m.meta" />
      </AspList>
    </Variant>

    <Variant title="Interactive (keyboard-operable, with selection)">
      <AspList variant="interactive" aria-label="Message board">
        <AspListItem
          v-for="m in MESSAGES"
          :key="m.id"
          :label="m.label"
          :meta="m.meta"
          :icon="m.icon"
          :active="selected === m.id"
          @click="onPick(m)"
        />
        <AspListItem label="retired_agent" meta="never" disabled />
      </AspList>
      <p class="note">
        Tab to a row, Enter or Space to pick it. Last clicked:
        <code>{{ clicks[0] ?? '—' }}</code>
      </p>
    </Variant>

    <Variant title="Spacing scale">
      <div class="row">
        <AspList v-for="s in ['sm', 'md', 'lg']" :key="s" variant="divided" :spacing="s">
          <AspListItem :label="`spacing ${s}`" meta="meta" />
          <AspListItem :label="`spacing ${s}`" meta="meta" />
        </AspList>
      </div>
    </Variant>

    <Variant title="On a dark card (inherits the card's ink)">
      <AspCard>
        <AspList variant="interactive" aria-label="Agents on a card">
          <AspListItem
            v-for="m in MESSAGES"
            :key="m.id"
            :label="m.label"
            :meta="m.meta"
            :active="selected === m.id"
          />
        </AspList>
      </AspCard>
    </Variant>

    <Variant title="Slot content instead of `label`">
      <AspList variant="divided" aria-label="Tasks">
        <AspListItem meta="in_progress">
          <strong>#2377</strong> — AspList + AspListItem
        </AspListItem>
        <AspListItem meta="done"> <strong>#2376</strong> — AspTypography </AspListItem>
      </AspList>
    </Variant>

    <Variant title="Dark theme">
      <div data-theme="dark" class="dark-pane">
        <AspList variant="divided" aria-label="Agents">
          <AspListItem v-for="m in MESSAGES" :key="m.id" :label="m.label" :meta="m.meta" />
        </AspList>
      </div>
    </Variant>
  </Story>
</template>

<style scoped>
.row {
  display: flex;
  gap: var(--space-lg);
  align-items: flex-start;
}

.dark-pane {
  padding: var(--space-lg);
  background: var(--surface-page);
}

.note {
  margin-top: var(--space-sm);
  font-size: var(--text-sm);
  color: var(--text-muted);
}
</style>
