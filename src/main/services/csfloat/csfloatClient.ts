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

let csfloat_base_api_url: "https://csfloat.com/api";
let csgo_base_api_url: "https://api.steampowered.com";
let csgo_base_store_url: `https://store.steampowered.com/`;
export default class CSFloatClient {
  private static API_URL = "https://csfloat.com/api/v1";
  private api_key: string;
  private steamToken: string;
  private sessionID: string;
  private proxy: string;
  private lastBalanceUpdate: number;
  private user_balance: number;
  private user?: CSFloatUser;

  public get balance() {
    return this.user_balance;
  }

  private constructor(api_key: string, proxy?: string) {
    this.api_key = api_key;
    this.proxy = proxy;
  }

  static async getInstance(api_key: string, proxy?: string) {
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
  }

  public async getDataProfile(): Promise<any> {
    const url = `${CSFloatClient.API_URL}/me`;
    const res = await this.internalFetch(url);

    return await res.json();
  }

  public setSteamToken(steamToken: string) {
    this.steamToken = steamToken;
  }

  public setSessionID(sessionID: string) {
    this.sessionID = sessionID;
  }

  public getSteamId() {
    assert(!!this.user, "User not setted!");
    return this.user.steamid;
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

  public async getTradesInPending(req?: getTradesInQueuedRequest): Promise<[]> {
    const state = req?.state || "pending";
    const limit = req?.limit || 100;
    const url = `${CSFloatClient.API_URL}/me/trades?state=${state}&limit=${limit}&page=0`;

    const res = await this.internalFetch(url);
    if (res.status !== 200) {
      throw new Error("Invalid status while fetching pending trades");
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
      const res = await fetch(csgo_base_store_url);
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
    const offerIDsToCancel = [
      ...new Set(
        pendingTrades
          .filter(
            (e) =>
              e.steam_offer.state ===
                TradeOfferState.CreatedNeedsConfirmation &&
              new Date(e.steam_offer.sent_at).getTime() < Date.now() - oneHourMs
          )
          .map((e) => e.steam_offer.id)
      ),
    ];

    if (offerIDsToCancel.length === 0) {
      console.log("if cancelUnconfirmedTradeOffers");
      return;
    }

    const offers = await this.getSentTradeOffersFromAPI();
    const resp = { offers, type: TradeOffersType.API };

    const offersIDsStillNeedsConfirmation = offerIDsToCancel.filter((id) => {
      const sentOffer = resp.offers.find((offer) => offer.offer_id === id);
      if (!sentOffer) {
        return false;
      }

      return sentOffer.state === TradeOfferState.CreatedNeedsConfirmation;
    });

    if (offersIDsStillNeedsConfirmation.length === 0) {
      return;
    }

    const sessionID = this.getSessionID();
    if (!sessionID) {
      return;
    }

    for (const offerID of offersIDsStillNeedsConfirmation) {
      try {
        await fetch(`https://steamcommunity.com/tradeoffer/${offerID}/cancel`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          },
          body: new URLSearchParams({
            sessionid: this.getSessionID(),
          } as any).toString(),
        });
      } catch (e: any) {
        console.error(
          `failed to cancel needs confirmation trade, returning early: ${e.toString()}`
        );
        return;
      }
    }
  }

