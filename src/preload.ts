// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from "electron";
import { LoginData, SteamAcc, IUserSettings } from "./shared/types";
import { LoginResponses } from "./shared/enums";

const api = {
  test: (msg: string): Promise<string> => ipcRenderer.invoke("test", msg),
  login: (loginOptions: LoginData): Promise<LoginResponses> =>
    ipcRenderer.invoke("login", loginOptions),
  getAccounts: (): Promise<SteamAcc[]> => ipcRenderer.invoke("getAccounts"),
  updateWaxpeerApiKey: (
    username: string,
    waxpeerApiKey: string
  ): Promise<boolean> =>
    ipcRenderer.invoke("updateWaxpeerApiKey", username, waxpeerApiKey),
  changeWaxpeerState: (newState: boolean, username: string): Promise<boolean> =>
    ipcRenderer.invoke("changeWaxpeerState", newState, username),
  logout: (username: string): Promise<void> =>
    ipcRenderer.invoke("logout", username),
  updateUserSettings: (
    newSettings: IUserSettings,
    username: string
  ): Promise<boolean> =>
    ipcRenderer.invoke("updateUserSettings", newSettings, username),
  openLogsFolder: (username?: string): Promise<void> =>
    ipcRenderer.invoke("openLogsFolder", username),
};

const events = {
  waxpeerStateChanged: (callback: (state: boolean, username: string) => void) =>
    ipcRenderer.on("waxpeerStateChanged", (_e, state, username) =>
      callback(state, username)
    ),
  apiReady: (callback: () => void) => ipcRenderer.on("apiReady", callback),
};

contextBridge.exposeInMainWorld("api", api);
contextBridge.exposeInMainWorld("events", events);

type ApiType = typeof api;
type EventsType = typeof events;
export type { ApiType };
export type { EventsType };
