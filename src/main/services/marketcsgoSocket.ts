import { TradeWebsocketEvents } from "../models/types";
import { EventEmitter } from "node:events";
import MarketcsgoClient, {
  MarketcsgoTradeOfferPayload,
} from "./marketcsgoClient";
import { sleepAsync } from "@doctormckay/stdlib/promises";
import { minutesToMS } from "../../shared/helpers";
import { FetchError } from "node-fetch";

interface MarketcsgoSocketEvents extends TradeWebsocketEvents {
  sendTrade: (data: MarketcsgoTradeOfferPayload) => void;
  cancelTrade: (tradeOfferId: string) => void;
  acceptWithdraw: (tradeOfferId: string) => void;
  stateChange: (online: boolean) => void;
  error: (error: any) => void;
}

export declare interface MarketcsgoSocket {
  emit<U extends keyof MarketcsgoSocketEvents>(
    event: U,
    ...args: Parameters<MarketcsgoSocketEvents[U]>
  ): boolean;

  on<U extends keyof MarketcsgoSocketEvents>(
    event: U,
    listener: MarketcsgoSocketEvents[U]
  ): this;

  once<U extends keyof MarketcsgoSocketEvents>(
    event: U,
    listener: MarketcsgoSocketEvents[U]
  ): this;
}

export class MarketcsgoSocket extends EventEmitter {
  private static WS_URL = `wss://market.csgo.com/connection/websocket`;
  private marketcsgoClient: MarketcsgoClient;
  private connected: boolean;

  public constructor(marketcsgoClient: MarketcsgoClient) {
    super();
    this.marketcsgoClient = marketcsgoClient;
    this.connect();
  }

  public async connect(): Promise<void> {
    this.connected = true;
    this.registerLoops();
  }

  private registerLoops() {
    this.startPingLoop();
    this.watchTradesToSend();
    this.watchTradesToAcceptAndCancel();
  }

  private async startPingLoop() {
    while (this.connected) {
      try {
        const status = await this.marketcsgoClient.sendSteamToken();
        this.emit("stateChange", status);
      } catch (err) {
        if (!(err instanceof FetchError)) this.emit("error", err);
        this.emit("stateChange", false);
      }
      await sleepAsync(minutesToMS(3));
    }
  }

  private async watchTradesToSend() {
    while (this.connected) {
      try {
        const tradesToSend = await this.marketcsgoClient.getAllTradesToSend();
        for (const tradeToSend of tradesToSend) {
          this.emit("sendTrade", tradeToSend);
        }
      } catch (err) {
        if (!(err instanceof FetchError)) this.emit("error", err);
      }
      await sleepAsync(minutesToMS(0.5));
    }
  }

  private async watchTradesToAcceptAndCancel() {
    while (this.connected) {
      try {
        const trades = await this.marketcsgoClient.getTrades();
        for (const trade of trades) {
          // It's not inverted, somehow the api mark incoming items as 'out' and going items as 'in'
          if (trade.dir == "out") this.emit("acceptWithdraw", trade.trade_id);
          if (
            trade.dir == "in" &&
            Date.now() - trade.timestamp > minutesToMS(5)
          )
            this.emit("cancelTrade", trade.trade_id);
        }
      } catch (err) {
        if (!(err instanceof FetchError)) this.emit("error", err);
      }
      await sleepAsync(minutesToMS());
    }
  }

  public disconnect() {
    this.connected = false;
    return;
  }
}
