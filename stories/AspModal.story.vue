<script setup>
import { ref } from 'vue'
import AspModal from '../src/components/AspModal.vue'
import AspButton from '../src/components/AspButton.vue'
import AspInput from '../src/components/AspInput.vue'
import AspSelect from '../src/components/AspSelect.vue'

const basic = ref(false)
const withFooter = ref(false)
const sm = ref(false)
const md = ref(false)
const lg = ref(false)
const fullscreen = ref(false)
const sticky = ref(false)
const long = ref(false)
const bodyOnly = ref(false)
const nestedOuter = ref(false)
const nestedInner = ref(false)
const dark = ref(false)

const taskTitle = ref('')
const assignee = ref('engineer')
const ASSIGNEES = [
  { value: 'engineer', label: 'system_3_engineer' },
  { value: 'manager', label: 'system_3_manager' },
  { value: 'designer', label: 'design_agent' },
]

const paragraphs = Array.from(
  { length: 12 },
  (_, i) => `Paragraph ${i + 1} — body content long enough to scroll inside the panel.`
)
</script>

<template>
  <Story title="Components/AspModal">
    <template #docs>
      <p>
        <strong>Purpose:</strong> the overlay dialog (<code>docs/COMPONENTS.md</code> §8) for
        create-task, edit and confirm flows.
      </p>
      <p>
        <strong>When to use:</strong> a short, focused task that must be finished or abandoned
        before the page underneath is useful again — confirm a destructive action, fill one small
        form. <strong>When not to use:</strong> anything long enough to need its own scroll
        context and back-button behaviour (that is a page), or a passive message (that is a toast,
        unbuilt).
      </p>
      <p>
        <strong>Teleported to <code>&lt;body&gt;</code>.</strong> A dialog authored inside a card
        or any ancestor with <code>overflow: hidden</code>, <code>transform</code> or
        <code>filter</code> would be clipped or positioned against that ancestor rather than the
        viewport — and its call sites are exactly that shape.
      </p>
      <p>
        <strong>Surface note.</strong> The panel sits on <code>--surface-card</code>, which is
        <em>dark even in the light theme</em>, so it sets its own ink
        (<code>--text-on-dark</code>) instead of inheriting the ambient one; the title takes the
        same amber as <code>AspCard</code>. Children inherit from the panel. This is the
        distinction behind #2415: a component that sets a background must set the ink with it.
      </p>
      <p>
        <strong>Mobile is the base, not an override.</strong> Below the <code>md</code> breakpoint
        every size is a full-screen sheet; the sized, centred, rounded dialog appears from 768px
        up via <code>min-width</code>. Narrow the Histoire viewport to see it.
      </p>
      <p>
        <strong>Keyboard and focus:</strong> focus enters the panel on open and returns to the
        trigger on close; Tab cycles inside the dialog and cannot reach the page behind it; Esc
        closes when <code>dismissible</code>. Clicking the scrim closes only when the press both
        starts and ends there, so a text selection dragged out of the panel does not discard a
        draft. Body scroll is locked while open (ref-counted, so nesting works).
      </p>
    </template>

    <Variant title="Default">
      <AspButton @click="basic = true">Open dialog</AspButton>
      <AspModal v-model:open="basic" title="Dialog title">
        <p>Body content goes in the default slot.</p>
      </AspModal>
    </Variant>

    <Variant title="With footer (create-task)">
      <AspButton @click="withFooter = true">New task</AspButton>
      <AspModal v-model:open="withFooter" title="Create task">
        <div class="form">
          <AspInput v-model="taskTitle" label="Title" placeholder="What needs doing" />
          <AspSelect v-model="assignee" label="Assignee" :options="ASSIGNEES" />
        </div>
        <template #footer>
          <AspButton variant="ghost" @click="withFooter = false">Cancel</AspButton>
          <AspButton variant="primary" @click="withFooter = false">Create</AspButton>
        </template>
      </AspModal>
    </Variant>

    <Variant title="Sizes">
      <div class="row">
        <AspButton @click="sm = true">sm</AspButton>
        <AspButton @click="md = true">md</AspButton>
        <AspButton @click="lg = true">lg</AspButton>
        <AspButton @click="fullscreen = true">fullscreen</AspButton>
      </div>
      <AspModal v-model:open="sm" size="sm" title="Small">
        <p>24rem cap — confirm dialogs.</p>
      </AspModal>
      <AspModal v-model:open="md" size="md" title="Medium">
        <p>34rem cap — the default, sized for a short form.</p>
      </AspModal>
      <AspModal v-model:open="lg" size="lg" title="Large">
        <p>48rem cap — a form with two columns, or a table preview.</p>
      </AspModal>
      <AspModal v-model:open="fullscreen" size="fullscreen" title="Fullscreen">
        <p>Sheet geometry at every width.</p>
      </AspModal>
    </Variant>

    <Variant title="Non-dismissible (must answer)">
      <AspButton variant="secondary" @click="sticky = true">Delete branch…</AspButton>
      <AspModal v-model:open="sticky" size="sm" title="Delete branch?" :dismissible="false">
        <p>Esc and scrim clicks do nothing here — the choice has to be made explicitly.</p>
        <template #footer>
          <AspButton variant="ghost" @click="sticky = false">Cancel</AspButton>
          <AspButton variant="primary" @click="sticky = false">Delete</AspButton>
        </template>
      </AspModal>
    </Variant>

    <Variant title="Scrolling body">
      <AspButton @click="long = true">Open long dialog</AspButton>
      <AspModal v-model:open="long" title="Long body">
        <p v-for="p in paragraphs" :key="p">{{ p }}</p>
        <template #footer>
          <AspButton variant="primary" @click="long = false">Done</AspButton>
        </template>
      </AspModal>
    </Variant>

    <Variant title="No focusable content">
      <AspButton @click="bodyOnly = true">Open message</AspButton>
      <AspModal v-model:open="bodyOnly" title="Nothing to focus" :show-close="false">
        <p>
          No close button, no controls. The panel itself takes focus
          (<code>tabindex="-1"</code>) so Tab cannot walk out into the page behind it. Esc still
          closes.
        </p>
      </AspModal>
    </Variant>

    <Variant title="Nested (scroll-lock is ref-counted)">
      <AspButton @click="nestedOuter = true">Open outer</AspButton>
      <AspModal v-model:open="nestedOuter" title="Edit task">
        <p>Closing the inner dialog must not restore page scrolling while this one is still up.</p>
        <template #footer>
          <AspButton variant="ghost" @click="nestedOuter = false">Close</AspButton>
          <AspButton variant="primary" @click="nestedInner = true">Delete…</AspButton>
        </template>
      </AspModal>
      <AspModal v-model:open="nestedInner" size="sm" title="Delete task?">
        <p>Confirm the destructive step.</p>
        <template #footer>
          <AspButton variant="ghost" @click="nestedInner = false">Cancel</AspButton>
          <AspButton variant="primary" @click="nestedInner = false">Delete</AspButton>
        </template>
      </AspModal>
    </Variant>

    <Variant title="Dark theme">
      <div data-theme="dark" class="dark-pane">
        <AspButton @click="dark = true">Open dialog</AspButton>
        <AspModal v-model:open="dark" title="Dialog title">
          <p>
            The panel is teleported to <code>&lt;body&gt;</code>, so it reads the
            <em>document</em> theme, not this pane's. In a real app the theme lives on
            <code>:root</code> and the two agree; a scoped <code>data-theme</code> like this one
            is a story artefact.
          </p>
        </AspModal>
      </div>
    </Variant>
  </Story>
</template>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.dark-pane {
  padding: var(--space-lg);
  background: var(--surface-page);
}
</style>
