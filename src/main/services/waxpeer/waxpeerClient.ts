import assert from "assert";
import fetch, { RequestInfo, RequestInit } from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";
import { sleepAsync } from "@doctormckay/stdlib/promises.js";
import { minutesToMS } from "../../../shared/helpers";
import { WaxpeerUser } from "./class/waxpeer.class";
import {
  ReadyToTransferP2PResponse,
  SteamTokenResponse,
  SteamTradeResponse,
  UserResponse,
} from "./interface/waxpeer.interface";

export default class WaxpeerClient {
  private static API_URL = "https://api.waxpeer.com";
  private static API_URL_PRIVATE = "https://waxpeer.com/api";
  private lastBalanceUpdate = 0;
  private api_key: string;
  private keepingSendingSteamToken = false;
  private steamToken?: string;
  private proxy?: string;
  private user?: WaxpeerUser;

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
    if (!this.user) this.user = new WaxpeerUser(json.user);
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
      const result = await this.postSteamToken();
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
