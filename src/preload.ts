// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from "electron";
import { LoginData, SteamAcc, IUserSettings, ISettings } from "./shared/types";
import { LoginResponses } from "./shared/enums";

const api = {
  test: (msg: string): Promise<string> => ipcRenderer.invoke("test", msg),
  login: (loginOptions: LoginData): Promise<LoginResponses> =>
    ipcRenderer.invoke("login", loginOptions),
  getAccounts: (): Promise<SteamAcc[]> => ipcRenderer.invoke("getAccounts"),
  getAccountByUsername: (username: string): Promise<SteamAcc> =>
    ipcRenderer.invoke("getAccountByUsername", username),
  hasAccounts: (): Promise<boolean> => ipcRenderer.invoke("hasAccounts"),
  updateWaxpeerApiKey: (
    username: string,
    waxpeerApiKey: string
  ): Promise<boolean> =>
    ipcRenderer.invoke("updateWaxpeerApiKey", username, waxpeerApiKey),
  updateShadowpayApiKey: (
    username: string,
    shadowpayApiKey: string
  ): Promise<boolean> =>
    ipcRenderer.invoke("updateShadowpayApiKey", username, shadowpayApiKey),
  changeWaxpeerState: (newState: boolean, username: string): Promise<boolean> =>
    ipcRenderer.invoke("changeWaxpeerState", newState, username),
  changeShadowpayState: (
    newState: boolean,
    username: string
  ): Promise<boolean> =>
    ipcRenderer.invoke("changeShadowpayState", newState, username),
  logout: (username: string): Promise<void> =>
    ipcRenderer.invoke("logout", username),
  updateUserSettings: (
    newSettings: IUserSettings,
    username: string
  ): Promise<boolean> =>
    ipcRenderer.invoke("updateUserSettings", newSettings, username),
  openLogsFolder: (username?: string): Promise<void> =>
    ipcRenderer.invoke("openLogsFolder", username),
  openExternalLink: (link: string): Promise<void> =>
    ipcRenderer.invoke("openExternalLink", link),
  getAppSettings: (): Promise<ISettings | null> =>
    ipcRenderer.invoke("getAppSettings"),
  setAppSettings: (settings: ISettings): Promise<boolean> =>
    ipcRenderer.invoke("setAppSettings", settings),
};

const events = {
  waxpeerStateChanged: (callback: (state: boolean, username: string) => void) =>
    ipcRenderer.on("waxpeerStateChanged", (_e, state, username) =>
      callback(state, username)
    ),
  shadowpayStateChanged: (
    callback: (state: boolean, username: string) => void
  ) =>
    ipcRenderer.on("shadowpayStateChanged", (_e, state, username) =>
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
