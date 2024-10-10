import { EventEmitter } from "events";
import WebSocket from "ws";
import { sleepAsync } from "@doctormckay/stdlib/promises.js";

interface WaxpeerWebsocketEvents {
  sendTrade: (data: TradeWebsocketCreateTradeData) => void;
  cancelTrade: (data: TradeWebsocketCancelTradeData) => void;
  acceptWithdraw: (data: TradeWebsocketAcceptWithdrawData) => void;
  userChange: (data: UserOnlineChangePayload) => void;
}

export declare interface WaxpeerWebsocket {
  emit<U extends keyof WaxpeerWebsocketEvents>(
    event: U,
    ...args: Parameters<WaxpeerWebsocketEvents[U]>
  ): boolean;

  on<U extends keyof WaxpeerWebsocketEvents>(
    event: U,
    listener: WaxpeerWebsocketEvents[U]
  ): this;

  once<U extends keyof WaxpeerWebsocketEvents>(
    event: U,
    listener: WaxpeerWebsocketEvents[U]
  ): this;
}

export class WaxpeerWebsocket extends EventEmitter {
  private steamid: string;
  private tradelink: string;
  private waxApi?: string;
  private accessToken?: string;
  private w: {
    ws: WebSocket | null;
    tries: number;
    int: any;
  } = {
    ws: null,
    tries: 0,
    int: null,
  };
  private allowReconnect = true;
  private readonly readyStatesMap = {
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
  };

  /**
   * Represents a TradeSocket object.
   * @constructor
   * @throws {Error} If Steam API or Waxpeer API or access token is not provided.
   */
  constructor(options: TradeWebSocketOptions) {
    super();
    this.steamid = options.steamid;
    this.tradelink = options.tradelink;
    this.waxApi = options.waxApi;
    this.accessToken = options.accessToken;
    if (!this.waxApi && !this.accessToken)
      throw new Error("Waxpeer API or access token is required");
    this.connectWss();
  }
  socketOpen() {
    return this.w.ws?.readyState === this.readyStatesMap.OPEN;
  }
  async connectWss() {
    this.allowReconnect = true;
    if (
      this.w &&
      this.w.ws &&
      this.w.ws.readyState !== this.readyStatesMap.CLOSED
    )
      this.w.ws.terminate();
    const t = (this.w.tries + 1) * 1e3;
    this.w.ws = new WebSocket("wss://wssex.waxpeer.com");
    this.w.ws.on("error", (e) => {
      console.log("TradeWebsocket error", e);
    });
    this.w.ws.on("close", async () => {
      this.w.tries += 1;
      console.log(`TradeWebsocket closed`, this.steamid);
      await sleepAsync(t);
      if (
        this.steamid &&
        this.allowReconnect &&
        this.w?.ws?.readyState !== this.readyStatesMap.OPEN
      ) {
        return this.connectWss();
      }
    });
    this.w.ws.on("open", () => {
      console.log(`TradeWebsocket opened`, this.steamid);
      if (this.steamid) {
        clearInterval(this.w.int);
        const authObject: {
          name: string;
          steamid: string;
          tradeurl: string;
          source: string;
          info: { version: string };
          apiKey?: string;
          waxApi?: string;
          accessToken?: string;
        } = {
          name: "auth",
          steamid: this.steamid,
          tradeurl: this.tradelink,
          source: "npm_waxpeer",
          info: { version: "1.6.2" },
        };
        if (this.waxApi) authObject.waxApi = this.waxApi;
        if (this.accessToken) authObject.accessToken = this.accessToken;
        this.w.ws.send(JSON.stringify(authObject));
        this.w.int = setInterval(() => {
          if (this.w?.ws && this.w.ws.readyState === this.readyStatesMap.OPEN)
            this.w.ws.send(JSON.stringify({ name: "ping" }));
        }, 25000);
      } else {
        this.w.ws.close();
      }
    });

    this.w.ws.on("message", (e: any) => {
      try {
        const jMsg = JSON.parse(e);
        console.log(JSON.stringify(jMsg, undefined, 2));
        switch (jMsg.name) {
          case "pong":
            break;
          case "send-trade":
            this.emit("sendTrade", jMsg.data);
            break;
          case "cancelTrade":
            this.emit("cancelTrade", jMsg.data);
            break;
          case "accept_withdraw":
            this.emit("acceptWithdraw", jMsg.data);
            break;
          case "user_change":
            this.emit("userChange", jMsg.data);
            break;

          default:
            console.log("unknow message", jMsg);
            break;
        }
      } catch (e) {
        console.log(e);
      }
    });
  }
  disconnectWss() {
    if (this.w && this.w.ws) {
      clearInterval(this.w.int);
      this.allowReconnect = false;
      this.w.ws.close();
    }
  }
  isConnected() {
    if (
      this.w &&
      this.w.ws &&
      (this.w.ws.readyState == 0 || this.w.ws.readyState == 1)
    )
      return true;

    return false;
  }
}

interface UserOnlineChangePayload {
  can_p2p: boolean;
}

interface TradeWebsocketCancelTradeData {
  trade_id: string;
  seller_steamid: string;
}

interface TradeWebsocketAcceptWithdrawData {
  tradeid: string;
  partner: string;
}

export interface TradeWebSocketOptions {
  steamid: string; // The Steam ID.
  tradelink: string; // The trade link.
  waxApi: string; // The Waxpeer API key.
  accessToken: string; // The access token as string NOT encoded.
}

export interface TradeWebsocketCreateTradeData {
  waxid: string;
  wax_id: string;
  json_tradeoffer: TradeWebsocketCreateTradeJsonTradeoffer;
  tradeoffermessage: string;
  tradelink: string;
  partner: string;
  created: string;
  now: string;
  send_until: string;
}
interface TradeWebsocketCreateTradeJsonTradeoffer {
  newversion: boolean;
  version: number;
  me: TradeWebsocketCreateTradeSide;
  them: TradeWebsocketCreateTradeSide;
}
interface TradeWebsocketCreateTradeSide {
  assets: TradeWebsocketAsset[];
  currency: any[];
  ready: boolean;
}
interface TradeWebsocketAsset {
  appid: number;
  contextid: string;
  amount: number;
  assetid: string;
}
