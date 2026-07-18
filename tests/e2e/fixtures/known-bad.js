// The control. Identical to the real matrix, plus a stylesheet that reinstates
// the exact defects #2415 fixed.
//
// This exists because a probe that has only ever agreed with us has not been
// tested. Three separate probe defects were found while building it -- one of
// them reported a regression that contradicted sound reasoning and would have
// reverted a correct fix if trusted. Asserting that the probe FAILS here, on
// every run, is what makes its passing verdict on matrix.html mean anything.
import { createApp } from 'vue'

import '../../../build/tokens.css'
import { injectProbeCss, shell } from './specimens.js'

createApp({ render: () => shell() }).mount('#app')
injectProbeCss()

// Each rule below is a defect that actually shipped, restored verbatim.
const broken = document.createElement('style')
broken.textContent = `
  /* #2416: content hardcoded an absolute ink and rendered its text in exactly
     its own background colour on a dark card -- measured 1:1. */
  .data-table { color: var(--text-on-light) !important; }
  .empty-state__heading { color: var(--text-on-light) !important; }
  .field__label { color: var(--text-on-light) !important; }

  /* #2418: an absolute muted grey cannot clear AA on surfaces of opposite
     polarity; the best possible grey reaches only 2.80:1. */
  .data-table__caption,
  .empty-state__message { color: #6c757d !important; }

  /* #2419: raw brand amber as label ink on a light surface -- 1.41:1. */
  .btn--ghost { color: var(--brand-primary) !important; }
`
document.head.appendChild(broken)
