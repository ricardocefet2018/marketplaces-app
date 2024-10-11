<template>
  <Toolbar class="border-noround pr-3 pl-3">
    <template #start>
      <Avatar label="M" class="mr-2" size="large" />
      <h3>MultiMarketApp v0.0.1</h3>
    </template>

    <template #end>
      <Button icon="pi pi-cog"></Button>
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
        @click="emit('addAccount')"
      ></Button>
    </fieldset>
    <fieldset class="border-noround m-0 p-2 h-full border-none col">
      <WaxpeerCard
        @waxpeer-api-key-changed="onUpdateWaxpeerApiKey"
        @state-changed="changeWaxpeerState"
        v-model="steamacc.waxpeerSettings"
        :disabled="waxpeerDisabled"
        v-if="!!steamacc"
      />
    </fieldset>
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
import WaxpeerCard from "./components/WaxpeerCard.vue";
import { SteamAcc } from "../../shared/types";

const emit = defineEmits<{
  addAccount: [];
}>();

const props = defineProps<{
  steamaccs: SteamAcc[];
}>();
const steamaccMap = ref<Map<string, SteamAcc>>();
const steamaccList = ref<SteamAcc[]>();
const steamacc: Ref<SteamAcc> = ref();
const waxpeerDisabled: Ref<boolean> = ref(false);

function onUpdateListbox(e: SteamAcc | null) {
  if (!e) return;
  steamacc.value = e;
}

onMounted(async () => {
  window.events.waxpeerStateChanged((state, username) => {
    console.log(
      `Account ${username} was setted to ${state ? "online" : "offline"}`
    );
    if (steamacc.value.username == username) {
      steamacc.value.waxpeerSettings.state = state;
    }
    updateSteamAccList();
  });
  if (props.steamaccs.length > 0) {
    steamaccMap.value = new Map(
      props.steamaccs.map((acc) => [acc.username, acc])
    );
    steamaccList.value = Array.from(steamaccMap.value.values());
    steamacc.value = steamaccList.value[0];
  } else {
    await updateSteamAccList();
    steamaccList.value = Array.from(steamaccMap.value.values());
    steamacc.value = steamaccList.value[0];
    // steamacc.value = steamaccMap.value.values().next().value;
  }
});

async function onUpdateWaxpeerApiKey(waxpeerApiKey: string) {
  const status = await window.api.updateWaxpeerApiKey(
    steamacc.value.username,
    waxpeerApiKey
  );
  if (!status) {
    waxpeerDisabled.value = true;
    return;
  }
  steamacc.value.waxpeerSettings.apiKey = waxpeerApiKey;
  await updateSteamAccList();
}

async function changeWaxpeerState(newState: boolean) {
  waxpeerDisabled.value = true;
  const result = await window.api.changeWaxpeerState(
    newState,
    steamacc.value.username
  );
  console.log(
    `Changing waxpeer state has been ${result ? "successed" : "failed"}`
  );
  waxpeerDisabled.value = false;
}

async function updateSteamAccList() {
  const accList = await window.api.getAccounts();
  steamaccMap.value = new Map(accList.map((acc) => [acc.username, acc]));
}

async function logout() {
  await window.api.logout(steamacc.value.username);
  await updateSteamAccList();
  if (steamaccMap.value.size == 0) emit("addAccount");
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
