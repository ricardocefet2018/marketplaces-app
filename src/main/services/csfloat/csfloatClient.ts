import {HttpsProxyAgent} from "https-proxy-agent";
import fetch, {RequestInit, Response} from "node-fetch";
import {EStatusTradeCSFLOAT} from "./enums/cs-float.enum";
import {
    IAnnotateOfferBody,
    IHistoryPingBody,
    IPingCancelTradeBody,
    PaginationRequest,
} from "./interfaces/fetch.interface";
import {IMEResponse, ITradeFloat, IUpdateErrors, OfferStatus} from "./interfaces/csfloat.interface";
import { Item } from "./interfaces/csfloat.interface";

export default class CSFloatClient {
    private static API_URL = "https://csfloat.com/api/v1";
    private static EXTENSION_VERSION = "5.5.0";
    private readonly api_key: string;
    private readonly proxy: string;
    private user_balance: string

    private constructor(api_key: string, proxy?: string) {
        this.api_key = api_key;
        this.proxy = proxy;
    }

    public get balance() {
        return this.user_balance;
    }

    static async getInstance(api_key: string, proxy?: string): Promise<CSFloatClient> {
        const instance = new CSFloatClient(api_key, proxy)
        await instance.updateBalance()
        return instance;
    }

    public async getTrades(
        status: EStatusTradeCSFLOAT,
        options?: PaginationRequest
    ): Promise<ITradeFloat[]> {
        const limit = options?.limit || 100;
        const page = options?.page || 0;
        const url = new URL(`${CSFloatClient.API_URL}/me/trades`);
        url.searchParams.append('state', status);
        url.searchParams.append('limit', limit.toString());
        url.searchParams.append('page', page.toString());

        const response = await this.internalFetch(url.toString());

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(
                `Failed to fetch trades: ${response.status} - ${errorBody}`
            );
        }
        const result = (await response.json()) as { trades: ITradeFloat[] };

        if (!result || !Array.isArray(result.trades)) {
            throw new Error(`Invalid API response format - ${JSON.stringify(result)}`);
        }

        return result.trades as ITradeFloat[];
    }

    async pingBlockedUsers(ignoredOrBlockedUsers: string[]): Promise<void> {
        const url = new URL(
            `${CSFloatClient.API_URL}/trades/steam-status/blocked-users`
        );

        const response = await this.internalFetch(url.toString(), {
            method: "POST",
            body: JSON.stringify({ blocked_steam_ids: ignoredOrBlockedUsers }),
        });

        if (response.status !== 200) {
            const txt = await response.text();
            throw new Error(`invalid status - ${txt}`);
        }
    }

    async tradeHistoryStatus(historyPingBody: IHistoryPingBody[]): Promise<void> {
        const url = new URL(
            `${CSFloatClient.API_URL}/trades/steam-status/trade-history`
        );

        const response = await this.internalFetch(url.toString(), {
            method: "POST",
            body: JSON.stringify({ history: historyPingBody }),
        });

        if (response.status !== 200) {
            const txt = await response.text();
            throw new Error(`invalid status - ${txt}`);
        }
    }

    async tradeOffers(tradeOffer: OfferStatus[]): Promise<void> {
        const url = new URL(`${CSFloatClient.API_URL}/trades/steam-status/offer`);

        const response = await this.internalFetch(url.toString(), {
            method: "POST",
            body: JSON.stringify({ sent_offers: tradeOffer, type: 1 }),
        });

        if (response.status !== 200) {
            const txt = await response.text();
            throw new Error(`invalid status - ${txt}`);
        }
    }

    async annotateOffer(AnnotateOfferBody: IAnnotateOfferBody): Promise<void> {
        const url = new URL(
            `${CSFloatClient.API_URL}/trades/steam-status/new-offer`
        );

        const response = await this.internalFetch(url.toString(), {
            method: "POST",
            body: JSON.stringify({
                offer_id: AnnotateOfferBody.offer_id,
                given_asset_ids: AnnotateOfferBody.given_asset_ids || [],
                received_asset_ids: AnnotateOfferBody.received_asset_ids || [],
                other_steam_id64: AnnotateOfferBody.other_steam_id64,
            }),
        });

        if (response.status !== 200) {
            const txt = await response.text();
            throw new Error(`invalid status - ${txt}`);
        }
    }

    async pingCancelTrade(
        pingCancelTradeBody: IPingCancelTradeBody
    ): Promise<void> {
        const url = new URL(
            `${CSFloatClient.API_URL}/trades/${pingCancelTradeBody.trade_id}/cancel-ping`
        );

        const response = await this.internalFetch(url.toString(), {
            method: "POST",
            body: JSON.stringify({ steam_id: pingCancelTradeBody.steam_id }),
        });

        if (response.status !== 200) {
            const txt = await response.text();
            throw new Error(`invalid status - ${txt}`);
        }
    }

    async pingExtensionStatus(updateErrors: IUpdateErrors, steamID: string): Promise<boolean> {
        const url = new URL(`${CSFloatClient.API_URL}/me/extension/status`);
        const response = await this.internalFetch(url.toString(), {
            method: "POST",
            body: JSON.stringify({
                steam_community_permission: true,
                steam_powered_permission: true,
                version: CSFloatClient.EXTENSION_VERSION,
                access_token_steam_id: steamID,
                history_error: updateErrors?.history_error || "",
                trade_offer_error: updateErrors?.trade_offer_error || "",
            }),
        });

        if (response.status !== 200) {
            const txt = await response.text();
            throw new Error(`invalid status - ${txt}`);
        }

        return response.status === 200;
    }

    async acceptTradesInFloat(tradeId: string): Promise<boolean> {
        const url = new URL(`${CSFloatClient.API_URL}/trades/bulk/accept`);
        const response = await this.internalFetch(url.toString(), {
            method: "POST",
            body: JSON.stringify({ trade_ids: [tradeId] }),
        });

        if (response.status !== 200) {
            const txt = await response.text();
            throw new Error(`invalid status - ${txt}`);
        }

        return response.status === 200;
    }

    public async updateBalance(): Promise<void> {
        const url = new URL(`${CSFloatClient.API_URL}/me`);
        const response = await this.internalFetch(url.toString())
        if (!response.ok) {
            const txt = await response.text();
            throw new Error(txt);
        }
        const json: IMEResponse = await response.json()
        this.user_balance = json.user.balance.toString()
    }

    public async getInventoryFromCSFloat(): Promise<Item[]> {
        const url = new URL(`${CSFloatClient.API_URL}/me/inventory`);
        const response = await this.internalFetch(url.toString())
        if (!response.ok) {
            const txt = await response.text();
            throw new Error(txt);
        }
        return response.json();
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
}
