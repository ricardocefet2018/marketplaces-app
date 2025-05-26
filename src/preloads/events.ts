import { ipcRenderer } from "electron";

export const events = {
  waxpeerCanSellStateChanged: (
    callback: (state: boolean, username: string) => void
  ) =>
    ipcRenderer.on("waxpeerCanSellStateChanged", (_e, state, username) =>
      callback(state, username)
    ),

  waxpeerStateChanged: (callback: (state: boolean, username: string) => void) =>
    ipcRenderer.on("waxpeerStateChanged", (_e, state, username) =>
      callback(state, username)
    ),

  shadowpayCanSellStateChanged: (
    callback: (state: boolean, username: string) => void
  ) =>
    ipcRenderer.on("shadowpayCanSellStateChanged", (_e, state, username) =>
      callback(state, username)
    ),

  shadowpayStateChanged: (
    callback: (state: boolean, username: string) => void
  ) =>
    ipcRenderer.on("shadowpayStateChanged", (_e, state, username) =>
      callback(state, username)
    ),

  marketcsgoStateChanged: (
    callback: (state: boolean, username: string) => void
  ) =>
    ipcRenderer.on("marketcsgoStateChanged", (_e, state, username) =>
      callback(state, username)
    ),

  marketcsgoCanSellStateChanged: (
    callback: (state: boolean, username: string) => void
  ) =>
    ipcRenderer.on("marketcsgoCanSellStateChanged", (_e, state, username) =>
      callback(state, username)
    ),

  csfloatStateChanged: (callback: (state: boolean, username: string) => void) =>
    ipcRenderer.on("csfloatStateChanged", (_e, state, username) =>
      callback(state, username)
    ),

  csfloatCanSellStateChanged: (
    callback: (state: boolean, username: string) => void
  ) =>
    ipcRenderer.on("csfloatCanSellStateChanged", (_e, state, username) =>
      callback(state, username)
    ),
  getInventoryInfo: (
    callback: (info: {
      tradableItems: number,
      inventoryBalanceFloat: number,
      inventoryBalanceBuff: number
    }, username: string) => void
  ) =>
    ipcRenderer.on("getInventoryInfo", (_e, info, username) =>
      callback(info, username)
    ),

  apiReady: (callback: () => void) => ipcRenderer.on("apiReady", callback),
};
