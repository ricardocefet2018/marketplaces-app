import { LoginData, SteamAcc } from "../../shared/types";
import { TradeManager } from "../models/trademanager.model";
import { User } from "../models/db.model";

export class TradeManagerController {
  private static instance: TradeManagerController;
  private tradeManagers: Map<string, TradeManager> = new Map();

  // constructor() {}

  public static async getInstance() {
    if (this.instance) return this.instance;
    this.instance = new TradeManagerController();
    await this.instance.tryToReloginSavedAccounts();
    return this.instance;
  }

  private async tryToReloginSavedAccounts() {
    const users = await User.findAll();
    for (const user of users) {
      const tm = await TradeManager.relogin(
        user.username,
        user.refreshToken,
        user.proxy
      );
      this.tradeManagers.set(user.username, tm);
    }
    return;
  }

  public async login(loginOptions: LoginData) {
    const tm = await TradeManager.login(loginOptions);
    this.tradeManagers.set(loginOptions.username, tm);
    return;
  }

  public getAccounts(): SteamAcc[] {
    const returningMap: SteamAcc[] = [];
    this.tradeManagers.forEach((tm) => {
      returningMap.push({
        username: tm.username,
        status: tm.hasSteamId(),
      });
    });
    return returningMap;
  }
}

export interface TradeManagerOptions {
  username: string;
  refreshToken: string;
  proxy?: string;
}
