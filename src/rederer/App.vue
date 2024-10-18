<template>
  <Login
    class="m-8"
    @logged-on="changeCurrentPage(Pages.main)"
    @cancel="changeCurrentPage(Pages.main)"
    :cancelable="cancelable"
    v-if="currentPage == Pages.login"
  />
  <Main
    v-if="currentPage == Pages.main"
    @add-account="changeCurrentPage(Pages.login)"
    @user-settings="accessUserSettings"
    :steamaccs="steamaccs"
    :steamacc="steamacc"
  ></Main>
  <UserSettings
    class="m-8"
    v-if="currentPage == Pages.userSettings"
    :steamacc="steamacc"
    @back="changeCurrentPage(Pages.main)"
  ></UserSettings>
  <div
    style="height: 90vh"
    class="flex align-content-center"
    v-if="currentPage == null"
  >
    <div class="w-full flex align-items-center justify-content-center">
      <ProgressSpinner style="width: 4rem" />
    </div>
  </div>
  <Toolbar class="absolute bottom-0 left-0 right-0 border-noround">
    <template #start>
      <p class="opacity-50" @click="onFooterClick">{{ footerMsg }}</p>
    </template>

    <template #end>
      <i class="pi pi-github m-2"></i>
      <i class="pi pi-twitter m-2"></i>
    </template>
  </Toolbar>
</template>

<script setup lang="ts">
import { onMounted, Ref, ref } from "vue";
import Login from "./pages/Login.vue";
import Main from "./pages/Main.vue";
import UserSettings from "./pages/UserSettings.vue";
import { Pages } from "./models/pages.enum";
import Toolbar from "primevue/toolbar";
import ProgressSpinner from "primevue/progressspinner";
import { SteamAcc } from "../shared/types";

const footerMsg = ref("Made with love by Ricardo Rocha");
const steamacc: Ref<SteamAcc> = ref();
const steamaccs: Ref<SteamAcc[]> = ref();
const cancelable: Ref<boolean> = ref();
const currentPage: Ref<Pages | null> = ref(null);

onMounted(async () => {
  cancelable.value = false;
  await changeCurrentPage();
});

async function onFooterClick() {
  footerMsg.value = await window.api.test(footerMsg.value);
}

async function changeCurrentPage(page?: Pages) {
  steamaccs.value = await window.api.getAccounts();
  cancelable.value = steamaccs.value.length > 0;
  if (page === undefined) {
    currentPage.value = steamaccs.value.length > 0 ? Pages.main : Pages.login;
  } else {
    currentPage.value = page;
  }
}

function accessUserSettings(s: SteamAcc) {
  steamacc.value = s;
  changeCurrentPage(Pages.userSettings);
}
</script>
