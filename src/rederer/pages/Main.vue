<template>
  <div aria-page="main">
    <Toolbar class="border-noround pr-3 pl-3">
      <template #start>
        <Avatar label="M" class="mr-2" size="large" />
        <h3>MultiMarketApp v0.0.1</h3>
      </template>

      <template #end>
        <Button
          icon="pi pi-cog"
          @click="router.push({ name: 'appSettings' })"
        ></Button>
      </template>
    </Toolbar>
    <div
      class="grid grid-nogutter"
      style="height: calc(100vh - 75.19px - 67.56px); max-width: 100%"
    >
      <fieldset
        class="border-noround m-0 p-2 h-full border-none border-right-2 col-fixed"
        style="width: fit-content"
      >
        <SelectedAccountCard
          :steamacc
          class="mb-2"
          @logout="logout"
          @user-settings="
            router.push({
              name: 'userSettings',
              params: { username: steamacc.username },
            })
          "
          v-if="!!steamacc"
        ></SelectedAccountCard>
        <Listbox
          :model-value="steamacc"
          :options="steamaccList"
          optionLabel="username"
          class="w-full"
          list-style="max-height: 29rem"
          filter
          @update:model-value="onUpdateListbox"
          :invalid="steamacc === null"
        >
          <template #option="slotProps">
            <div class="flex items-center">
              <div>
                <Badge
                  value=""
                  :severity="slotProps.option.status ? 'primary' : 'danger'"
                ></Badge>
                {{ slotProps.option.username }}
              </div>
            </div>
          </template>
        </Listbox>
        <Button
          label="Add account"
          icon="pi pi-sign-in"
          size="small"
          icon-pos="right"
          class="w-full mt-2 mb-2"
          @click="router.push({ name: 'login' })"
        ></Button>
      </fieldset>
      <fieldset
        class="overflow-auto border-noround m-0 p-2 border-none col"
        style="height: calc(100vh - 75.19px - 67.56px); max-width: 100%"
      >
        <MarketplaceCard
          class="mb-2"
          marketplace="Waxpeer"
          @api-key-changed="onUpdateWaxpeerApiKey"
          @state-changed="changeWaxpeerState"
          v-model="steamacc.waxpeer"
          :disabled="waxpeerDisabled"
          v-if="!!steamacc"
        ></MarketplaceCard>
        <MarketplaceCard
          class="mb-2"
          marketplace="Shadowpay"
          @api-key-changed="onUpdateShadowpayApiKey"
          @state-changed="changeShadowpayState"
          v-model="steamacc.shadowpay"
          :disabled="shadowpayDisabled"
          v-if="!!steamacc"
        ></MarketplaceCard>
        <MarketplaceCard
          class="mb-2"
          marketplace="MarketCSGO"
          @api-key-changed="onUpdateMarketCSGOApiKey"
          @state-changed="changeMarketCSGOState"
          v-model="steamacc.marketcsgo"
          :disabled="marketcsgoDisabled"
          v-if="!!steamacc"
        ></MarketplaceCard>
        <MarketplaceCard
          class="mb-2"
          marketplace="CSFLoat"
          @api-key-changed="onUpdateCSFloatApiKey"
          @state-changed="changeCSFloatState"
          v-model="steamacc.csfloat"
          :disabled="csfloatDisabled"
          v-if="!!steamacc"
        ></MarketplaceCard>
      </fieldset>
    </div>
  </div>
</template>

<script setup lang="ts">
import Avatar from "primevue/avatar";
import Button from "primevue/button";
import Toolbar from "primevue/toolbar";
import Listbox from "primevue/listbox";
import { onMounted, Ref, ref } from "vue";
import SelectedAccountCard from "./components/SelectedAccountCard.vue";
import Badge from "primevue/badge";
import MarketplaceCard from "./components/MarketplaceCard.vue";
import { SteamAcc } from "../../shared/types";
import { useRoute, useRouter } from "vue-router";
import { useMyToast } from "../services/toast";

const router = useRouter();
const route = useRoute();
const toast = useMyToast();

const steamaccMap = ref<Map<string, SteamAcc>>();
const steamaccList = ref<SteamAcc[]>();
const steamacc: Ref<SteamAcc> = ref();
const waxpeerDisabled: Ref<boolean> = ref(false);
const shadowpayDisabled: Ref<boolean> = ref(false);
const marketcsgoDisabled: Ref<boolean> = ref(false);
const csfloatDisabled: Ref<boolean> = ref(false);

function onUpdateListbox(e: SteamAcc | null) {
  if (!e) return;
  steamacc.value = e;
}

