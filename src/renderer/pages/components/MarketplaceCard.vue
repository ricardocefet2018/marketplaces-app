<template>
  <div>
    <Card class="w-full" :dt="cardDT">
      <template #title>
        <div class="flex align-items-center gap-2">
          <div class="flex svg-container">
            <SvgIcon :name="`${marketplace.toLowerCase()}-logo`" />
          </div>

          <Badge
            value=""
            :severity="model.canSell ? 'primary' : 'danger'"
          ></Badge>

          <div
            class="flex-1 flex align-items-center"
          >
            {{ marketplace }}
          </div>

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
import Badge from "primevue/badge";
import { Marketplace, MarketplaceSettings } from "../../../shared/types";
import { ref } from "vue";
import SvgIcon from "./SvgIcon.vue";

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

<style scoped>
.svg-container {
  justify-content: center;
  align-items: center;
  height: 100%;
  width: auto;
}
</style>
