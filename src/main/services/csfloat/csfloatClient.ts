import fetch, { RequestInit } from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";
import {
  AppId,
  getTradesInQueuedRequest,
  OfferStatus,
  Trade,
  TradeHistoryStatus,
  TradeOfferState,
  TradeOffersType,
  TradeState,
} from "./interface/csfloat.interface";
import assert from "assert";
import CEconItem from "steamcommunity/classes/CEconItem.js";
import TradeOffer from "steam-tradeoffer-manager/lib/classes/TradeOffer.js";
export default class CSFloatClient {
  private static API_URL = "https://csfloat.com/api/v1";
  private api_key: string;
  private steamToken: string;
  private sessionID: string;
  private proxy: string;
  private lastBalanceUpdate: number;
  private user_balance: number;
  private steamID: string;

  public get balance() {
    return this.user_balance;
  }

  private constructor(api_key: string, proxy?: string) {
    this.api_key = api_key;
    this.proxy = proxy;
  }

  static async getInstance(api_key: string, proxy?: string) {
    if (!api_key) throw new Error("API key is required");
    const instance = new CSFloatClient(api_key, proxy);
    await instance.updateBalance();
    return instance;
  }

  public async updateBalance(bought = false) {
    const fifteenMinutesAgo = Date.now() - 1000 * 60 * 15;
    if (!bought && this.lastBalanceUpdate > fifteenMinutesAgo) return;

    const json = await this.getDataProfile();

    if (!json.user) throw new Error(JSON.stringify(json));
    this.user_balance = json.user.balance;
    this.steamID = json.user.steam_id;
  }

  public async getDataProfile(): Promise<any> {
    const url = `${CSFloatClient.API_URL}/me`;
    const res = await this.internalFetch(url);

    const data = await res.json();

    return data;
  }

  public setSteamToken(steamToken: string) {
    this.steamToken = steamToken;
  }

  public setSessionID(sessionID: string) {
    this.sessionID = sessionID;
  }

  public getSteamId() {
    assert(!!this.steamID, "User not setted!");
    return this.steamID;
  }

  public async getTradesInQueued(req?: getTradesInQueuedRequest): Promise<[]> {
    const state = req?.state || "queued";
    const limit = req?.limit || 100;
    const url = `${CSFloatClient.API_URL}/me/trades?state=${state}&limit=${limit}&page=0`;

    const res = await this.internalFetch(url);
    if (res.status !== 200) {
      throw new Error("Invalid status while fetching pending trades");
    }

    const result = await res.json();
    return result.trades;
  }

  public async getTrades(
    status: string,
    req?: getTradesInQueuedRequest
  ): Promise<[]> {
    const limit = req?.limit || 100;
    const url = `${CSFloatClient.API_URL}/me/trades?state=${status}&limit=${limit}&page=0`;

    const res = await this.internalFetch(url);

    if (res.status !== 200) {
      throw new Error(`Invalid status while fetching ${status} trades`);
    }

    const result = await res.json();
    return result.trades;
  }

  private internalFetch(url: string, init: RequestInit = {}) {
    if (this.proxy) init.agent = new HttpsProxyAgent(this.proxy);

    const headers: any = init.headers ?? {};
    headers["Accept"] = "application/json";
    headers["Authorization"] = this.api_key;
    init.headers = headers;
    return fetch(url, init);
  }

  public getSteamToken(): string {
    return this.steamToken;
  }

  public getSessionID(): string {
    return this.sessionID;
  }

  public async pingUpdates(
    pendingTrades: Trade[],
    tradesSteamOffers: TradeOffer[],
    tradeOffersHistory: TradeOffer[]
  ): Promise<void> {
    if (!tradesSteamOffers) return;

    await this.pingTradeHistory(pendingTrades, tradeOffersHistory).then(() =>
      console.log("Finalized pingTradeHistory")
    );

    await this.pingSentTradeOffers(pendingTrades, tradesSteamOffers).then(() =>
      console.log("Finalized pingSentTradeOffers")
    );

    await this.pingCancelTrades(pendingTrades, tradesSteamOffers).then(() =>
      console.log("Finalized pingCancelTrades")
    );
  }

