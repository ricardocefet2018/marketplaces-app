import { app, BrowserWindow, Menu, Tray } from "electron";
import { DB } from "./main/services/db";
import path from "path";
import { registerHandlers } from "./main/index";
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

    await createTray(mainWindow);
    hideWindow(mainWindow);

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      // mainWindow.webContents.openDevTools();
      await mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
      await mainWindow.loadFile(
        path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
      );
    }

    return mainWindow.webContents;
  };

  const hideWindow = (mainWindow: BrowserWindow) => {
    mainWindow.on("minimize", (event: Event) => {
      event.preventDefault();
      mainWindow.hide();
    });
  };

  const createTray = async (mainWindow: BrowserWindow) => {
    const icon = app.getFileIcon(process.execPath);
    let tray = new Tray(await icon);
    tray.setToolTip("Multi-Apps");
    tray.setContextMenu(
      Menu.buildFromTemplate([
        {
          label: "Show App",
          click: () => mainWindow && mainWindow.show(),
        },
        {
          label: "Quit",
          click: () => app.quit(),
        },
      ])
    );

    tray.on("double-click", () => {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    });
  };

  app.on("ready", async () => {
    console.log("App ready!");
    try {
      await DB.start();
    } catch (err) {
      handleError(err);
    }
    const mainWindowWebContents = await createWindow();
    try {
      await registerHandlers(mainWindowWebContents);
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
