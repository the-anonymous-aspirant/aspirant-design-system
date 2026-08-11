<script setup>
import { ref } from 'vue'
import AspTextarea from '../src/components/AspTextarea.vue'

const text = ref('')
const filled = ref('Restart the pipeline after the migration lands, then confirm the health page is green.')
const growing = ref('')

const LOREM =
  'Line one of a long description.\nLine two adds detail.\nLine three keeps going.\nLine four.\nLine five.\nLine six.\nLine seven.\nLine eight.\nLine nine.\nLine ten.\nLine eleven — past the default 10-row cap, so this scrolls internally instead of growing further.'
</script>

<template>
  <Story title="Components/AspTextarea">
    <template #docs>
      <p>
        <strong>Purpose:</strong> the multi-line field-editor primitive (system_3 #3677),
        extracted out of the raw <code>&lt;textarea&gt;</code> that used to live trapped inside
        <code>AspComposer</code>. A task description, an artifact body, any long-form text entry.
      </p>
      <p>
        <strong>When to use:</strong> any multi-line text entry that is not a chat/comment
        composer — for that grammar (Enter-to-send, attachments), use <code>AspComposer</code>,
        which now composes this primitive internally.
      </p>
      <p>
        <strong>When not to use:</strong> single-line entry — use <code>AspInput</code>.
      </p>
      <p>
        <strong>Enter behaviour:</strong> always inserts a newline. This component never
        intercepts Enter — that semantic belongs to whatever composes it (see
        <code>AspComposer</code>'s Enter-to-send).
      </p>
      <p>
        <strong>Auto-grow:</strong> grows with content from the <code>rows</code> floor (default
        3) up to the <code>maxRows</code> ceiling (default 10), then scrolls internally.
      </p>
    </template>

    <Variant title="Default">
      <AspTextarea v-model="text" label="Task description" placeholder="Describe the task" />
      <p style="margin-top: 8px; color: var(--text-muted)">Value: {{ text || '(empty)' }}</p>
    </Variant>

    <Variant title="Filled + hint">
      <AspTextarea v-model="filled" label="Notes" hint="Visible to every assignee." />
    </Variant>

    <Variant title="Required">
      <AspTextarea v-model="text" label="Rationale" required placeholder="Why this change" />
    </Variant>

    <Variant title="Error">
      <AspTextarea
        model-value=""
        label="Rationale"
        required
        error="Rationale is required before submitting."
      />
    </Variant>

    <Variant title="Disabled">
      <div style="display: flex; flex-direction: column; gap: 12px">
        <AspTextarea model-value="" label="Empty + disabled" placeholder="Unavailable" disabled />
        <AspTextarea
          model-value="Locked notes from the pipeline."
          label="Filled + disabled"
          hint="Set by the pipeline."
          disabled
        />
      </div>
    </Variant>

    <Variant title="Auto-grow (type or paste past 10 rows)">
      <AspTextarea
        v-model="growing"
        label="Long-form body"
        hint="Grows to a max of 10 rows, then scrolls internally."
      />
      <button type="button" style="margin-top: 8px" @click="growing = LOREM">
        Fill with 11 lines
      </button>
    </Variant>

    <Variant title="Custom rows / maxRows">
      <AspTextarea
        model-value=""
        label="Short field, low ceiling"
        placeholder="rows=2, maxRows=4"
        :rows="2"
        :max-rows="4"
      />
    </Variant>

    <Variant title="Dark theme">
      <div
        data-theme="dark"
        style="
          padding: 24px;
          background: var(--surface-page);
          display: flex;
          flex-direction: column;
          gap: 16px;
        "
      >
        <AspTextarea model-value="" label="Task description" placeholder="Describe the task" />
        <AspTextarea
          model-value="Restart the pipeline after the migration lands."
          label="Notes"
          hint="Visible to every assignee."
        />
        <AspTextarea
          model-value=""
          label="Rationale"
          error="Rationale is required before submitting."
        />
        <AspTextarea model-value="Locked notes." label="Filled + disabled" disabled />
      </div>
    </Variant>

    <Variant title="Unstyled structure">
      <p style="color: var(--text-muted); margin-bottom: 12px">
        Label / control / message order is semantic, so the field stays usable if component
        styles fail to load.
      </p>
      <AspTextarea model-value="Value" label="Label renders above" error="Message renders below." />
    </Variant>
  </Story>
</template>
