export interface LoginData {
  username: string;
  password: string;
  authCode: string;
  proxy?: string;
}

export interface SteamAcc {
  username: string;
  status: boolean;
  waxpeerSettings: WaxpeerSettings;
  shadowpaySettings: ShadowpaySettings;
  marketcsgoSettings: MarketcsgoSettings;
  userSettings: IUserSettings;
  avatar?: string;
}

export interface MarketplaceSettings {
  apiKey: string;
  state: boolean;
}

export interface WaxpeerSettings extends MarketplaceSettings {
  apiKey: string;
  state: boolean;
}

export interface ShadowpaySettings extends MarketplaceSettings {
  apiKey: string;
  state: boolean;
}

export interface MarketcsgoSettings extends MarketplaceSettings {
  apiKey: string;
  state: boolean;
}

export interface IUserSettings {
  acceptGifts: boolean;
  pendingTradesFilePath: string;
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

export type Marketplace = "Waxpeer" | "Shadowpay" | "CSFLoat" | "MarketCSGO";
