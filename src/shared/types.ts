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
  userSettings: IUserSettings;
  avatar?: string;
}

export interface WaxpeerSettings {
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