onMounted(async () => {
  const hasAccounts = await window.api.hasAccounts();
  if (!hasAccounts) router.push({ name: "login" });

  await updateSteamAccList();
  if (route.params.username)
    steamacc.value = steamaccMap.value.get(route.params.username as string);
  else steamacc.value = steamaccList.value[0];
  window.events.waxpeerStateChanged((state, username) => {
    if (steamacc.value.username == username)
      steamacc.value.waxpeer.state = state;

    updateSteamAccList();
  });
  window.events.shadowpayStateChanged((state, username) => {
    if (steamacc.value.username == username)
      steamacc.value.shadowpay.state = state;

    updateSteamAccList();
  });
  window.events.marketcsgoStateChanged((state, username) => {
    if (steamacc.value.username == username)
      steamacc.value.marketcsgo.state = state;

    updateSteamAccList();
  });

  window.events.csfloatStateChanged((state, username) => {
    if (steamacc.value.username == username)
      steamacc.value.csfloat.state = state;

    updateSteamAccList();
  });
});

async function onUpdateWaxpeerApiKey(waxpeerApiKey: string) {
  const status = await window.api.updateWaxpeerApiKey(
    steamacc.value.username,
    waxpeerApiKey
  );
  if (!status) {
    waxpeerDisabled.value = true;
    toast.error("Error updating Waxpeer api key, check out the logs.");
    return;
  }
  toast.success("Waxpeer api key changed.");
  steamacc.value.waxpeer.apiKey = waxpeerApiKey;
  await updateSteamAccList();
}

async function onUpdateShadowpayApiKey(shadowpayApiKey: string) {
  const status = await window.api.updateShadowpayApiKey(
    steamacc.value.username,
    shadowpayApiKey
  );
  if (!status) {
    shadowpayDisabled.value = true;
    toast.error("Error updating Shadowpay api key, check out the logs.");
    return;
  }
  toast.success("Shadowpay api key changed.");
  steamacc.value.shadowpay.apiKey = shadowpayApiKey;
  await updateSteamAccList();
}

async function onUpdateMarketCSGOApiKey(marketcsgoApiKey: string) {
  const status = await window.api.updateMarketcsgoApiKey(
    steamacc.value.username,
    marketcsgoApiKey
  );
  if (!status) {
    marketcsgoDisabled.value = true;
    toast.error("Error updating MarketCSGO api key, check out the logs.");
    return;
  }
  toast.success("MarketCSGO api key changed.");
  steamacc.value.marketcsgo.apiKey = marketcsgoApiKey;
  await updateSteamAccList();
}
async function onUpdateCSFloatApiKey(csfloatApiKey: string) {
  const status = await window.api.updateCSFloatApiKey(
    steamacc.value.username,
    csfloatApiKey
  );
  if (!status) {
    csfloatDisabled.value = true;
    toast.error("Error updating CSFLoat api key, check out the logs.");
    return;
  }
  toast.success("CSFLoat api key changed.");
  steamacc.value.csfloat.apiKey = csfloatApiKey;
  await updateSteamAccList();
}

async function changeWaxpeerState(newState: boolean) {
  waxpeerDisabled.value = true;
  const result = await window.api.changeWaxpeerState(
    newState,
    steamacc.value.username
  );
  if (!result.success && result.msg) toast.error(result.msg);
  if (result.success)
    toast.success(
      `Waxpeer has successfully turned ${newState ? "on" : "off"}.`
    );
  waxpeerDisabled.value = false;
}

async function changeShadowpayState(newState: boolean) {
  shadowpayDisabled.value = true;
  const result = await window.api.changeShadowpayState(
    newState,
    steamacc.value.username
  );
  if (!result.success && result.msg) toast.error(result.msg);
  if (result.success)
    toast.success(
      `Shadowpay has successfully turned ${newState ? "on" : "off"}.`
    );
  shadowpayDisabled.value = false;
}

async function changeMarketCSGOState(newState: boolean) {
  marketcsgoDisabled.value = true;
  const result = await window.api.changeMarketcsgoState(
    newState,
    steamacc.value.username
  );
  if (!result.success && result.msg) toast.error(result.msg);
  if (result.success)
    toast.success(
      `Marketcsgo has successfully turned ${newState ? "on" : "off"}.`
    );
  marketcsgoDisabled.value = false;
  return;
}

async function changeCSFloatState(newState: boolean) {
  csfloatDisabled.value = true;
  const result = await window.api.changeCSFloatState(
    newState,
    steamacc.value.username
  );
  if (!result.success && result.msg) toast.error(result.msg);
  if (result.success)
    toast.success(
      `CSFloat has successfully turned ${newState ? "on" : "off"}.`
    );
  csfloatDisabled.value = false;
  return;
}

async function updateSteamAccList() {
  steamaccList.value = await window.api.getAccounts();
  steamaccMap.value = new Map(
    steamaccList.value.map((acc) => [acc.username, acc])
  );
}

async function logout() {
  await window.api.logout(steamacc.value.username);
  await updateSteamAccList();
  if (steamaccMap.value.size == 0) router.push({ name: "login" });
}
</script>

<style scoped>
fieldset {
  border-color: var(--p-content-border-color);
}

span.online {
  color: var(--p-primary-color);
}

span.offline {
  color: var(--p-button-danger-background);
}
</style>
