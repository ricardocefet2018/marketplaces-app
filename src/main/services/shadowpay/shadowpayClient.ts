import assert from "assert";
import fetch, { RequestInfo, RequestInit } from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";
import { sleepAsync } from "@doctormckay/stdlib/promises";
import { minutesToMS } from "../../../shared/helpers";
import {
  GetBalanceResponse,
  GetWSTokenResponse,
} from "./interface/shadowpay.interface";

export default class ShadowpayClient {
  private static API_URL = "https://api.shadowpay.com/api/v2";
  private lastBalanceUpdate = 0;
  private api_key: string;
  private keepingSendingSteamToken = false;
  private steamToken?: string;
  private proxy?: string;
  private user_balance?: number;

  public get balance() {
    return this.user_balance;
  }

  private constructor(api_key: string, proxy?: string) {
    this.api_key = api_key;
    this.proxy = proxy;
  }

  static async getInstance(api_key: string, proxy?: string) {
    const instance = new ShadowpayClient(api_key, proxy);
    await instance.updateBalance(); // This serves only to check if the apikey is correct;
    return instance;
  }

  private async updateBalance(bought = false): Promise<void> {
    const fifteenMinutesAgo = Date.now() - 1000 * 60 * 15;
    if (!bought && this.lastBalanceUpdate > fifteenMinutesAgo) return;
    const url = `${ShadowpayClient.API_URL}/user/balance`;
    const res = await this.internalFetch(url);
    const json = (await res.json()) as GetBalanceResponse;
    if (json.status != "success") throw new Error(JSON.stringify(json));
    this.user_balance = json.data.balance;
  }

  public async setSteamToken(steamToken: string) {
    this.steamToken = steamToken;
    if (this.keepingSendingSteamToken) await this.sendSteamToken();
    if (!this.keepingSendingSteamToken) {
      this.keepingSendingSteamToken = true;
      this.keepSendingSteamToken();
    }
  }

  private async keepSendingSteamToken() {
    while (this.steamToken && this.keepingSendingSteamToken) {
      const success = await this.sendSteamToken();
      if (!success) {
        this.keepingSendingSteamToken = false;
        break;
      }
      await sleepAsync(1000 * 60 * 30);
    }
    return;
  }

  public async sendSteamToken(): Promise<boolean> {
    assert(this.steamToken, "Steam token not defined!");
    const url = `${ShadowpayClient.API_URL}/user/token`;
    const options = {
      method: "PATCH",
      body: JSON.stringify({ access_token: this.steamToken }),
    };
    try {
      const res = await this.internalFetch(url, options);
      const json = (await res.json()) as { status: string };
      return json.status != "success";
    } catch (err) {
      await sleepAsync(minutesToMS());
      return await this.sendSteamToken();
    }
  }

  public async reportTradeOffer(
    shadowpayTradeId: string | number,
    tradeOfferId: string | number
  ): Promise<boolean> {
    const url = `${ShadowpayClient.API_URL}/user/trade`;
    const options = {
      method: "POST",
      body: JSON.stringify({
        trade_id: shadowpayTradeId.toString(),
        tradeoffer_id: tradeOfferId.toString(),
      }),
    };
    const res = await this.internalFetch(url, options);
    const json = await res.json();
    // if (json.error_message == "failed_to_validate") {
    //   // only happens when steam api is busy or you access token is wrong, os
    //   // TODO make sure access token is not wrong
    //   sleepAsync(minutesToMS(5));
    //   return await this.reportTradeOffer(shadowpayTradeId, tradeOfferId);
    // }
    return json.status == "success";
  }

  public async getWSTokens() {
    const url = `${ShadowpayClient.API_URL}/user/websocket`;
    const res = await this.internalFetch(url);
    const json = (await res.json()) as GetWSTokenResponse;
    if (json.status != "success") throw new Error(JSON.stringify(json));
    return json.data;
  }

  private internalFetch(url: URL | RequestInfo, init: RequestInit = {}) {
    if (this.proxy) init.agent = new HttpsProxyAgent(this.proxy);

    const headers: any = init.headers ?? {};
    headers["Accept"] = "application/json";
    headers["Authorization"] = `Bearer ${this.api_key}`;
    if (init.body) {
      headers["Content-type"] = "application/json";
      if (typeof init.body != "string") init.body = JSON.stringify(init.body);
    }
    init.headers = headers;
    return fetch(url, init);
  }
}
