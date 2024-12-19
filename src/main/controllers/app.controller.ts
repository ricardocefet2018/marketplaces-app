import { app, Notification, shell } from "electron";
import { Settings } from "../entities/settings";
import { ISettings } from "../../shared/types";

// Every OS function is supposed to be there
export class AppController {
  private static instance: AppController;
  private settings: ISettings;

  public static async factory(): Promise<AppController> {
    if (this.instance) return this.instance;
    this.instance = new AppController();
    await this.instance.getSettings();
    return this.instance;
  }

  public static getInstance(): AppController {
    if (!this.instance) throw new Error("Factory method not called before!");
    return this.instance;
  }

  public async getSettings(): Promise<ISettings> {
    let s = await Settings.findOne({ where: { id: 1 } });
    if (!s) s = await new Settings().save();
    this.settings = s;
    return s;
  }

  public async saveSettings(newSettings: ISettings): Promise<void> {
    let s = await Settings.findOne({ where: { id: 1 } });
    if (!s) s = await new Settings().save();

    s = Object.assign(s, newSettings);
    this.settings = newSettings;
    if (!process.env["NODE_ENV"])
      app.setLoginItemSettings({
        openAtLogin: s.startWithWindow,
      });

    await s.save();
  }

  public notify(options: Electron.NotificationConstructorOptions): void {
    if (this.settings.notification) new Notification(options).show();
  }

  public openExternalLink(link: string): void {
    shell.openExternal(link);
  }

  public openLogsPath(username?: string) {
    let path = app.getPath("userData");
    if (username) path += `\\acc_${username}`;
    path += "\\logs";
    shell.openPath(path);
  }
}
