import assert from "assert";
import fetch, { RequestInfo, RequestInit } from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";
import { sleepAsync } from "@doctormckay/stdlib/promises.js";
import { minutesToMS } from "../../shared/helpers";

export default class WaxpeerClient {
  private static API_URL = "https://api.waxpeer.com";
  private static API_URL_PRIVATE = "https://waxpeer.com/api";
  private lastBalanceUpdate = 0;
  private api_key: string;
  private keepingSendingSteamToken = false;
  private steamToken?: string;
  private proxy?: string;
  private user?: User;

  public get balance() {
    return this.user.wallet_balance.toFixed(3);
  }

  private constructor(api_key: string, proxy?: string) {
    this.api_key = api_key;
    this.proxy = proxy;
  }

  static async getInstance(api_key: string, proxy?: string) {
    const instance = new WaxpeerClient(api_key, proxy);
    await instance.updateBalance();
    return instance;
  }

  public async updateBalance(bought = false): Promise<void> {
    const fifteenMinutesAgo = Date.now() - 1000 * 60 * 15;
    if (!bought && this.lastBalanceUpdate > fifteenMinutesAgo) return;
    const url = `${WaxpeerClient.API_URL}/v1/user?api=${this.api_key}`;
    const res = await this.internalFetch(url);
    const json = (await res.json()) as UserResponse;
    if (res.status != 200) throw new Error(JSON.stringify(json));
    if (!this.user) this.user = new User(json.user);
    this.user.wallet_balance = json.user.wallet / 1000;
    this.lastBalanceUpdate = Date.now();
    return;
  }

  public getSteamId() {
    assert(!!this.user, "User not setted!");
    return this.user.steamid;
  }

  public getTWSInitObject() {
    assert(!!this.user, "User not defined!");
    assert(!!this.steamToken, "Steam token not defined!");
    return {
      steamid: this.user.steamid,
      tradelink: this.user.tradeLink,
      waxApi: this.api_key,
      accessToken: this.steamToken,
    };
  }

  public async readyToTransferP2P(): Promise<ReadyToTransferP2PResponse> {
    assert(!!this.user, "User not setted!");
    const url =
      WaxpeerClient.API_URL +
      "/v1/ready-to-transfer-p2p?steam_api=" +
      this.user.steam_api;
    const res = await this.internalFetch(url);
    const json = await res.json();
    return json as ReadyToTransferP2PResponse;
  }

  public async steamTrade(
    trade_id: string,
    costum_id: string
  ): Promise<{ success: boolean }> {
    const url = WaxpeerClient.API_URL + "/v1/steam-trade?api=" + this.api_key;
    const body = JSON.stringify({
      tradeid: trade_id,
      waxid: costum_id,
    });
    const options = {
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
      body: body,
    };
    const res = await this.internalFetch(url, options);
    const json = await res.json();
    if (res.status != 200) throw new Error(JSON.stringify(json));
    return json as SteamTradeResponse;
  }

  public async setSteamToken(steamToken: string) {
    this.steamToken = steamToken;
    if (this.keepingSendingSteamToken) await this.postSteamToken();
    if (!this.keepingSendingSteamToken) {
      this.keepingSendingSteamToken = true;
      this.keepSendingSteamToken();
    }
  }

  private async keepSendingSteamToken() {
    while (this.steamToken && this.keepingSendingSteamToken) {
      console.log("Sending steam token to waxpeer...");
      const result = await this.postSteamToken();
      console.log(result);
      if (!result.success) {
        this.keepingSendingSteamToken = false;
        break;
      }
      await sleepAsync(minutesToMS(30));
    }
    return;
  }

  private async postSteamToken(): Promise<SteamTokenResponse> {
    assert(this.steamToken, "Steam token not defined!");
    const url =
      WaxpeerClient.API_URL + `/v1/user/steam-token?api=${this.api_key}`;
    const body = JSON.stringify({
      token: btoa(this.steamToken),
    });
    try {
      const res = await this.internalFetch(url, {
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
        body: body,
      });
      const json = await res.json();
      return json as SteamTokenResponse;
    } catch (err) {
      await sleepAsync(minutesToMS(1));
      return await this.postSteamToken(); // try again after 1 min
    }
  }

  private internalFetch(url: URL | RequestInfo, init?: RequestInit) {
    if (this.proxy) {
      init = {
        agent: new HttpsProxyAgent(this.proxy),
        ...init,
      };
    }
    return fetch(url, init);
  }
}

interface IReadyTransferTrade {
  id: number;
  costum_id: string;
  trade_id: string;
  tradelink: string;
  trade_message: string;
  done: boolean;
  stage: number;
  creator: string;
  send_until: string;
  last_updated: string;
  for_steamid64: string;
  user: IReadyTransferUser;
  seller: IReadyTransferUser;
  items: IReadyTransferItem[];
}
interface IReadyTransferItem {
  id: number;
  item_id: string;
  give_amount: number;
  merchant: string;
  image: string;
  price: number;
  game: string;
  name: string;
  status: number;
}
interface IReadyTransferUser {
  id: string;
  avatar?: string;
}
interface ReadyToTransferP2PResponse {
  success: boolean;
  trades: IReadyTransferTrade[];
}
interface SteamTradeResponse {
  success: boolean;
  msg?: string;
}
interface SteamTokenResponse {
  success: boolean;
  msg: string;
  exp: number;
}

class User {
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

interface UserResponse {
  success: boolean;
  user: {
    wallet: number;
    id: string;
    userid: number;
    id64: string;
    avatar: string;
    name: string;
    sell_fees: number;
    can_p2p: boolean;
    tradelink: string;
    login: string;
    ref: string;
    sell_status: boolean;
    steam_api: string;
  };
}
