<script setup lang="ts">
import { computed, defineAsyncComponent } from "vue";

const props = defineProps({
  name: {
    type: String,
    required: true,
  },
  className: {
    type: String,
    default: "",
  },
});

const iconComponent = computed(() => {
  return defineAsyncComponent(
    () => import(`../../assets/icons/${props.name}.svg`)
  );
});
</script>

<template>
  <component :is="iconComponent" :class="[className]" />
</template>
