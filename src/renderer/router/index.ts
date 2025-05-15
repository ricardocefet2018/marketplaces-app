import { createMemoryHistory, createRouter } from "vue-router";
import Main from "../pages/Main.vue";
import Login from "../pages/Login.vue";
import UserSettings from "../pages/UserSettings.vue";
import AppSettings from "../pages/AppSettings.vue";
import ListitemComponent from "../pages/components/ListitemComponent.vue";

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    {
      path: "/main/:username?",
      name: "main",
      component: Main,
    },
    {
      path: "/login",
      name: "login",
      component: Login,
    },
    {
      path: "/user-settings/:username",
      name: "userSettings",
      component: UserSettings,
    },
    {
      path: "/app-settings",
      name: "appSettings",
      component: AppSettings,
    },
    {
      path: "/list-items",
      name: "listItems",
      component: ListitemComponent,
    }

  ],
});

export default router;
