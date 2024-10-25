/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/application-architecture#main-and-renderer-processes
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.ts` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */
import "primeflex/primeflex.css";
import "primeicons/primeicons.css";
import "./rederer/assets/main.css";
import { createApp } from "vue";
import PrimeVue from "primevue/config";
import Tooltip from "primevue/tooltip";
import Aura from "@primevue/themes/aura";
import App from "./rederer/App.vue";
import { definePreset } from "@primevue/themes";

const app = createApp(App);
const MyPreset = definePreset(Aura, {
  components: {
    inputtext: {
      placeholder: {
        color: "{surface.600}",
      },
    },
    toggleswitch: {
      colorScheme: {
        dark: {
          root: {
            background: "{red.500}",
            hover: {
              background: "{red.400}",
            },
          },
          handle: {
            background: "{zinc.800}",
            hover: {
              background: "{zinc.800}",
            },
          },
        },
      },
    },
  },
});
app.use(PrimeVue, {
  theme: {
    preset: MyPreset,
  },
});
app.directive("tooltip", Tooltip);
window.events.apiReady(() => {
  app.mount("#app");
});
