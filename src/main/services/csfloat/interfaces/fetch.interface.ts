import TradeOffer from "steam-tradeoffer-manager/lib/classes/TradeOffer";

export interface PaginationRequest {
  limit?: number;
  page?: number;
}

export interface IGetTradeOffersResponde {
  sent: TradeOffer[];
  received: TradeOffer[];
}

export interface IHistoryPingBody {
  other_party_url: string;
  received_assets: {
    asset_id: string;
  }[];
  given_assets: {
    asset_id: string;
  }[];
}

export interface IAnnotateOfferBody {
  offer_id: string;
  given_asset_ids: string[];
  received_asset_ids: string[];
  other_steam_id64: string;
}

export interface IPingCancelTradeBody {
  trade_id: string;
  steam_id: string | null | undefined;
}
