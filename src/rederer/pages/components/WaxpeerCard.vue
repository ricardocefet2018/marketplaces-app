<template>
  <Card class="w-full">
    <template #title>
      <div class="flex">
        <div class="flex-1">Waxpeer</div>
        <TripleStateSwitch
          class="flex"
          v-model="online"
          :disabled="!waxpeerApiKey"
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
import ToggleSwitch from "primevue/toggleswitch";
import { onMounted, ref, Ref } from "vue";
import TripleStateSwitch from "./TripleStateSwitch.vue";

const emits = defineEmits<{ waxpeerApiKeyChanged: [waxpeerApiKey: string] }>();

const props = defineProps<{
  waxpeerApiKey?: string;
  lastState?: boolean;
}>();

const waxpeerApiKey: Ref<string> = ref();
const online: Ref<boolean> = ref();

onMounted(() => {
  waxpeerApiKey.value = props.waxpeerApiKey ?? "";
  online.value = props.lastState ?? false;
});

function saveWaxpeerApiKey() {
  emits("waxpeerApiKeyChanged", waxpeerApiKey.value);
}
</script>

<style scoped></style>
