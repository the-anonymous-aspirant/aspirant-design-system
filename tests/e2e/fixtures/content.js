// Specimens for the three logged defects of #2382, one per mount point.
//
// RAW_SOURCE is the load-bearing one. Every line of it is chosen to be
// something a markdown parser would MANGLE: a leading `#` it would promote to a
// heading, `*.yaml` it would read as emphasis, and four-space indentation it
// would swallow into an implicit code block. A gentler fixture (plain prose
// with no markdown metacharacters) would render identically under both paths
// and prove nothing about which one ran.
import { createApp, h } from 'vue'

import '../../../build/tokens.css'
import { AspContent } from '../../../src/index.js'

// Exercises every token class the ramp assigns a colour to, so the contrast
// assertions have something to measure in each one. A snippet that happened to
// contain only keywords and strings would leave the other rules unmeasured and
// let a sub-AA colour ship in a class no fixture reached.
const FENCED = [
  'Body copy above the fence, which inherits the surface.',
  '',
  '```python',
  '# a comment, for the comment rule',
  'import asyncio',
  '',
  '',
  'class Probe:',
  '    """A docstring."""',
  '',
  '    RETRIES = 3',
  '    ENABLED = True',
  '',
  '    def run(self, url: str) -> bool:',
  '        label = "a string literal"',
  '        return asyncio.run(fetch(url, timeout=2.5))',
  '```',
].join('\n')

const RAW_SOURCE = [
  '# module: probe_runner',
  '# NOTE: the * below is a glob, not emphasis',
  '',
  'DEFAULTS = {',
  '    "timeout": 2.5,',
  '    "globs": ["*.yaml", "*.yml"],',
  '}',
].join('\n')

const LONG_BODY = Array.from(
  { length: 80 },
  (_, i) => `## Section ${i + 1}\n\nParagraph ${i + 1} of a deliberately long body.\n`
).join('\n')

// A fence carrying no language hint. Rendered unhighlighted rather than
// guessed at: hljs.highlightAuto mis-grammars short snippets, and a wrong
// grammar mis-colours code that reads fine plain.
const UNHINTED = ['```', '2026-07-19T09:14:02Z  swap  green -> blue  ok', '```'].join('\n')

// An artifact body is written by an agent or a tool, i.e. untrusted.
const HOSTILE = [
  'Raw HTML must be escaped, not passed through:',
  '',
  `<${'script'}>window.__XSS = true<${'/'}${'script'}>`,
  '<img src=x onerror="window.__XSS = true">',
  '',
  'Markdown still renders **normally** around it.',
].join('\n')

createApp({
  setup: () => () =>
    h(
      'div',
      {
        // A real consumer sets an ambient ink on its page or card; the tokens
        // stylesheet alone does not. Without this the whole fixture inherits
        // the UA default black in BOTH themes, which makes "prose inherits the
        // surface" unmeasurable — the assertion would compare black to black
        // and pass a component that had hardcoded its colour.
        style: 'padding:24px; display:grid; gap:24px; color: var(--text-body)',
      },
      [
        h('div', { id: 'probe-fenced', 'data-surface': 'content-fenced' }, [
          h(AspContent, { content: FENCED, type: 'markdown' }),
        ]),
        h('div', { id: 'probe-raw', 'data-surface': 'content-raw' }, [
          h(AspContent, { content: RAW_SOURCE, type: 'code', language: 'python' }),
        ]),
        // Same string, no explicit type: proves the sniffer routes it away from
        // markdown on its own, which is the defect-2 fix for callers that do not
        // yet have a content-type to pass.
        h('div', { id: 'probe-auto', 'data-surface': 'content-auto' }, [
          h(AspContent, { content: RAW_SOURCE, type: 'auto', language: 'python' }),
        ]),
        // The control: the SAME string forced through the markdown path. If this
        // one does not mangle, the fixture is too weak to prove the others.
        h('div', { id: 'probe-raw-as-markdown', 'data-surface': 'content-control' }, [
          h(AspContent, { content: RAW_SOURCE, type: 'markdown' }),
        ]),
        h('div', { id: 'probe-long', 'data-surface': 'content-long' }, [
          h(AspContent, { content: LONG_BODY, type: 'markdown', maxHeight: 320 }),
        ]),
        h('div', { id: 'probe-uncapped', 'data-surface': 'content-uncapped' }, [
          h(AspContent, { content: LONG_BODY, type: 'markdown', maxHeight: null }),
        ]),
        h('div', { id: 'probe-unhinted', 'data-surface': 'content-unhinted' }, [
          h(AspContent, { content: UNHINTED, type: 'markdown' }),
        ]),
        h('div', { id: 'probe-hostile', 'data-surface': 'content-hostile' }, [
          h(AspContent, { content: HOSTILE, type: 'markdown' }),
        ]),
      ]
    ),
}).mount('#app')
