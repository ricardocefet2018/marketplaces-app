<template>
  <Card class="w-full">
    <template #title>
      <div class="flex">
        <div class="flex-1">Waxpeer</div>
        <TripleStateSwitch
          class="flex"
          v-model="online"
          :disabled="!props.waxpeerSettings.apiKey"
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
          ></InputText>
          <Button label="Save" class="flex" @click="saveWaxpeerApiKey" />
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
import TripleStateSwitch from "./TripleStateSwitch.vue";
import { WaxpeerSettings } from "../../../shared/types";

const emits = defineEmits<{ waxpeerApiKeyChanged: [waxpeerApiKey: string] }>();

const props = defineProps<{
  waxpeerSettings: WaxpeerSettings;
  invalid: boolean;
}>();

const waxpeerApiKey: Ref<string> = ref();
const online: Ref<boolean> = ref();

onMounted(() => {
  waxpeerApiKey.value = props.waxpeerSettings.apiKey ?? "";
  online.value = props.waxpeerSettings.state ?? false;
});

function saveWaxpeerApiKey() {
  emits("waxpeerApiKeyChanged", waxpeerApiKey.value);
}
</script>

<style scoped></style>
