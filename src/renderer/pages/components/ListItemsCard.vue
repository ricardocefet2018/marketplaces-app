<template>
  <Card :dt="cardDT">
    <template #title>
      <div class="cardTitle">
        <div class="itemsTradablesClass">
          <p class="itemsTradablesClassText">Tradables:</p>
          <Tag severity="success" value="140" />
        </div>

        <div class="groupButton">
          <Button icon="pi pi-bars" @click="openModal()"></Button>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { ref } from "vue";
import Card from "primevue/card";
import Tag from "primevue/tag";
import Button from "primevue/button";
import router from "../../../renderer/router";

const cardDT = ref({
  body: {
    gap: 0,
  },
});

function openModal() {
  window.open("/list-item").before(() => {});
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

.cardTitle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 32px;
}

.itemsTradablesClass {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
}

.itemsTradablesClassText {
  font-size: 15px;
}
.groupButton {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
}
</style>
