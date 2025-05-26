import { ipcRenderer } from "electron";
import {
  LoginData,
  SteamAcc,
  IUserSettings,
  ISettings,
  ApiResponse,
} from "../shared/types";
import { LoginResponses } from "../shared/enums";

export const api = {
  // General
  test: (msg: string): Promise<string> => ipcRenderer.invoke("test", msg),

  // Login
  login: (loginOptions: LoginData): Promise<LoginResponses> =>
    ipcRenderer.invoke("login", loginOptions),
  logout: (username: string): Promise<void> =>
    ipcRenderer.invoke("logout", username),

  // Accounts
  getAccounts: (): Promise<SteamAcc[]> => ipcRenderer.invoke("getAccounts"),
  getAccountByUsername: (username: string): Promise<SteamAcc> =>
    ipcRenderer.invoke("getAccountByUsername", username),
  hasAccounts: (): Promise<boolean> => ipcRenderer.invoke("hasAccounts"),


  getInventoryInfo: (username: string): Promise<{
    tradableItems: number,
    inventoryBalanceFloat: number,
    inventoryBalanceBuff: number
  }> =>
    ipcRenderer.invoke("getInventoryInfo", username),

  // Update API Keys
  updateWaxpeerApiKey: (
    username: string,
    waxpeerApiKey: string
  ): Promise<ApiResponse> =>
    ipcRenderer.invoke("updateWaxpeerApiKey", username, waxpeerApiKey),
  updateShadowpayApiKey: (
    username: string,
    shadowpayApiKey: string
  ): Promise<ApiResponse> =>
    ipcRenderer.invoke("updateShadowpayApiKey", username, shadowpayApiKey),
  updateMarketcsgoApiKey: (
    username: string,
    marketcsgoApiKey: string
  ): Promise<ApiResponse> =>
    ipcRenderer.invoke("updateMarketcsgoApiKey", username, marketcsgoApiKey),
  updateCSFloatApiKey: (
    username: string,
    csfloatApiKey: string
  ): Promise<ApiResponse> =>
    ipcRenderer.invoke("updateCSFloatApiKey", username, csfloatApiKey),

  // Change States
  changeWaxpeerState: (
    newState: boolean,
    username: string
  ): Promise<ApiResponse> =>
    ipcRenderer.invoke("changeWaxpeerState", newState, username),
  changeShadowpayState: (
    newState: boolean,
    username: string
  ): Promise<ApiResponse> =>
    ipcRenderer.invoke("changeShadowpayState", newState, username),
  changeMarketcsgoState: (
    newState: boolean,
    username: string
  ): Promise<ApiResponse> =>
    ipcRenderer.invoke("changeMarketcsgoState", newState, username),
  changeCSFloatState: (
    newState: boolean,
    username: string
  ): Promise<ApiResponse> =>
    ipcRenderer.invoke("changeCSFloatState", newState, username),

  // Settings
  updateUserSettings: (
    newSettings: IUserSettings,
    username: string
  ): Promise<ApiResponse> =>
    ipcRenderer.invoke("updateUserSettings", newSettings, username),
  getAppSettings: (): Promise<ISettings | null> =>
    ipcRenderer.invoke("getAppSettings"),
  setAppSettings: (settings: ISettings): Promise<ApiResponse> =>
    ipcRenderer.invoke("setAppSettings", settings),

  // Utilities
  openLogsFolder: (username?: string): Promise<void> =>
    ipcRenderer.invoke("openLogsFolder", username),
  openExternalLink: (link: string): Promise<void> =>
    ipcRenderer.invoke("openExternalLink", link),
};
