import fetch, { RequestInit } from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";
import {
  AppId,
  getTradesInQueuedRequest,
  OfferStatus,
  Trade,
  TradeHistoryAPIResponse,
  TradeHistoryStatus,
  TradeOffersAPIOffer,
  TradeOffersAPIResponse,
  TradeOfferState,
  TradeOffersType,
  TradeState,
} from "./interface/csfloat.interface";
import assert from "assert";
import { CSFloatUser } from "./class/csfloat.class";

export default class CSFloatClient {
  csfloat_base_api_url = "https://csfloat.com/api";
  csgo_base_api_url = "https://api.steampowered.com";
  csgo_base_store_url = "https://store.steampowered.com/";

  private static API_URL = "https://csfloat.com/api/v1";
  private api_key: string;
  private steamToken: string;
  private sessionID: string;
  private proxy: string;
  private lastBalanceUpdate: number;
  private user_balance: number;
  private user?: CSFloatUser;
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

  public async verifySteamPermission() {
    try {
      const res = await fetch(this.csgo_base_store_url);
      return res.status === 200;
    } catch (error) {
      console.error("Failed to fetch Steam URL:", error);
      return false;
    }
  }

  public getSteamToken(): string {
    return this.steamToken;
  }
  public getSessionID(): string {
    return this.sessionID;
  }

  public async pingUpdates(pendingTrades: Trade[]) {
    const tasks = [
      {
        method: this.cancelUnconfirmedTradeOffers,
        name: "cancelUnconfirmedTradeOffers",
      },
      { method: this.pingTradeHistory, name: "pingTradeHistory" },
      { method: this.pingSentTradeOffers, name: "pingSentTradeOffers" },
      { method: this.pingCancelTrades, name: "pingCancelTrades" },
    ];

    for (const task of tasks) {
      try {
        await task.method.call(this, pendingTrades);
      } catch (e) {
        console.error(`${task.name} failed`, e);
      }
    }
  }

