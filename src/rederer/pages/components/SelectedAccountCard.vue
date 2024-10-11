<template>
  <Card style="overflow: hidden; width: 280px">
    <!-- <template #header>
        </template> -->
    <template #title>
      <div class="flex">
        <Avatar label="A" class="mr-2 flex-none" size="large" />
        <div class="flex-1">
          <p style="font-size: 0.85rem" class="m-0">
            {{ props.steamacc.username }}
          </p>
          <p style="font-size: 0.75rem" class="m-0">
            Steam status:
            <Badge
              value=""
              :severity="selectedAccountSteamStatus ? 'primary' : 'danger'"
            ></Badge>
          </p>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex gap-1 mt-1">
        <Button
          label="Logout"
          class="w-full"
          severity="danger"
          size="small"
          icon="pi pi-sign-out"
          iconPos="right"
          @click="emit('logout')"
        ></Button>
        <Button icon="pi pi-cog" size="small"></Button>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import Avatar from "primevue/avatar";
import Badge from "primevue/badge";
import Button from "primevue/button";
import Card from "primevue/card";
import { SteamAcc } from "../../../shared/types";
import { ref } from "vue";

const emit = defineEmits<{
  logout: [];
}>();

const props = defineProps<{ steamacc: SteamAcc }>();

const selectedAccountSteamStatus = ref(props.steamacc.status);
</script>

<style scoped></style>
