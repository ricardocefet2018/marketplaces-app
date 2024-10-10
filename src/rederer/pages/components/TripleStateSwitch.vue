<template>
  <ToggleSwitch v-model="model" :dt="tripleState" @change="onChange" />
</template>

<script setup lang="ts">
import ToggleSwitch from "primevue/toggleswitch";
import { ref } from "vue";

const emits = defineEmits<{
  change: [value: boolean];
}>();

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

const model = defineModel<boolean>();

function onChange() {
  emits("change", !model.value);
}
</script>

<style scoped></style>
