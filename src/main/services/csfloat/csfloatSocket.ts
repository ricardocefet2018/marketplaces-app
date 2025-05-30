import { JsonTradeoffer } from "../../models/types";
import { EventEmitter } from "node:events";
import CSFloatClient from "./csfloatClient";
import { ICSFloatSocketEvents, ITradeFloat, IUpdateErrors, OfferStatus } from "./interfaces/csfloat.interface";
import { EStatusTradeCSFLOAT, ETradeOfferStateCSFloat, } from "./enums/cs-float.enum";
import { sleepAsync } from "@doctormckay/stdlib/promises";
import { minutesToMS } from "../../../shared/helpers";
import { IGetTradeOffersResponse, IHistoryPingBody, } from "./interfaces/fetch.interface";
import { AppId } from "./enums/steam.enum";
import CEconItem from "steamcommunity/classes/CEconItem.js";

export declare interface CSFloatSocket {
    emit<U extends keyof ICSFloatSocketEvents>(
        event: U,
        ...args: Parameters<ICSFloatSocketEvents[U]>
    ): boolean;

    on<U extends keyof ICSFloatSocketEvents>(
        event: U,
        listener: ICSFloatSocketEvents[U]
    ): this;

    once<U extends keyof ICSFloatSocketEvents>(
        event: U,
        listener: ICSFloatSocketEvents[U]
    ): this;
}

export class CSFloatSocket extends EventEmitter {
    private connected: boolean;
    private _csFloatClient: CSFloatClient;
    private readonly steamIDBase64: string;
    private statusExtension = false;

    constructor(_CSFloatClient: CSFloatClient, steamIDBase64: string) {
        super();
        this._csFloatClient = _CSFloatClient;
        this.steamIDBase64 = steamIDBase64;
    }

    public disconnect() {
        this.connected = false;
        this.emit("stateChange", false);
        return;
    }

    public async connect(): Promise<void> {
        this.connected = true;
        await this.registerLoops();
    }

    async getTradesOffers(): Promise<IGetTradeOffersResponse> {
        return new Promise<IGetTradeOffersResponse>((resolve, reject) => {
            this.emit("getTradeOffers", (resp, err) => {
                if (err) {
                    reject(err);
                }
                resolve(resp as IGetTradeOffersResponse);
            });
        });
    }

    async getItemsTradables(): Promise<CEconItem[]> {
        return new Promise((resolve, reject) => {
            this.emit("getInventory", (items, error) => {
                if (error) reject(error);
                resolve(items);
            });
        });
    }

    async getBlockedUsers(): Promise<string[]> {
        return new Promise((resolve, reject) => {
            this.emit(
                "getBlockerUsers",
                async (ignoredOrBlokedUsersResponse: string[], error) => {
                    if (error) {
                        reject(new Error(`Failed to get ignored and blocked users: ${error}`))
                    }
                    resolve(ignoredOrBlokedUsersResponse);
                }
            );
        })
    }

    private async registerLoops(): Promise<void> {
        while (this.connected) {
            try {
                this.emit("stateChange", true);

                const tradesOffers = await this.getTradesOffers();
                const tradesInQueue = await this._csFloatClient.getTrades(
                    EStatusTradeCSFLOAT.QUEUED
                );

                await this.autoAcceptTrades(tradesInQueue, tradesOffers);


                const tradesInPending = await this._csFloatClient.getTrades(
                    EStatusTradeCSFLOAT.PENDING
                );

                await this.verificationsLoop(tradesInPending);
                await this.sendOffer(tradesInPending);
                await this.extensionLoop(
                    tradesInPending,
                    tradesOffers
                );
            } catch (err) {
                this.emit("stateChange", false);
                this.emit("error", err);
            }
            await sleepAsync(minutesToMS(3));
        }

        this.disconnect();
    }

    private async extensionLoop(
        tradesInPending: ITradeFloat[],
        tradeOffers: IGetTradeOffersResponse
    ): Promise<void> {
        let errors: IUpdateErrors;

        if (tradesInPending.length > 0) {
            const ignoredOrBlokedUsers = await this.getBlockedUsers()

            errors = await this.pingUpdates(
                tradesInPending,
                ignoredOrBlokedUsers,
                tradeOffers
            );
        }

        this.statusExtension = await this._csFloatClient.pingExtensionStatus(
            errors,
            this.steamIDBase64
        );
        this.emit("stateChange", this.statusExtension);

    }

