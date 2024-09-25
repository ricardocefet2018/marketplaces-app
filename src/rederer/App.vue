<template>
  <Login
    class="m-8"
    @logged-on="currentPage = Pages.main"
    v-if="currentPage == Pages.login"
  />
  <Main
    v-if="currentPage == Pages.main"
    @add-account="currentPage = Pages.login"
  ></Main>
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
import { Pages } from "./models/pages.enum";
import Main from "./pages/Main.vue";
import Toolbar from "primevue/toolbar";
import ProgressSpinner from "primevue/progressspinner";

const footerMsg = ref("Made with love by Ricardo Rocha");

let currentPage: Ref<Pages | null> = ref(null);
onMounted(async () => {
  const steamAccounts = await window.api.getAccounts();
  if (steamAccounts.size > 0) currentPage.value = Pages.main;
  if (steamAccounts.size == 0) currentPage.value = Pages.login;
});

async function onFooterClick() {
  footerMsg.value = await window.api.test(footerMsg.value);
}
</script>
