import { LoginData } from "../../../../shared/types";

interface TradeManagerEvents {
  waxpeerStateChanged: (state: boolean, username: string) => void;
  shadowpayStateChanged: (state: boolean, username: string) => void;
  marketcsgoStateChanged: (state: boolean, username: string) => void;
  loggedOn: (tm: TradeManager) => void;
}

export declare interface TradeManager {
  emit<U extends keyof TradeManagerEvents>(
    event: U,
    ...args: Parameters<TradeManagerEvents[U]>
  ): boolean;

  on<U extends keyof TradeManagerEvents>(
    event: U,
    listener: TradeManagerEvents[U]
  ): this;

  once<U extends keyof TradeManagerEvents>(
    event: U,
    listener: TradeManagerEvents[U]
  ): this;
}

export interface TradeManagerOptions {
  storagePathBase: string;
  username: string;
  login: string | LoginData; // Can be refreshToken or LoginData
  proxy?: string;
}
