// A stock (position) sparkline of a level with a small range, in the 48px
// at-a-glance cell on a dark AspCard (§3.120 Q3, system_3 #9179). The two
// series are the #9104 B4-5 readings: TASKS IN BACKLOG at 51–52 and DISK at
// 74.3–75.8%. The spec measures how much of the cell the line's pixels span.
// §3.120 Q3 was amended on 2026-11-14 (#10975, built in system_3 #11100): a
// frame is never narrower than the flat-series frame, so those two now sit in
// a band on purpose. CPU, whose range is well over a sixth of its level, is
// the line the amendment leaves exactly as it was.
import { createApp, h } from 'vue'

import '../../../build/tokens.css'
import AspBarChart from '../../../src/components/AspBarChart.vue'
import AspCard from '../../../src/components/AspCard.vue'

const LABELS = ['00:00', '01:00', '02:00', '03:00', '04:00']

const CELLS = [
  { id: 'backlog', title: 'Tasks in backlog', unit: '', data: [51, 51, 52, 52, 51] },
  { id: 'disk', title: 'Disk', unit: '%', data: [74.3, 74.9, 75.8, 75.2, 74.6] },
  { id: 'cpu', title: 'CPU', unit: '%', data: [22, 30, 38, 34, 26] },
]

createApp({
  setup() {
    return () =>
      h(
        'div',
        CELLS.map((c) =>
          h('section', { id: c.id }, [
            h(AspCard, null, () => [
              h('h2', null, c.title),
              h(AspBarChart, {
                variant: 'sparkline',
                encoding: 'position',
                unit: c.unit,
                data: { labels: LABELS, datasets: [{ label: c.title, data: c.data }] },
                ariaLabel: c.title,
              }),
            ]),
          ]),
        ),
      )
  },
}).mount('#app')
