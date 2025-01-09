// eslint-disable-next-line import/no-unresolved
import { JsonTradeoffer, TradeWebsocketEvents } from "src/main/models/types";

export interface SpWSMessageSent {
  id: number;
  params: any;
  method?: number;
}

export interface ShadowpayWebsocketEvents extends TradeWebsocketEvents {
  sendTrade: (data: SendTradePayload) => void;
  cancelTrade: (tradeOfferId: string) => void;
  acceptWithdraw: (tradeOfferId: string) => void;
  stateChange: (online: boolean) => void;
  error: (error: any) => void;
}

export declare interface ShadowpayWebsocket {
  emit<U extends keyof ShadowpayWebsocketEvents>(
    event: U,
    ...args: Parameters<ShadowpayWebsocketEvents[U]>
  ): boolean;

  on<U extends keyof ShadowpayWebsocketEvents>(
    event: U,
    listener: ShadowpayWebsocketEvents[U]
  ): this;

  once<U extends keyof ShadowpayWebsocketEvents>(
    event: U,
    listener: ShadowpayWebsocketEvents[U]
  ): this;
}

export interface SpWSMessageReceived {
  id?: number;
  result: {
    channel: string;
    data: {
      data: {
        data:
          | SendTradePartialPayload
          | AcceptTradePayload
          | CancelTradePayload
          | DeclineTradePayload
          | any;
        token: string;
        type: "sendOffer" | "acceptOffer" | "cancelOffer" | "declineOffer";
      };
    };
  };
}

export interface SendTradePartialPayload {
  id: number;
  assetid: string;
  project: number;
  json_tradeoffer: string;
  tradelink: string;
  tradeofferid: string;
  from_steamid: string;
  to_steamid: string;
}

export interface SendTradePayload {
  id: number;
  assetid: string;
  project: number;
  json_tradeoffer: JsonTradeoffer;
  tradelink: string;
  tradeofferid: string;
  from_steamid: string;
  to_steamid: string;
}

export interface AcceptTradePayload {
  id: number;
  assetid: string;
  project: number;
  json_tradeoffer: string;
  tradelink: string;
  tradeofferid: string;
  from_steamid: string;
  to_steamid: string;
}
export interface CancelTradePayload {
  id: number;
  tradeofferid: string;
}

export interface DeclineTradePayload {
  id: number;
  tradeofferid: string;
}
