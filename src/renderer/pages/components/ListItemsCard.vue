<template>
  <Card :dt="cardDT">
    <template #title>
      <div class="card-title">
        <div class="informations">
          <div class="inventory-amount">
            <Button
              type="button"
              severity="secondary"
              v-tooltip.bottom="'Value of your inventory'"
            >
              <i class="material-icons">payments</i>
              <span class="value">${{ inventoryValue }}</span>
            </Button>
          </div>

          <div class="tradable-items">
            <Button
              type="button"
              severity="secondary"
              v-tooltip.bottom="'Amount of tradable items'"
            >
              <i class="material-icons">sync</i>
              <span class="value">
                {{ tradableItems }}
                <span class="label">items</span>
              </span>
            </Button>
          </div>
        </div>

        <div class="actions">
          <Button icon="pi pi-bars" @click="handleOpenModal" />
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import Card from "primevue/card";
import Button from "primevue/button";
import { SteamAcc } from "src/shared/types";

const props = defineProps<{ steamacc: SteamAcc }>();

const cardDT = ref({
  body: { gap: 0 },
});

const tradableItems = ref(0);
const inventoryValue = ref(0);

onMounted(() => {
  initializeApiCheck();
});

function initializeApiCheck() {
  const checkInterval = setInterval(async () => {
    if (window.api) {
      clearInterval(checkInterval);
      await updateInfoItems();
      startPolling();
    }
  }, 1000);
}

async function updateInfoItems(): Promise<void> {
  try {
    const inventoryInfo = await window.api.getInventoryInfo(
      props.steamacc.username
    );
    tradableItems.value = Number(inventoryInfo.tradableItems);
    inventoryValue.value = Number(inventoryInfo.inventoryBalanceBuff);
  } catch (error) {
    window.alert(error);
  }
}

function startPolling() {
  setInterval(async () => {
    await updateInfoItems();
  }, 100000);
}

function handleOpenModal() {
  window.open("/list-item");
}
</script>

<style scoped>
:deep(.p-card) {
  height: auto;
}

:deep(.p-card-body) {
  padding-top: 2px !important;
  padding-bottom: 2px !important;
}

.card-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 32px;
}

.informations {
  display: flex;
  align-items: center;
  gap: 8px;
}

.inventory-amount,
.tradable-items {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 8px 0;
}

.actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.value {
  font-size: 15px;
}

.label {
  font-size: 10px;
}
</style>
