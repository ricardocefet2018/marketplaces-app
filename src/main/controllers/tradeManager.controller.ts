import { getAppStoragePath } from "../../shared/helpers";
import { LoginData } from "../../shared/types";
import { TradeManager } from "../models/trademanager.model";

export class TradeManagerController {
  private static instance: TradeManagerController;
  private tradeManagers: Map<string, TradeManager> = new Map();

  public static getInstance() {
    if (this.instance) return this.instance;
    this.instance = new TradeManagerController();
    return this.instance;
  }

  public async login(loginOptions: LoginData) {
    const tm = await TradeManager.getInstance({
      username: loginOptions.username,
      login: {
        password: loginOptions.password,
        authCode: loginOptions.authCode,
      },
      storagePathBase: getAppStoragePath(),
      proxy: loginOptions.proxy,
    });
    this.tradeManagers.set(loginOptions.username, tm);
    return;
  }
}

export interface TradeManagerOptions {
  username: string;
  refreshToken: string;
  proxy?: string;
}