  private async pingTradeHistory(
    pendingTrades: Trade[],
    tradeOffersHistory: TradeOffer[]
  ) {
    const historyTrades = await this.formatTradeHistory(tradeOffersHistory);

    const assetsToFind = pendingTrades.reduce((acc, e) => {
      acc[e.contract.item.asset_id] = true;
      return acc;
    }, {} as { [key: string]: boolean });

    const historyForCSFloat = historyTrades.filter((trade) => {
      const received_ids = trade.received_assets.map((e) => e.asset_id);
      const given_ids = trade.given_assets.map((e) => e.asset_id);
      return !![...received_ids, ...given_ids].find((e) => {
        return assetsToFind[e];
      });
    });

    if (historyForCSFloat.length === 0) {
      return;
    }

    const resp = await fetch(
      `${CSFloatClient.API_URL}/trades/steam-status/trade-history`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `${this.api_key}`,
        },
        body: JSON.stringify({ history: historyForCSFloat, type: 1 }),
      }
    );

    if (resp.status !== 200) {
      throw new Error("invalid status");
    }
  }

  async formatTradeHistory(
    tradeOffers: TradeOffer[]
  ): Promise<TradeHistoryStatus[]> {
    return tradeOffers.flatMap((trade: TradeOffer) => {
      if (
        trade.state === TradeOfferState.Accepted &&
        (!trade.escrowEnds ||
          parseInt(String(trade.escrowEnds)) * 1000 < Date.now())
      ) {
        const receivedAssets = (trade.itemsToReceive || [])
          .filter((asset) => asset.appid === AppId.CSGO)
          .map((assetid) => ({
            asset_id: String(assetid),
          }));

        const givenAssets = (trade.itemsToGive || [])
          .filter((asset) => asset.appid === AppId.CSGO)
          .map((assetid) => ({
            asset_id: String(assetid),
          }));

        if (receivedAssets.length > 0 || givenAssets.length > 0) {
          return [
            {
              other_party_url: `https://steamcommunity.com/profiles/${trade.partner.getSteamID64()}`,
              received_assets: receivedAssets,
              given_assets: givenAssets,
            },
          ];
        }
      }
    });
  }

  mapTradesSteamOffers(tradesSteamOffers: TradeOffer[]): OfferStatus[] {
    return tradesSteamOffers.map(this.mapTradeOfferToStatus);
  }

  mapTradeOfferToStatus(e: TradeOffer): OfferStatus {
    return {
      offer_id: e.id,
      state: e.state,
      given_asset_ids: (e.itemsToGive || []).map((e) => e.assetid),
      received_asset_ids: (e.itemsToReceive || []).map((e) => e.assetid),
      time_created: e.created,
      time_updated: e.updated,
      other_steam_id64: e.partner.getSteamID64(),
    } as unknown as OfferStatus;
  }

  async pingSentTradeOffers(
    pendingTrades: Trade[],
    tradesSteamOffers: TradeOffer[]
  ) {
    const offers = await this.mapTradesSteamOffers(tradesSteamOffers);
    const type = TradeOffersType.API;
    const offersToFind = pendingTrades.reduce((acc, e) => {
      acc[e.steam_offer.id] = true;
      return acc;
    }, {} as { [key: string]: boolean });
    const offersForCSFloat = offers.filter((e) => {
      return !!offersToFind[e.offer_id];
    });

    if (offersForCSFloat.length > 0) {
      const resp = await fetch(
        `${CSFloatClient.API_URL}/trades/steam-status/offer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: `${this.api_key}`,
          },
          body: JSON.stringify({ sent_offers: offersForCSFloat, type }),
        }
      );

      if (resp.status !== 200) {
        throw new Error("invalid status");
      }
    }

    for (const offer of offers) {
      if (offer.state !== TradeOfferState.Active) {
        continue;
      }
      const hasTradeWithNoOfferAnnotated = pendingTrades.find((e) => {
        if (e.steam_offer.id) {
          return false;
        }

        return (offer.given_asset_ids || []).includes(e.contract.item.asset_id);
      });

      if (!hasTradeWithNoOfferAnnotated) {
        continue;
      }

      try {
        const resp = await fetch(
          `${CSFloatClient.API_URL}/trades/steam-status/new-offer`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              authorization: `${this.api_key}`,
            },
            body: JSON.stringify({
              offer_id: offer.offer_id,
              given_asset_ids: offer.given_asset_ids || [],
              received_asset_ids: offer.received_asset_ids || [],
              other_steam_id64: offer.other_steam_id64,
            }),
          }
        );

        if (resp.status !== 200) {
          throw new Error("invalid status");
        }
      } catch (e) {
        console.error(`failed to annotate offer ${offer.offer_id} post-hoc`, e);
      }
    }
  }

  async pingCancelTrades(
    pendingTrades: Trade[],
    tradesSteamOffers: TradeOffer[]
  ) {
    const hasWaitForCancelPing = pendingTrades.find(
      (e) => e.state === TradeState.PENDING && e.wait_for_cancel_ping
    );
    if (!hasWaitForCancelPing) return;

    const steamTradeOffers = this.mapTradesSteamOffers(tradesSteamOffers);

    for (const trade of pendingTrades) {
      if (trade.state !== TradeState.PENDING) continue;

      if (!trade.wait_for_cancel_ping) continue;

      const tradeOffer = steamTradeOffers.find(
        (e) => e.offer_id === trade.steam_offer.id
      );
      if (
        tradeOffer &&
        (tradeOffer.state === TradeOfferState.Active ||
          tradeOffer.state === TradeOfferState.Accepted)
      )
        continue;

      try {
        const resp = await fetch(
          `${CSFloatClient.API_URL}/trades/${trade.id}/cancel-ping`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              authorization: `${this.api_key}`,
            },
            body: JSON.stringify({
              trade_id: trade.id,
              steam_id: this.getSteamId(),
            }),
          }
        );

        if (resp.status !== 200) throw new Error("invalid status");
      } catch (e) {
        console.error(`failed to send cancel ping for trade ${trade.id}`, e);
      }
    }
  }

  async acceptTrade(tradeId: any[]) {
    await fetch(`${CSFloatClient.API_URL}/trades/bulk/accept`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `${this.api_key}`,
      },
      body: JSON.stringify({
        trade_ids: tradeId,
      }),
    }).then((resp) => {
      if (resp.status !== 200)
        throw new Error("Erro ao enviar status da extensão");
    });
  }

  async pingSetupExtension() {
    await fetch(`${CSFloatClient.API_URL}/me/extension/setup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `${this.api_key}`,
      },
      body: JSON.stringify({}),
    });
  }

  async pingExtensionStatus(req: any) {
    const version = "5.2.0";
    await this.pingSetupExtension();

    const resp1 = await fetch(`${CSFloatClient.API_URL}/me/extension/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `${this.api_key}`,
        priority: "u=1, i",
      },
      body: JSON.stringify({
        steam_community_permission: true,
        steam_powered_permission: true,
        version,
        access_token_steam_id: this.getSteamId() || "",
        history_error: req.history_error || undefined,
        trade_offer_error: req.trade_offer_error || undefined,
      }),
    }).then((resp) => {
      if (resp.status !== 200)
        throw new Error("Erro ao enviar status da extensão");

      return resp;
    });
    const jsonResponse = await resp1.json();

    if (resp1.status !== 200)
      throw new Error("Erro ao enviar status da extensão");

    return jsonResponse;
  }

  async verifyItemInInventorySteam(
    queueTrades: Trade[],
    itemsForTrade: CEconItem[]
  ): Promise<any[]> {
    return queueTrades
      .map((trade) => {
        const assetId = trade?.contract?.item?.asset_id;

        if (assetId)
          return itemsForTrade.find((item) => item.assetid === assetId);

        return null;
      })
      .filter((item) => item !== null);
  }
}
