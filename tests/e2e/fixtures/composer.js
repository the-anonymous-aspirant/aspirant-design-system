// Two AspComposer mounts side by side, to prove the §3.62 leading-controls slot:
//
//   #plain   no slot content — must render byte-identical to the pre-slot
//            composer (a lone right-aligned Send, no leading container in the DOM).
//   #slotted a ghost "+ artifact" trigger fills the leading-controls slot — it
//            must sit LEFT of Send and not disturb Send's right edge.
//
// `#sent` counts `send` emissions so the spec can prove the slot did not break
// the primary submit path.
import { createApp, h, ref } from 'vue'

import '../../../build/tokens.css'
import { AspButton, AspChatArea, AspComposer } from '../../../src/index.js'

createApp({
  setup() {
    const plainDraft = ref('')
    const slottedDraft = ref('')
    const sent = ref(0)

    // #3112 attachments state. Every mount below keeps its own draft and its own
    // array, because the parent owns both.
    const unboundDraft = ref('')
    const emptyDraft = ref('')
    const filledDraft = ref('')
    const emptyAttachments = ref([])
    const filledAttachments = ref([
      { key: 'f1', name: 'screenshot.png', meta: '412 KB', status: 'done' },
      { key: 'f2', name: 'rows.csv', meta: 'uploading 40%', status: 'uploading' },
    ])
    const chatAttachments = ref([{ key: 'c1', name: 'from-chat.png', meta: '2 KB', status: 'done' }])
    const attachEvents = ref(0)
    const chatAttachEvents = ref(0)
    const removeEvents = ref(0)
    const lastAttached = ref('')
    const lastRemoved = ref('')
    const lastSentText = ref('')

    return () =>
      h('div', { style: 'padding:24px; display:flex; flex-direction:column; gap:24px; max-width:480px' }, [
        // Plain mount — the empty-slot control. No leading-controls slot passed.
        h('div', { id: 'plain' }, [
          h(AspComposer, {
            modelValue: plainDraft.value,
            'onUpdate:modelValue': (v) => (plainDraft.value = v),
            onSend: () => (sent.value += 1),
            placeholder: 'Plain composer…',
          }),
        ]),

        // Slotted mount — a ghost trigger in the leading-controls slot.
        h('div', { id: 'slotted' }, [
          h(
            AspComposer,
            {
              modelValue: slottedDraft.value,
              'onUpdate:modelValue': (v) => (slottedDraft.value = v),
              onSend: () => (sent.value += 1),
              placeholder: 'Slotted composer…',
            },
            {
              'leading-controls': () =>
                h(AspButton, { id: 'add-artifact', variant: 'ghost', type: 'button' }, () => '+ artifact'),
            }
          ),
        ]),

        h('output', { id: 'sent' }, String(sent.value)),

        // --- attachments (#3112) ---------------------------------------------
        // #attach-unbound  attachments NOT bound — must render no paperclip, no
        //                  strip, and no leading container at all.
        // #attach-empty    bound to [] — paperclip present, strip ABSENT.
        // #attach-filled   bound to entries — one chip each; ✕ removes through
        //                  the parent's array, proving the round trip.
        h('div', { id: 'attach-unbound' }, [
          h(AspComposer, {
            modelValue: unboundDraft.value,
            'onUpdate:modelValue': (v) => (unboundDraft.value = v),
            placeholder: 'Unbound composer…',
          }),
        ]),

        h('div', { id: 'attach-empty' }, [
          h(AspComposer, {
            modelValue: emptyDraft.value,
            'onUpdate:modelValue': (v) => (emptyDraft.value = v),
            attachments: emptyAttachments.value,
            'onUpdate:attachments': (v) => (emptyAttachments.value = v),
            onAttach: (files) => {
              attachEvents.value += 1
              lastAttached.value = files.map((f) => f.name).join(',')
              emptyAttachments.value = [
                ...emptyAttachments.value,
                ...files.map((f, i) => ({
                  key: `picked-${emptyAttachments.value.length + i}`,
                  name: f.name,
                  meta: `${f.size} B`,
                  status: 'pending',
                })),
              ]
            },
            onSend: () => (sent.value += 1),
            placeholder: 'Empty-bound composer…',
          }),
        ]),

        h('div', { id: 'attach-filled' }, [
          h(AspComposer, {
            modelValue: filledDraft.value,
            'onUpdate:modelValue': (v) => (filledDraft.value = v),
            attachments: filledAttachments.value,
            'onUpdate:attachments': (v) => (filledAttachments.value = v),
            onRemove: (entry) => {
              removeEvents.value += 1
              lastRemoved.value = entry?.name ?? ''
            },
            onSend: (text) => {
              sent.value += 1
              lastSentText.value = text
            },
            placeholder: 'Filled composer…',
          }),
        ]),

        h('output', { id: 'attach-events' }, String(attachEvents.value)),
        h('output', { id: 'last-attached' }, lastAttached.value),
        h('output', { id: 'remove-events' }, String(removeEvents.value)),
        h('output', { id: 'last-removed' }, lastRemoved.value),
        h('output', { id: 'last-sent-text' }, lastSentText.value),

        // AspChatArea WITHOUT `attachments` — proves the forward is opt-in on
        // the conversation surface too.
        h('div', { id: 'chat-attach-unbound' }, [
          h(AspChatArea, {
            modelValue: '',
            messages: [],
            composerPosition: 'top',
            composerPlaceholder: 'Chat attach unbound…',
          }),
        ]),

        // AspChatArea WITH `attachments` — proves the prop and the events reach
        // the embedded composer at the `bottom` position as well as `top`.
        h('div', { id: 'chat-attach-bound' }, [
          h(AspChatArea, {
            modelValue: '',
            messages: [],
            composerPosition: 'bottom',
            composerPlaceholder: 'Chat attach bound…',
            attachments: chatAttachments.value,
            'onUpdate:attachments': (v) => (chatAttachments.value = v),
            onAttach: (files) => {
              chatAttachEvents.value += 1
              lastAttached.value = files.map((f) => f.name).join(',')
            },
          }),
        ]),

        h('output', { id: 'chat-attach-events' }, String(chatAttachEvents.value)),

        // AspChatArea WITHOUT a composer-leading slot — proves the forward is
        // opt-in: the embedded composer must have no leading container.
        h('div', { id: 'chat-plain' }, [
          h(AspChatArea, {
            modelValue: '',
            messages: [],
            composerPosition: 'top',
            composerPlaceholder: 'Chat plain…',
          }),
        ]),

        // AspChatArea WITH a composer-leading slot — proves the forward reaches
        // the embedded composer's leading-controls slot.
        h('div', { id: 'chat-slotted' }, [
          h(
            AspChatArea,
            {
              modelValue: '',
              messages: [],
              composerPosition: 'top',
              composerPlaceholder: 'Chat slotted…',
            },
            {
              'composer-leading': () =>
                h(AspButton, { id: 'chat-add-artifact', variant: 'ghost', type: 'button' }, () => '+ artifact'),
            }
          ),
        ]),
      ])
  },
}).mount('#app')
