import { TradeWebsocketEvents } from "../../../models/types";
import {
  EContractStateCSFloat,
  EContractTypeCSFloat,
  EStatusTradeCSFLOAT,
  ETradeOfferStateCSFloat,
} from "../enums/cs-float.enum";
import { IGetTradeOffersResponse } from "./fetch.interface";
import CEconItem from "steamcommunity/classes/CEconItem.js";
import { ICreateTradeData } from "../../trade-manager/interface/tradeManager.interface";

export interface ICSFloatSocketEvents extends TradeWebsocketEvents {
  sendTrade: (data: ICreateTradeData) => void;
  cancelTrade: (tradeOfferId: string) => void;
  acceptWithdraw: (tradeOfferId: string) => void;
  stateChange: (online: boolean) => void;
  error: (error: any) => void;
  notifyWindows: (notifyData: INotifyData) => void;
  getBlockerUsers: (callback: (ignoredOrBlokedUsers: string[]) => void) => void;
  getSentTradeOffers: (
    callback: (getTradeOffersResponde: IGetTradeOffersResponse, error?: unknown) => void
  ) => void;
  getInventory: (
    callback: (items: CEconItem[], error?: unknown) => void
  ) => void;
}

export interface IResponseEmitEvents {
  tradeOffers: IGetTradeOffersResponse;
}

export interface INotifyData {
  title: string;
  body: string;
}

export interface IUpdateErrors {
  history_error?: string;
  trade_offer_error?: string;
  blocked_buyers_error?: string;
}

export interface ITradeFloat {
  id: string;
  created_at: string | Date;
  buyer_id: string;
  buyer: User;
  seller_id: string;
  seller: User;
  contract_id: string;
  accepted_at: string | Date;
  state: EStatusTradeCSFLOAT;
  verification_mode: string;
  steam_offer: SteamOffer;
  manual_verification: boolean;
  manual_verification_at?: Date | null;
  inventory_check_status: number;
  contract: Contract;
  trade_url: string;
  trade_token: string;
  wait_for_cancel_ping: boolean;
}

export interface IMEResponse {
  user: User
  pending_offers: number;
  actionable_trades: number;
  has_unread_notifications: boolean;
}

interface User {
  avatar: string;
  away: boolean;
  flags: number;
  has_valid_steam_api_key: boolean;
  online: boolean;
  stall_public: boolean;
  statistics: UserStatistics;
  steam_id: string;
  username: string;
  balance: number
}

interface UserStatistics {
  median_trade_time: number;
  total_avoided_trades: number;
  total_failed_trades: number;
  total_trades: number;
  total_verified_trades: number;
}

interface SteamOffer {
  id: string;
  state: ETradeOfferStateCSFloat;
  is_from_seller: boolean;
  can_cancel_at: string | Date;
  sent_at: string | Date;
  deadline_at: string | Date;
  updated_at: string | Date;
}

interface Contract {
  id: string;
  created_at: string | Date;
  type: EContractTypeCSFloat;
  price: number;
  state: EContractStateCSFloat;
  seller: User;
  reference: Reference;
  item: Item;
  is_seller: boolean;
  is_watchlisted: boolean;
  watchers: number;
  sold_at: string | Date;
}

interface Reference {
  base_price: number;
  float_factor: number;
  predicted_price: number;
  quantity: number;
  last_updated: string | Date;
}

interface Item {
  asset_id: string;
  def_index: number;
  paint_index: number;
  paint_seed: number;
  float_value: number;
  icon_url: string;
  d_param: string;
  is_stattrak: boolean;
  is_souvenir: boolean;
  rarity: number;
  quality: number;
  market_hash_name: string;
  tradable: number;
  inspect_link: string;
  cs2_screenshot_id: string;
  cs2_screenshot_at: string | Date;
  is_commodity: boolean;
  type: string;
  rarity_name: string;
  type_name: string;
  item_name: string;
  wear_name: string;
  description: string;
  collection: string;
  serialized_inspect: string;
  gs_sig: string;
}