    private async verificationsLoop(
        tradesInPending: ITradeFloat[]
    ): Promise<void> {

        if (!tradesInPending || tradesInPending.length === 0) return;

        for (const trade of tradesInPending) {
            if (
                trade.steam_offer.state ===
                ETradeOfferStateCSFloat.CreatedNeedsConfirmation
            ) {
                this.emit("notifyWindows", {
                    title: `CSFLOAT - ${trade.contract.item.item_name}`,
                    body: `Trade offer is waiting for confirmation, please confirm the trade!`,
                });
            }
        }
    }

    private async pingUpdates(
        tradesInPending: ITradeFloat[],
        ignoredOrBlokedUsers: string[],
        tradeOffers: IGetTradeOffersResponse
    ): Promise<IUpdateErrors> {
        const errors: IUpdateErrors = {};

        try {
            await this.reportBlockedBuyers(tradesInPending, ignoredOrBlokedUsers);
        } catch (error) {
            console.error("failed to report blocked buyers", error);
            errors.blocked_buyers_error = error.toString();
        }

        try {
            await this.cancelUnconfirmedTradeOffers(tradesInPending, tradeOffers);
        } catch (error) {
            console.error(`failed to cancel unconfirmed trade offers`, error);
        }

        try {
            await this.pingTradeHistory(tradesInPending, tradeOffers);
        } catch (error) {
            console.error("failed to ping trade history", error);
            errors.history_error = (error as any).toString();
        }

        try {
            await this.pingSentTradeOffers();
        } catch (error) {
            console.error("failed to ping sent trade offer state", error);
            errors.trade_offer_error = (error as any).toString();
        }

        try {
            await this.pingCancelTrades(tradesInPending, tradeOffers);
        } catch (e) {
            console.error("failed to ping cancel ping trade offers", e);
        }

        return errors;
    }

    private async reportBlockedBuyers(
        tradesInPending: ITradeFloat[],
        ignoredOrBlokedUsers: string[]
    ): Promise<void> {
        if (!tradesInPending || tradesInPending.length < 1) return;

        const filteredIDs = ignoredOrBlokedUsers.filter((steamID) => {
            return tradesInPending.some(
                (trade) => trade.seller_id == steamID || trade.buyer_id == steamID
            );
        });

        if (filteredIDs.length === 0) return;

        await this._csFloatClient.pingBlockedUsers(ignoredOrBlokedUsers);
    }

    private async cancelUnconfirmedTradeOffers(
        tradesInPending: ITradeFloat[],
        tradeOffers: IGetTradeOffersResponse
    ): Promise<void> {
        const offerIDsToCancel = tradesInPending
            .filter((trade, index, self) => {
                const needConfirmation = trade.steam_offer.state === ETradeOfferStateCSFloat.CreatedNeedsConfirmation;
                const createdAnHourAgo = new Date(trade.steam_offer.sent_at).getTime() < Date.now() - 60 * 60 * 1000;
                const isFirst = self.map((t) => t.id).indexOf(trade.id) == index;
                return needConfirmation && createdAnHourAgo && isFirst;
            })
            .map((trade) => trade.steam_offer.id)


        if (offerIDsToCancel.length === 0) return;

        const offersIDsStillNeedsConfirmation = offerIDsToCancel.filter((id) => {
            const sentOffer = tradeOffers.sent.find(
                (offer) => offer.id === id
            );
            if (!sentOffer) return false;

            return (
                sentOffer.state === ETradeOfferStateCSFloat.CreatedNeedsConfirmation
            );
        });

        if (offersIDsStillNeedsConfirmation.length === 0) return;

        for (const offerID of offersIDsStillNeedsConfirmation) {
            this.emit("cancelTrade", offerID);
        }
    }

