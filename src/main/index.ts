import { ipcMain, Notification, WebContents } from "electron";
import { LoginResponses } from "../shared/enums";
import { TradeManagerController } from "./controllers/tradeManager.controller";
import { handleError } from "../shared/helpers";
import { FetchError } from "node-fetch";
import { ISettings } from "../shared/types";
import { AppController } from "./controllers/app.controller";
import AppError from "./models/AppError";

export async function registerHandlers(mainWindowWebContents: WebContents) {
  const appController = await AppController.factory();
  const tradeManagerController = await TradeManagerController.factory(
    mainWindowWebContents
  );
  const myHandler: apiHandler = ipcMain.handle;

  myHandler("test", async (e, msg) => {
    return msg.toUpperCase();
  });

  myHandler("login", async (e, loginOptions) => {
    try {
      await tradeManagerController.login(loginOptions);
      appController.notify({
        title: "Logged on successfully",
        body: `Account ${loginOptions.username} logged on successfully!`,
      });
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
    return tradeManagerController.getAccounts();
  });

  myHandler("hasAccounts", async () => {
    return tradeManagerController.hasAccounts();
  });

  myHandler("getAccountByUsername", async (e, username) => {
    return tradeManagerController.getAccountByUsername(username);
  });

  myHandler("updateWaxpeerApiKey", async (e, username, waxpeerApiKey) => {
    try {
      const status = await tradeManagerController.updateWaxpeerApiKey(
        username,
        waxpeerApiKey
      );
      return status;
    } catch (err) {
      handleError(err);
      return false;
    }
  });

  myHandler("updateShadowpayApiKey", async (e, username, shadowpayApikey) => {
    try {
      const status = await tradeManagerController.updateShadowpayApiKey(
        username,
        shadowpayApikey
      );
      return status;
    } catch (err) {
      handleError(err);
      return false;
    }
  });

  myHandler("updateMarketcsgoApiKey", async (e, username, marketcsgoApiKey) => {
    try {
      const status = await tradeManagerController.updateMarketcsgoApiKey(
        username,
        marketcsgoApiKey
      );
      return status;
    } catch (err) {
      handleError(err);
      return false;
    }
  });

  myHandler("changeWaxpeerState", async (e, newState, username) => {
    try {
      await tradeManagerController.changeWaxpeerState(newState, username);
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

  myHandler("changeShadowpayState", async (e, newState, username) => {
    try {
      await tradeManagerController.changeShadowpayState(newState, username);
      new Notification({
        title: "Shadowpay state changed!",
        body: `${username} shadowpay state has successfully turn ${
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

  myHandler("changeMarketcsgoState", async (e, newState, username) => {
    try {
      await tradeManagerController.changeMarketcsgoState(newState, username);
      new Notification({
        title: "Marketcsgo state changed!",
        body: `${username} marketcsgo state has successfully turn ${
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
      else if (err instanceof AppError) body += " " + err.message;
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
    try {
      await tradeManagerController.logout(username);
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
    try {
      await tradeManagerController.updateUserSettings(newSettings, username);
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
    appController.openLogsPath(username);
  });

  myHandler("openExternalLink", async (e, link) => {
    appController.openExternalLink(link);
  });

  myHandler("getAppSettings", async () => {
    try {
      return await appController.getSettings();
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
      await appController.saveSettings(newSettings);
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

  mainWindowWebContents.send("apiReady");
}
