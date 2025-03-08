export interface CSFloatTradeOfferPayload {
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
export interface AccessToken {
  token: string;
  steam_id: string;
  updated_at: number; // Timestamp da última atualização
}

export interface getTradesInQueuedRequest {
  state?: string;
  limit?: number;
}

export interface getTradesInQueuedResponse {
  count: number;
  trades: Trade[];
}

export interface Trade {
  id: string;
  accepted_at?: string;
  buyer: User;
  buyer_id: string;
  contract: Contract;
  contract_id: string;
  created_at: string;
  expires_at?: string;
  grace_period_start: string;
  manual_verification: boolean;
  manual_verification_at?: string;
  seller_id: string;
  state: TradeState;
  trade_url: string;
  steam_offer: SteamOffer;
  wait_for_cancel_ping?: boolean;
}

interface User {
  avatar: string;
  flags: number;
  online: boolean;
  stall_public: boolean;
  statistics: {
    median_trade_time: number;
    total_avoided_trades: number;
    total_failed_trades: number;
    total_trades: number;
    total_verified_trades: number;
  };
  steam_id: string;
  username: string;
}
interface Contract {
  created_at: string;
  id: string;
  is_seller: boolean;
  is_watchlisted: boolean;
  item: Item;
  max_offer_discount?: number;
  min_offer_price?: number;
  price: number;
  seller: User;
  state: ContractState;
  type: ContractType;
  watchers: number;
}
interface Item {
  asset_id: string;
  d_param: string;
  def_index: number;
  description: string;
  float_value: number;
  has_screenshot: boolean;
  high_rank: number;
  icon_url: string;
  inspect_link: string;
  is_souvenir: false;
  is_stattrak: false;
  item_name: string;
  low_rank: number;
  market_hash_name: string;
  paint_index: number;
  paint_seed: number;
  phase?: string;
  quality: number;
  rarity: number;
  wear_name: string;
  scm?: {
    price?: number;
    volume?: number;
  };
}
enum ContractState {
  SOLD = "sold",
  LISTED = "listed",
  DELISTED = "delisted",
  REFUNDED = "refunded",
}

enum ContractType {
  BUY_NOW = "buy_now",
  AUCTION = "auction",
}
export enum TradeState {
  QUEUED = "queued",
  PENDING = "pending",
  VERIFIED = "verified",
  FAILED = "failed",
  CANCELLED = "cancelled",
}
interface SteamOffer {
  id: string;
  state: TradeOfferState;
  sent_at: string;
}
export enum TradeOfferState {
  Invalid = 1,
  Active = 2,
  Accepted = 3,
  Countered = 4,
  Expired = 5,
  Canceled = 6,
  Declined = 7,
  InvalidItems = 8,
  CreatedNeedsConfirmation = 9,
  CancelledBySecondFactor = 10,
  InEscrow = 11,
}

export interface TradeHistoryAPIResponse {
  response: {
    trades: {
      tradeid: string;
      steamid_other: string;
      status: number;
      assets_given?: HistoryAsset[];
      assets_received?: HistoryAsset[];
      time_escrow_end?: string;
    }[];
  };
}

interface HistoryAsset {
  assetid: string;
  appid: AppId;
  new_assetid: string;
}

export enum AppId {
  CSGO = 730,
}

export interface TradeOffersAPIResponse {
  response: {
    trade_offers_sent: TradeOffersAPIOffer[];
    trade_offers_received: TradeOffersAPIOffer[];
  };
}

export interface TradeOffersAPIOffer {
  tradeofferid: string;
  accountid_other: string;
  trade_offer_state: TradeOfferState;
  items_to_give?: TradeOfferItem[];
  items_to_receive?: TradeOfferItem[];
  time_created: number;
  time_updated: number;
}

export interface OfferStatus {
  offer_id: string;
  state: TradeOfferState;
  given_asset_ids?: string[];
  received_asset_ids?: string[];
  time_created?: number;
  time_updated?: number;
  other_steam_id64?: string;
}

interface TradeOfferItem {
  assetid: string;
}

export enum TradeOffersType {
  API = 1,
  HTML = 2,
}

export interface TradeHistoryStatus {
  other_party_url: string;
  received_assets: TradeHistoryAsset[];
  given_assets: TradeHistoryAsset[];
}

export interface TradeHistoryAsset {
  asset_id: string;
  new_asset_id?: string;
}
export interface UserResponse {
  success: boolean;
  user: {
    userid: number;
    id64: string;
  };
}
