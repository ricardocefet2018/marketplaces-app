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
  <div class="list-items">
    <div class="card">
      <Divider align="left" type="solid">
        <b>INVENTORY</b>
      </Divider>
      <DataTable :value="[{
        image: 'https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou6rwOANf1OD3fC0X09qzh5SCgfb4DL_Dn3tu5cB1g_zMu9Sn3FawqUc5MW32I9KSJgFsYV-BrAfrwL3v0J_o6J7JnSMyviR2sC3D30vgcvpDUYM/330x192?allow_animated=1',
        name: 'StatTrak™ MP5-SD | Phosphor (Field-Tested)',
        price: 1,
        rating: 3,
        check: false
      }]" scrollHeight="650px" scrollable selection="1" selectionMode='multiple'>
        <Column field="check" style="width: 80px; min-width: 80px">
          <template #body="slotProps">
            <Checkbox v-model="slotProps.check" binary/>
          </template>
        </Column>

        <Column header="Image" style="width: 80px; min-width: 80px">
          <template #body="slotProps">
            <img :alt="slotProps.data.name"
                 :src="slotProps.data.image"
                 style="width: 70px; height: 50px; object-fit: cover;"
            />
          </template>
        </Column>

        <Column field="name" header="Name" style="width: 400px; min-width: 400px">
          <template #body="slotProps">
            <span class="text-sm">StatTrak™ MP5-SD | Phosphor (Field-Tested)</span>
          </template>
        </Column>
        <Column header="Status" style="width: 80px; min-width: 80px">
          <template #body="slotProps">
            <Tag :value="1"/>
          </template>
        </Column>
        <Column field="price" header="Price">
          <template #body="slotProps">
            1
          </template>
        </Column>
        <Column header="Actions">
          <template #body="slotProps">
            <Rating :modelValue="slotProps.data.rating" readonly/>
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<script setup>
import {onMounted, ref} from "vue";
import Menubar from "primevue/menubar";
import Card from 'primevue/card';
import SelectButton from 'primevue/selectbutton';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Rating from 'primevue/rating';
import Divider from 'primevue/divider';
import Checkbox from 'primevue/checkbox';

const checked = ref(false);
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

.list-items {
  padding: 10px;
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


</style>
