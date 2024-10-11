import { WebContents } from "electron";
import { LoginData, SteamAcc } from "../../shared/types";
import { User } from "../models/user";
import { TradeManager } from "../services/trademanager";

export class TradeManagerController {
  private static instance: TradeManagerController;
  private tradeManagers: Map<string, TradeManager> = new Map();
  private webContents: WebContents & { send: EventSender };

  // constructor() {}

  public static async factory(mainWindowWebContents: WebContents) {
    if (this.instance) this.instance;
    this.instance = new TradeManagerController();
    this.instance.webContents = mainWindowWebContents;
    await this.instance.tryToReloginSavedAccounts();
    this.instance.webContents.send("apiReady");
    return this.instance;
  }

  public static getInstance() {
    if (!this.instance) throw new Error("Factory method not called before!");
    return this.instance;
  }

  private async tryToReloginSavedAccounts() {
    const users = await User.find();
    for (const user of users) {
      const tm = await TradeManager.relogin(
        user.username,
        user.refreshToken,
        user.proxy
      );
      this.tradeManagers.set(user.username, tm);
      tm.on("waxpeerStateChanged", (state, username) => {
        this.webContents.send("waxpeerStateChanged", state, username);
      });
      try {
        this.changeWaxpeerState(user.waxpeerSettings.state, user.username);
      } catch (err) {
        tm.handleError(err);
      }
    }
    return;
  }

  public async login(loginOptions: LoginData) {
    const tm = await TradeManager.login(loginOptions);
    tm.on("waxpeerStateChanged", (state, username) => {
      this.webContents.send("waxpeerStateChanged", state, username);
    });
    this.tradeManagers.set(loginOptions.username, tm);
    return;
  }

  public async logout(username: string) {
    if (!this.tradeManagers.has(username)) throw new Error("User not found");
    const tm = this.tradeManagers.get(username);
    tm.removeAllListeners();
    await tm.logout();
    this.tradeManagers.delete(username);
    return;
  }

  public getAccounts(): SteamAcc[] {
    const returningArray: SteamAcc[] = [];
    this.tradeManagers.forEach((tm) => {
      returningArray.push(tm.steamAcc);
    });
    return returningArray;
  }

  public async updateWaxpeerApiKey(
    username: string,
    waxpeerApiKey: string
  ): Promise<boolean> {
    const tm = this.tradeManagers.get(username);
    if (!tm) throw new Error("User not found");
    try {
      await tm.updateWaxpeerApiKey(waxpeerApiKey);
      return true;
    } catch (err) {
      tm.handleError(err);
      return false;
    }
  }

  public async changeWaxpeerState(newState: boolean, username: string) {
    const tm = this.tradeManagers.get(username);
    if (!tm) throw new Error("User not found");
    try {
      if (newState) await tm.startWaxpeerClient();
      if (!newState) await tm.stopWaxpeerClient();
      return;
    } catch (err) {
      tm.emit("waxpeerStateChanged", !newState, username);
      throw err;
    }
  }
}

export interface TradeManagerOptions {
  username: string;
  refreshToken: string;
  proxy?: string;
}
