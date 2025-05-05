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
import { sleepAsync } from "@doctormckay/stdlib/promises";
import { minutesToMS } from "../../../shared/helpers";
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
  private steamIDBase64: string;

  constructor(_CSFloatClient: CSFloatClient, steamIDBase64: string) {
    super();
    this._csFloatClient = _CSFloatClient;
    this.steamIDBase64 = steamIDBase64;
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
    while (this.connected) {
      try {
        this.emit("stateChange", true);
        const tradesInPending = await this._csFloatClient.getTrades(
          EStatusTradeCSFLOAT.PENDING
        );
        let blockedOrIgnoredUsers: string[];
        this.emit("getBlockerUsers", (ignoredOrBlokedUsers: string[]) => {
          blockedOrIgnoredUsers = ignoredOrBlokedUsers;
        });

        await this.verificationsLoop(tradesInPending);
        await this.extensionLoop(
          tradesInPending,
          this.steamIDBase64,
          blockedOrIgnoredUsers
        );
      } catch (err) {
        this.emit("error", err);
      }
      await sleepAsync(minutesToMS(3));
    }
  }

  private async extensionLoop(
    tradesInPending: ITradeFloat[],
    steamID: string,
    ignoredOrBlokedUsers: string[]
  ): Promise<void> {
    await this._csFloatClient.pingUpdates(
      tradesInPending,
      steamID,
      ignoredOrBlokedUsers
    );
  }

  private async verificationsLoop(
    tradesInPending: ITradeFloat[]
  ): Promise<void> {
    if (!tradesInPending) return;

    for (const trade of tradesInPending) {
      if (
        trade.steam_offer.state ===
        ETradeOfferStateCSFloat.CreatedNeedsConfirmation
      ) {
        this.emit("notifyWindows", {
          title: `CSFLOAT - ${trade.contract.item.item_name}`,
          body: `Trade offer is waiting for confirmation, please confirm the trade!`,
        });
      }
    }
  }
}
