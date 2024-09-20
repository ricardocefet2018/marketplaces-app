<script setup lang="ts">
import Card from "primevue/card";
import InputText from "primevue/inputtext";
import Password from "primevue/password";
import Button from "primevue/button";
import { Ref, ref } from "vue";
import { LoginResponses } from "../../shared/enums";
import { LoginData } from "../../shared/types";
import Schema from "async-validator";

const emit = defineEmits(["loggedOn"]);

const submitingForm = ref(false);

const form = ref({
  steamUsername: "",
  steamPassword: "",
  steamGuardCode: "",
  proxy: "",
});

type Errors = {
  [K in keyof typeof form.value]?: {
    field: K;
    fieldValue: (typeof form.value)[K];
    message: string;
  }[];
};

const errors: Ref<Errors> = ref({});

const validator = new Schema({
  steamUsername: {
    type: "string",
    required: true,
    message: "Steam username is required!",
  },
  steamPassword: {
    type: "string",
    required: true,
    message: "Steam password is required!",
  },
  steamGuardCode: {
    type: "string",
    required: true,
    message: "Steam guard code is required!",
  },
});

async function validateForm() {
  try {
    await validator.validate(form.value);
    errors.value = {};
  } catch (err) {
    console.log(err.fields);
    errors.value = err.fields;
  }
  return;
}

async function submitForm() {
  await validateForm();
  if (Object.keys(errors.value).length > 0) return;
  submitingForm.value = true;

  const loginData: LoginData = {
    username: form.value.steamUsername,
    password: form.value.steamPassword,
    authCode: form.value.steamGuardCode,
    proxy: form.value.proxy,
  };

  await new Promise((res) => setTimeout(res, 2000)); // just simulating delay
  const code = await window.api.login(loginData); // can't error

  submitingForm.value = false;
  if (code == LoginResponses.success) emit("loggedOn");
}
</script>
<template>
  <Card class="h-auto">
    <template #title> Steam Login </template>
    <template #content>
      <form id="form" @change="validateForm" :disabled="submitingForm">
        <div class="field">
          <label for="steamUsername">Steam username</label>
          <InputText
            id="steamUsername"
            class="w-full"
            v-model="form.steamUsername"
            :invalid="errors.steamUsername && errors.steamUsername.length > 0"
          ></InputText>
          <small
            class="error"
            v-if="errors.steamUsername && errors.steamUsername.length > 0"
          >
            {{ errors.steamUsername[0].message }}
          </small>
        </div>
        <div class="field">
          <label for="steamPassword">Steam password</label>
          <Password
            id="steamPassword"
            :feedback="false"
            v-model="form.steamPassword"
            toggleMask
            :invalid="errors.steamPassword && errors.steamPassword.length > 0"
          ></Password>
          <small
            class="error"
            v-if="errors.steamPassword && errors.steamPassword.length > 0"
          >
            {{ errors.steamPassword[0].message }}
          </small>
        </div>
        <div class="field">
          <label for="steamGuardCode">Steam guard code</label>
          <InputText
            id="steamGuardCode"
            class="w-full"
            v-model="form.steamGuardCode"
            :invalid="errors.steamGuardCode && errors.steamGuardCode.length > 0"
          ></InputText>
          <small
            class="error"
            v-if="errors.steamGuardCode && errors.steamGuardCode.length > 0"
          >
            {{ errors.steamGuardCode[0].message }}
          </small>
        </div>
        <div class="field">
          <label for="proxy">Proxy</label>
          <InputText id="proxy" class="w-full" v-model="form.proxy"></InputText>
        </div>
      </form>
    </template>
    <template #footer>
      <div class="flex gap-4 mt-1">
        <Button
          label="Cancel"
          severity="secondary"
          outlined
          class="w-full"
          :disabled="submitingForm"
        />
        <Button
          label="Save"
          class="w-full"
          @click="submitForm"
          :disabled="submitingForm"
        />
      </div>
    </template>
  </Card>
</template>
<style>
.p-password {
  width: 100%;
}
.p-password-input {
  width: inherit;
}
.error {
  color: var(--p-button-danger-background);
}
</style>
