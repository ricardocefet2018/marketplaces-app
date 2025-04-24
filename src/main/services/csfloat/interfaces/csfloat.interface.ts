import { TradeWebsocketEvents } from "src/main/models/types";

export interface ICSFloatSocketEvents extends TradeWebsocketEvents {
//   sendTrade: (data: MarketcsgoTradeOfferPayload) => void;
  cancelTrade: (tradeOfferId: string) => void;
  acceptWithdraw: (tradeOfferId: string) => void;
  stateChange: (online: boolean) => void;
  error: (error: any) => void;
}

export declare interface ICSFloatSocket {
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
