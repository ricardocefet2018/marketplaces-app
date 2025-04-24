import { EventEmitter } from "node:events";
import CSFloatClient from "./csfloatClient";

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
