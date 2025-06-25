import { ipcMain, Notification, WebContents } from "electron";
import { LoginResponses } from "../shared/enums";
import { TradeManagerService } from "./services/tradeManager.service";
import { handleError } from "../shared/helpers";
import { FetchError } from "node-fetch";
import { ISettings } from "../shared/types";
import { AppService } from "./services/app.service";
import AppError from "./models/AppError";

export async function registerHandlers(mainWindowWebContents: WebContents) {
  const appService = await AppService.factory();
  const tradeManagerService = await TradeManagerService.factory(
    mainWindowWebContents
  );
  const myHandler: apiHandler = ipcMain.handle;

  myHandler("test", async (e, msg) => {
    return msg.toUpperCase();
  });

  myHandler("login", async (e, loginOptions) => {
    try {
      await tradeManagerService.login(loginOptions);
      appService.notify({
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
    return tradeManagerService.getAccounts();
  });

  myHandler("hasAccounts", async () => {
    return tradeManagerService.hasAccounts();
  });

  myHandler("getAccountByUsername", async (e, username) => {
    return tradeManagerService.getAccountByUsername(username);
  });

  myHandler("updateWaxpeerApiKey", async (e, username, waxpeerApiKey) => {
    try {
      const success = await tradeManagerService.updateWaxpeerApiKey(
        username,
        waxpeerApiKey
      );
      if (!success)
        return {
          success,
          msg: `Error updating Waxpeer api key. Most likely your DB is corrupted.`,
        };

      return {
        success,
      };
    } catch (err) {
      handleError(err);
      return {
        success: false,
        msg: "Unexpected Error. Please relogin.",
      };
    }
  });

  myHandler("updateShadowpayApiKey", async (e, username, shadowpayApikey) => {
    try {
      const success = await tradeManagerService.updateShadowpayApiKey(
        username,
        shadowpayApikey
      );
      if (!success)
        return {
          success,
          msg: `Error updating Shadowpay api key. Most likely your DB is corrupted.`,
        };

      return {
        success,
      };
    } catch (err) {
      handleError(err);
      return {
        success: false,
        msg: "Unexpected Error. Please relogin.",
      };
    }
  });

  myHandler("updateMarketcsgoApiKey", async (e, username, marketcsgoApiKey) => {
    try {
      const success = await tradeManagerService.updateMarketcsgoApiKey(
        username,
        marketcsgoApiKey
      );
      if (!success)
        return {
          success,
          msg: `Error updating Marketcsgo api key. Most likely your DB is corrupted.`,
        };

      return {
        success,
      };
    } catch (err) {
      handleError(err);
      return {
        success: false,
        msg: "Unexpected Error. Please relogin.",
      };
    }
  });

  myHandler("updateCSFloatApiKey", async (e, username, csfloatApiKey) => {
    try {
      const success = await tradeManagerService.updateCSFloatApiKey(
        username,
        csfloatApiKey
      );
      if (!success)
        return {
          success,
          msg: `Error updating CSFloat api key. Most likely your DB is corrupted.`,
        };

      return {
        success,
      };
    } catch (err) {
      handleError(err);
      return {
        success: false,
        msg: "Unexpected Error. Please relogin.",
      };
    }
  });

  myHandler("changeWaxpeerState", async (e, newState, username) => {
    try {
      await tradeManagerService.changeWaxpeerState(newState, username);
      return {
        success: true,
      };
    } catch (err) {
      let body = "Check out the logs.";
      if (err instanceof FetchError)
        body += " Most likely you or server is offline.";
      else if (err instanceof Error && err.message.startsWith("{"))
        body += " " + err.message;
      else body += " Most likely your DB is corrupted.";
      handleError(err);
      return {
        success: false,
        msg: body,
      };
    }
  });

  myHandler("changeShadowpayState", async (e, newState, username) => {
    try {
      await tradeManagerService.changeShadowpayState(newState, username);
      return {
        success: true,
      };
    } catch (err) {
      let body = "Check out the logs.";
      if (err instanceof FetchError)
        body += " Most likely you or server is offline.";
      else if (err instanceof Error && err.message.startsWith("{"))
        body += " " + err.message;
      else body += " Most likely your DB is corrupted.";
      handleError(err);
      return {
        success: false,
        msg: body,
      };
    }
  });

  myHandler("changeMarketcsgoState", async (e, newState, username) => {
    try {
      await tradeManagerService.changeMarketcsgoState(newState, username);
      return {
        success: true,
      };
    } catch (err) {
      let body = "Check out the logs.";
      if (err instanceof FetchError)
        body += " Most likely you or server is offline.";
      else if (err instanceof Error && err.message.startsWith("{"))
        body += " " + err.message;
      else if (err instanceof AppError) body += " " + err.message;
      else body += " Most likely your DB is corrupted.";
      handleError(err);
      return {
        success: false,
        msg: body,
      };
    }
  });

  myHandler("changeCSFloatState", async (e, newState, username) => {
    try {
      await tradeManagerService.changeCSFloatState(newState, username);
      return {
        success: true,
      };
    } catch (err) {
      let body = "Check out the logs.";
      if (err instanceof FetchError)
        body += " Most likely you or server is offline.";
      else if (err instanceof Error && err.message.startsWith("{"))
        body += " " + err.message;
      else body += " Most likely your DB is corrupted.";
      handleError(err);
      return {
        success: false,
        msg: body,
      };
    }
  });

  myHandler("logout", async (e, username) => {
    try {
      await tradeManagerService.logout(username);
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
      const success = await tradeManagerService.updateUserSettings(
        newSettings,
        username
      );
      if (!success)
        return {
          success,
          msg: `Error updating user settings. Most likely your DB is corrupted.`,
        };

      return {
        success,
      };
    } catch (err) {
      handleError(err);
      return {
        success: false,
        msg: "Unexpected Error. Please relogin.",
      };
    }
  });

  myHandler("openLogsFolder", async (e, username) => {
    appService.openLogsPath(username);
  });

  myHandler("openExternalLink", async (e, link) => {
    appService.openExternalLink(link);
  });

  myHandler("getAppSettings", async () => {
    try {
      return await appService.getSettings();
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
      await appService.saveSettings(newSettings);
      return {
        success: true,
      };
    } catch (err) {
      handleError(err);
      return {
        success: false,
        msg: "Unexpected Error. Most likely your DB is corrupted.",
      };
    }
  });

  mainWindowWebContents.send("apiReady");
}
