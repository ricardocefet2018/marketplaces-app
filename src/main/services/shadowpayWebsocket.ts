import { EventEmitter } from "events";
import ShadowpayClient from "./shadowpayClient";
import { WebSocket } from "ws";
import { sleepAsync } from "@doctormckay/stdlib/promises";
import { FetchError } from "node-fetch";

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
    delete this.socket;
  }

  private registerHandlers(token: string) {
    this.socket.once("open", () => {
      this.sendMsg({
        token,
      });
    });

    this.socket.onmessage = (message) => {
      console.log(message);
    };

    this.socket.onclose = async () => {
      this.socket.removeAllListeners();
      this.connect();
    };

    this.socket.onerror = console.log;
  }

  private sendMsg(params: any, method?: number) {
    if (this.socket && this.socket.readyState == 1) {
      const msgToSend: SpWSMessageModel = {
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
}

interface SpWSMessageModel {
  id: number;
  params: any;
  method?: number;
}
