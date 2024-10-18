<template>
  <Card class="w-full">
    <template #title>
      <div class="flex">
        <div class="flex-1">Waxpeer</div>
        <StyledToggleSwitch
          class="flex"
          v-model="model.state"
          @change="emitStateChange"
          :disabled="!model.apiKey || props.disabled"
        />
      </div>
    </template>
    <template #content>
      <div class="field">
        <div class="flex m-2">
          <label for="waxpeerApiKey">Waxpeer API key</label>
        </div>
        <div class="flex gap-2">
          <InputText
            id="waxpeerApiKey"
            class="flex-1"
            v-model="waxpeerApiKey"
            :disabled="model.state || props.disabled"
          ></InputText>
          <Button
            label="Save"
            class="flex"
            @click="saveWaxpeerApiKey"
            :disabled="model.state || props.disabled"
          />
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import InputText from "primevue/inputtext";
import { onMounted, ref, Ref } from "vue";
import StyledToggleSwitch from "./StyledToggleSwitch.vue";
import { WaxpeerSettings } from "../../../shared/types";

const emit = defineEmits<{
  waxpeerApiKeyChanged: [waxpeerApiKey: string];
  stateChanged: [state: boolean];
}>();

const props = defineProps<{
  disabled: boolean;
}>();

const model = defineModel<WaxpeerSettings>();

const waxpeerApiKey: Ref<string> = ref();

onMounted(() => {
  waxpeerApiKey.value = model.value.apiKey ?? "";
});

function saveWaxpeerApiKey() {
  emit("waxpeerApiKeyChanged", waxpeerApiKey.value);
}

function emitStateChange() {
  emit("stateChanged", model.value.state);
}
</script>

<style scoped></style>
