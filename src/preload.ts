// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from "electron";
import { LoginData } from "./shared/types";
import { LoginResponses } from "./shared/enums";

export const api = {
  test: (msg: string): Promise<string> => ipcRenderer.invoke("test", msg),
  login: (loginOptions: LoginData): Promise<LoginResponses> =>
    ipcRenderer.invoke("login", loginOptions),
  getAccounts: (): Promise<Map<string, boolean>> =>
    ipcRenderer.invoke("getAccounts"),
};

contextBridge.exposeInMainWorld("api", api);
