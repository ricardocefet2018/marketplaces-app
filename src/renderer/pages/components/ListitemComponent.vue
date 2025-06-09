<template>
  <div class="menu-header">
    <Menubar>
      <template #start>
        <div class="flex items-center gap-3 min-h-[48px]">
          <template v-if="isLoading">
            <Skeleton class="mr-2" shape="circle" size="2.5rem"/>
            <Skeleton borderRadius="8px" height="38px" width="180px"/>
          </template>
          <template v-else>
            <Avatar :image="avatarUser" class="shadow" size="large" style="width:3rem;height:2.5rem;"/>
            <div style="min-width:180px;max-width:240px;width:100%;">
              <Select v-model="selectedUser" :options="users" optionLabel="name" style="height:38px;"/>
            </div>
          </template>
        </div>
      </template>
      <template #end>

        <div class="card flex justify-center flex-direction-row gap-2">
          <Tag value="Primary">
            <SvgIcon :name="`waxpeer-logo`"/>
            <span class="text-base">$1</span>
          </Tag>
          <Tag value="Primary">
            <SvgIcon :name="`csfloat-logo`"/>
            <span class="text-base">$1</span>
          </Tag>
          <Tag value="Primary">
            <SvgIcon :name="`shadowpay-logo`"/>
            <span class="text-base">$1</span>
          </Tag>
          <Tag value="Primary">
            <SvgIcon :name="`marketcsgo-logo`"/>
            <span class="text-base">$1</span>
          </Tag>
          <!--          <SelectButton v-model="value" :options="options" aria-labelledby="multiple" multiple optionLabel="name"/>-->
        </div>
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
          <Skeleton v-if="isLoading" height="32px" width="80px"/>
          <p v-else>${{ inventoryBuffValue }}</p>
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
          <Skeleton v-if="isLoading" height="32px" width="60px"/>
          <template v-else>
            <p>{{ totalItems }}</p>
            <span>itens</span>
          </template>
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
          <Skeleton v-if="isLoading" height="32px" width="60px"/>
          <template v-else>
            <p>{{ totalItemsLock }}</p>
            <span>itens</span>
          </template>
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
          <Skeleton v-if="isLoading" height="32px" width="60px"/>
          <template v-else>
            <p>{{ tradableItems }}</p>
            <span>itens</span>
          </template>
        </div>
      </template>
    </Card>
  </div>

  <div class="list-items">
    <div class="card">
      <Divider align="left" type="solid">
        <b>INVENTORY</b>
      </Divider>

      <div class="p-input-icon-left mb-3">
        <Card class="card">
          <template #title>
            <InputText v-model="filters.name.value" class="w-full" placeholder="Buscar pelo nome..."/>
          </template>
        </Card>
      </div>

      <DataTable v-if="!isLoading" v-model:filters="filters" v-model:selection="selectedProducts"
                 :globalFilterFields="['market_hash_name']" :value="inventoryData" dataKey="name" removableSort
                 scrollHeight="650px" scrollable>
        <Column field="pos" style="width: 20px; min-width: 20px">
          <template #body="slotProps">
            {{ slotProps.data.pos }}
            <!--            <Checkbox v-model="slotProps.check" binary/>-->
          </template>
        </Column>
        <Column header="Image" style="width: 80px; min-width: 80px">
          <template #body="slotProps">
            <img :alt="slotProps.data.name"
                 :src="`https://community.cloudflare.steamstatic.com/economy/image/${slotProps.data.icon_url}`"
                 :style="{
                   width: '70px',
                   height: '50px',
                   objectFit: 'cover',
                   borderLeft: slotProps.data.tags && slotProps.data.tags[4] && slotProps.data.tags[4].color ? `solid 2px #${slotProps.data.tags[4].color}` : 'solid 2px transparent'
                 }"
            />

          </template>
        </Column>
        <Column field="name" header="Name" sortable style="width: 450px; min-width: 400px">
          <template #body="slotProps">

            <span :style="{ color: slotProps.data.name_color ? `#${slotProps.data.name_color}` : '' }" class="text-sm">{{
                slotProps.data.market_hash_name
              }}</span>
            &nbsp;
            &nbsp;

            <Tag v-if="slotProps.data.market_hash_name && slotProps.data.market_hash_name.includes('StatTrak™')"
                 severity="warn"
                 value="StatTrak™"/>
          </template>
        </Column>
        <Column field="tradable" header="Status" sortable style="width: 120px; min-width: 120px">
          <template #body="slotProps">
            <Tag :severity="slotProps.data.tradable ? 'success' : 'danger'"
                 :value="slotProps.data.tradable ? 'Tradable' : 'Not Tradable'"/>
          </template>
        </Column>

        <Column field="stickers" header="Stickers">
          <template #body="slotProps">
            <div v-html="getStickerInfo(slotProps.data)"></div>
          </template>
        </Column>
        <Column header="Actions">
          <template #body="slotProps">
            <Rating :modelValue="slotProps.data.rating" readonly/>
          </template>
        </Column>
      </DataTable>
      <template v-if="isLoading">
        <div style="padding: 1rem">
          <Skeleton v-for="i in 8" :key="i" borderRadius="8px" class="mb-2" height="40px" width="100%"/>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import {onMounted, ref} from "vue";
