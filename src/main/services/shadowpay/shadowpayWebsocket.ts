import { EventEmitter } from "events";
import ShadowpayClient from "./shadowpayClient";
import { WebSocket, CloseEvent, ErrorEvent } from "ws";
import { sleepAsync } from "@doctormckay/stdlib/promises";
import { FetchError } from "node-fetch";
import { JsonTradeoffer, TradeWebsocketEvents } from "../../models/types";
import { infoLogger, minutesToMS, secondsToMS } from "../../../shared/helpers";
import {
  AcceptTradePayload,
  CancelTradePayload,
  DeclineTradePayload,
  SendTradePartialPayload,
  SendTradePayload,
  SpWSMessageReceived,
  SpWSMessageSent,
} from "./interface/shadowpay.interface";

interface ShadowpayWebsocketEvents extends TradeWebsocketEvents {
  sendTrade: (data: SendTradePayload) => void;
  cancelTrade: (tradeOfferId: string) => void;
  acceptWithdraw: (tradeOfferId: string) => void;
  stateChange: (online: boolean) => void;
  error: (error: any) => void;
}

export declare interface ShadowpayWebsocket {
  emit<U extends keyof ShadowpayWebsocketEvents>(
    event: U,
    ...args: Parameters<ShadowpayWebsocketEvents[U]>
  ): boolean;

  on<U extends keyof ShadowpayWebsocketEvents>(
    event: U,
    listener: ShadowpayWebsocketEvents[U]
  ): this;

  once<U extends keyof ShadowpayWebsocketEvents>(
    event: U,
    listener: ShadowpayWebsocketEvents[U]
  ): this;
}

export class ShadowpayWebsocket extends EventEmitter {
  private shadowpayClient: ShadowpayClient;
  private socket: WebSocket;
  private id: number;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isManualDisconnect = false;

  constructor(spClient: ShadowpayClient) {
    super();
    this.shadowpayClient = spClient;
    this.connect();
  }

  private async connect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    infoLogger("Shadowpay Websocket: Connecting to websocket...");

    try {
      let ws = await this.shadowpayClient.getWSTokens();

      this.id = 0;
      this.socket = new WebSocket(ws.url);
      this.registerHandlers(ws.token);
    } catch (err) {
      infoLogger(
        "Shadowpay Websocket: Error connecting to websocket: " + err.message
      );

      if (err instanceof FetchError) {
        this.emit("stateChange", false);
        this.scheduleReconnect();
        return;
      }

      throw err;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.isManualDisconnect) return;

    infoLogger("Shadowpay Websocket: Scheduling reconnect in 1 minute...");

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, minutesToMS(1));
  }

  public disconnect() {
    infoLogger("Shadowpay Websocket: Disconnecting from websocket...");

    this.isManualDisconnect = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.close();
    }
    this.socket?.removeAllListeners();
    this.socket = undefined;
  }

  private registerHandlers(token: string) {
    this.socket.once("open", () => {
      infoLogger("Shadowpay Websocket: Connected to websocket.");
      this.sendMsg({
        token,
      });
      this.emit("stateChange", true);
      this.pingLoop();
    });

    this.socket.onmessage = (e) => {
      const msg = new String((e.data as string).replaceAll('\\"', "<QUOTE>"));
      const jsons: string[] = msg.split("\n");
      for (const json of jsons) {
        if (json.length === 0) continue;
        let object;
        try {
          object = JSON.parse(json);
        } catch (err) {
          infoLogger(
            "Shadowpay Websocket: Error parsing websocket JSON: " + json
          );

          this.emit(
            "error",
            new Error("Error parsing shadowpay websocket JSON" + json)
          );
          continue;
        }

        if (object.id == 1) {
          infoLogger("Shadowpay Websocket: Handshake complete.");
          return;
        }

        if (typeof object.result?.data === "string") {
          if (object.result.data !== "success") {
            infoLogger(
              "Shadowpay Websocket: Ping error: " + object.result.data
            );

            this.emit(
              "error",
              new Error("Ping error shadowpay websocket message: " + json)
            );
            this.emit("stateChange", false);
          }
          return;
        }

        if (!object.result?.data?.data?.type) {
          infoLogger("Shadowpay Websocket: Unknown message format: " + json);

          this.emit(
            "error",
            new Error("Unknow shadowpay websocket message: " + json)
          );
          return;
        }

        const type = object.result.data.data.type;
        this.handleMessageType(type, object);
      }
    };

    this.socket.onclose = (e: CloseEvent) => this.handleClose(e);

    this.socket.onerror = (e: ErrorEvent) => this.handleError(e);
  }

  private handleMessageType(type: string, object: any) {
    switch (type) {
      case "acceptOffer":
        const acceptData: AcceptTradePayload = object.result.data.data.data;
        this.emit("acceptWithdraw", acceptData.tradeofferid);
        break;

      case "cancelOffer":
        const cancelData: CancelTradePayload = object.result.data.data.data;
        this.emit("cancelTrade", cancelData.tradeofferid);
        break;

      case "declineOffer":
        const declineData: DeclineTradePayload = object.result.data.data.data;
        this.emit("cancelTrade", declineData.tradeofferid);
        break;

      case "sendOffer":
        const partialData: SendTradePartialPayload =
          object.result.data.data.data;
        const jsonTradeoffer: JsonTradeoffer = JSON.parse(
          partialData.json_tradeoffer.replaceAll("<QUOTE>", '"')
        );
        const sendData: SendTradePayload = {
          ...partialData,
          json_tradeoffer: jsonTradeoffer,
        };
        this.emit("sendTrade", sendData);
        break;

      default:
        this.emit(
          "error",
          new Error("Unknow shadowpay websocket message type: " + type)
        );
    }
  }

  private handleClose(e: CloseEvent) {
    infoLogger(
      "Shadowpay Websocket: Connection closed with code: " +
        e.code +
        " reason: " +
        e.reason
    );

    this.socket?.removeAllListeners();
    this.emit("stateChange", false);

    if (!this.isManualDisconnect) {
      this.scheduleReconnect();
    }

    this.socket = undefined;
    this.isManualDisconnect = false;
  }

  private handleError(e: ErrorEvent) {
    infoLogger("Shadowpay Websocket: Error: " + e.message);
    this.emit("error", e);
    this.emit("stateChange", false);
  }

  private sendMsg(params: any, method?: number) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      const msgToSend: SpWSMessageSent = {
        id: ++this.id,
        params: params,
      };
      if (method !== undefined) msgToSend.method = method;
      this.socket.send(JSON.stringify(msgToSend));
    }
  }

  private async pingLoop() {
    while (this.socket?.readyState === WebSocket.OPEN) {
      this.sendMsg(
        {
          data: {},
          method: this.id < 2 ? "is_user_online" : "send_first_stat",
        },
        9
      );
      await sleepAsync(secondsToMS(5));
    }
  }
}
