import { JsonTradeoffer } from "src/main/models/types";
import { LoginData, Marketplace } from "../../../../shared/types";
import CEconItem from "steamcommunity/classes/CEconItem.js";

export interface TradeManagerOptions {
  storagePathBase: string;
  username: string;
  login: string | LoginData; // Can be refreshToken or LoginData
  proxy?: string;
}

export interface ICreateTradeData {
  tradeURL: string;
  json_tradeoffer: JsonTradeoffer;
  id: string | number;
  marketplace: Marketplace;
  message: string;
}

export interface CEconItemModified extends CEconItem {
  market_actions: contentMarketActions[];
}


interface contentMarketActions {
  link: string;
  name: string;
}