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
      external: ['vue', 'chart.js', 'chart.js/auto'],
      output: {
        globals: { vue: 'Vue', 'chart.js': 'Chart', 'chart.js/auto': 'Chart' },
      },
    },
  },
})
