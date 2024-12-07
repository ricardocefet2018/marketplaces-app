<template>
  <div>
    <Card class="w-full">
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
      <template #content>
        <div class="field">
          <div class="flex m-2">
            <label for="apiKey">{{ marketplace }} API key</label>
          </div>
          <div class="flex gap-2">
            <Password
              id="apiKey"
              class="flex-1"
              v-model="apiKey"
              :disabled="model.state || props.disabled"
              :feedback="false"
              toggle-mask
            />
            <Button
              label="Save"
              class="flex"
              @click="emit('apiKeyChanged', apiKey)"
              :disabled="model.state || props.disabled"
            />
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import Card from "primevue/card";
import ToggleSwitch from "primevue/toggleswitch";
import Password from "primevue/password";
import Button from "primevue/button";
import { Marketplace, MarketplaceSettings } from "../../../shared/types";
import { onMounted, ref } from "vue";

const emit = defineEmits<{
  apiKeyChanged: [apiKey: string];
  stateChanged: [state: boolean];
}>();

const props = defineProps<{
  marketplace: Marketplace;
  disabled: boolean;
}>();

const model = defineModel<MarketplaceSettings>();

const apiKey = ref<string>();

onMounted(() => {
  apiKey.value = model.value.apiKey;
});
</script>

<style scoped></style>
