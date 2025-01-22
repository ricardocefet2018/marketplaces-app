import { ipcRenderer } from "electron";

export const events = {
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

  marketcsgoStateChanged: (
    callback: (state: boolean, username: string) => void
  ) =>
    ipcRenderer.on("marketcsgoStateChanged", (_e, state, username) =>
      callback(state, username)
    ),

  csfloatStateChanged: (callback: (state: boolean, username: string) => void) =>
    ipcRenderer.on("csfloatStateChanged", (_e, state, username) =>
      callback(state, username)
    ),

  apiReady: (callback: () => void) => ipcRenderer.on("apiReady", callback),
};