    private async pingTradeHistory(
        tradesInPending: ITradeFloat[],
        tradeOffersHistory: IGetTradeOffersResponse
    ): Promise<void> {

        const tradeOffersHistoryConcated = tradeOffersHistory.sent
            .concat(tradeOffersHistory.received)
            .filter(
                (tradeOffer) =>
                    tradeOffer.state === ETradeOfferStateCSFloat.Accepted ||
                    tradeOffer.state === ETradeOfferStateCSFloat.Declined ||
                    tradeOffer.state === ETradeOfferStateCSFloat.Expired ||
                    tradeOffer.state === ETradeOfferStateCSFloat.Canceled ||
                    tradeOffer.state === ETradeOfferStateCSFloat.Invalid
            )
            .filter((tradeOffer) => {
                if (!tradeOffer.escrowEnds) return true;

                if (typeof tradeOffer.escrowEnds === 'string') {
                    return parseInt(tradeOffer.escrowEnds) * 1000;
                } else {
                    return new Date(tradeOffer.escrowEnds).getTime() < Date.now();
                }
            })
            .map((tradeOffer) => {
                return {
                    other_party_url: `https://steamcommunity.com/profiles/${tradeOffer.partner.getSteamID64()}`,
                    received_assets: (tradeOffer.itemsToReceive || [])
                        .filter((item_to_receive) => item_to_receive.appid === AppId.CSGO)
                        .map((item_to_receive) => {
                            return { asset_id: item_to_receive.assetid, };
                        }),
                    given_assets: (tradeOffer.itemsToGive || [])
                        .filter((item_to_give) => item_to_give.appid === AppId.CSGO)
                        .map((item_to_give) => {
                            return { asset_id: item_to_give.assetid };
                        }),
                };
            });

        const assetsToFind = tradesInPending.reduce((acc, trade) => {
            acc[trade.contract.item.asset_id] = true;
            return acc;
        }, {} as { [key: string]: boolean });

        const historyForCSFloat = tradeOffersHistoryConcated.filter((trade) => {
            const received_ids = trade.received_assets.map(
                (items_to_receive) => items_to_receive.asset_id
            );

            const given_ids = trade.given_assets.map(
                (items_to_give) => items_to_give.asset_id
            );

            return !![...received_ids, ...given_ids].find((e) => {
                return assetsToFind[e];
            });
        }) as IHistoryPingBody[];

        if (historyForCSFloat.length === 0) return;

        await this._csFloatClient.tradeHistoryStatus(historyForCSFloat);
    }

    private async pingSentTradeOffers(
    ): Promise<void> {
        const tradeOffersSents = (await this.getTradesOffers()).sent
        const tradesInPending = await this._csFloatClient.getTrades(
            EStatusTradeCSFLOAT.PENDING
        );

        const offersToFind = tradesInPending.reduce((acc, trade) => {
            acc[trade.steam_offer.id] = true;
            return acc;
        }, {} as { [key: string]: boolean });

        const offersForCSFloat = tradeOffersSents.filter((offer) => {
            return !!offersToFind[offer.id];
        });

        if (offersForCSFloat.length > 0) {
            const offersForCSFloatMapped = offersForCSFloat.map((offer) => {
                return {
                    offer_id: offer.id,
                    state: offer.state,
                    given_asset_ids: offer?.itemsToGive.map(item => item.assetid) || [],
                    received_asset_ids: offer?.itemsToReceive?.map(item => item.assetid) || [],
                    time_created: offer.created ? Number(offer.created) : Number(new Date()),
                    other_steam_id64: offer.partner.getSteamID64(),
                } as OfferStatus
            })

            await this._csFloatClient.tradeOffers(offersForCSFloatMapped);
        }

        for (const offer of tradeOffersSents) {
            const itemsToGive = offer.itemsToGive.map(
                (item) => item.assetid
            ) as string[];
            const itemsToReceive = offer.itemsToReceive.map(
                (item) => item.assetid
            ) as string[];


            if (offer.state !== ETradeOfferStateCSFloat.Active) continue;

            const hasTradeWithNoOfferAnnotated = tradesInPending.find((trade) => {
                if (trade.steam_offer.id) {
                    return false;
                }

                return (itemsToGive || []).includes(trade.contract.item.asset_id);
            });

            if (!hasTradeWithNoOfferAnnotated) continue;

            try {
                await this._csFloatClient.annotateOffer({
                    offer_id: offer.id,
                    given_asset_ids: itemsToGive || [],
                    received_asset_ids: itemsToReceive || [],
                    other_steam_id64: offer.partner.getSteamID64(),
                });
            } catch (error) {
                console.error(`failed to annotate offer ${offer.id} post-hoc`, error);
            }
        }
    }