import Menubar from "primevue/menubar";
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Rating from 'primevue/rating';
import Divider from 'primevue/divider';
import Select from 'primevue/select';
import Avatar from 'primevue/avatar';
import InputText from 'primevue/inputtext';
import Skeleton from 'primevue/skeleton';
import SvgIcon from "./SvgIcon.vue";
const checked = ref(false);
let selectedUser = ref();
const tradableItems = ref(0);
const inventoryBuffValue = ref(0);
const inventoryFloatValue = ref(0);
const totalItems = ref(0);
const totalItemsLock = ref(0);
const isLoading = ref(false);

const filters = ref({
  global: {value: null, matchMode: 'contains'},
  name: {value: null, matchMode: 'contains'},
});
const selectedProducts = ref();
const metaKey = ref(false);
const value = ref(null);
const options = ref([
  {name: 'CSFloat', value: 1},
  {name: 'MarketCSGO', value: 2},
  {name: 'ShadowPay', value: 3},
  {name: 'Waxpeer', value: 4}
]);
const priceMacketOptions = ref([
  {name: 'CSFloat', value: 1},
  {name: 'Buff163', value: 2},
]);

let users = ref([]);
let avatarUser = ref('');
const currentUsername = ref('');
const inventoryData = ref([]);

onMounted(() => {
  initializeApiCheck();
});

function initializeApiCheck() {
  const checkInterval = setInterval(() => {
    if (window.api) {
      clearInterval(checkInterval);
      getAndSetUsers()

    }
  }, 1000);
}

async function updateInfoItems() {
  isLoading.value = true;
  try {
    const inventoryInfo = await window.api.getInventoryInfo(
        selectedUser.value.name
    );
    console.log('Inventory Info:', inventoryInfo);
    inventoryData.value = inventoryInfo.inventory;
    tradableItems.value = Number(inventoryInfo.tradableItems);
    inventoryBuffValue.value = Number(inventoryInfo.buffInventoryValue);
    inventoryFloatValue.value = Number(inventoryInfo.csFloatInventoryValue);
    totalItems.value = Number(inventoryInfo.inventory.length);
    totalItemsLock.value = (Number(totalItems.value) - Number(tradableItems.value))
  } catch (error) {
    window.alert(error);
  } finally {
    isLoading.value = false;
  }
}


async function getAndSetUsers() {
  window.api.getAccounts().then(usersResponse => {
    usersResponse.forEach(user => {
      users.value.push({
        name: user.username,
        avatar: user.avatar,
        value: user.username
      });
    });
    selectedUser.value = users.value[0]
    avatarUser.value = selectedUser.value.avatar
    console.log('Avatar URL:', avatarUser.value); // Para debug
    updateInfoItems()
  }).catch(error => {
    window.alert(`Erro: ${error.message}`);
  });
}

function getStickerInfo(item) {
  const result = [];

  if (item.descriptions && item.descriptions.length > 0) {
    const stickerDesc = item.descriptions.find(desc => desc.name === 'sticker_info');
    if (stickerDesc) {
      const imgTagRegex = /<img[^>]+>/g;
      let imgTags = stickerDesc.value.match(imgTagRegex);

      if (imgTags && imgTags.length > 0) {
        imgTags.forEach((e) => {
          result.push(e);
        })
      }
    }
    const charmsDesc = item.descriptions.find(desc => desc.name === 'keychain_info');
    if (charmsDesc) {
      const imgTagRegex = /<img[^>]+>/g;
      let imgTags = charmsDesc.value.match(imgTagRegex);

      if (imgTags && imgTags.length > 0) {
        imgTags.forEach((e) => {
          result.push(e);
        })
      }
    }
  }
  // Corrigindo a condição: result.length < 0 para result.length === 0
  if (result.length === 0) return '';
  return result.join(' ');
}

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
  flex-direction: row;
  justify-content: center;
  align-items: center;

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
