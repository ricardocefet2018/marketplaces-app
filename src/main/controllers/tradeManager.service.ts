import { WebContents } from "electron";
import { LoginData, SteamAcc, IUserSettings } from "../../shared/types";
import { TradeManager } from "../services/trade-manager/trademanager";
import { User } from "../entities/user.entity";

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
      tm.on("waxpeerCanSellStateChanged", (state, username) => {
        this.webContents.send("waxpeerCanSellStateChanged", state, username);
      });
      tm.on("waxpeerStateChanged", (state, username) => {
        this.webContents.send("waxpeerStateChanged", state, username);
      });
      tm.on("shadowpayCanSellStateChanged", (state, username) => {
        this.webContents.send("shadowpayCanSellStateChanged", state, username);
      });
      tm.on("shadowpayStateChanged", (state, username) => {
        this.webContents.send("shadowpayStateChanged", state, username);
      });
      tm.on("marketcsgoCanSellStateChanged", (state, username) => {
        this.webContents.send("marketcsgoCanSellStateChanged", state, username);
      });
      tm.on("marketcsgoStateChanged", (state, username) => {
        this.webContents.send("marketcsgoStateChanged", state, username);
      });
      tm.on("csfloatCanSellStateChanged", (state, username) => {
        this.webContents.send("csfloatCanSellStateChanged", state, username);
      });
      tm.on("csfloatStateChanged", (state, username) => {
        this.webContents.send("csfloatStateChanged", state, username);
      });
      try {
        this.changeWaxpeerState(user.waxpeer.state, user.username);
        this.changeShadowpayState(user.shadowpay.state, user.username);
        this.changeMarketcsgoState(user.marketcsgo.state, user.username);
        this.changeCSFloatState(user.csfloat.state, user.username);
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
    tm.on("csfloatStateChanged", (state, username) => {
      this.webContents.send("csfloatStateChanged", state, username);
    });
    this.tradeManagers.set(loginOptions.username, tm);
    return;
  }

  public async logout(username: string) {
    const tradeManager = this.tradeManagers.get(username);
    if (!tradeManager) throw new Error("User not found");

    tradeManager.removeAllListeners();
    await tradeManager.logout();
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
    const tradeManager = this.tradeManagers.get(username);
    if (!tradeManager) throw new Error("User not found");

    try {
      await tradeManager.updateWaxpeerApiKey(waxpeerApiKey);
      return true;
    } catch (err) {
      tradeManager.handleError(err);
      return false;
    }
  }

  public async updateShadowpayApiKey(
    username: string,
    shadowpayApiKey: string
  ) {
    const tradeManager = this.tradeManagers.get(username);
    if (!tradeManager) throw new Error("User not found");

    try {
      await tradeManager.updateShadowpayApiKey(shadowpayApiKey);
      return true;
    } catch (err) {
      tradeManager.handleError(err);
      return false;
    }
  }

  public async updateMarketcsgoApiKey(
    username: string,
    marketcsgoApiKey: string
  ) {
    const tradeManager = this.tradeManagers.get(username);
    if (!tradeManager) throw new Error("User not found");

    try {
      await tradeManager.updateMarketcsgoApiKey(marketcsgoApiKey);
      return true;
    } catch (err) {
      tradeManager.handleError(err);
      return false;
    }
  }

  public async updateCSFloatApiKey(username: string, CSFloatApiKey: string) {
    const tradeManager = this.tradeManagers.get(username);
    if (!tradeManager) throw new Error("User not found");

    try {
      await tradeManager.updateCSFloatApiKey(CSFloatApiKey);
      return true;
    } catch (err) {
      tradeManager.handleError(err);
      return false;
    }
  }

  public async changeWaxpeerState(newState: boolean, username: string) {
    const tradeManager = this.getTradeManager(username);

    try {
      if (newState) await tradeManager.startWaxpeerClient();
      if (!newState) await tradeManager.stopWaxpeerClient();
      return;
    } catch (err) {
      if (!newState) await tradeManager.startWaxpeerClient();
      if (newState) await tradeManager.stopWaxpeerClient();
      throw err;
    }
  }

  public async changeShadowpayState(newState: boolean, username: string) {
    const tradeManager = this.getTradeManager(username);

    try {
      if (newState) await tradeManager.startShadowpayClient();
      if (!newState) await tradeManager.stopShadowpayClient();
      return;
    } catch (err) {
      if (!newState) await tradeManager.startShadowpayClient();
      if (newState) await tradeManager.stopShadowpayClient();
      throw err;
    }
  }

  public async changeMarketcsgoState(newState: boolean, username: string) {
    const tradeManager = this.getTradeManager(username);
    try {
      if (newState) await tradeManager.startMarketcsgoClient();
      if (!newState) await tradeManager.stopMarketcsgoClient();
      return;
    } catch (err) {
      if (!newState) await tradeManager.startMarketcsgoClient();
      if (newState) await tradeManager.stopMarketcsgoClient();
      throw err;
    }
  }

  public async changeCSFloatState(
    newState: boolean,
    username: string
  ): Promise<void> {
    const tradeManager = this.getTradeManager(username);
    try {
      if (newState) return tradeManager.startCSFloatClient();
      return tradeManager.stopCSFloatClient();
    } catch (err) {
      if (!newState) await tradeManager.startCSFloatClient();
      else await tradeManager.stopCSFloatClient();
      throw err;
    }
  }

  public async updateUserSettings(
    newSettings: IUserSettings,
    username: string
  ) {
    const tradeManager = this.tradeManagers.get(username);
    if (!tradeManager) throw new Error("User not found");

    try {
      await tradeManager.updateSettings(newSettings);
      return true;
    } catch (err) {
      tradeManager.handleError(err);
      return false;
    }
  }

  public getTradeManager(username: string): TradeManager {
    const tradeManager = this.tradeManagers.get(username);

    if (!tradeManager) throw new Error("User not found");
    if (!tradeManager.steamAcc.status)
      throw new Error("Steam account is offline, please relogin");

    return tradeManager;
  }
}

export interface TradeManagerOptions {
  username: string;
  refreshToken: string;
  proxy?: string;
}
