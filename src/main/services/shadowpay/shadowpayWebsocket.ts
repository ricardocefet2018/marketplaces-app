import { EventEmitter } from "events";
import ShadowpayClient from "./shadowpayClient";
import { WebSocket } from "ws";
import { sleepAsync } from "@doctormckay/stdlib/promises";
import { FetchError } from "node-fetch";
import { JsonTradeoffer, TradeWebsocketEvents } from "../../models/types";
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

  constructor(spClient: ShadowpayClient) {
    super();
    this.shadowpayClient = spClient;
    this.connect();
  }

  private async connect(): Promise<void> {
    let ws;
    try {
      ws = await this.shadowpayClient.getWSTokens();
    } catch (err) {
      if (err instanceof FetchError) return await this.connect();
      throw err;
    }
    this.id = 0;
    this.socket = new WebSocket(ws.url);
    this.registerHandlers(ws.token);
  }

  public disconnect() {
    if (this.socket.readyState == WebSocket.OPEN) this.socket.close();
    this.socket.removeAllListeners();
    this.socket = undefined;
  }

  private registerHandlers(token: string) {
    this.socket.once("open", () => {
      this.sendMsg({
        token,
      });
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
          this.emit(
            "error",
            new Error("Error parsing shadowpay websocket JSON" + json)
          );
          continue;
        }
        // const object: SpWSMessageReceived =
        //   this.getObejctFromMessageReceived(json);
        if (object.id == 1) {
          this.emit("stateChange", true);
          return;
        }
        if (!object.result?.data?.data?.type) {
          this.emit(
            "error",
            new Error("Unknow shadowpay websocket message: " + json)
          );
          return;
        }
        const type = object.result.data.data.type;

        if (type == "acceptOffer") {
          const data: AcceptTradePayload = object.result.data.data.data;
          this.emit("acceptWithdraw", data.tradeofferid);
          continue;
        }
        if (type == "cancelOffer") {
          const data: CancelTradePayload = object.result.data.data.data;
          this.emit("cancelTrade", data.tradeofferid);
          continue;
        }
        if (type == "declineOffer") {
          const data: DeclineTradePayload = object.result.data.data.data;
          this.emit("cancelTrade", data.tradeofferid);
          continue;
        }
        if (type == "sendOffer") {
          const partial_data: SendTradePartialPayload =
            object.result.data.data.data;

          const json_tradeoffer: JsonTradeoffer = JSON.parse(
            partial_data.json_tradeoffer.replaceAll("<QUOTE>", '"')
          );

          const data: SendTradePayload = {
            id: partial_data.id,
            assetid: partial_data.assetid,
            project: partial_data.project,
            json_tradeoffer: json_tradeoffer,
            tradelink: partial_data.tradelink,
            tradeofferid: partial_data.tradeofferid,
            from_steamid: partial_data.from_steamid,
            to_steamid: partial_data.to_steamid,
          };

          this.emit("sendTrade", data);
          continue;
        }
        this.emit(
          "error",
          new Error("Unknow shadowpay websocket message: " + json)
        );
      }
    };

    this.socket.onclose = async () => {
      this.socket.removeAllListeners();
      this.emit("stateChange", false);
      this.disconnect();
      this.connect();
    };

    this.socket.onerror = (e) => {
      this.emit("error", e);
    };
  }

  private sendMsg(params: any, method?: number) {
    if (this.socket && this.socket.readyState == 1) {
      const msgToSend: SpWSMessageSent = {
        id: ++this.id,
        params: params,
      };
      if (!!method && !isNaN(method)) msgToSend.method = method;
      this.socket.send(JSON.stringify(msgToSend));
    }
  }

  private async pingLoop() {
    const pingMsg = {
      data: {},
      method: this.id < 2 ? "is_user_online" : "send_first_stat",
    };
    while (this.socket.readyState == 1) {
      this.sendMsg(pingMsg, 9);
      await sleepAsync(5000);
    }
  }

  private getObejctFromMessageReceived(data: string): SpWSMessageReceived {
    if (!data.includes('"json_tradeoffer":')) return JSON.parse(data);

    let index = data.indexOf('"json_tradeoffer":');
    index += 18;
    const openBraketIndex = data.indexOf("{", index);
    const closeBraketIndex = getClosingBraketIndex(data, openBraketIndex);

    if (openBraketIndex == -1 || closeBraketIndex == -1)
      return JSON.parse(data);

    let json = "";
    for (let i = 0; i < data.length; i++) {
      const element = data[i];
      if (i == openBraketIndex - 1 || i == closeBraketIndex + 1) continue;
      json += element;
    }

    const object = JSON.parse(json);
    return object;

    function getClosingBraketIndex(strObj: string, position = 0) {
      strObj = strObj.slice(position);
      if (!strObj.startsWith("{")) return -1;
      let openBraketIndex = 0;
      let closeBraketIndex = 0;
      for (let i = 0; i < strObj.length; i++) {
        const char = strObj[i];
        if (char == "{") openBraketIndex++;
        if (char == "}") closeBraketIndex++;
        if (openBraketIndex - closeBraketIndex == 0) return i + position;
      }
      return -1;
    }
  }
}
