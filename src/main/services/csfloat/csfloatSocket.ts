import { EventEmitter } from "node:events";
import CSFloatClient from "./csfloatClient";
import {
  ICSFloatSocketEvents,
  ITradeFloat,
} from "./interfaces/csfloat.interface";
import {
  EStatusTradeCSFLOAT,
  ETradeOfferStateCSFloat,
} from "./enums/cs-float.enum";
import { AppController } from "src/main/controllers/app.controller";
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
  private _csFloatClient: CSFloatClient;
  private _appController: AppController;

  constructor(_CSFloatClient: CSFloatClient, _appController: AppController) {
    super();
    this._appController = _appController;
    this._csFloatClient = _CSFloatClient;
    this.connect();
  }

  public disconnect() {
    this.connected = false;
    return;
  }

  public async connect(): Promise<void> {
    this.connected = true;
    this.registerLoops();
  }

  private async registerLoops(): Promise<void> {
    const tradesInPending = await this.getTrades(EStatusTradeCSFLOAT.PENDING);

    await this.verificationsLoop(tradesInPending);
    await this.extensionLoop();
  }

  private async extensionLoop(): Promise<void> {}

  private async verificationsLoop(
    tradesInPending: ITradeFloat[]
  ): Promise<void> {
    if (!tradesInPending) return;

    for (const trade of tradesInPending) {
      if (
        trade.steam_offer.state ===
        ETradeOfferStateCSFloat.CreatedNeedsConfirmation
      ) {
        this._appController.notify({
          title: `CSFLOAT - ${trade.contract.item.item_name}`,
          body: `Trade offer is waiting for confirmation`,
        });
      }
    }
  }

  private async getTrades(state: EStatusTradeCSFLOAT): Promise<ITradeFloat[]> {
    return this._csFloatClient.getTrades(state, {});
  }
}
