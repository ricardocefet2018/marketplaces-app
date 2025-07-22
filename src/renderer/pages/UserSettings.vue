<template>
  <div
    class="m-8"
    aria-page="userSettings"
  >
    <Loading v-if="!!loading" />
    <Card v-if="!loading">
      <template #title>
        <div class="flex justify-content-between">
          <span class="flex justify-content-start align-items-center">
            {{ steamAcc.username }}'s settings
          </span>
          <Button
            v-tooltip.left="steamAcc.username + '\'s logs'"
            icon="pi pi-file-edit"
            class=""
            @click="openLogsFolder"
          />
        </div>
        <Divider />
      </template>
      <template #content>
        <div
          style="max-height: 55vh"
          class="overflow-auto pr-3"
        >
          <form
            id="form"
            :disabled="submitingForm"
            @change="validateForm"
            @submit="submitForm"
          >
            <div class="field">
              <label for="pendingTradesFile">
                Save pending trades to file
                <Badge
                  v-tooltip="
                    `Created trades will be pending of confirmation. 
                    There are tools that auto confirm created trades saved on a file. Click at \'?\' to see more.`
                  "
                  value="?"
                  severity="secondary"
                  size="small"
                  @click="
                    openExternalLink(
                      'https://github.com/ricardocefet2018/SteamDesktopAuthenticator'
                    )
                  "
                />
              </label>
              <InputText
                id="pendingTradesFile"
                v-model="form.pendingTradesFilePath"
                class="w-full"
                placeholder="C:\Users\JohnDoe\Documents\pendingTradesFile.json"
              />
              <small
                v-if="errors.pendingTradesFilePath"
                style="color: var(--p-red-500)"
              >
                {{ errors.pendingTradesFilePath[0].message }}
              </small>
              <br />
              <small>
                This option will create a file if it does not exists.
              </small>
            </div>
            <div class="field flex justify-content-between">
              <label
                for="acceptGifts"
                style="width: 40%"
              >
                Auto accept gifts
                <Badge
                  v-tooltip="
                    'Automatically accept any offer empty on your side.'
                  "
                  value="?"
                  severity="secondary"
                  size="small"
                />
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
                  v-tooltip="`Where to get it?\nAt Waxpeer API section.`"
                  value="?"
                  severity="secondary"
                  size="small"
                  @click="openExternalLink('https://waxpeer.com/profile/user')"
                />
              </label>
              <Password
                id="waxpeerApiKey"
                v-model="form.waxpeerApiKey"
                class="flex-1"
                :invalid="!!errors.waxpeerApiKey"
                :disabled="steamAcc.waxpeer.state"
                :feedback="false"
                toggle-mask
              />
              <small
                v-if="errors.waxpeerApiKey"
                style="color: var(--p-red-500)"
              >
                {{ errors.waxpeerApiKey[0].message }}
              </small>
              <small v-if="steamAcc.waxpeer.state">
                Stop Waxpeer before change the API key.
              </small>
            </div>
            <div class="field">
              <label for="shadowpayApiKey">
                Shadowpay API key
                <Badge
                  v-tooltip="
                    `Where to get it?\nClick on 'edit' button then copy the 'Api token'.`
                  "
                  value="?"
                  severity="secondary"
                  size="small"
                  @click="openExternalLink('https://shadowpay.com/profile')"
                />
              </label>
              <Password
                id="shadowpayApiKey"
                v-model="form.shadowpayApiKey"
                class="flex-1"
                :invalid="!!errors.shadowpayApiKey"
                :disabled="steamAcc.shadowpay.state"
                :feedback="false"
                toggle-mask
              />
              <small
                v-if="errors.shadowpayApiKey"
                style="color: var(--p-red-500)"
              >
                {{ errors.shadowpayApiKey[0].message }}
              </small>
              <small v-if="steamAcc.shadowpay.state">
                Stop Shadowpay before change the API key.
              </small>
            </div>
            <div class="field">
              <label for="marketcsgoApiKey">
                MarketCSGO API key
                <Badge
                  v-tooltip="`Where to get it?`"
                  value="?"
                  severity="secondary"
                  size="small"
                  @click="
                    openExternalLink(
                      'https://market.csgo.com/en/api/content/start#apigen'
                    )
                  "
                />
              </label>
              <Password
                id="marketcsgoApiKey"
                v-model="form.marketcsgoApiKey"
                class="flex-1"
                :invalid="!!errors.marketcsgoApiKey"
                :disabled="steamAcc.marketcsgo.state"
                :feedback="false"
                toggle-mask
              />
              <small
                v-if="errors.marketcsgoApiKey"
                style="color: var(--p-red-500)"
              >
                {{ errors.marketcsgoApiKey[0].message }}
              </small>
              <small v-if="steamAcc.marketcsgo.state">
                Stop MarketCSGO before change the API key.
              </small>
            </div>
            <div class="field">
              <label for="csfloatApiKey">
                CSFloat API key
                <Badge
                  v-tooltip="`Where to get it?\nAt 'Developers' section.`"
                  value="?"
                  severity="secondary"
                  size="small"
                  @click="openExternalLink('https://csfloat.com/profile')"
                />
              </label>
              <Password
                id="csfloatApiKey"
                v-model="form.csfloatApiKey"
                class="flex-1"
                :invalid="!!errors.csfloatApiKey"
                :disabled="steamAcc.csfloat.state"
                :feedback="false"
                toggle-mask
              />
              <small
                v-if="errors.csfloatApiKey"
                style="color: var(--p-red-500)"
              >
                {{ errors.csfloatApiKey[0].message }}
              </small>
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
            :disabled="submitingForm"
            @click="submitForm"
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
  import Loading from "./components/LoadingComponent.vue";
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
      window.api.updateCSFloatApiKey(username, form.value.csfloatApiKey),
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
    router.push({
      name: "main",
      params: { username: steamAcc.value.username },
    });
  }

  async function openLogsFolder() {
    await window.api.openLogsFolder(steamAcc.value.username);
  }

  async function openExternalLink(link: string) {
    await window.api.openExternalLink(link);
  }
</script>

<style scoped></style>
