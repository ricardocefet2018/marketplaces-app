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
        :username="steamacc.username"
        :status="steamacc.status"
        class="mb-2"
        v-if="!!steamacc"
      ></SelectedAccountCard>
      <Listbox
        :model-value="steamacc"
        :options="steamaccs"
        optionLabel="steamid"
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
      <p class="m-0">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
        tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
        veniam
      </p>
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
import { SteamAcc } from "../models/steamAcc.model";
import Badge from "primevue/badge";

const emit = defineEmits(["addAccount"]);

const steamaccs: Ref<SteamAcc[]> = ref([]);

const steamacc: Ref<SteamAcc> = ref();

function onUpdateListbox(e: SteamAcc | null) {
  if (!e) return;
  steamacc.value = e;
}

onMounted(async () => {
  const registeredAccounts = await window.api.getAccounts();
  registeredAccounts.forEach((status, username) => {
    steamaccs.value.push({ username, status });
  });
  if (steamaccs.value.length > 0) steamacc.value = steamaccs.value[0];
});
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