    private async pingCancelTrades(
        tradesInPending: ITradeFloat[],
        tradeOffers: IGetTradeOffersResponse
    ): Promise<void> {
        const hasWaitForCancelPing = tradesInPending.find(
            (trade) =>
                trade.state === EStatusTradeCSFLOAT.PENDING &&
                trade.wait_for_cancel_ping
        );

        if (!hasWaitForCancelPing) return;

        const allTradeOffers = [
            ...(tradeOffers.sent || []),
            ...(tradeOffers.received || []),
        ];

        for (const trade of tradesInPending) {
            if (trade.state !== EStatusTradeCSFLOAT.PENDING) continue;

            if (!trade.wait_for_cancel_ping) continue;

            const tradeOffer = allTradeOffers.find(
                (steamTradeOffer) => steamTradeOffer.id === trade.steam_offer.id
            );

            if (
                tradeOffer &&
                (tradeOffer.state === ETradeOfferStateCSFloat.Active ||
                    tradeOffer.state === ETradeOfferStateCSFloat.Accepted)
            )
                continue;

            try {
                await this._csFloatClient.pingCancelTrade({
                    trade_id: trade.id,
                    steam_id: this.steamIDBase64,
                });
            } catch (error) {
                console.error(
                    `failed to send cancel ping for trade ${trade.id}`,
                    error
                );
            }
        }
    }

    private async autoAcceptTrades(
        tradesInQueue: ITradeFloat[],
        tradeOffers: IGetTradeOffersResponse
    ): Promise<void> {
        if (tradesInQueue.length < 1) return;

        const tradeOffersSent = tradeOffers.sent;
        const itemsTradables = await this.getItemsTradables()

        if (itemsTradables.length === 0) return;

        for (const tradeInQueue of tradesInQueue) {
            const hasMatchingItem = itemsTradables.some(
                (item) => item.assetid === tradeInQueue.contract.item.asset_id
            );

            if (!hasMatchingItem) continue;
            let alreadyHasOffer = false
            let state: ETradeOfferStateCSFloat;

            for (const tradeOffer of tradeOffersSent) {
                state = tradeOffer.state
                for (const item of tradeOffer.itemsToGive) {
                    if (item.assetid === tradeInQueue.contract.item.asset_id && state != ETradeOfferStateCSFloat.Declined && state != ETradeOfferStateCSFloat.Canceled) {
                        alreadyHasOffer = true
                    }
                }
            }

            if (!alreadyHasOffer) {
                try {
                    const saleAccepted = await this._csFloatClient
                        .acceptTradesInFloat(tradeInQueue.id)
                    if (saleAccepted) this.emit("notifyWindows", {
                        title: `CSFLOAT - Accepted Sale`,
                        body: `Item: ${tradeInQueue.contract.item.item_name}!`,
                    });
                } catch (error) {
                    this.emit("notifyWindows", {
                        title: `CSFLOAT - can not accept sale!`,
                        body: `Item: ${tradeInQueue.contract.item.item_name}!`,
                    });
                    console.error(error)
                }
            }
        }
    }

    private async sendOffer(
        tradesInPending: ITradeFloat[],
    ): Promise<void> {
        if (tradesInPending.length === 0) return;
        for (const tradePending of tradesInPending) {
            if (tradePending.buyer.steam_id === this.steamIDBase64) continue;
            if (tradePending.steam_offer.state === ETradeOfferStateCSFloat.Accepted || tradePending.steam_offer.state === ETradeOfferStateCSFloat.Active) continue;
            const JSON_tradeOffer: JsonTradeoffer = {
                newversion: true,
                version: 2,
                me: {
                    assets: [
                        {
                            appid: 730,
                            contextid: "2",
                            amount: 1,
                            assetid: tradePending.contract.item.asset_id,
                        },
                    ],
                    currency: [] as any[],
                    ready: true,
                },
                them: {
                    assets: [] as any[],
                    currency: [] as any[],
                    ready: true,
                },
            };

            this.emit("sendTrade", {
                tradeURL: tradePending.trade_url,
                json_tradeoffer: JSON_tradeOffer,
                id: tradePending.id,
                marketplace: "CSFloat",
                message: "",
            });
        }
    }

}
