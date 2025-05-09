import { JsonTradeoffer } from "./../../models/types";
import { EventEmitter } from "node:events";
import CSFloatClient from "./csfloatClient";
import {
  ICSFloatSocketEvents,
  IResponseEmitEvents,
  ITradeFloat,
  IUpdateErrors,
} from "./interfaces/csfloat.interface";
import {
  EStatusTradeCSFLOAT,
  ETradeOfferStateCSFloat,
} from "./enums/cs-float.enum";
import { sleepAsync } from "@doctormckay/stdlib/promises";
import { minutesToMS } from "../../../shared/helpers";
import {
  IGetTradeOffersResponde,
  IHistoryPingBody,
} from "./interfaces/fetch.interface";
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
  private steamIDBase64: string;
  private statusExtension: boolean = false;

  constructor(_CSFloatClient: CSFloatClient, steamIDBase64: string) {
    super();
    this._csFloatClient = _CSFloatClient;
    this.steamIDBase64 = steamIDBase64;
    this.connect();
  }

  public disconnect() {
    this.connected = false;
    return;
  }

  public async connect(): Promise<void> {
    this.connected = true;
    this.registerLoops();
  }

  private async registerLoops(): Promise<void> {
    while (this.connected) {
      try {
        const tradesInPending = await this._csFloatClient.getTrades(
          EStatusTradeCSFLOAT.PENDING
        );

        const tradesInQueue = await this._csFloatClient.getTrades(
          EStatusTradeCSFLOAT.QUEUED
        );

        const { blockedOrIgnoredUsers, tradeOffers } =
          await this.emitPrimaryEvents(tradesInPending);
        await this.verificationsLoop(tradesInPending);
        await this.autoAcceptTrades(tradesInQueue, tradeOffers);
        await this.sendOffer(tradesInPending, tradeOffers);
        await this.extensionLoop(
          tradesInPending,
          blockedOrIgnoredUsers,
          tradeOffers
        );
      } catch (err) {
        this.emit("error", err);
      }
      await sleepAsync(minutesToMS(3));
    }

    this.disconnect();
  }

  private async extensionLoop(
    tradesInPending: ITradeFloat[],
    ignoredOrBlokedUsers: string[],
    tradeOffers: IGetTradeOffersResponde
  ): Promise<void> {
    let errors: IUpdateErrors;

    if (tradesInPending.length > 0) {
      errors = await this.pingUpdates(
        tradesInPending,
        ignoredOrBlokedUsers,
        tradeOffers
      );
    }

    try {
      this.statusExtension = await this._csFloatClient.pingExtensionStatus(
        errors,
        this.steamIDBase64
      );
      this.emit("stateChange", this.statusExtension);
    } catch (error) {
      console.error("failed to ping extension status to csfloat", error);
    }
  }

  private async verificationsLoop(
    tradesInPending: ITradeFloat[]
  ): Promise<void> {

    if (!tradesInPending) return;

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

  private async emitPrimaryEvents(
    tradesInPending: ITradeFloat[]
  ): Promise<IResponseEmitEvents> {
    if (!tradesInPending || tradesInPending.length < 1) {
      return {
        blockedOrIgnoredUsers: [],
        tradeOffers: {
          sent: [],
          received: [],
        },
      };
    }

    let blockedOrIgnoredUsers: string[];
    this.emit("getBlockerUsers", (ignoredOrBlokedUsers: string[]) => {
      blockedOrIgnoredUsers = ignoredOrBlokedUsers;
    });

    const tradeOffers: IGetTradeOffersResponde = await new Promise(
      (resolve, reject) => {
        this.emit(
          "getSentTradeOffers",
          async (getTradeOffersResponde: IGetTradeOffersResponde) => {
            if (!getTradeOffersResponde) {
              reject(new Error("Failed to get trade offers"));
              return;
            }
            resolve(getTradeOffersResponde);
          }
        );
      }
    );

    return {
      blockedOrIgnoredUsers,
      tradeOffers,
    };
  }

  private async pingUpdates(
    tradesInPending: ITradeFloat[],
    ignoredOrBlokedUsers: string[],
    tradeOffers: IGetTradeOffersResponde
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
      await this.pingSentTradeOffers(tradesInPending, tradeOffers);
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

    const hasTrade = tradesInPending.some(
      (trade) =>
        trade.seller_id.toString() === this.steamIDBase64 ||
        trade.buyer_id === this.steamIDBase64
    );

    if (!hasTrade) return;

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
    tradeOffers: IGetTradeOffersResponde
  ): Promise<void> {
    const offerIDsToCancel = [
      ...new Set(
        tradesInPending
          .filter(
            (trade) =>
              trade.steam_offer.state ===
              ETradeOfferStateCSFloat.CreatedNeedsConfirmation &&
              new Date(trade.steam_offer.sent_at).getTime() <
              Date.now() - 60 * 60 * 1000
          )
          .map((trade) => trade.steam_offer.id)
      ),
    ];

    if (offerIDsToCancel.length === 0) return;

    const tradeOffersConcatenated = tradeOffers.sent.concat(
      tradeOffers.received
    );

    const offersIDsStillNeedsConfirmation = offerIDsToCancel.filter((id) => {
      const sentOffer = tradeOffersConcatenated.find(
        (offer) => offer.id === id
      );
      if (!sentOffer) return false;

      return (
        sentOffer.state === ETradeOfferStateCSFloat.CreatedNeedsConfirmation
      );
    });

    if (offersIDsStillNeedsConfirmation.length === 0) return;

    for (const offerID of offersIDsStillNeedsConfirmation) {
      try {
        await this.emit("cancelTrade", offerID);
      } catch (error: any) {
        console.error(
          `failed to cancel needs confirmation trade, returning early: ${error.toString()}`
        );
        return;
      }
    }
  }

  private async pingTradeHistory(
    tradesInPending: ITradeFloat[],
    tradeOffersHistory: IGetTradeOffersResponde
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

        let escrowTime: number;
        if (typeof tradeOffer.escrowEnds === 'string') {
          escrowTime = parseInt(tradeOffer.escrowEnds) * 1000;
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

    await this._csFloatClient.tradeHistoryStatus(historyForCSFloat);
  }

  private async pingSentTradeOffers(
    tradesInPending: ITradeFloat[],
    tradeOffers: IGetTradeOffersResponde
  ): Promise<void> {
    const tradeOffersSents = tradeOffers.sent;

    const offersToFind = tradesInPending.reduce((acc, trade) => {
      acc[trade.steam_offer.id] = true;
      return acc;
    }, {} as { [key: string]: boolean });

    const offersForCSFloat = tradeOffersSents.filter((offer) => {
      return !!offersToFind[offer.id];
    });

    if (offersForCSFloat.length > 0)
      await this._csFloatClient.tradeOfferStatus(offersForCSFloat);

    for (const offer of tradeOffersSents) {
      const itemsToGive = offer.itemsToGive.map(
        (item) => item.assetid
      ) as string[];
      const itemsToReceive = offer.itemsToReceive.map(
        (item) => item.assetid
      ) as string[];

      if (offer.state !== ETradeOfferStateCSFloat.Active) continue;

      const hasTradeWithNoOfferAnnotated = tradesInPending.find((trade) => {
        if (trade.steam_offer.id) return false;

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
    tradeOffers: IGetTradeOffersResponde
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
        (item) => item.id === trade.steam_offer.id
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
    tradeOffers: IGetTradeOffersResponde
  ): Promise<void> {
    if (tradesInQueue.length < 1) return;

    const tradeOffersSent = tradeOffers.sent;
    const itemsTradables: CEconItem[] = await new Promise((resolve, reject) => {
      this.emit("getInventory", (items: CEconItem[], error) => {
        if (error) {
          console.error("Error in 'itemsTradables' (CSFloat) :", error);
          reject(error);
        }
        resolve(items);
      });
    });

    if (!itemsTradables) return;

    for (const trade of tradesInQueue) {
      const hasMatchingItem = itemsTradables.some(
        (item) => item.assetid === trade.contract.item.asset_id
      );

      if (!hasMatchingItem) continue;

      let alreadyHasOffer: boolean;

      for (const tradeOffer of tradeOffersSent) {
        for (const item of tradeOffer.itemsToGive) {
          if (item.assetid === trade.contract.item.asset_id) {
            alreadyHasOffer = true;
          } else {
            alreadyHasOffer = false;
          }
        }
      }

      if (!alreadyHasOffer) {
        await this._csFloatClient
          .acceptTradesInFloat(trade.id)
          .then(() => {
            this.emit("notifyWindows", {
              title: `CSFLOAT - Item: ${trade.contract.item.item_name}`,
              body: `Accepted item!`,
            });
          })
          .catch(() => {
            this.emit("notifyWindows", {
              title: `CSFLOAT!`,
              body: `Item: ${trade.contract.item.item_name}, Cannot be accepted!`,
            });
          });
      }
    }
  }

  private async sendOffer(
    tradesInPending: ITradeFloat[],
    tradeOffers: IGetTradeOffersResponde
  ): Promise<void> {
    if (tradesInPending.length < 1) return;
    const tradeOffersAlreadySent = tradeOffers.sent;

    const tradesActives = tradeOffersAlreadySent.filter(
      (trade) => trade.state === ETradeOfferStateCSFloat.Active
    );

    for (const tradePending of tradesInPending) {
      if (
        tradesActives.some((trade) =>
          trade.itemsToGive.some(
            (item) =>
              item.assetid.toString() ===
              tradePending.contract.item.asset_id.toString()
          )
        )
      )
        return;

      if (
        tradesActives.some((trade) =>
          trade.itemsToGive.some(
            (item) =>
              item.market_hash_name.toString() ===
              tradePending.contract.item.market_hash_name.toString()
          )
        )
      )
        return;

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
