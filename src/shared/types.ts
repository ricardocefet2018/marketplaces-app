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
  avatar?: string;
}

export interface WaxpeerSettings {
  apiKey: string;
  state: boolean;
}

export interface UserSettings {
  acceptGifts: boolean;
}

export type FormErrors<FormType> = {
  [K in keyof FormType]?: {
    field: K;
    fieldValue: FormType[K];
    message: string;
  }[];
};
