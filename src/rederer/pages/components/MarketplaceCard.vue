<template>
  <div>
    <Card class="w-full" :dt="cardDT">
      <template #title>
        <div class="flex">
          <div class="flex-1">{{ marketplace }}</div>
          <ToggleSwitch
            class="flex"
            v-model="model.state"
            @change="emit('stateChanged', model.state)"
            :disabled="!model.apiKey || props.disabled"
          />
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import Card from "primevue/card";
import ToggleSwitch from "primevue/toggleswitch";
import { Marketplace, MarketplaceSettings } from "../../../shared/types";
import { ref } from "vue";

const emit = defineEmits<{
  stateChanged: [state: boolean];
}>();

const props = defineProps<{
  marketplace: Marketplace;
  disabled: boolean;
}>();

const model = defineModel<MarketplaceSettings>();

const cardDT = ref({
  body: {
    gap: 0,
  },
});
</script>

<style scoped></style>
