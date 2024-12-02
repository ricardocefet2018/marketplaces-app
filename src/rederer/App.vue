<template>
  <RouterView />
  <Loading v-if="!!loading" />
  <Toolbar class="absolute bottom-0 left-0 right-0 border-noround">
    <template #start>
      <p class="opacity-50" @click="onFooterClick">{{ footerMsg }}</p>
    </template>

    <template #end>
      <i class="pi pi-github m-2 cursor-pointer" @click="openGithubPage"></i>
      <i class="pi pi-twitter m-2 cursor-pointer" @click="openTwitterPage"></i>
    </template>
  </Toolbar>
</template>

<script setup lang="ts">
import { onMounted, Ref, ref } from "vue";
import Toolbar from "primevue/toolbar";
import { useRouter } from "vue-router";
import Loading from "./pages/components/Loading.vue";

const footerMsg = ref("Made with love by Ricardo Rocha");
const loading: Ref<boolean> = ref(true);
const router = useRouter();

onMounted(async () => {
  const hasAccounts = await window.api.hasAccounts();
  loading.value = false;
  if (hasAccounts) router.push({ name: "main" });
  else router.push({ name: "login" });
});

async function onFooterClick() {
  footerMsg.value = await window.api.test(footerMsg.value);
}

function openGithubPage() {
  window.api.openExternalLink(
    "https://github.com/ricardocefet2018/marketplaces-app"
  );
}

function openTwitterPage() {
  window.api.openExternalLink("https://x.com/ricardorocha_os");
}
</script>
