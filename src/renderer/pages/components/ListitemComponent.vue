<template>
  <div class="menu-header">
    <Menubar :model="items">
      <template #end>
        <SelectButton v-model="value" :options="options" aria-labelledby="multiple" multiple optionLabel="name"/>
      </template>
    </Menubar>
  </div>

  <div class="cards-menu">
    <Card class="card">
      <template #title>
        <div class="p-card-title">
          <i class="material-icons">attach_money</i>
          <span>Price Inventory</span>
        </div>
      </template>
      <template #content>
        <div class="p-card-content">
          <p>1000</p>
          <span>$</span>
        </div>
      </template>
    </Card>

    <Card class="card">
      <template #title>
        <div class="p-card-title">
          <i class="material-icons">inventory_2</i>
          <span>Total</span>
        </div>
      </template>
      <template #content>
        <div class="p-card-content">
          <p>1000</p>
          <span>itens</span>
        </div>
      </template>
    </Card>

    <Card class="card">
      <template #title>
        <div class="p-card-title">
          <i class="material-icons">lock</i>
          <span>Trade Lock</span>
        </div>
      </template>
      <template #content>
        <div class="p-card-content">
          <p>1000</p>
          <span>itens</span>
        </div>
      </template>
    </Card>

    <Card class="card">
      <template #title>
        <div class="p-card-title">
          <i class="material-icons">compare_arrows</i>
          <span>Tradables</span>
        </div>
      </template>
      <template #content>
        <div class="p-card-content">
          <p>1000</p>
          <span>itens</span>
        </div>
      </template>
    </Card>
  </div>

</template>

<script setup>
import {ref} from "vue";
import Menubar from "primevue/menubar";
import Card from 'primevue/card';
import SelectButton from 'primevue/selectbutton';

const items = ref([
  {
    label: 'Home',
    icon: 'pi pi-home'
  },
  {
    label: 'Settings',
    icon: 'pi pi-cog',
  }
]);
const value = ref(null);
const options = ref([
  {name: 'CSFloat', value: 1},
  {name: 'MarketCSGO', value: 2},
  {name: 'ShadowPay', value: 3},
  {name: 'Waxpeer', value: 4}
]);
</script>
<style scoped>
.menu-header {
  margin: 10px;
}

.cards-menu {
  display: flex;

  .card {
    margin: 10px;
    flex: 1;
  }

  .p-card-title {
    display: flex;
    justify-content: start;

    span {
      margin-left: 10px;
      font-weight: bold;
    }
  }

  .p-card-content {
    display: flex;
    flex-direction: row;
    align-items: baseline;
    margin-left: 30px;

    p {
      font-size: 24px;
      margin: 0;
    }

    span {
      margin-left: 5px;
      font-size: 14px;
      color: #666;
    }
  }
}

:deep(.p-menubar) {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 1rem;
}

:deep(.p-menubar-end) {
  margin-left: auto;
}</style>
