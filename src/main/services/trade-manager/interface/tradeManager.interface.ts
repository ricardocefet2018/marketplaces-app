import { LoginData } from "../../../../shared/types";

export interface TradeManagerOptions {
  storagePathBase: string;
  username: string;
  login: string | LoginData; // Can be refreshToken or LoginData
  proxy?: string;
}
