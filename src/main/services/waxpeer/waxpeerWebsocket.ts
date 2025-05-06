import { EventEmitter } from "events";
import WebSocket from "ws";
import { infoLogger, minutesToMS, secondsToMS } from "../../../shared/helpers";
import {
  TradeWebsocketCreateTradeData,
  TradeWebsocketEvents,
} from "../../models/types";

interface WaxpeerWebsocketEvents extends TradeWebsocketEvents {
  sendTrade: (data: any) => void;
  cancelTrade: (tradeOfferId: string) => void;
  acceptWithdraw: (tradeOfferId: string) => void;
  stateChange: (online: boolean) => void;
  error: (error: any) => void;
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
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isManualDisconnect = false;
  private ws: WebSocket | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private readonly readyStatesMap = {
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
  };

  constructor(options: TradeWebSocketOptions) {
    super();
    this.steamid = options.steamid;
    this.tradelink = options.tradelink;
    this.waxApi = options.waxApi;
    this.accessToken = options.accessToken;

    if (!this.waxApi && !this.accessToken) {
      throw new Error("Waxpeer API or access token is required");
    }

    this.connect();
  }

  private async connect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.isManualDisconnect = false;
    infoLogger("Waxpeer Websocket: Connecting to websocket...");

    this.ws = new WebSocket("wss://wssex.waxpeer.com");
    this.registerEventHandlers();
  }

  private registerEventHandlers(): void {
    if (!this.ws) return;

    this.ws.on("error", (e) => this.handleError(e));
    this.ws.on("close", () => this.handleClose());
    this.ws.on("open", () => this.handleOpen());
    this.ws.on("message", (data) => this.handleMessage(data));
  }

  private handleOpen(): void {
    infoLogger("Waxpeer WebSocket: Connected to websocket!");
    this.emit("stateChange", true);

    const authObject = {
      name: "auth",
      steamid: this.steamid,
      tradeurl: this.tradelink,
      source: "npm_waxpeer",
      info: { version: "1.6.2" },
      ...(this.waxApi && { waxApi: this.waxApi }),
      ...(this.accessToken && { accessToken: this.accessToken }),
    };

    this.ws?.send(JSON.stringify(authObject));
    this.startPingInterval();
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === this.readyStatesMap.OPEN) {
        this.ws.send(JSON.stringify({ name: "ping" }));
      }
    }, secondsToMS(25));
  }

  private handleMessage(data: WebSocket.Data): void {
    try {
      const jMsg = JSON.parse(data.toString());

      switch (jMsg.name) {
        case "pong":
          break;
        case "send-trade":
          this.emit("sendTrade", jMsg.data);
          break;
        case "cancelTrade":
          this.emit("cancelTrade", jMsg.data.trade_id);
          break;
        case "accept_withdraw":
          this.emit("acceptWithdraw", jMsg.data.tradeid);
          break;
        case "user_change":
          this.emit("stateChange", jMsg.data.can_p2p);
          break;
        case "disconnect":
          infoLogger("Waxpeer WebSocket: Disconnected");

          this.emit("stateChange", false);
          break;
        default:
          this.emit("error", new Error(`Unknown message type: ${jMsg.name}`));
      }
    } catch (err) {
      this.emit("error", err);
    }
  }

  private handleError(e: Error): void {
    console.error("Waxpeer WebSocket: error:", e);
    this.emit("stateChange", false);
    this.emit("error", e);
    this.scheduleReconnect();
  }

  private handleClose(): void {
    infoLogger("Waxpeer WebSocket: Disconnected");
    this.emit("stateChange", false);
    this.cleanup();
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.isManualDisconnect || this.reconnectTimer) return;

    infoLogger("Waxpeer WebSocket: Scheduling reconnect in 1 minute...");
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, minutesToMS(1));
  }

  private cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws = null;
    }
  }

  public disconnectWss(): void {
    infoLogger("Waxpeer WebSocket: Disconnecting from websocket...");

    this.isManualDisconnect = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.cleanup();
    }
  }

  public isConnected(): boolean {
    return this.ws?.readyState === this.readyStatesMap.OPEN;
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
