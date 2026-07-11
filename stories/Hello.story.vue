<script setup>
const message = 'Histoire pipeline works. Real As* components land in subtask A3 (#1958).'
</script>

<template>
  <Story title="Hello">
    <Variant title="Default">
      <div class="hello">
        <h1>aspirant-design-system</h1>
        <p>{{ message }}</p>
      </div>
    </Variant>
  </Story>
</template>

<style scoped>
.hello {
  padding: 2rem;
  font-family: Inter, system-ui, sans-serif;
}

.hello h1 {
  color: #ffb300;
  margin: 0 0 1rem 0;
}

.hello p {
  color: #424242;
  line-height: 1.5;
}
</style>
