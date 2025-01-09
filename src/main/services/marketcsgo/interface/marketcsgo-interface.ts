// eslint-disable-next-line import/no-unresolved
import { TradeWebsocketEvents } from "src/main/models/types";

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

export interface MarketcsgoTradeOfferPayload {
  hash: string;
  partner: number;
  token: string;
  tradeoffermessage: string;
  items: ItemInTrade[];
  created?: boolean;
}

export interface ItemInTrade {
  appid: number;
  contextid: number;
  assetid: string;
  amount: number;
}

export interface GetTradesPayload {
  success: boolean;
  trades?: TradePayload[];
  error?: string;
}

export interface TradePayload {
  dir: "out" | "in";
  trade_id: string;
  bot_id: string;
  timestamp: number;
  secret: string;
  nik: string;
}
