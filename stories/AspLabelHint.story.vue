<script setup>
import AspCard from '../src/components/AspCard.vue'
import AspInput from '../src/components/AspInput.vue'
import AspLabelHint from '../src/components/AspLabelHint.vue'
import AspSelect from '../src/components/AspSelect.vue'

const OPTIONS = [
  { value: 'bank', label: 'Banküberweisung (Bank transfer)' },
  { value: 'cash', label: 'Bar (Cash)' },
]
</script>

<template>
  <Story title="Components/AspLabelHint">
    <template #docs>
      <p>
        <strong>Purpose:</strong> the "?" beside a field label that answers "what does this field
        mean?" in one line (system_3 #9927, #10033). AspInput, AspTextarea and AspSelect render it
        for <code>labelHint</code>; a plain label (a <code>&lt;dt&gt;</code>, a caption) uses it
        directly.
      </p>
      <p>
        <strong>Tap, not only hover.</strong> It is a <code>&lt;button&gt;</code> beside the label,
        never inside it: inside <code>&lt;label for&gt;</code> a tap focused the field instead. A
        tap opens the hint and focuses nothing in the field; a second tap, a tap elsewhere or Esc
        closes it. Keyboard focus opens it too. <code>aria-expanded</code> and
        <code>aria-controls</code> follow the tooltip.
      </p>
      <p>
        <strong>Hit area.</strong> The visible mark is a 14px circle; the target is larger without
        moving anything: 44px wide below 768px and 24px from 768px up, from 11px above the label row
        to the top of the control. It sits under every control, so a control always wins its own
        tap, even with no gap between fields. Put it in a row with
        <code>position: relative; display: flex; align-items: center</code>, after the label.
      </p>
      <p>
        <strong>Contrast role: INHERITS.</strong> The mark's ink is <code>--text-muted</code>, which
        is <code>currentColor</code>-based, so it follows the setter it sits on, as the label does.
      </p>
    </template>

    <Variant title="On the page">
      <div style="display: grid; gap: 16px; max-width: 320px">
        <AspInput
          label="Issue date"
          label-hint="The day you issue the invoice. It is set when you press Issue."
          model-value=""
        />
        <AspSelect
          label="Method"
          label-hint="How the money came in."
          :options="OPTIONS"
          :model-value="null"
        />
      </div>
    </Variant>

    <Variant title="On a dark card">
      <AspCard>
        <div style="display: grid; gap: 16px; max-width: 320px">
          <AspInput
            label="Steuernummer (Tax number)"
            label-hint="Your tax number from the Finanzamt. Printed on every invoice."
            model-value=""
          />
          <AspSelect
            label="Method"
            label-hint="How the money came in."
            :options="OPTIONS"
            :model-value="null"
          />
        </div>
      </AspCard>
    </Variant>

    <Variant title="Beside a plain label">
      <dl style="max-width: 320px">
        <div style="position: relative; display: flex; align-items: center">
          <dt>Issue date</dt>
          <AspLabelHint
            label="Issue date"
            content="The day you issue the invoice. It is set when you press Issue."
          />
        </div>
        <dd style="margin: 4px 0 0">2026-11-05</dd>
      </dl>
    </Variant>
  </Story>
</template>
