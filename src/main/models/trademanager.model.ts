import path from "path";
import { EventEmitter } from "events";
import TradeOfferManager from "steam-tradeoffer-manager";
import SteamUser from "steam-user";
import { TradeWebsocketCreateTradeData } from "./types";
import CEconItem from "steamcommunity/classes/CEconItem.js";
import {
  getAppStoragePath,
  handleError,
  infoLogger,
  minutesToMS,
} from "../../shared/helpers";
import TradeOffer from "steam-tradeoffer-manager/lib/classes/TradeOffer.js";
import { sleepAsync } from "@doctormckay/stdlib/promises.js";
import { LoginData } from "../../shared/types";
import { User } from "./db.model";

export class TradeManager extends EventEmitter {
  private _client: SteamUser;
  private _manager: TradeOfferManager;
  private _cookies: string[] = [];
  private user: User;
  private storagePath: string;

  private constructor(options: TradeManagerOptions) {
    super();
    const steamUserOptions: { httpProxy?: string } = {};
    if (options.proxy) steamUserOptions["httpProxy"] = options.proxy;
    this._client = new SteamUser(steamUserOptions);
    this._manager = new TradeOfferManager({
      steam: this._client,
      useAccessToken: true,
      language: "en",
      savePollData: true,
    });

    this.storagePath = path.join(
      options.storagePathBase,
      `acc_${options.username}`
    );
  }

  public static async login(loginData: LoginData): Promise<TradeManager> {
    const tm = new TradeManager({
      username: loginData.username,
      login: loginData,
      storagePathBase: getAppStoragePath(),
      proxy: loginData.proxy,
    });

    tm.user = User.build({
      username: loginData.username,
      proxy: loginData.proxy,
    });

    const loginPromise = new Promise<void>((resolve, reject) => {
      tm._client.logOn({
        accountName: loginData.username,
        password: loginData.password,
        twoFactorCode: loginData.authCode,
      });

      tm.setListeners();

      tm._client.once("steamGuard", async (domain, callback, lastCodeWrong) => {
        if (lastCodeWrong) reject(new Error("Invalid Steam guard code."));
      });

      tm._client.once("loggedOn", async () => {
        const sid64 = tm._client.steamID.getSteamID64(); // steamID is not null since it's loggedOn
        tm.infoLogger(`Acc ${sid64} loged on`);
        resolve();
      });

      tm._client.once("error", async (err) => {
        reject(err);
      });
    });

    await loginPromise;
    return tm;
  }

  public static async relogin(
    username: string,
    refreshToken: string,
    proxy?: string
  ): Promise<TradeManager> {
    const tm = new TradeManager({
      username: username,
      login: refreshToken,
      storagePathBase: getAppStoragePath(),
      proxy: proxy,
    });

    try {
      tm.user = await User.findOne({
        where: {
          username: username,
        },
      });
      await new Promise<void>((resolve) => {
        tm._client.logOn({
          refreshToken: refreshToken,
        });

        tm._client.once("loggedOn", () => {
          const sid64 = tm._client.steamID.getSteamID64(); // steamID is not null since it's loggedOn
          tm.infoLogger(`Acc ${sid64} loged on`);
          resolve();
        });

        tm._client.once("error", (err) => {
          tm.handleError(err);
          resolve();
        });
      });
    } catch (err) {
      tm.handleError(err); // We deal with the any error here since it's related to accounts that was already logged before
    }
    return tm;
  }

  private setListeners() {
    this._client.on("refreshToken", async (token) => {
      console.log("new refreshToken");
      try {
        this.user.refreshToken = token;
        await this.user.save();
        this.infoLogger(`Acc ${this.user.username} was registered to DB`);
        this.infoLogger(`updated refreshToken`);
      } catch (err) {
        this.handleError(err);
      }
    });

    this._client.on("webSession", (sessionID, cookies) => {
      this._cookies = cookies;
      this._manager.setCookies(cookies);
      this.emit("accessTokenChange", this.getSteamLoginSecure());
    });

    this._manager.on("newOffer", (offer) => {
      const sid64 = this._client.steamID.getSteamID64(); // need to be logged on to receive offers
      console.log(`Account ${sid64} received a new Offer ${offer.id}`);
    });
  }

