import {JsonTradeoffer} from "../../../models/types";
import {LoginData, Marketplace} from "../../../../shared/types";

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
