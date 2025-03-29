import CEconItem from "steamcommunity/classes/CEconItem.js";
import { JsonTradeoffer, TradeWebsocketEvents } from "../../models/types";
import { EventEmitter } from "node:events";
import CSFloatClient from "./csfloatClient";
import { EStatusTradeCSFLOAT } from "./enum/csfloat.enum";
import { sleepAsync } from "@doctormckay/stdlib/promises";
import { minutesToMS } from "../../../shared/helpers";
import TradeOffer from "steam-tradeoffer-manager/lib/classes/TradeOffer.js";
import { ITradeOffer } from "../trade-manager/interface/tradeManager.interface";
import { Marketplace } from "../../../shared/types";
import { FetchError } from "node-fetch";
import {
  IMakeData,
  Trade,
  TradeOfferState,
} from "./interface/csfloat.interface";

interface CSFloatSocketEvents extends TradeWebsocketEvents {
  sendTrade: (data: ITradeOffer) => void;
  cancelTrade: (tradeOfferId: string) => void;
  acceptWithdraw: (tradeOfferId: string) => void;
  stateChange: (online: boolean) => void;
  error: (error: any) => void;
  getInventory: (
    callback: (items: CEconItem[], error?: unknown) => void
  ) => void;
  getTradeOffers: (
    callback: (tradeOffers: TradeOffer[], error?: unknown) => void
  ) => void;
  getTradeHistory: (
    callback: (tradeOffers: TradeOffer[], error?: unknown) => void
  ) => void;
}

export declare interface CSFloatSocket {
  emit<U extends keyof CSFloatSocketEvents>(
    event: U,
    ...args: Parameters<CSFloatSocketEvents[U]>
  ): boolean;

  on<U extends keyof CSFloatSocketEvents>(
    event: U,
    listener: CSFloatSocketEvents[U]
  ): this;

  once<U extends keyof CSFloatSocketEvents>(
    event: U,
    listener: CSFloatSocketEvents[U]
  ): this;
}

export class CSFloatSocket extends EventEmitter {
  private csfloatClient: CSFloatClient;
  private connected: boolean;

  public constructor(csfloatClient: CSFloatClient) {
    super();
    this.csfloatClient = csfloatClient;
    this.connect();
  }

  public async connect(): Promise<void> {
    this.connected = true;
    await this.loop();
  }

  private async loop() {
    this.emit("stateChange", true);
    while (this.connected) {
      try {
        this.emit("stateChange", true);
        await this.main();
      } catch (error) {
        if (!(error instanceof FetchError)) this.emit("error", error);
        this.emit("stateChange", false);
      }
      await sleepAsync(minutesToMS(3));
    }
  }

  async main() {
    const tradesCSFloatInQueue: any[] = await this.csfloatClient.getTrades(
      EStatusTradeCSFLOAT.QUEUED
    );

    const tradesSteamOffers: TradeOffer[] = [];

    if (tradesCSFloatInQueue.length > 0) {
      const itemsSteamExchangeable: CEconItem[] = await new Promise(
        (resolve, reject) => {
          this.emit("getInventory", (items: CEconItem[], error?: unknown) => {
            if (error) {
              console.error(
                "Error in 'itemsSteamExchangeable' (CSFloat) :",
                error
              );
              reject(error);
            }
            resolve(items);
          });
        }
      );

      const responseGetTradeOffers: TradeOffer[] = await new Promise(
        (resolve, reject) => {
          this.emit(
            "getTradeOffers",
            async (tradeOffers: TradeOffer[], error) => {
              if (error) {
                console.error("Error in 'getTradeOffers' (CSFloat) :", error);
                reject(error);
              }
              resolve(tradeOffers);
            }
          );
        }
      );

      if (!responseGetTradeOffers) return;

      tradesSteamOffers.push(...responseGetTradeOffers);

      for (const trade of tradesCSFloatInQueue) {
        const hasMatchingItem = itemsSteamExchangeable.some(
          (item) => item.assetid === trade.contract.item.asset_id
        );

        if (!hasMatchingItem) continue;

        for (const tradeOffer of tradesSteamOffers) {
          {
            for (const item of tradeOffer.itemsToGive) {
              if (item.assetid === trade.contract.item.asset_id) continue;
            }
          }
        }

        await this.csfloatClient.acceptTrade([trade.id]);
      }
    }

    await this.csfloatClient.pingExtensionStatus({
      history_error: undefined,
      trade_offer_error: undefined,
    });

    await this.csfloatClient.updateBalance();

    const pendingTrades: Trade[] = await this.csfloatClient.getTrades(
      EStatusTradeCSFLOAT.PENDING
    );
    console.log("pendingTrades", pendingTrades);
    console.log("tradesSteamOffers", tradesSteamOffers);

    if (pendingTrades.length > 0) {
      const dataTrades = this.makeDataByPingUpdate(pendingTrades);

      for (const dataTrade of dataTrades) {
        await this.emit("sendTrade", dataTrade);
      }
    }

    await this.cancelUnconfirmedTradeOffers(pendingTrades, tradesSteamOffers);

    const responseGetTradeOffers: TradeOffer[] = await new Promise(
      (resolve, reject) => {
        this.emit(
          "getTradeHistory",
          async (tradeOffers: TradeOffer[], error) => {
            if (error) {
              console.error("Error in 'getTradeOffers' (CSFloat) :", error);
              reject(error);
            }
            resolve(tradeOffers);
          }
        );
      }
    );

    await this.csfloatClient.pingUpdates(
      pendingTrades,
      tradesSteamOffers,
      responseGetTradeOffers
    );

    await this.csfloatClient.pingExtensionStatus({
      history_error: undefined,
      trade_offer_error: undefined,
    });
    return;
  }

  private async cancelUnconfirmedTradeOffers(
    pendingTrades: Trade[],
    tradesSteamOffers: TradeOffer[]
  ): Promise<void> {
    if (!tradesSteamOffers) return;

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

    const offers = this.csfloatClient.mapTradesSteamOffers(tradesSteamOffers);
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

    for (const offerID of offersIDsStillNeedsConfirmation) {
      await this.emit("cancelTrade", offerID);
    }
  }

  makeDataByPingUpdate(pendingTrades: any): IMakeData[] {
    return pendingTrades.map((objectTrade: any) => {
      const JSON_tradeOffer: JsonTradeoffer = {
        newversion: true,
        version: 2,
        me: {
          assets: [
            {
              appid: 730,
              contextid: "2",
              amount: 1,
              assetid: objectTrade.contract.item.asset_id,
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

      return {
        tradeURL: objectTrade.trade_url,
        json_tradeoffer: JSON_tradeOffer,
        id: objectTrade.id,
        marketplace: "CSFloat" as Marketplace,
        message: "",
      };
    });
  }

  public disconnect() {
    this.connected = false;
    return;
  }
}
