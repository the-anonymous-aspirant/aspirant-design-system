// #4209 §3.82 — the surface × theme matrix, rendered through the real AspBadge
// so the e2e measures what actually ships. Four quadrants: {light,dark} theme ×
// {page,card} surface. Each quadrant paints the real surface token it names, so
// a dot/ring measured against the quadrant background is measured against the
// exact surface a consumer would mount on.
import { createApp, h } from 'vue'

import '../../../build/tokens.css'
import { AspBadge } from '../../../src/index.js'

const STATUSES = ['positive', 'caution', 'negative', 'neutral']

const quadrant = (theme, surf) =>
  h(
    'div',
    {
      'data-cell': `${theme}-${surf}`,
      'data-theme-cell': theme,
      'data-surface': surf,
      // Dark quadrants carry [data-theme='dark'] so the token build's dark
      // overrides (and the badge's own [data-theme] dot rule) resolve.
      ...(theme === 'dark' ? { 'data-theme': 'dark' } : {}),
      style: `padding:16px;background:var(--surface-${surf === 'card' ? 'card' : 'page'})`,
    },
    [
      h(
        'div',
        { style: 'display:flex;gap:8px;flex-wrap:wrap' },
        STATUSES.map((s) =>
          h(
            AspBadge,
            { key: `p${s}`, surface: surf, status: s, 'data-status': s, 'data-kind': 'pill' },
            () => s
          )
        )
      ),
      h(
        'div',
        { style: 'display:flex;gap:12px;flex-wrap:wrap;margin-top:10px' },
        STATUSES.map((s) =>
          h(
            AspBadge,
            {
              key: `d${s}`,
              surface: surf,
              variant: 'dot',
              status: s,
              'data-status': s,
              'data-kind': 'dot',
            },
            () => s
          )
        )
      ),
    ]
  )

createApp({
  setup() {
    return () =>
      h(
        'div',
        { style: 'padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:16px' },
        [
          ['light', 'page'],
          ['light', 'card'],
          ['dark', 'page'],
          ['dark', 'card'],
        ].map(([t, s]) => quadrant(t, s))
      )
  },
}).mount('#app')
