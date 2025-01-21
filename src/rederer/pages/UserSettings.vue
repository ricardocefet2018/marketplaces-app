<template>
  <div class="m-8" aria-page="userSettings">
    <Loading v-if="!!loading" />
    <Card v-if="!loading">
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
        <div style="max-height: 55vh" class="overflow-auto pr-3">
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
                  v-tooltip="
                    'Automatically accept any offer empty on your side.'
                  "
                ></Badge>
              </label>
              <div>
                <ToggleSwitch v-model="form.acceptGifts" />
              </div>
            </div>
            <Divider align="left">Marketplaces</Divider>
            <div class="field">
              <label for="waxpeerApiKey">
                Waxpeer API key
                <Badge
                  value="?"
                  severity="secondary"
                  size="small"
                  @click="openExternalLink('https://waxpeer.com/profile/user')"
                  v-tooltip="`Where to get it?\nAt Waxpeer API section.`"
                ></Badge>
              </label>
              <Password
                id="waxpeerApiKey"
                class="flex-1"
                :invalid="!!errors.waxpeerApiKey"
                v-model="form.waxpeerApiKey"
                :disabled="steamAcc.waxpeer.state"
                :feedback="false"
                toggle-mask
              />
              <small
                style="color: var(--p-red-500)"
                v-if="errors.waxpeerApiKey"
                >{{ errors.waxpeerApiKey[0].message }}</small
              >
              <small v-if="steamAcc.waxpeer.state">
                Stop Waxpeer before change the API key.
              </small>
            </div>
            <div class="field">
              <label for="shadowpayApiKey">
                Shadowpay API key
                <Badge
                  value="?"
                  severity="secondary"
                  size="small"
                  @click="openExternalLink('https://shadowpay.com/profile')"
                  v-tooltip="
                    `Where to get it?\nClick on 'edit' button then copy the 'Api token'.`
                  "
                ></Badge>
              </label>
              <Password
                id="shadowpayApiKey"
                class="flex-1"
                :invalid="!!errors.shadowpayApiKey"
                v-model="form.shadowpayApiKey"
                :disabled="steamAcc.shadowpay.state"
                :feedback="false"
                toggle-mask
              />
              <small
                style="color: var(--p-red-500)"
                v-if="errors.shadowpayApiKey"
                >{{ errors.shadowpayApiKey[0].message }}</small
              >
              <small v-if="steamAcc.shadowpay.state">
                Stop Shadowpay before change the API key.
              </small>
            </div>
            <div class="field">
              <label for="marketcsgoApiKey">
                MarketCSGO API key
                <Badge
                  value="?"
                  severity="secondary"
                  size="small"
                  @click="
                    openExternalLink(
                      'https://market.csgo.com/en/api/content/start#apigen'
                    )
                  "
                  v-tooltip="`Where to get it?`"
                ></Badge>
              </label>
              <Password
                id="marketcsgoApiKey"
                class="flex-1"
                :invalid="!!errors.marketcsgoApiKey"
                v-model="form.marketcsgoApiKey"
                :disabled="steamAcc.marketcsgo.state"
                :feedback="false"
                toggle-mask
              />
              <small
                style="color: var(--p-red-500)"
                v-if="errors.marketcsgoApiKey"
                >{{ errors.marketcsgoApiKey[0].message }}</small
              >
              <small v-if="steamAcc.marketcsgo.state">
                Stop MarketCSGO before change the API key.
              </small>
            </div>
            <div class="field">
              <label for="csfloatApiKey">
                CSFloat API key
                <Badge
                  value="?"
                  severity="secondary"
                  size="small"
                  @click="openExternalLink('https://csfloat.com/profile')"
                  v-tooltip="`Where to get it?\nAt 'Developers' section.`"
                ></Badge>
              </label>
              <Password
                id="csfloatApiKey"
                class="flex-1"
                :invalid="!!errors.csfloatApiKey"
                v-model="form.csfloatApiKey"
                :disabled="steamAcc.csfloat.state"
                :feedback="false"
                toggle-mask
              />
              <small
                style="color: var(--p-red-500)"
                v-if="errors.csfloatApiKey"
                >{{ errors.csfloatApiKey[0].message }}</small
              >
              <small v-if="steamAcc.csfloat.state">
                Stop CSFloat before change the API key.
              </small>
            </div>
          </form>
        </div>
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
import {
  FormErrors,
  IUserMarketplacesSettings,
  IUserSettings,
  SteamAcc,
} from "../../shared/types";
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
import Password from "primevue/password";

const route = useRoute();
const router = useRouter();
const toast = useMyToast();
const loading = ref(true);
const accUsername = route.params.username as string;

const steamAcc = ref<SteamAcc>();

const form = ref<IUserMarketplacesSettings>();

const errors: Ref<FormErrors<IUserMarketplacesSettings>> = ref({});

const validator = Validator.factory<IUserMarketplacesSettings>({
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
  waxpeerApiKey: {
    type: "string",
    required: false,
    len: 64,
    message: "Invalid Waxpeer apiKey",
  },
  shadowpayApiKey: {
    type: "string",
    required: false,
    len: 32,
    message: "Invalid Shadowpay apiKey",
  },
  marketcsgoApiKey: {
    type: "string",
    required: false,
    len: 31,
    message: "Invalid MarketCSGO apiKey",
  },
  csfloatApiKey: {
    type: "string",
    required: false,
    len: 32,
    message: "Invalid CSFloat apiKey",
  },
});

const submitingForm = ref<boolean>();

onMounted(async () => {
  const acc = await window.api.getAccountByUsername(accUsername);
  steamAcc.value = acc;
  form.value = {
    acceptGifts: acc.userSettings.acceptGifts,
    pendingTradesFilePath: acc.userSettings.pendingTradesFilePath,
    waxpeerApiKey: acc.waxpeer.apiKey,
    shadowpayApiKey: acc.shadowpay.apiKey,
    marketcsgoApiKey: acc.marketcsgo.apiKey,
    csfloatApiKey: acc.csfloat.apiKey,
  };
  loading.value = false;
});

async function validateForm() {
  try {
    await validator.validate(form.value);
    errors.value = {};
    return true;
  } catch (err) {
    console.log(err.fields);
    errors.value = err.fields;
    return false;
  }
}

async function submitForm(e: SubmitEvent) {
  e.preventDefault();
  const validated = await validateForm();
  if (!validated) return;
  const username = steamAcc.value.username;
  const userSettings: IUserSettings = {
    acceptGifts: form.value.acceptGifts,
    pendingTradesFilePath: form.value.pendingTradesFilePath,
  };

  const updateResponses = await Promise.all([
    window.api.updateUserSettings(userSettings, username),
    window.api.updateWaxpeerApiKey(username, form.value.waxpeerApiKey),
    window.api.updateShadowpayApiKey(username, form.value.shadowpayApiKey),
    window.api.updateMarketcsgoApiKey(username, form.value.marketcsgoApiKey),
    // TODO window.api.updateCSFloatApiKey(username, form.value.csfloatApiKey),
  ]);
  updateResponses.forEach((res) => {
    if (!res.success && res.msg) {
      toast.error(res.msg);
    }
  });
  const success = updateResponses
    .map((res) => res.success)
    .reduce((a, b) => a && b);
  if (!success) return;

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
