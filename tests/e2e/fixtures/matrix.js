// Renders every component on every surface, using the library exactly as a
// consumer would. This is the page the contrast spec asserts must be clean.
import { createApp } from 'vue'

import '../../../build/tokens.css'
import { injectProbeCss, shell } from './specimens.js'

createApp({ render: () => shell() }).mount('#app')
injectProbeCss()
