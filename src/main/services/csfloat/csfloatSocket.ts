import { EventEmitter } from "node:events";
import CSFloatClient from "./csfloatClient";
import { ICSFloatSocketEvents } from "./interfaces/csfloat.interface";

export declare interface CSFloatSocket {
  emit<U extends keyof ICSFloatSocketEvents>(
    event: U,
    ...args: Parameters<ICSFloatSocketEvents[U]>
  ): boolean;

  on<U extends keyof ICSFloatSocketEvents>(
    event: U,
    listener: ICSFloatSocketEvents[U]
  ): this;

  once<U extends keyof ICSFloatSocketEvents>(
    event: U,
    listener: ICSFloatSocketEvents[U]
  ): this;
}

export class CSFloatSocket extends EventEmitter {
  private connected: boolean;

  constructor(_csFloatClient: CSFloatClient) {
    super();
  }

  public disconnect() {
    this.connected = false;
    return;
  }
}
