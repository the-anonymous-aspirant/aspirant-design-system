// Three modals plus the page content they overlay:
//
//   #open-main   a dismissible dialog with two footer buttons and a text input,
//                so Tab cycling has something to cycle between
//   #open-sticky a `dismissible: false` dialog, to prove Esc and scrim are inert
//   #open-bare   a dialog with no focusable content at all, which is the case
//                the trap's container fallback exists for
//
// `#behind` is a focusable control OUTSIDE every dialog. If the trap leaks, Tab
// reaches it — that assertion is the whole point of putting it here. The tall
// spacer gives the document a scrollbar so the scroll-lock is observable.
import { createApp, h, ref } from 'vue'

import '../../../build/tokens.css'
import { AspButton, AspInput, AspModal } from '../../../src/index.js'

createApp({
  setup() {
    const main = ref(false)
    const sticky = ref(false)
    const bare = ref(false)
    const text = ref('')
    const closes = ref(0)

    const countClose = () => (closes.value += 1)

    return () =>
      h('div', { style: 'padding:24px' }, [
        h(AspButton, { id: 'open-main', onClick: () => (main.value = true) }, () => 'Open main'),
        h(AspButton, { id: 'open-sticky', onClick: () => (sticky.value = true) }, () => 'Open sticky'),
        h(AspButton, { id: 'open-bare', onClick: () => (bare.value = true) }, () => 'Open bare'),
        h('button', { id: 'behind', type: 'button' }, 'behind the dialog'),
        h('output', { id: 'closes' }, String(closes.value)),
        // Forces a document scrollbar so `overflow: hidden` on <body> is visible
        // to a scrollTo assertion.
        h('div', { id: 'spacer', style: 'height:300vh' }),

        h(
          AspModal,
          {
            open: main.value,
            'onUpdate:open': (v) => (main.value = v),
            onClose: countClose,
            title: 'Main dialog',
          },
          {
            default: () => [h(AspInput, { id: 'field', label: 'Title', modelValue: text.value })],
            footer: () => [
              h(AspButton, { id: 'cancel', variant: 'ghost', onClick: () => (main.value = false) }, () => 'Cancel'),
              h(AspButton, { id: 'confirm', variant: 'primary', onClick: () => (main.value = false) }, () => 'Confirm'),
            ],
          }
        ),

        h(
          AspModal,
          {
            open: sticky.value,
            'onUpdate:open': (v) => (sticky.value = v),
            onClose: countClose,
            title: 'Sticky dialog',
            dismissible: false,
          },
          { default: () => h('p', null, 'Must be answered.') }
        ),

        h(
          AspModal,
          {
            open: bare.value,
            'onUpdate:open': (v) => (bare.value = v),
            onClose: countClose,
            title: 'Bare dialog',
            showClose: false,
          },
          { default: () => h('p', null, 'Nothing focusable in here.') }
        ),
      ])
  },
}).mount('#app')