  private async cancelUnconfirmedTradeOffers(pendingTrades: Trade[]) {
    const oneHourMs = 60 * 60 * 1000;
    const oneHourAgo = Date.now() - oneHourMs;
    const filteredTrades = pendingTrades.filter((trade) => {
      const { state, sent_at } = trade.steam_offer;

      return (
        state === TradeOfferState.CreatedNeedsConfirmation &&
        new Date(sent_at).getTime() < oneHourAgo
      );
    });

    const offerIDsToCancel = [
      ...new Set(filteredTrades.map((trade) => trade.steam_offer.id)),
    ];

    const offers = await this.getSentTradeOffersFromAPI();

    const offersIDsStillNeedsConfirmation = offerIDsToCancel.filter((id) =>
      offers.some(
        (offer) =>
          offer.offer_id === id &&
          offer.state === TradeOfferState.CreatedNeedsConfirmation
      )
    );

    if (offersIDsStillNeedsConfirmation.length === 0) {
      return;
    }

    const sessionID = this.getSessionID();

    if (!sessionID) {
      return;
    }

    for (const offerID of offersIDsStillNeedsConfirmation) {
      const url = `https://steamcommunity.com/tradeoffer/${offerID}/cancel`;
      const body = new URLSearchParams({
        sessionid: this.getSessionID(),
      }).toString();

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          },
          body,
        });

        if (!response.ok) {
          throw new Error(`Failed to cancel trade offer with ID ${offerID}`);
        }
      } catch (error) {
        console.error(`Error canceling trade offer with ID ${offerID}:`, error);
        return;
      }
    }
  }

  private async pingTradeHistory(pendingTrades: Trade[]) {
    const historyTrades = await this.getTradeHistory();

    // premature optimization in case it's 100 trades
    const assetsToFind = pendingTrades.reduce((acc, e) => {
      acc[e.contract.item.asset_id] = true;
      return acc;
    }, {} as { [key: string]: boolean });

    // We only want to send history that is relevant to verifying trades on CSFloat
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
      `https://csfloat.com/api/v1/trades/steam-status/trade-history`,
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
  async getTradeHistory(): Promise<TradeHistoryStatus[]> {
    const access = this.getSteamToken();
    const url = `${this.csgo_base_api_url}/IEconService/GetTradeHistory/v1/?access_token=${access}&max_trades=200`;

    // This only works if they have granted permission for https://api.steampowered.com
    const steamValidation = await this.verifySteamPermission();
    if (!steamValidation)
      throw new Error(`"${this.csgo_base_api_url}" is not available`);

    const tradeHistoryResponse = await fetch(url, {});

    if (tradeHistoryResponse.status !== 200) {
      throw new Error("Error when searching trade history. (getTradeHistory)");
    }

    const tradeHistory =
      (await tradeHistoryResponse.json()) as TradeHistoryAPIResponse;

    const historyResponse = (tradeHistory.response?.trades || []).flatMap(
      (trade) => {
        // Filtra trades completos e que não estão em escrow ou cujo escrow já expirou
        if (
          trade.status === 3 && // k_ETradeStatus_Complete
          (!trade.time_escrow_end ||
            parseInt(trade.time_escrow_end) * 1000 < Date.now())
        ) {
          const receivedAssets = (trade.assets_received || [])
            .filter((asset) => asset.appid === AppId.CSGO)
            .map(({ assetid, new_assetid }) => ({
              asset_id: assetid,
              new_asset_id: new_assetid,
            }));

          const givenAssets = (trade.assets_given || [])
            .filter((asset) => asset.appid === AppId.CSGO)
            .map(({ assetid, new_assetid }) => ({
              asset_id: assetid,
              new_asset_id: new_assetid,
            }));

          // Retorna apenas trades que têm pelo menos um asset CSGO
          if (receivedAssets.length > 0 || givenAssets.length > 0) {
            return {
              other_party_url: `https://steamcommunity.com/profiles/${trade.steamid_other}`,
              received_assets: receivedAssets,
              given_assets: givenAssets,
            } as TradeHistoryStatus;
          }
        }
        return [];
      }
    );

    return historyResponse;
  }

  private async getSentTradeOffersFromAPI(): Promise<OfferStatus[]> {
    const access = this.getSteamToken();
    const url = `${this.csgo_base_api_url}/IEconService/GetTradeOffers/v1/?access_token=${access}&get_sent_offers=true`;

    const resp = await fetch(url, {});

    if (resp.status !== 200) {
      throw new Error("Error when searching trade history.");
    }

    const data = (await resp.json()) as TradeOffersAPIResponse;
    return (data.response?.trade_offers_sent || []).map(
      this.mapTradeOfferToStatus
    );
  }

  mapTradeOfferToStatus(e: TradeOffersAPIOffer): OfferStatus {
    return {
      offer_id: e.tradeofferid,
      state: e.trade_offer_state,
      given_asset_ids: (e.items_to_give || []).map((e) => e.assetid),
      received_asset_ids: (e.items_to_receive || []).map((e) => e.assetid),
      time_created: e.time_created,
      time_updated: e.time_updated,
      other_steam_id64: (
        BigInt("76561197960265728") + BigInt(e.accountid_other)
      ).toString(),
    } as OfferStatus;
  }

  async pingSentTradeOffers(pendingTrades: Trade[]) {
    const offers = await this.getSentTradeOffersFromAPI();
    const type = TradeOffersType.API;

    const offersToFind = pendingTrades.reduce((acc, e) => {
      acc[e.steam_offer.id] = true;
      return acc;
    }, {} as { [key: string]: boolean });

    // We only want to send offers that are relevant to verifying trades on CSFloat
    const offersForCSFloat = offers.filter((e) => {
      return !!offersToFind[e.offer_id];
    });

    if (offersForCSFloat.length > 0) {
      const resp = await fetch(
        `https://csfloat.com/api/v1/trades/steam-status/offer`,
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

    // Any trade offers to attempt to annotate in case they sent the trade offer outside of CSFloat
    // This is something they shouldn't do, but you can't control the will of users to defy
    for (const offer of offers) {
      // console.log("entrou no for");

      if (offer.state !== TradeOfferState.Active) {
        // If it was already accepted, trade history will send the appropriate ping
        continue;
      }
      const hasTradeWithNoOfferAnnotated = pendingTrades.find((e) => {
        if (e.steam_offer.id) {
          // Already has a steam offer
          return false;
        }

        return (offer.given_asset_ids || []).includes(e.contract.item.asset_id);
      });

      if (!hasTradeWithNoOfferAnnotated) {
        // Couldn't find matching trade on CSFloat
        continue;
      }

      try {
        const resp = await fetch(
          `${this.csfloat_base_api_url}/v1/trades/steam-status/new-offer`,
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

  async pingCancelTrades(pendingTrades: Trade[]) {
    const hasWaitForCancelPing = pendingTrades.find(
      (e) => e.state === TradeState.PENDING && e.wait_for_cancel_ping
    );
    if (!hasWaitForCancelPing) {
      // Nothing to process/ping, exit
      return;
    }

    const tradeOffers = await this.getSentAndReceivedTradeOffersFromAPI();

    const allTradeOffers = [
      ...(tradeOffers.sent || []),
      ...(tradeOffers.received || []),
    ];

    for (const trade of pendingTrades) {
      if (trade.state !== TradeState.PENDING) {
        continue;
      }

      if (!trade.wait_for_cancel_ping) {
        continue;
      }

      const tradeOffer = allTradeOffers.find(
        (e) => e.offer_id === trade.steam_offer.id
      );
      if (
        tradeOffer &&
        (tradeOffer.state === TradeOfferState.Active ||
          tradeOffer.state === TradeOfferState.Accepted)
      ) {
        // We don't want to send a cancel ping if the offer is active or valid
        continue;
      }

      try {
        const resp = await fetch(
          `${this.csfloat_base_api_url}/v1/trades/${trade.id}/cancel-ping`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              trade_id: trade.id,
              steam_id: tradeOffers.steam_id,
            }),
          }
        );

        if (resp.status !== 200) {
          throw new Error("invalid status");
        }
      } catch (e) {
        console.error(`failed to send cancel ping for trade ${trade.id}`, e);
      }
    }
  }

  async getSentAndReceivedTradeOffersFromAPI(): Promise<{
    received: OfferStatus[];
    sent: OfferStatus[];
    steam_id?: string | null;
  }> {
    const access = this.getSteamToken();

    const resp = await fetch(
      `${this.csgo_base_api_url}/IEconService/GetTradeOffers/v1/?access_token=${access}&get_received_offers=true&get_sent_offers=true`
    );

    if (resp.status !== 200) {
      throw new Error("invalid status");
    }

    const data = (await resp.json()) as TradeOffersAPIResponse;
    return {
      received: (data.response?.trade_offers_received || []).map(
        this.mapTradeOfferToStatus
      ),
      sent: (data.response?.trade_offers_sent || []).map(
        this.mapTradeOfferToStatus
      ),
      steam_id: this.getSteamId(),
    };
  }

  async pingExtensionStatus(req: any) {
    const steamPoweredPermissions = { granted: true };
    const steamCommunityPermissions = { granted: true };
    const version = "5.2.0";

    const resp1 = await fetch(
      "https://csfloat.com/api/v1/me/extension/status",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `${this.api_key}`,
          priority: "u=1, i",
        },
        body: JSON.stringify({
          steam_community_permission: steamCommunityPermissions.granted,
          steam_powered_permission: steamPoweredPermissions.granted,
          version,
          access_token_steam_id: this.getSteamId() || "",
          history_error: req.history_error || "",
          trade_offer_error: req.trade_offer_error || "",
        }),
      }
    );
    const jsonResponse = await resp1.json();

    if (resp1.status !== 200) {
      throw new Error("Erro ao enviar status da extensão");
    }

    return jsonResponse;
  }
}
