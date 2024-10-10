import { ipcMain, Notification } from "electron";
import { LoginResponses } from "../shared/enums";
import { TradeManagerController } from "./controllers/tradeManager.controller";
import { handleError } from "../shared/helpers";
import { FetchError } from "node-fetch";

export function registerHandlers() {
  const myHandler: apiHandler = ipcMain.handle;

  myHandler("test", async (e, msg) => {
    return msg.toUpperCase();
  });

  myHandler("login", async (e, loginOptions) => {
    const tmc = await TradeManagerController.getInstance();
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
    const tmc = await TradeManagerController.getInstance();
    return tmc.getAccounts();
  });

  myHandler("updateWaxpeerApiKey", async (e, username, waxpeerApiKey) => {
    const tmc = await TradeManagerController.getInstance();
    try {
      const status = await tmc.updateWaxpeerApiKey(username, waxpeerApiKey);
      return status;
    } catch (err) {
      handleError(err);
      return false;
    }
  });

  myHandler("changeWaxpeerState", async (e, newState, username) => {
    const tmc = await TradeManagerController.getInstance();
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
}
