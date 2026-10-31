// Fixture for AspButton rendered as a link (system_3 #9246): every variant x
// sm/md/lg as a <button>, as `href`, and as `to` through a registered
// RouterLink. The RouterLink here is a stub that renders an <a> and records
// each navigation on window.__nav, so the spec can tell client-side navigation
// from a page load; the DS resolves whatever RouterLink the app registers.
// Also: blocked (disabled, loading) links, a target=_blank link with and
// without the caller's rel, and a `to` link on an AspCard.
import { createApp, h } from 'vue'

import '../../../build/tokens.css'
import { AspButton, AspCard } from '../../../src/index.js'

window.__nav = []
window.__clicks = 0

const RouterLink = {
  name: 'RouterLink',
  props: { to: { type: [String, Object], required: true } },
  setup(props, { slots }) {
    const href = () => (typeof props.to === 'string' ? props.to : props.to.path)
    return () =>
      h('a', {
        href: href(),
        onClick: (e) => {
          e.preventDefault()
          window.__nav.push(href())
        },
      }, slots.default?.())
  },
}

const VARIANTS = ['primary', 'secondary', 'ghost', 'destructive']
const SIZES = ['sm', 'md', 'lg']
const label = 'Go home'

const row = (variant, size) =>
  h('div', { class: 'row', 'data-variant': variant, 'data-size': size, style: 'display:flex;gap:8px;align-items:center' }, [
    h(AspButton, { variant, size, 'data-render': 'button' }, () => label),
    h(AspButton, { variant, size, href: '/somewhere', 'data-render': 'href' }, () => label),
    h(AspButton, { variant, size, to: '/', 'data-render': 'to' }, () => label),
  ])

const app = createApp({
  setup() {
    return () =>
      h('div', { style: 'padding:24px;display:flex;flex-direction:column;gap:12px;background:var(--surface-page);color:var(--text-body)' }, [
        ...VARIANTS.flatMap((v) => SIZES.map((s) => row(v, s))),
        h('div', { id: 'blocked', style: 'display:flex;gap:8px' }, [
          h(AspButton, { href: '/nope', disabled: true, 'data-render': 'href-disabled', onClick: () => (window.__clicks += 1) }, () => 'Disabled'),
          h(AspButton, { to: '/nope', loading: true, 'data-render': 'to-loading', onClick: () => (window.__clicks += 1) }, () => 'Loading'),
        ]),
        h('div', { id: 'external', style: 'display:flex;gap:8px' }, [
          h(AspButton, { href: 'https://example.com/', target: '_blank', 'data-render': 'blank' }, () => 'Buy me a coffee'),
          h(AspButton, { href: 'https://example.com/', target: '_blank', rel: 'noopener', 'data-render': 'blank-rel' }, () => 'Own rel'),
        ]),
        h(AspCard, { id: 'on-card' }, () => [
          h(AspButton, { to: '/', 'data-render': 'card-to' }, () => label),
        ]),
        h('div', { id: 'link-variant' }, [
          h(AspButton, { variant: 'link', href: '/x', 'data-render': 'link-variant' }, () => 'inline'),
        ]),
      ])
  },
})
app.component('RouterLink', RouterLink)
app.mount('#app')
