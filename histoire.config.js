import { defineConfig } from 'histoire'
import { HstVue } from '@histoire/plugin-vue'

export default defineConfig({
  plugins: [HstVue()],
  storyMatch: ['stories/**/*.story.vue', 'src/**/*.story.vue'],
  setupFile: 'stories/histoire.setup.js',
  theme: {
    title: 'aspirant-design-system',
    // Logo + favicon slots are wired once aspirant-icon-pipeline ships (v1).
    // Histoire renders the default mark until then.
    colors: {
      primary: {
        50: '#fff8e1',
        100: '#ffecb3',
        200: '#ffe082',
        300: '#ffd54f',
        400: '#ffca28',
        500: '#ffb300',
        600: '#ffa000',
        700: '#ff8f00',
        800: '#ff6f00',
        900: '#e07800',
      },
    },
  },
  vite: {
    resolve: {
      alias: {
        '@': new URL('./src', import.meta.url).pathname,
      },
    },
  },
})
