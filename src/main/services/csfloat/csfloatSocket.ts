import CEconItem from "steamcommunity/classes/CEconItem.js";
import { JsonTradeoffer, TradeWebsocketEvents } from "../../models/types";
import { EventEmitter } from "node:events";
import CSFloatClient from "./csfloatClient";
import { EStatusTradeCSFLOAT } from "./enum/csfloat.enum";
import { sleepAsync } from "@doctormckay/stdlib/promises";
import { minutesToMS } from "../../../shared/helpers";
import TradeOffer from "steam-tradeoffer-manager/lib/classes/TradeOffer";
import { ITradeOffer } from "../trade-manager/interface/tradeManager.interface";
import { Marketplace } from "../../../shared/types";

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
    let count = 1;
    while (this.connected) {
      count++;
      await this.main();
      await sleepAsync(minutesToMS(3));
    }
  }

  async main() {
    const tradesInQueue: any[] = await this.csfloatClient.getTrades(
      EStatusTradeCSFLOAT.QUEUED
    );

    if (tradesInQueue.length > 0) {
      const itemsTradables: CEconItem[] = await new Promise(
        (resolve, reject) => {
          this.emit("getInventory", (items: CEconItem[], error?: unknown) => {
            if (error) {
              console.error("Error:", error);
              reject(error);
              return;
            }

            resolve(items);
          });
        }
      );

      tradesInQueue.forEach(async (trade) => {
        const hasMatchingItem = itemsTradables.some(
          (item) => item.assetid === trade.contract.item.asset_id
        );
        if (!hasMatchingItem) return;

        const itemsInTrade: any[] = await new Promise((resolve, reject) => {
          this.emit(
            "getTradeOffers",
            async (tradeOffers: TradeOffer[], error) => {
              resolve(tradeOffers);
              reject(error);
            }
          );
        });

        itemsInTrade.forEach(async (tradeOffer) => {
          tradeOffer.itemsToGive.forEach(async (item: any) => {
            if (item.assetid === trade.contract.item.asset_id) return;
          });
        });

        await this.csfloatClient.acceptTrade([trade.id]);
      });
    }

    await this.csfloatClient.pingExtensionStatus({
      history_error: undefined,
      trade_offer_error: undefined,
    });

    await this.csfloatClient.updateBalance();

    const hasPermission = await this.csfloatClient.verifySteamPermission();

    if (!hasPermission) {
      this.emit("stateChange", false);
      return;
    }

    const pedingTrades: any[] = await this.csfloatClient.getTrades(
      EStatusTradeCSFLOAT.PENDING
    );

    if (pedingTrades.length <= 0) return;

    const dataTrades = pedingTrades.map((objectTrade: any) => {
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

    await Promise.all(
      dataTrades.map((dataTrade) => this.emit("sendTrade", dataTrade))
    );
    await this.csfloatClient.pingUpdates(pedingTrades);

    await this.csfloatClient.pingExtensionStatus({
      history_error: undefined,
      trade_offer_error: undefined,
    });
    return;
  }

  public disconnect() {
    this.connected = false;
    return;
  }
}
