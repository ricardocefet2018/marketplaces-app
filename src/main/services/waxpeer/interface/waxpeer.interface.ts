export interface UserResponse {
  success: boolean;
  user: {
    wallet: number;
    id: string;
    userid: number;
    id64: string;
    avatar: string;
    name: string;
    sell_fees: number;
    can_p2p: boolean;
    tradelink: string;
    login: string;
    ref: string;
    sell_status: boolean;
    steam_api: string;
  };
}

export interface IReadyTransferTrade {
  id: number;
  costum_id: string;
  trade_id: string;
  tradelink: string;
  trade_message: string;
  done: boolean;
  stage: number;
  creator: string;
  send_until: string;
  last_updated: string;
  for_steamid64: string;
  user: IReadyTransferUser;
  seller: IReadyTransferUser;
  items: IReadyTransferItem[];
}

export interface IReadyTransferItem {
  id: number;
  item_id: string;
  give_amount: number;
  merchant: string;
  image: string;
  price: number;
  game: string;
  name: string;
  status: number;
}

export interface IReadyTransferUser {
  id: string;
  avatar?: string;
}

export interface ReadyToTransferP2PResponse {
  success: boolean;
  trades: IReadyTransferTrade[];
}

export interface SteamTradeResponse {
  success: boolean;
  msg?: string;
}

export interface SteamTokenResponse {
  success: boolean;
  msg: string;
  exp: number;
}
