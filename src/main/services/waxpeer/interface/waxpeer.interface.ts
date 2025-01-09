interface UserResponse {
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
interface IReadyTransferTrade {
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
interface IReadyTransferItem {
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
interface IReadyTransferUser {
  id: string;
  avatar?: string;
}
interface ReadyToTransferP2PResponse {
  success: boolean;
  trades: IReadyTransferTrade[];
}
interface SteamTradeResponse {
  success: boolean;
  msg?: string;
}
interface SteamTokenResponse {
  success: boolean;
  msg: string;
  exp: number;
}
