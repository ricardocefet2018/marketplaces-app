import { LoginData, SteamAcc } from "../../shared/types";
import { User } from "../models/entities";
import { TradeManager } from "../models/trademanager.model";

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
    const users = await User.find();
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
        username: tm.user.username,
        status: tm.hasSteamId(),
        waxpeerSettings: tm.user.waxpeerSettings,
      });
    });
    return returningMap;
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
}

export interface TradeManagerOptions {
  username: string;
  refreshToken: string;
  proxy?: string;
}
