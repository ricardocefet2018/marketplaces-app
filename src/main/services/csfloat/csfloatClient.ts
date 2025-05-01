import { HttpsProxyAgent } from "https-proxy-agent";
import fetch, { RequestInit, Response } from "node-fetch";
import { EStatusTradeCSFLOAT } from "./enums/cs-float.enum";
import { PaginationRequest } from "./interfaces/fetch.interface";
import { ITradeFloat } from "./interfaces/csfloat.interface";
export default class CSFloatClient {
  private static API_URL = "https://csfloat.com/api/v1";
  private api_key: string;
  private proxy: string;

  private constructor(api_key: string, proxy?: string) {
    this.api_key = api_key;
    this.proxy = proxy;
  }

  static getInstance(api_key: string, proxy?: string): CSFloatClient {
    return new CSFloatClient(api_key, proxy);
  }

  public async getTrades(
    status: EStatusTradeCSFLOAT,
    options?: PaginationRequest
  ): Promise<ITradeFloat[]> {
    const limit = options?.limit || 100;
    const page = options?.page || 0;
    const url = new URL(`${CSFloatClient.API_URL}/me/trades`);
    const params = new URLSearchParams({
      state: status,
      limit: limit.toString(),
      page: page.toString()
    });
    url.search = params.toString();
  
    const response = await this.internalFetch(url.toString());
  
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to fetch trades: ${response.status} - ${errorBody}`);
    }
    const result = await response.json() as {trades:ITradeFloat[]};
 
    if (!result || !Array.isArray(result.trades)) {
      throw new Error('Invalid API response format');
    }
  
    return result.trades as ITradeFloat[];
  }

  private internalFetch(
    url: string,
    init: RequestInit = {}
  ): Promise<Response> {
    if (this.proxy) init.agent = new HttpsProxyAgent(this.proxy);

    const headers = new Headers(init.headers as HeadersInit);

    headers.set("Accept", "application/json");
    headers.set("Authorization", this.api_key);

    init.headers = Object.fromEntries(headers.entries());

    return fetch(url, init);
  }
}
