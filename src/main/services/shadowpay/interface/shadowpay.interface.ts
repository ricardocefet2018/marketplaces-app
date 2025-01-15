import { JsonTradeoffer } from "../../../models/types";

export interface GetBalanceResponse {
  data: {
    balance: number;
  };
  status: "success" | string;
}

export interface GetWSTokenResponse {
  data: {
    token: string;
    offers_token: string;
    url: string;
  };
  status: string;
}

export interface SpWSMessageSent {
  id: number;
  params: any;
  method?: number;
}

export interface SpWSMessageReceived {
  id?: number;
  result: {
    channel: string;
    data: {
      data: {
        data:
          | SendTradePartialPayload
          | AcceptTradePayload
          | CancelTradePayload
          | DeclineTradePayload
          | any;
        token: string;
        type: "sendOffer" | "acceptOffer" | "cancelOffer" | "declineOffer";
      };
    };
  };
}

export interface SendTradePartialPayload {
  id: number;
  assetid: string;
  project: number;
  json_tradeoffer: string;
  tradelink: string;
  tradeofferid: string;
  from_steamid: string;
  to_steamid: string;
}

export interface SendTradePayload {
  id: number;
  assetid: string;
  project: number;
  json_tradeoffer: JsonTradeoffer;
  tradelink: string;
  tradeofferid: string;
  from_steamid: string;
  to_steamid: string;
}

export interface AcceptTradePayload {
  id: number;
  assetid: string;
  project: number;
  json_tradeoffer: string;
  tradelink: string;
  tradeofferid: string;
  from_steamid: string;
  to_steamid: string;
}

export interface CancelTradePayload {
  id: number;
  tradeofferid: string;
}

export interface DeclineTradePayload {
  id: number;
  tradeofferid: string;
}
