import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.js', import.meta.url)),
      name: 'AspirantDesignSystem',
      fileName: 'aspirant-design-system',
    },
    rollupOptions: {
      /*
       * `marked` and `highlight.js` are externalised for the same reason
       * `chart.js` is: they belong to exactly one component, and bundling them
       * charges every consumer for a component they may not use. Measured on
       * the AspContent branch — bundling took the library from 85.64 kB to
       * 262.98 kB (25.09 kB to 70.47 kB gzipped), i.e. roughly tripled it for
       * one renderer.
       *
       * A function rather than a list because highlight.js is imported through
       * several deep entry points (`/lib/core`, `/lib/languages/*`), and a
       * literal list would silently bundle whichever grammar someone adds next.
       */
      external: (id) =>
        ['vue', 'chart.js', 'chart.js/auto', 'marked'].includes(id) ||
        id === 'highlight.js' ||
        id.startsWith('highlight.js/'),
      output: {
        globals: (id) => {
          if (id === 'vue') return 'Vue'
          if (id.startsWith('chart.js')) return 'Chart'
          if (id === 'marked') return 'marked'
          // Every highlight.js entry point resolves to the one global the UMD
          // build of that package exposes.
          if (id.startsWith('highlight.js')) return 'hljs'
          return id
        },
      },
    },
  },
})
