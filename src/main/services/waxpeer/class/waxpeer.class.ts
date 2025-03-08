import { UserResponse } from "../interface/waxpeer.interface";

export class WaxpeerUser {
  public sell_status: boolean;
  public id: string;
  public name: string;
  public steamid: string;
  public wallet_balance: number;
  public wallet_balance_int: number;
  public tradeLink: string;
  public partnerAndToken: string;
  public steam_api: string;

  public constructor(user: UserResponse["user"]) {
    this.wallet_balance = user.wallet / 1000;
    this.wallet_balance_int = user.wallet;
    this.id = user.id;
    this.steamid = user.id64;
    this.name = user.name;
    this.sell_status = user.sell_status;
    this.tradeLink = user.tradelink;
    this.partnerAndToken = user.tradelink.split("?")[1];
    this.steam_api = user.steam_api;
  }
}