  private async pingTradeHistory(pendingTrades: Trade[]) {
    const { history, type } = await this.getTradeHistoryFromAPI();

    // premature optimization in case it's 100 trades
    const assetsToFind = pendingTrades.reduce((acc, e) => {
      acc[e.contract.item.asset_id] = true;
      return acc;
    }, {} as { [key: string]: boolean });

    // We only want to send history that is relevant to verifying trades on CSFloat
    const historyForCSFloat = history.filter((e) => {
      const received_ids = e.received_assets.map((e) => e.asset_id);
      const given_ids = e.given_assets.map((e) => e.asset_id);
      return !![...received_ids, ...given_ids].find((e) => {
        return assetsToFind[e];
      });
    });

    if (historyForCSFloat.length === 0) {
      console.log("if historyForCSFloat");
      return;
    }

    const resp = await fetch(
      `https://csfloat.com/api/v1/trades/steam-status/trade-history`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ history: historyForCSFloat, type }),
      }
    );

    if (resp.status !== 200) {
      throw new Error("invalid status");
    }
  }
  async getTradeHistoryFromAPI(): Promise<{
    history: TradeHistoryStatus[];
    type: TradeOffersType;
  }> {
    const access = this.getSteamToken();

    // This only works if they have granted permission for https://api.steampowered.com
    const resp = await fetch(
      `${csgo_base_api_url}/IEconService/GetTradeHistory/v1/?access_token=${access}&max_trades=200`,
      {}
    );

    if (resp.status !== 200) {
      throw new Error("invalid status");
    }

    const data = (await resp.json()) as TradeHistoryAPIResponse;
    const history = await (data.response?.trades || [])
      .filter((e) => e.status === 3) // Ensure we only count _complete_ trades (k_ETradeStatus_Complete)
      .filter(
        (e) =>
          !e.time_escrow_end ||
          new Date(parseInt(e.time_escrow_end) * 1000).getTime() < Date.now()
      )
      .map((e) => {
        return {
          other_party_url: `https://steamcommunity.com/profiles/${e.steamid_other}`,
          received_assets: (e.assets_received || [])
            .filter((e) => e.appid === AppId.CSGO)
            .map((e) => {
              return { asset_id: e.assetid, new_asset_id: e.new_assetid };
            }),
          given_assets: (e.assets_given || [])
            .filter((e) => e.appid === AppId.CSGO)
            .map((e) => {
              return { asset_id: e.assetid, new_asset_id: e.new_assetid };
            }),
        } as TradeHistoryStatus;
      })
      .filter((e) => {
        // Remove non-CS related assets
        return e.received_assets.length > 0 || e.given_assets.length > 0;
      });

    return { history, type: TradeOffersType.API };
  }

  private async getSentTradeOffersFromAPI(): Promise<OfferStatus[]> {
    const access = this.getSteamToken();

    const resp = await fetch(
      `${csgo_base_api_url}/IEconService/GetTradeOffers/v1/?access_token=${access}&get_sent_offers=true`,
      {}
    );
    console.log("resp--------------------------------------------", resp);

    if (resp.status !== 200) {
      throw new Error("invalid status");
    }

    const data = (await resp.json()) as TradeOffersAPIResponse;
    return (data.response?.trade_offers_sent || []).map(this.offerStateMapper);
  }

  offerStateMapper(e: TradeOffersAPIOffer): OfferStatus {
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
    console.log(
      "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
    );
    console.log("pendingTrades", pendingTrades);
    console.log(
      "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
    );

    const offers = await this.getSentTradeOffersFromAPI();
    const type = TradeOffersType.API;
    console.log("1");

    const offersToFind = pendingTrades.reduce((acc, e) => {
      acc[e.steam_offer.id] = true;
      return acc;
    }, {} as { [key: string]: boolean });
    console.log("2", offersToFind);

    // We only want to send offers that are relevant to verifying trades on CSFloat
    const offersForCSFloat = offers.filter((e) => {
      return !!offersToFind[e.offer_id];
    });
    console.log("3", offersForCSFloat);

    if (offersForCSFloat.length > 0) {
      const resp = await fetch(
        `https://csfloat.com/api/v1/trades/steam-status/offer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sent_offers: offersForCSFloat, type }),
        }
      );

      if (resp.status !== 200) {
        throw new Error("invalid status");
      }
    }
    console.log("4");

    // Any trade offers to attempt to annotate in case they sent the trade offer outside of CSFloat
    // This is something they shouldn't do, but you can't control the will of users to defy
    console.log(
      "offers--------------------------------------------",
      offers.length
    );
    for (const offer of offers) {
      // console.log("entrou no for");

      if (offer.state !== TradeOfferState.Active) {
        // If it was already accepted, trade history will send the appropriate ping
        continue;
      }
      console.log(
        "==================================PASSOU================================================================="
      );
      const hasTradeWithNoOfferAnnotated = pendingTrades.find((e) => {
        if (e.steam_offer.id) {
          // Already has a steam offer
          return false;
        }

        return (offer.given_asset_ids || []).includes(e.contract.item.asset_id);
      });

      console.log("hasTradeWithNoOfferAnnotated", hasTradeWithNoOfferAnnotated);
      if (!hasTradeWithNoOfferAnnotated) {
        console.log(
          "!hasTradeWithNoOfferAnnotated",
          !hasTradeWithNoOfferAnnotated
        );
        // Couldn't find matching trade on CSFloat
        continue;
      }

      try {
        console.log("try------------------");
        const resp = await fetch(
          `${csfloat_base_api_url}/v1/trades/steam-status/new-offer`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              offer_id: offer.offer_id,
              given_asset_ids: offer.given_asset_ids || [],
              received_asset_ids: offer.received_asset_ids || [],
              other_steam_id64: offer.other_steam_id64,
            }),
          }
        );

        console.log("try------------------", resp);

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
          `${csfloat_base_api_url}/v1/trades/${trade.id}/cancel-ping`,
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
      `${csgo_base_api_url}/IEconService/GetTradeOffers/v1/?access_token=${access}&get_received_offers=true&get_sent_offers=true`
    );

    if (resp.status !== 200) {
      throw new Error("invalid status");
    }

    const data = (await resp.json()) as TradeOffersAPIResponse;
    return {
      received: (data.response?.trade_offers_received || []).map(
        this.offerStateMapper
      ),
      sent: (data.response?.trade_offers_sent || []).map(this.offerStateMapper),
      steam_id: this.getSteamId(),
    };
  }

  async pingExtensionStatus(req: any) {
    const resp = await fetch(`${csfloat_base_api_url}/v1/me/extension/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        steam_community_permission: true,
        steam_powered_permission: true,
        access_token_steam_id: this.getSteamId() || "",
        history_error: req.history_error || "",
        trade_offer_error: req.trade_offer_error || "",
      }),
    });

    if (resp.status !== 200) {
      throw new Error("invalid status");
    }
  }
}
