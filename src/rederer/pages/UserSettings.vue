<template>
  <div class="m-8" aria-page="userSettings">
    <Loading v-if="!!loading" />
    <Card class="h-auto" v-if="!loading">
      <template #title>
        <div class="flex justify-content-between">
          <span class="flex justify-content-start align-items-center">
            {{ steamAcc.username }}'s settings
          </span>
          <Button
            icon="pi pi-file-edit"
            class=""
            @click="openLogsFolder"
            v-tooltip.left="steamAcc.username + '\'s logs'"
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
          <div class="field">
            <label for="pendingTradesFile">
              Save pending trades to file
              <Badge
                value="?"
                severity="secondary"
                size="small"
                @click="
                  openExternalLink(
                    'https://github.com/ricardocefet2018/SteamDesktopAuthenticator'
                  )
                "
                v-tooltip="
                  `Created trades will be pending of confirmation. 
                  There are tools that auto confirm created trades saved on a file. Click at \'?\' to see more.`
                "
              ></Badge>
            </label>
            <InputText
              class="w-full"
              id="pendingTradesFile"
              v-model="form.pendingTradesFilePath"
              placeholder="C:\Users\JohnDoe\Documents\pendingTradesFile.json"
            />
            <small
              style="color: var(--p-red-500)"
              v-if="errors.pendingTradesFilePath"
            >
              {{ errors.pendingTradesFilePath[0].message }}
            </small>
            <br />
            <small>
              This option will create a file if it does not exists.
            </small>
          </div>
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
              <ToggleSwitch v-model="form.acceptGifts" />
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
            @click="
              router.push({
                name: 'main',
                params: { username: steamAcc.username },
              })
            "
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
import { onMounted, Ref, ref } from "vue";
import { FormErrors, IUserSettings, SteamAcc } from "../../shared/types";
import { Validator } from "../models/validator";
import Card from "primevue/card";
import Button from "primevue/button";
import Divider from "primevue/divider";
import Badge from "primevue/badge";
import InputText from "primevue/inputtext";
import ToggleSwitch from "primevue/toggleswitch";
import { useRoute, useRouter } from "vue-router";
import Loading from "./components/Loading.vue";
import { useMyToast } from "../services/toast";

const route = useRoute();
const router = useRouter();
const toast = useMyToast();
const loading = ref(true);
const accUsername = route.params.username as string;

const steamAcc = ref<SteamAcc>();

const form = ref<IUserSettings>();

const errors: Ref<FormErrors<IUserSettings>> = ref({});

const validator = Validator.factory<IUserSettings>({
  acceptGifts: {
    type: "boolean",
    required: true,
    message: "Accept gifts is required!",
  },
  pendingTradesFilePath: {
    type: "string",
    required: false,
    pattern: /^[a-zA-Z]:\\(?:[^\\/:*?"<>|\r\n]+\\)*[^\\/:*?"<>|\r\n]+\.json$/,
    message: "Need to be an .json absolute path",
  },
});

const submitingForm = ref<boolean>();

onMounted(async () => {
  const acc = await window.api.getAccountByUsername(accUsername);
  steamAcc.value = acc;
  form.value = acc.userSettings;
  loading.value = false;
});

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
  const res = await window.api.updateUserSettings(
    formvalue,
    steamAcc.value.username
  );
  if (!res.success && res.msg) {
    toast.error(res.msg);
    return;
  }
  toast.success(`${accUsername}'s settings saved successfully`);
  router.push({ name: "main", params: { username: steamAcc.value.username } });
}

async function openLogsFolder() {
  await window.api.openLogsFolder(steamAcc.value.username);
}

async function openExternalLink(link: string) {
  await window.api.openExternalLink(link);
}
</script>

<style scoped></style>
