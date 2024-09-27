<template>
  <ToggleSwitch v-model="model" :dt="tripleState" />
</template>

<script setup lang="ts">
import ToggleSwitch from "primevue/toggleswitch";
import { ref } from "vue";

const tripleState = ref({
  background: "{red.500}",
  hover: {
    background: "{red.400}",
  },
  handle: {
    background: "{zinc.800}",
    hover: {
      background: "{zinc.800}",
    },
  },
});

const model = defineModel();
</script>

<style scoped></style>
