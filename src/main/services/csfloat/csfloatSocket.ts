import { EventEmitter } from "node:events";
import CSFloatClient from "./csfloatClient";
import {
  ICSFloatSocketEvents,
  IHistoryPingData,
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
import { IGetTradeOffersResponde } from "./interfaces/fetch.interface";
import { AppId } from "./enums/steam.enum";
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
        this.emit("stateChange", true);
        const tradesInPending = await this._csFloatClient.getTrades(
          EStatusTradeCSFLOAT.PENDING
        );
        const { blockedOrIgnoredUsers, tradeOffers } =
          await this.emitPrimaEvents();

        await this.verificationsLoop(tradesInPending);
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
  }

  private async extensionLoop(
    tradesInPending: ITradeFloat[],
    ignoredOrBlokedUsers: string[],
    tradeOffers: IGetTradeOffersResponde
  ): Promise<void> {
    await this.pingUpdates(tradesInPending, ignoredOrBlokedUsers, tradeOffers);
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

  private async emitPrimaEvents(): Promise<IResponseEmitEvents> {
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
  ): Promise<void> {
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
    } catch (e) {
      console.error("failed to ping trade history", e);
      errors.history_error = (e as any).toString();
    }
  }

  private async reportBlockedBuyers(
    tradesInPending: ITradeFloat[],
    ignoredOrBlokedUsers: string[]
  ): Promise<void> {
    if (!tradesInPending || tradesInPending.length < 0) return;

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
      .filter(
        (tradeOffer) =>
          !tradeOffer.escrowEnds ||
          new Date(
            parseInt(tradeOffer.escrowEnds.toString()) * 1000
          ).getTime() < Date.now()
      )
      .map((tradeOffer) => {
        return {
          other_party_url: `https://steamcommunity.com/profiles/${tradeOffer.partner.getSteamID64()}`,
          received_assets: (tradeOffer.itemsToReceive || [])
            .filter((item_to_receive) => item_to_receive.appid === AppId.CSGO)
            .map((item_to_receive) => {
              return { asset_id: item_to_receive.assetid };
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
    }) as IHistoryPingData[];

    const response = await this._csFloatClient.tradeHistoryStatus(
      historyForCSFloat
    );
  }
}
