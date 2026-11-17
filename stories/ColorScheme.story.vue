<script setup>
// The browser's own parts, inside each theme. `data-theme` carries
// `color-scheme` (build/tokens.css), so in dark these draw dark: the date
// field and its picker, the file button, the colour well and the scrollbar
// (system_3 #11585).
const rows = Array.from({ length: 12 }, (_, i) => `Row ${i + 1}`)
</script>

<template>
  <Story title="Foundations/Native controls and color-scheme">
    <Variant v-for="theme in ['light', 'dark']" :key="theme" :title="theme === 'dark' ? 'Dark theme' : 'Light theme'">
      <div :data-theme="theme" class="native-pane">
        <label class="native-row">Date <input type="date" value="2026-11-17"></label>
        <label class="native-row">File <input type="file"></label>
        <label class="native-row">Colour <input type="color" value="#e8a317"></label>
        <div class="native-scroll" tabindex="0" aria-label="Scrolling box">
          <p v-for="r in rows" :key="r">{{ r }}</p>
        </div>
      </div>
    </Variant>
  </Story>
</template>

<style scoped>
.native-pane {
  display: grid;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--surface-page);
  color: var(--text-on-light);
}

.native-row {
  display: flex;
  gap: var(--space-sm);
  align-items: center;
}

.native-scroll {
  height: 6rem;
  width: 14rem;
  overflow: auto;
  border: 1px solid var(--border-control);
}
</style>
