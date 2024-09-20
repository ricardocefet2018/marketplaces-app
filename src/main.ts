import { app, BrowserWindow } from "electron";
import path from "path";
import { registerHandlers } from "./main/index";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
async function main() {
  if (require("electron-squirrel-startup")) {
    app.quit();
  }

  const createWindow = () => {
    const mainWindow = new BrowserWindow({
      width: 720,
      height: 800,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
      },
      autoHideMenuBar: true,
      resizable: false,
    });

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
      mainWindow.loadFile(
        path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
      );
    }
  };

  app.on("ready", () => {
    registerHandlers();
    createWindow();
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
