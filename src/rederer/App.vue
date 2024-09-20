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
import { onMounted, ref } from "vue";
import Login from "./pages/Login.vue";
import { Pages } from "./models/pages.enum";
import Main from "./pages/Main.vue";
import Toolbar from "primevue/toolbar";

const footerMsg = ref("Made with love by Ricardo Rocha");

let currentPage = ref(Pages.login);
onMounted(() => {
  currentPage.value = Pages.login;
});

async function onFooterClick() {
  footerMsg.value = await window.api.test(footerMsg.value);
}
</script>
