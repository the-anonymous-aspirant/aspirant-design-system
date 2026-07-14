// Global setup for Histoire stories.
// Loads the generated design tokens so every story consumes real values via
// `var(--token)` instead of hardcoded colors. Run `npm run tokens:build` at
// least once before `npm run story:dev` so this import resolves.
import '../src/fonts/fonts.css'
import '../build/tokens.css'
