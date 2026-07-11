// Placeholder — wired for real in subtask A2 (#1957).
// The A1 scaffold only needs `style-dictionary` installed and a script hook;
// the actual base/aspirant token JSONs land in A2.

export default {
  source: ['tokens/**/*.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'build/',
      files: [{ destination: 'tokens.css', format: 'css/variables' }],
    },
    js: {
      transformGroup: 'js',
      buildPath: 'build/',
      files: [{ destination: 'tokens.js', format: 'javascript/es6' }],
    },
  },
}
