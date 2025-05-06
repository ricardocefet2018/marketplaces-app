import TradeOffer from "steam-tradeoffer-manager/lib/classes/TradeOffer";

export interface PaginationRequest {
  limit?: number;
  page?: number;
}

export interface IGetTradeOffersResponde {
  sent: TradeOffer[];
  received: TradeOffer[];
}
