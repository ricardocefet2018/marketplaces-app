import { ipcMain, IpcMainInvokeEvent, Notification } from "electron";
import apiType from "../preload";
import { LoginResponses } from "../shared/enums";
import { TradeManagerController } from "./controllers/tradeManager.controller";
import { handleError } from "../shared/helpers";

type myType = <U extends keyof apiType>(
  channel: U,
  linstenner: (
    e: IpcMainInvokeEvent,
    ...args: Parameters<apiType[U]>
  ) => ReturnType<apiType[U]>
) => void;

const myHandler: myType = ipcMain.handle;

export function registerHandlers() {
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
}
