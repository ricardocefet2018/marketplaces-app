export interface MarketcsgoTradeOfferPayload {
  hash: string;
  partner: number;
  token: string;
  tradeoffermessage: string;
  items: ItemInTrade[];
  created?: boolean;
}

interface ItemInTrade {
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
