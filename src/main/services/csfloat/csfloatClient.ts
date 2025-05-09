import { SteamAcc } from './../../../shared/types';
import { HttpsProxyAgent } from "https-proxy-agent";
import fetch, { RequestInit, Response } from "node-fetch";
import { EStatusTradeCSFLOAT } from "./enums/cs-float.enum";
import {
  IAnnotateOfferBody,
  IHistoryPingBody,
  IPingCancelTradeBody,
  PaginationRequest,
} from "./interfaces/fetch.interface";
import { ITradeFloat, IUpdateErrors } from "./interfaces/csfloat.interface";
import TradeOffer from "steam-tradeoffer-manager/lib/classes/TradeOffer";

export default class CSFloatClient {
  private static API_URL = "https://csfloat.com/api/v1";
  //when update version extension, change here!
  private static EXTATION_VERSION = "5.5.0";
  private api_key: string;
  private proxy: string;

  private constructor(api_key: string, proxy?: string) {
    this.api_key = api_key;
    this.proxy = proxy;
  }

  static getInstance(api_key: string, proxy?: string): CSFloatClient {
    return new CSFloatClient(api_key, proxy);
  }

  private internalFetch(
    url: string,
    init: RequestInit = {}
  ): Promise<Response> {
    if (this.proxy) init.agent = new HttpsProxyAgent(this.proxy);

    const headers = new Headers(init.headers as HeadersInit);

    headers.set("Accept", "application/json");
    headers.set("Authorization", this.api_key);

    init.headers = Object.fromEntries(headers.entries());

    return fetch(url, init);
  }

  public async getTrades(
    status: EStatusTradeCSFLOAT,
    options?: PaginationRequest
  ): Promise<ITradeFloat[]> {
    const limit = options?.limit || 100;
    const page = options?.page || 0;
    const url = new URL(`${CSFloatClient.API_URL}/me/trades`);
    const params = new URLSearchParams({
      state: status,
      limit: limit.toString(),
      page: page.toString(),
    });
    url.search = params.toString();

    const response = await this.internalFetch(url.toString());

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Failed to fetch trades: ${response.status} - ${errorBody}`
      );
    }
    const result = (await response.json()) as { trades: ITradeFloat[] };

    if (!result || !Array.isArray(result.trades)) {
      throw new Error("Invalid API response format");
    }

    return result.trades as ITradeFloat[];
  }

  async pingBlockedUsers(ignoredOrBlokedUsers: string[]): Promise<void> {
    const url = new URL(
      `${CSFloatClient.API_URL}/trades/steam-status/blocked-users`
    );

    await this.internalFetch(url.toString(), {
      method: "POST",
      body: JSON.stringify({ blocked_steam_ids: ignoredOrBlokedUsers }),
    });
  }

  async tradeHistoryStatus(historyPingBody: IHistoryPingBody[]): Promise<void> {
    const url = new URL(
      `${CSFloatClient.API_URL}/trades/steam-status/trade-history`
    );

    await this.internalFetch(url.toString(), {
      method: "POST",
      body: JSON.stringify({ history: historyPingBody }),
    });
  }

  async tradeOfferStatus(tradeOffer: TradeOffer[]): Promise<void> {
    const url = new URL(`${CSFloatClient.API_URL}/trades/steam-status/offer`);

    await this.internalFetch(url.toString(), {
      method: "POST",
      body: JSON.stringify({ sent_offers: tradeOffer }),
    });
  }

  async annotateOffer(AnnotateOfferBody: IAnnotateOfferBody): Promise<void> {
    const url = new URL(
      `${CSFloatClient.API_URL}/trades/steam-status/new-offer`
    );

    await this.internalFetch(url.toString(), {
      method: "POST",
      body: JSON.stringify({
        offer_id: AnnotateOfferBody.offer_id,
        given_asset_ids: AnnotateOfferBody.given_asset_ids || [],
        received_asset_ids: AnnotateOfferBody.received_asset_ids || [],
        other_steam_id64: AnnotateOfferBody.other_steam_id64,
      }),
    });
  }

  async pingCancelTrade(
    pingCancelTradeBody: IPingCancelTradeBody
  ): Promise<void> {
    const url = new URL(
      `${CSFloatClient.API_URL}/trades/${pingCancelTradeBody.trade_id}/cancel-ping`
    );

    await this.internalFetch(url.toString(), {
      method: "POST",
      body: JSON.stringify({ steam_id: pingCancelTradeBody.steam_id }),
    });
  }

  async pingExtensionStatus(updateErrors: IUpdateErrors, steamID: string): Promise<boolean> {
    const url = new URL(`${CSFloatClient.API_URL}/me/extension/status`);
    const response = await this.internalFetch(url.toString(), {
      method: "POST",
      body: JSON.stringify({
        steam_community_permission: true,
        steam_powered_permission: true,
        version: CSFloatClient.EXTATION_VERSION,
        access_token_steam_id: steamID,
        history_error: updateErrors?.history_error || "",
        trade_offer_error: updateErrors?.trade_offer_error || "",
      }),
    });

    return response.ok;
  }


  async acceptTradesInFloat(tradeId: string): Promise<void> {
    const url = new URL(`${CSFloatClient.API_URL}/trades/bulk/accept`);
    await this.internalFetch(url.toString(), {
      method: "POST",
      body: JSON.stringify({ trade_ids: [tradeId] }),
    });
  }
}
