<template>
  <Loading v-if="!!loading" />
  <div class="m-8" v-if="!loading">
    <Card class="h-auto">
      <template #title>
        <div class="flex justify-content-between">
          <span class="flex justify-content-start align-items-center">
            App settings
          </span>
          <Button
            icon="pi pi-file-edit"
            class=""
            @click="openLogsFolder"
            v-tooltip.left="'App logs'"
          />
        </div>
        <Divider />
      </template>
      <template #content>
        <form
          id="form"
          @change="validateForm"
          :disabled="submitingForm"
          v-on:submit="submitForm"
        >
          <div class="field flex justify-content-between">
            <label for="notification" style="width: 40%">
              Notifications
              <Badge
                value="?"
                severity="secondary"
                size="small"
                v-tooltip="'Turn on/off ALL notifications.'"
              ></Badge>
            </label>
            <div>
              <ToggleSwitch v-model="form.notification" />
            </div>
          </div>
          <div class="field flex justify-content-between">
            <label for="startWithWindow" style="width: 40%">
              Start with windows
            </label>
            <div>
              <ToggleSwitch v-model="form.startWithWindow" />
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
            @click="router.push({ name: 'main' })"
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
  </div>
</template>

<script setup lang="ts">
import Button from "primevue/button";
import Badge from "primevue/badge";
import Card from "primevue/card";
import Divider from "primevue/divider";
import { FormErrors, ISettings } from "../../shared/types";
import { onMounted, ref } from "vue";
import { Validator } from "../models/validator";
import ToggleSwitch from "primevue/toggleswitch";
import { useRouter } from "vue-router";

const router = useRouter();

const loading = ref(true);
const form = ref<ISettings>();

const errors = ref<FormErrors<ISettings>>({});

const validator = Validator.factory<ISettings>({
  startWithWindow: {
    type: "boolean",
    required: true,
  },
  notification: {
    type: "boolean",
    required: true,
  },
});

const submitingForm = ref<boolean>(false);

onMounted(async () => {
  form.value = await window.api.getAppSettings();
  loading.value = false;
});

async function openLogsFolder() {
  await window.api.openLogsFolder();
}

async function validateForm() {
  try {
    await validator.validate(form.value);
    errors.value = {};
    return true;
  } catch (err) {
    console.log(err);
    errors.value = err.fields;
    return false;
  }
}

async function submitForm(e: SubmitEvent) {
  e.preventDefault();
  const validated = await validateForm();
  if (!validated) return;
  const formvalue = Object.assign({}, form.value);
  const success = await window.api.setAppSettings(formvalue);
  if (!success) return;
  router.push({ name: "main" });
}
</script>

<style scoped></style>
