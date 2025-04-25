import { TradeWebsocketEvents } from "src/main/models/types";

export interface ICSFloatSocketEvents extends TradeWebsocketEvents {
  sendTrade: (data: any) => void;
  cancelTrade: (tradeOfferId: string) => void;
  acceptWithdraw: (tradeOfferId: string) => void;
  stateChange: (online: boolean) => void;
  error: (error: any) => void;
}
