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
          @state-changed="changeWaxpeerState"
          v-model="steamacc.waxpeer"
          :disabled="waxpeerDisabled"
          v-if="!!steamacc"
        ></MarketplaceCard>
        <MarketplaceCard
          class="mb-2"
          marketplace="Shadowpay"
          @state-changed="changeShadowpayState"
          v-model="steamacc.shadowpay"
          :disabled="shadowpayDisabled"
          v-if="!!steamacc"
        ></MarketplaceCard>
        <MarketplaceCard
          class="mb-2"
          marketplace="MarketCSGO"
          @state-changed="changeMarketCSGOState"
          v-model="steamacc.marketcsgo"
          :disabled="marketcsgoDisabled"
          v-if="!!steamacc"
        ></MarketplaceCard>
        <MarketplaceCard
          class="mb-2"
          marketplace="Float"
          @state-changed="changeCSFloatState"
          v-model="steamacc.csfloat"
          :disabled="csgofloatDisabled"
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
const csgofloatDisabled: Ref<boolean> = ref(false);

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

  window.events.csgofloatStateChanged((state, username) => {
    if (steamacc.value.username == username)
      steamacc.value.csfloat.state = state;

    updateSteamAccList();
  });
});

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

async function changeCSFloatState(newState: boolean): Promise<void> {
  toast.clear();
  toast.info(`${newState ? "Starting" : "Stopping"} extension Float...`);
  csgofloatDisabled.value = true;

  try {
    const responseStateFloat = await window.api.changeCSFloatState(
      newState,
      steamacc.value.username
    );
    if (responseStateFloat.success) {
      toast.success(`Float has successfully turned on`);
    }
  } catch (error) {
    toast.error(`Error - (changeCSFloatState): ${error}`);
  } finally {
    csgofloatDisabled.value = false;
  }
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
