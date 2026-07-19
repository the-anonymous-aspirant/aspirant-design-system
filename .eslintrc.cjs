module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'vue/multi-word-component-names': 'off',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    // Component templates and story files often chain 5+ short props on a
    // single line for scannability. The 3-per-line default is too tight.
    'vue/max-attributes-per-line': ['warn', { singleline: 6, multiline: 1 }],
    'vue/singleline-html-element-content-newline': 'off',
  },
  overrides: [
    {
      // AspContent renders a body it must first parse — v-html is the whole
      // point of it, not an oversight. Both sites are fed escaped output (the
      // markdown renderer's `html()` hook escapes raw HTML; the code branch
      // emits only highlight.js spans over escaped text); see the comments at
      // those call sites. Disabled here rather than in the template because an
      // in-template disable comment is emitted into the rendered DOM as a
      // comment node in every consumer's app.
      files: ['src/components/AspContent.vue'],
      rules: { 'vue/no-v-html': 'off' },
    },
  ],
  ignorePatterns: ['node_modules/', 'dist/', 'build/', '.histoire/', '**/*.json'],
}
