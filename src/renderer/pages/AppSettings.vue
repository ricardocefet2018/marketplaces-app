<template>
  <div aria-page="appSettings">
    <Loading v-if="!!loading" />
    <div
      v-if="!loading"
      class="m-8"
    >
      <Card class="h-auto">
        <template #title>
          <div class="flex justify-content-between">
            <span class="flex justify-content-start align-items-center">
              App settings
            </span>
            <Button
              v-tooltip.left="'App logs'"
              icon="pi pi-file-edit"
              class=""
              @click="openLogsFolder"
            />
          </div>
          <Divider />
        </template>
        <template #content>
          <form
            id="form"
            :disabled="submitingForm"
            @change="validateForm"
            @submit="submitForm"
          >
            <div class="field flex justify-content-between">
              <label
                for="notification"
                style="width: 40%"
              >
                Notifications
                <Badge
                  v-tooltip="'Turn on/off ALL notifications.'"
                  value="?"
                  severity="secondary"
                  size="small"
                />
              </label>
              <div>
                <ToggleSwitch v-model="form.notification" />
              </div>
            </div>
            <div class="field flex justify-content-between">
              <label
                for="startWithWindow"
                style="width: 40%"
              >
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
              :disabled="submitingForm"
              @click="submitForm"
            />
          </div>
        </template>
      </Card>
    </div>
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
  import { useMyToast } from "../services/toast";
  import Loading from "./components/LoadingComponent.vue";

  const router = useRouter();
  const toast = useMyToast();

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
    const formvalue = Object.assign({}, form.value); // TODO form.value isn't seralizable for some reason
    const response = await window.api.setAppSettings(formvalue);
    if (!response.success && response.msg) {
      toast.error(response.msg);
      return;
    }
    toast.success("Settings saved successfully!");
    router.push({ name: "main" });
  }
</script>

<style scoped></style>
