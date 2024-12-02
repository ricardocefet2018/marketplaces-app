import { ipcMain, Notification, shell } from "electron";
import { LoginResponses } from "../shared/enums";
import { TradeManagerController } from "./controllers/tradeManager.controller";
import { getAppStoragePath, handleError } from "../shared/helpers";
import { FetchError } from "node-fetch";
import { Settings } from "./models/settings";
import { ISettings } from "../shared/types";

export function registerHandlers() {
  const myHandler: apiHandler = ipcMain.handle;

  myHandler("test", async (e, msg) => {
    return msg.toUpperCase();
  });

  myHandler("login", async (e, loginOptions) => {
    const tmc = TradeManagerController.getInstance();
    try {
      await tmc.login(loginOptions);
      new Notification({
        title: "Logged on successfully",
        body: `Account ${loginOptions.username} logged on successfully!`,
      }).show();
      return LoginResponses.success;
    } catch (err) {
      new Notification({
        title: "Can't login!",
        body: err.message,
      }).show();
      return LoginResponses.fail;
    }
  });

  myHandler("getAccounts", async () => {
    return TradeManagerController.getInstance().getAccounts();
  });

  myHandler("hasAccounts", async () => {
    return TradeManagerController.getInstance().hasAccounts();
  });

  myHandler("getAccountByUsername", async (e, username) => {
    return TradeManagerController.getInstance().getAccountByUsername(username);
  });

  myHandler("updateWaxpeerApiKey", async (e, username, waxpeerApiKey) => {
    const tmc = TradeManagerController.getInstance();
    try {
      const status = await tmc.updateWaxpeerApiKey(username, waxpeerApiKey);
      return status;
    } catch (err) {
      handleError(err);
      return false;
    }
  });

  myHandler("changeWaxpeerState", async (e, newState, username) => {
    const tmc = TradeManagerController.getInstance();
    try {
      await tmc.changeWaxpeerState(newState, username);
      new Notification({
        title: "Waxpeer state changed!",
        body: `${username} waxpeer state has successfully turn ${
          newState ? "online" : "offline"
        }`,
      }).show();
      return true;
    } catch (err) {
      let body = "Check out the logs.";
      if (err instanceof FetchError)
        body += " Most likely you or server is offline.";
      else if (err instanceof Error && err.message.startsWith("{"))
        body += " " + err.message;
      else body += " Most likely your DB is corrupted.";
      new Notification({
        title: "Something gone wrong!",
        body,
      }).show();
      handleError(err);
    }
    return false;
  });

  myHandler("logout", async (e, username) => {
    const tmc = TradeManagerController.getInstance();
    try {
      await tmc.logout(username);
      new Notification({
        title: "Logged out successfully!",
        body: `Account ${username} was removed!`,
      }).show();
    } catch (err) {
      new Notification({
        title: "Error on logout!",
        body: err.message ?? "Unknow error. Check your logs!",
      }).show();
      handleError(err);
    }
  });

  myHandler("updateUserSettings", async (e, newSettings, username) => {
    const tmc = TradeManagerController.getInstance();
    try {
      await tmc.updateUserSettings(newSettings, username);
      new Notification({
        title: "User settings saved!",
      }).show();
      return true;
    } catch (err) {
      new Notification({
        title: "Can't save settings.",
        body:
          err.message ??
          "Most likely your DB is corrupted. Check out your logs.",
      }).show();
      handleError(err);
      return false;
    }
  });

  myHandler("openLogsFolder", async (e, username) => {
    let path = getAppStoragePath();
    if (username) path += `\\acc_${username}`;
    path += "\\logs";
    shell.openPath(path);
  });

  myHandler("openExternalLink", async (e, link) => {
    shell.openExternal(link);
  });

  myHandler("getAppSettings", async () => {
    try {
      return await Settings.findOne({ where: { id: 1 } });
    } catch (err) {
      handleError(err);
      new Notification({
        title: "Error getting app settings.",
        body: "Most likely your DB is corrupted.",
      });
      return null;
    }
  });

  myHandler("setAppSettings", async (e, newSettings: ISettings) => {
    try {
      let settings = await Settings.findOne({ where: { id: 1 } });
      settings = Object.assign(settings, newSettings);
      await settings.save();
      new Notification({
        title: "Settings saved successfully.",
      }).show();
      return true;
    } catch (err) {
      handleError(err);
      new Notification({
        title: "Error getting app settings.",
        body: "Most likely your DB is corrupted.",
      }).show();
      return false;
    }
  });
}
