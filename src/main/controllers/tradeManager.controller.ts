import { WebContents } from "electron";
import { LoginData, SteamAcc, IUserSettings } from "../../shared/types";
import { User } from "../models/user";
import { TradeManager } from "../services/trademanager";

export class TradeManagerController {
  private static instance: TradeManagerController;
  private tradeManagers: Map<string, TradeManager> = new Map();
  private webContents: WebContents & { send: EventSender };

  constructor(mainWindowWebContents: WebContents) {
    this.webContents = mainWindowWebContents;
  }

  public static async factory(mainWindowWebContents: WebContents) {
    if (this.instance) return this.instance;
    this.instance = new TradeManagerController(mainWindowWebContents);
    await this.instance.tryToReloginSavedAccounts();
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
      tm.on("shadowpayStateChanged", (state, username) => {
        this.webContents.send("shadowpayStateChanged", state, username);
      });
      tm.on("marketcsgoStateChanged", (state, username) => {
        this.webContents.send("marketcsgoStateChanged", state, username);
      });
      try {
        this.changeWaxpeerState(user.waxpeerSettings.state, user.username);
        this.changeShadowpayState(user.shadowpaySettings.state, user.username);
        this.changeMarketcsgoState(
          user.marketcsgoSettings.state,
          user.username
        );
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
    tm.on("shadowpayStateChanged", (state, username) => {
      this.webContents.send("shadowpayStateChanged", state, username);
    });
    tm.on("marketcsgoStateChanged", (state, username) => {
      this.webContents.send("marketcsgoStateChanged", state, username);
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

  public hasAccounts(): boolean {
    return this.tradeManagers.size > 0;
  }

  public getAccountByUsername(username: string): SteamAcc {
    return this.tradeManagers.get(username).steamAcc;
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

  public async updateShadowpayApiKey(
    username: string,
    shadowpayApiKey: string
  ) {
    const tm = this.tradeManagers.get(username);
    if (!tm) throw new Error("User not found");
    try {
      await tm.updateShadowpayApiKey(shadowpayApiKey);
      return true;
    } catch (err) {
      tm.handleError(err);
      return false;
    }
  }

  public async updateMarketcsgoApiKey(
    username: string,
    marketcsgoApiKey: string
  ) {
    const tm = this.tradeManagers.get(username);
    if (!tm) throw new Error("User not found");
    try {
      await tm.updateMarketcsgoApiKey(marketcsgoApiKey);
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

  public async changeShadowpayState(newState: boolean, username: string) {
    const tm = this.tradeManagers.get(username);
    if (!tm) throw new Error("User not found");
    try {
      if (newState) await tm.startShadowpayClient();
      if (!newState) await tm.stopShadowpayClient();
      return;
    } catch (err) {
      tm.emit("shadowpayStateChanged", !newState, username);
      throw err;
    }
  }

  public async changeMarketcsgoState(newState: boolean, username: string) {
    const tm = this.tradeManagers.get(username);
    if (!tm) throw new Error("User not found");
    try {
      if (newState) await tm.startMarketcsgoClient();
      if (!newState) await tm.stopMarketcsgoClient();
      return;
    } catch (err) {
      tm.emit("marketcsgoStateChanged", !newState, username);
      throw err;
    }
  }

  public async updateUserSettings(
    newSettings: IUserSettings,
    username: string
  ) {
    const tm = this.tradeManagers.get(username);
    if (!tm) throw new Error("User not found");
    try {
      await tm.updateSettings(newSettings);
    } catch (err) {
      tm.handleError(err);
      return false;
    }
  }
}

export interface TradeManagerOptions {
  username: string;
  refreshToken: string;
  proxy?: string;
}
