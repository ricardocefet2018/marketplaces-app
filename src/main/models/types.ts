export interface TradeWebsocketCreateTradeData {
  waxid: string;
  wax_id: string;
  json_tradeoffer: TradeWebsocketCreateTradeJsonTradeoffer;
  tradeoffermessage: string;
  tradelink: string;
  partner: string;
  created: string;
  now: string;
  send_until: string;
}
interface TradeWebsocketCreateTradeJsonTradeoffer {
  newversion: boolean;
  version: number;
  me: TradeWebsocketCreateTradeSide;
  them: TradeWebsocketCreateTradeSide;
}
interface TradeWebsocketCreateTradeSide {
  assets: TradeWebsocketAsset[];
  currency: any[];
  ready: boolean;
}
interface TradeWebsocketAsset {
  appid: number;
  contextid: string;
  amount: number;
  assetid: string;
}
