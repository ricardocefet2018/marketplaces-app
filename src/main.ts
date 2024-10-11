import { app, BrowserWindow } from "electron";
import { DB } from "./main/services/db";
import path from "path";
import { registerHandlers } from "./main/index";
import { TradeManagerController } from "./main/controllers/tradeManager.controller";
import { handleError } from "./shared/helpers";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
async function main() {
  if (require("electron-squirrel-startup")) {
    app.quit();
  }

  const createWindow = async () => {
    const mainWindow = new BrowserWindow({
      width: 720,
      height: 800,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
      },
      autoHideMenuBar: true,
      resizable: false,
    });

    mainWindow.webContents.openDevTools();

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      await mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
      await mainWindow.loadFile(
        path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
      );
    }

    return mainWindow.webContents;
  };

  app.on("ready", async () => {
    console.log("App ready!");
    try {
      await DB.start();
    } catch (err) {
      handleError(err);
    }
    registerHandlers();
    const mainWindowWebContents = await createWindow();
    try {
      await TradeManagerController.factory(mainWindowWebContents); // TODO this function turn sync if there is no accounts emiting "apiReady" event before the window load any url
    } catch (err) {
      handleError(err);
    }
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}

main();
