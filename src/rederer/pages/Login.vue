<script setup lang="ts">
import Card from "primevue/card";
import InputText from "primevue/inputtext";
import Password from "primevue/password";
import Button from "primevue/button";
import { onMounted, Ref, ref } from "vue";
import { LoginResponses } from "../../shared/enums";
import { FormErrors, LoginData } from "../../shared/types";
import { Validator } from "../models/validator";
import { useRouter } from "vue-router";

const router = useRouter();

const cancelable = ref(false);

const submitingForm = ref(false);

const form = ref({
  steamUsername: "",
  steamPassword: "",
  steamGuardCode: "",
  proxy: "",
});

const errors: Ref<FormErrors<typeof form.value>> = ref({});

const validator = Validator.factory<typeof form.value>({
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
  proxy: {
    type: "string",
    required: false,
  },
});

onMounted(async () => {
  const hasAccounts = await window.api.hasAccounts();
  cancelable.value = hasAccounts;
});

async function validateForm() {
  try {
    await validator.validate(form.value);
    errors.value = {};
    return true;
  } catch (err) {
    errors.value = err.fields;
    return false;
  }
}

async function submitForm() {
  const success = await validateForm();
  if (!success) return;
  submitingForm.value = true;

  const loginData: LoginData = {
    username: form.value.steamUsername,
    password: form.value.steamPassword,
    authCode: form.value.steamGuardCode,
    proxy: form.value.proxy,
  };

  const code = await window.api.login(loginData); // can't error

  submitingForm.value = false;
  if (code == LoginResponses.success)
    router.push({ name: "main", params: { username: loginData.username } });
}
</script>
<template>
  <div class="m-8">
    <Card class="h-auto">
      <template #title> Steam Login </template>
      <template #content>
        <form id="form" @input="validateForm" :disabled="submitingForm">
          <div class="field">
            <label for="steamUsername">Steam username</label>
            <InputText
              id="steamUsername"
              class="w-full"
              v-model="form.steamUsername"
              :invalid="errors.steamUsername && errors.steamUsername.length > 0"
              :disabled="submitingForm"
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
              :disabled="submitingForm"
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
              :invalid="
                errors.steamGuardCode && errors.steamGuardCode.length > 0
              "
              :disabled="submitingForm"
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
            <InputText
              id="proxy"
              class="w-full"
              v-model="form.proxy"
              :disabled="submitingForm"
            ></InputText>
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
            :disabled="submitingForm || !cancelable"
            @click="router.push({ name: 'main' })"
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
  </div>
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
