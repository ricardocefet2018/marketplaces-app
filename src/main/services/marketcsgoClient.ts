import fetch, { RequestInit } from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";
import assert from "node:assert";
import { sleepAsync } from "@doctormckay/stdlib/promises";
import { minutesToMS } from "../../shared/helpers";

export default class MarketcsgoClient {
  private static API_URL = "https://market.csgo.com/api/v2";
  private api_key: string;
  private steamToken: string;
  private proxy: string;
  private lastBalanceUpdate: number;
  private user_balance: number;

  public get balance() {
    return this.user_balance;
  }

  private constructor(api_key: string, proxy?: string) {
    this.api_key = api_key;
    this.proxy = proxy;
  }

  static async getInstance(api_key: string, proxy?: string) {
    const instance = new MarketcsgoClient(api_key, proxy);
    await instance.updateBalance(); // This serves only to check if the apikey is correct;
    return instance;
  }

  public async updateBalance(bought = false) {
    const fifteenMinutesAgo = Date.now() - 1000 * 60 * 15;
    if (!bought && this.lastBalanceUpdate > fifteenMinutesAgo) return;
    const url = `${MarketcsgoClient.API_URL}/get-money?key=${this.api_key}`;
    const res = await this.internalFetch(url);
    const json = await res.json();
    if (!json.success) throw new Error(JSON.stringify(json));
    this.user_balance = json.money;
  }

  public setSteamToken(steamToken: string) {
    this.steamToken = steamToken;
  }

  public async sendSteamToken(): Promise<boolean> {
    assert(this.steamToken, "Steam token not defined!");
    const url = `${MarketcsgoClient.API_URL}/ping-new`;
    const options = {
      method: "POST",
      body: JSON.stringify({
        access_token: this.steamToken,
        proxy: this.proxy,
      }),
    };
    try {
      const res = await this.internalFetch(url, options);
      const json = await res.json();
      // Sometimes it just fails without any reason, just try again so.
      if (!json.success && (!json.message || json.message == ""))
        return await this.sendSteamToken();
      console.log("sendSteamToken response", json);
      return json.success && json.online && json.p2p && json.ping == "pong";
    } catch (err) {
      await sleepAsync(minutesToMS());
      return await this.sendSteamToken();
    }
  }

  public async getWSToken(): Promise<string> {
    const url = `${MarketcsgoClient.API_URL}/get-ws-token`;
    const res = await this.internalFetch(url);
    const json = await res.json();
    if (!json.success) throw new Error(JSON.stringify(json));
    return json.token;
  }

  public async getAllTradesToSend() {
    const url = `${MarketcsgoClient.API_URL}/trade-request-give-p2p-all`;
    const res = await this.internalFetch(url);
    const json: TradeRequestGiveP2PAll = await res.json();
    if (!json.success && json.error != "nothing")
      throw new Error(JSON.stringify(json));
    return json.offers ?? [];
  }

  public async getTrades() {
    const url = `${MarketcsgoClient.API_URL}/trades`;
    const res = await this.internalFetch(url);
    const json: GetTradesPayload = await res.json();
    if (!json.success && json.error != "active trades from market not found")
      throw new Error(JSON.stringify(json));
    let trades: TradePayload[] = [];
    if (json.trades)
      trades = json.trades.map((t) => {
        t.timestamp = t.timestamp * 1000;
        return t;
      });
    return trades;
  }

  public async registerTradeOffer(tradeOfferId: string) {
    const url = `${MarketcsgoClient.API_URL}/trade-ready?tradeoffer=${tradeOfferId}`;
    const res = await this.internalFetch(url);
    const json = await res.json();
    if (!json.success) throw new Error(JSON.stringify(json));
    return json.success;
  }

  private internalFetch(
    url: string,
    init: RequestInit = {},
    incognito = false
  ) {
    if (!incognito)
      url += url.includes("?")
        ? `&key=${this.api_key}`
        : `?key=${this.api_key}`;
    if (this.proxy) init.agent = new HttpsProxyAgent(this.proxy);

    const headers: any = init.headers ?? {};
    headers["Accept"] = "application/json";
    if (init.body) {
      headers["Content-type"] = "application/json";
      if (typeof init.body != "string") init.body = JSON.stringify(init.body);
    }
    init.headers = headers;
    return fetch(url, init);
  }
}

class TradeRequestGiveP2PAll {
  success: boolean;
  offers: MarketcsgoTradeOfferPayload[];
  error?: string;
}

export interface MarketcsgoTradeOfferPayload {
  hash: string;
  partner: number;
  token: string;
  tradeoffermessage: string;
  items: ItemInTrade[];
  created?: boolean;
}

interface ItemInTrade {
  appid: number;
  contextid: number;
  assetid: string;
  amount: number;
}

interface GetTradesPayload {
  success: boolean;
  trades?: TradePayload[];
  error?: string;
}

interface TradePayload {
  dir: "out" | "in";
  trade_id: string;
  bot_id: string;
  timestamp: number;
  secret: string;
  nik: string;
}
