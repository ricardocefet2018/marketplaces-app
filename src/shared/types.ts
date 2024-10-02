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
