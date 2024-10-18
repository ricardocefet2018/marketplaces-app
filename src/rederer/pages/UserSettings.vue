<template>
  <Card class="h-auto">
    <template #title>
      <div class="flex justify-content-between">
        <span class="flex justify-content-start align-items-center">
          User settings
        </span>
        <Button
          icon="pi pi-file-edit"
          class=""
          @click="openLogsFolder"
          v-tooltip.left="'User logs'"
        />
      </div>
      <Divider />
    </template>
    <template #content>
      <form id="form" @change="validateForm" :disabled="submitingForm">
        <!-- <div class="field">
          <label for="op1">Opção 1</label>
          <InputText class="w-full" id="op1" />
        </div> -->
        <div class="field flex justify-content-between">
          <label for="acceptGifts" style="width: 40%">
            Auto accept gifts
            <Badge
              value="?"
              severity="secondary"
              size="small"
              v-tooltip="'Automatically accept any offer empty on your side.'"
            ></Badge>
          </label>
          <div>
            <StyledToggleSwitch v-model="form.acceptGifts" />
          </div>
        </div>
      </form>
    </template>
    <template #footer>
      <div class="flex gap-4 mt-1">
        <Button
          label="Cancel"
          severity="secondary"
          outlined
          class="w-full"
          :disabled="submitingForm"
          @click="emit('back')"
        />
        <Button
          label="Save"
          class="w-full"
          @click="submitForm"
          :disabled="submitingForm"
        />
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { onBeforeMount, onMounted, Ref, ref } from "vue";
import StyledToggleSwitch from "./components/StyledToggleSwitch.vue";
import { FormErrors, IUserSettings, SteamAcc } from "../../shared/types";
import { Validator } from "../models/validator";
import Card from "primevue/card";
import Button from "primevue/button";
import Divider from "primevue/divider";
import Badge from "primevue/badge";
import InputText from "primevue/inputtext";

const emit = defineEmits<{
  back: [];
  openLogs: [];
}>();

const props = defineProps<{
  steamacc: SteamAcc;
}>();

const form = ref<IUserSettings>();

const errors: Ref<FormErrors<IUserSettings>> = ref({});

const validator = Validator.factory<IUserSettings>({
  acceptGifts: {
    type: "boolean",
    required: true,
    message: "Accept gifts is required!",
  },
});

const submitingForm = ref<boolean>();

onBeforeMount(() => {
  form.value = props.steamacc.userSettings;
});

async function validateForm() {
  try {
    await validator.validate(form.value);
    errors.value = {};
    return true;
  } catch (err) {
    errors.value = err.fields;
    return false;
  }
}

async function submitForm() {
  const validated = await validateForm();
  if (!validated) return;
  const formvalue = Object.assign({}, form.value); // TODO form.value isn't seralizable for some reason
  const success = await window.api.updateUserSettings(
    formvalue,
    props.steamacc.username
  );
  if (success) emit("back");
}

async function openLogsFolder() {
  await window.api.openLogsFolder(props.steamacc.username);
}
</script>

<style scoped></style>