  public async createTradeForWaxpeer(data: TradeWebsocketCreateTradeData) {
    const tradeURL = data.tradelink;
    const apps_contexts = getAppidContextidByCreateTradeData(data);
    const offer = this._manager.createOffer(tradeURL);
    try {
      const inventories = await Promise.all(
        apps_contexts.map((app_context) =>
          this.getInventoryContents(app_context.appid, app_context.contextid)
        )
      );
      const unifiedInv = inventories.reduce((a, b) => [...a, ...b]);
      const assets = data.json_tradeoffer.me.assets;
      const itemsToSend = assets.map((asset) =>
        unifiedInv.find(
          (econItem) =>
            econItem.assetid == asset.assetid &&
            econItem.appid == asset.appid &&
            econItem.contextid.toString() == asset.contextid
        )
      );
      if (!itemsToSend.every((v) => typeof v != "undefined")) {
        this.infoLogger(
          `One or more items of waxpeer sale ${data.wax_id} wasn't in inventory`
        );
        return; // Don't want to create trade if we don't have all items that we need
      }

      const alreadyInTrade = await this.isItemsInTrade(
        <CEconItem[]>itemsToSend
      );
      if (alreadyInTrade) {
        this.infoLogger(
          `One or more items of waxpeer ${data.wax_id} was already in trade`
        );
        return;
      } // Don't want to create trade one (or more item) is already in trade
      offer.addMyItems(<CEconItem[]>itemsToSend);
      offer.setMessage(data.tradeoffermessage);
      const offerStatus = await new Promise<"pending" | "sent">((res, rej) => {
        offer.send((err, status) => {
          if (err) rej(err);

          res(status);
        });
      });
      this.infoLogger(`Steam offer #${offer.id} is ${offerStatus}`);
      return offer.id;
    } catch (err) {
      this.handleError(err);
      return;
    }

    function getAppidContextidByCreateTradeData(
      createTradeData: TradeWebsocketCreateTradeData
    ) {
      const app_contextFromAssets =
        createTradeData.json_tradeoffer.me.assets.map(
          (a) => a.appid.toString() + "_" + a.contextid
        );
      const app_context = app_contextFromAssets
        .filter((value, index, self) => self.indexOf(value) == index)
        .map((v) => ({
          appid: Number(v.split("_")[0]),
          contextid: Number(v.split("_")[1]),
        }));
      return app_context;
    }
  }

  public async cancelTradeOffer(offerId: string, retry = true) {
    let retriedTimes = 0;
    do {
      try {
        const offer = await this.getTradeOffer(offerId);
        const { ETradeOfferState } = TradeOfferManager;

        if (
          offer.state != ETradeOfferState.Active &&
          offer.state != ETradeOfferState.CreatedNeedsConfirmation
        )
          return; // Offer was found but isn't cancellable

        await cancelOffer(offer);
        this.infoLogger(`${offer.id} was canceled`);
        return;
      } catch (err) {
        if (err instanceof Error && err.message === "No matching offer found") {
          return; // There is no offers with that ID;
        }
        if (!retry) throw err;
        this.handleError(err);
        await sleepAsync(minutesToMS(++retriedTimes)); // await some minutes to retry
      }
    } while (retry); // Try till it's cancelled

    async function cancelOffer(offer: TradeOffer): Promise<void> {
      return new Promise((resolve, reject) => {
        offer.cancel((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
  }

  private async getTradeOffer(offerId: string): Promise<TradeOffer> {
    return new Promise((resolve, reject) => {
      this._manager.getOffer(offerId, (err, offer) => {
        if (err) reject(err);

        resolve(offer);
      });
    });
  }

  private async isItemsInTrade(items: CEconItem[]) {
    return new Promise<boolean>((res, rej) => {
      this._manager.getOffersContainingItems(items, (err, sent, received) => {
        if (err) rej(err);
        if (sent.length > 0 || received.length > 0) res(true);
        res(false);
      });
    });
  }

  public async acceptTradeOffer(offerId: string) {
    try {
      const offer = await this.getTradeOffer(offerId);
      await acceptOffer(offer);
      this.infoLogger(`${offer.id} was accepted`);
      return;
    } catch (err) {
      this.handleError(err);
    }

    function acceptOffer(offer: TradeOffer) {
      return new Promise((resolve, reject) => {
        offer.accept(false, (err, status) => {
          if (err) reject(err);
          resolve(status);
        });
      });
    }
  }

  public getSteamLoginSecure() {
    for (const cookie of this._cookies) {
      const [key, value] = cookie.split("=");
      if (key == "steamLoginSecure") {
        return value.split("%7C%7C")[1];
      }
    }
    return "";
  }

  public hasSteamId() {
    return !!this._client.steamID;
  }

  public get username() {
    return this.user.username;
  }

  public handleError(err: any) {
    try {
      handleError(err, this.storagePath);
    } catch (err) {
      // do nothing
    }
  }

  public infoLogger(info: string) {
    try {
      infoLogger(info, this.storagePath);
    } catch (err) {
      // do nothing
    }
  }

  private getInventoryContents(appid: number, contextid: number) {
    return new Promise<CEconItem[]>((res, rej) => {
      this._manager.getInventoryContents(appid, contextid, true, (err, inv) => {
        if (err) rej(err);
        res(inv);
      });
    });
  }
}

interface TradeManagerEvents {
  accessTokenChange: (accessToken: string) => void;
  loggedOn: (tm: TradeManager) => void;
  refreshToken: (token: string) => void;
}

export declare interface TradeManager {
  emit<U extends keyof TradeManagerEvents>(
    event: U,
    ...args: Parameters<TradeManagerEvents[U]>
  ): boolean;

  on<U extends keyof TradeManagerEvents>(
    event: U,
    listener: TradeManagerEvents[U]
  ): this;
}

export interface TradeManagerOptions {
  storagePathBase: string;
  username: string;
  login: string | LoginData; // Can be refreshToken or LoginData
  proxy?: string;
}
