export interface LoginData {
  username: string;
  password: string;
  authCode: string;
  proxy?: string;
}

export interface SteamAcc {
  username: string;
  status: boolean;
  waxpeer: Waxpeer;
  shadowpay: Shadowpay;
  marketcsgo: MarketCSGO;
  csfloat: CSFloat;
  userSettings: IUserSettings;
  avatar?: string;
}

export interface MarketplaceSettings {
  apiKey: string;
  state: boolean;
}

export interface Waxpeer extends MarketplaceSettings {
  apiKey: string;
  state: boolean;
}

export interface Shadowpay extends MarketplaceSettings {
  apiKey: string;
  state: boolean;
}

export interface MarketCSGO extends MarketplaceSettings {
  apiKey: string;
  state: boolean;
}

export interface CSFloat extends MarketplaceSettings {
  apiKey: string;
  state: boolean;
}

export interface IUserSettings {
  acceptGifts: boolean;
  pendingTradesFilePath: string;
}

export interface IUserMarketplacesSettings {
  acceptGifts: boolean;
  pendingTradesFilePath: string;
  waxpeerApiKey: string;
  shadowpayApiKey: string;
  marketcsgoApiKey: string;
  csfloatApiKey: string;
}

export interface ISettings {
  startWithWindow: boolean;
  notification: boolean;
}

export type FormErrors<FormType> = {
  [K in keyof FormType]?: {
    field: K;
    fieldValue: FormType[K];
    message: string;
  }[];
};

export type Marketplace = "Waxpeer" | "Shadowpay" | "CSFloat" | "MarketCSGO";

export interface ApiResponse<T = null> {
  success: boolean;
  data?: T;
  msg?: string;
}
