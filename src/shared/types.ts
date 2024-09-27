export interface LoginData {
  username: string;
  password: string;
  authCode: string;
  proxy?: string;
}

export interface SteamAcc {
  username: string;
  status: boolean;
  avatar?: string;
}
