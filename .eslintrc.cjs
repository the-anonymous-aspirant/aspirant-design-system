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
  ignorePatterns: ['node_modules/', 'dist/', 'build/', '.histoire/', '**/*.json'],
}
