export default class CSFloatClient {
  private api_key: string;
  private proxy: string;
  private steamToken: string;

  private constructor(api_key: string, proxy?: string) {
    this.api_key = api_key;
    this.proxy = proxy;
  }

  static getInstance(api_key: string, proxy?: string): CSFloatClient {
    return new CSFloatClient(api_key, proxy);
  }

  public setSteamToken(steamToken: string) {
    this.steamToken = steamToken;
  }
}
