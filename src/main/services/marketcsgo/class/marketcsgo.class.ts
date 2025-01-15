import { MarketcsgoTradeOfferPayload } from "../interface/marketcsgo.interface";

export class TradeRequestGiveP2PAll {
  success: boolean;
  offers: MarketcsgoTradeOfferPayload[];
  error?: string;
}
