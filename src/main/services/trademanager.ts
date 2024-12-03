import path from "path";
import { EventEmitter } from "events";
import TradeOfferManager from "steam-tradeoffer-manager";
import SteamUser from "steam-user";
import { TradeWebsocketCreateTradeData } from "../models/types";
import CEconItem from "steamcommunity/classes/CEconItem.js";
import {
  getAppStoragePath,
  handleError,
  infoLogger,
  minutesToMS,
  pushElementToJsonFile,
} from "../../shared/helpers";
import TradeOffer from "steam-tradeoffer-manager/lib/classes/TradeOffer.js";
import { sleepAsync } from "@doctormckay/stdlib/promises.js";
import { IUserSettings, LoginData, SteamAcc } from "../../shared/types";
import { User } from "../models/user";
import WaxpeerClient from "./waxpeerClient";
import { WaxpeerWebsocket } from "./waxpeerWebsocket";
import { FetchError } from "node-fetch";

export class TradeManager extends EventEmitter {
  private _steamClient: SteamUser;
  private _steamTradeOfferManager: TradeOfferManager;
  private _steamCookies: string[] = [];
  private _user: User;
  private storagePath: string;
  private _wpClient?: WaxpeerClient;
  private _wpWebsocket?: WaxpeerWebsocket;

  public get steamAcc(): SteamAcc {
    return {
      username: this._user.username,
      status: !!this._steamClient.steamID,
      waxpeerSettings: this._user.waxpeerSettings,
      userSettings: this._user.userSettings,
    };
  }

  private constructor(options: TradeManagerOptions) {
    super();
    const steamUserOptions: { httpProxy?: string } = {};
    if (options.proxy) steamUserOptions["httpProxy"] = options.proxy;
    this._steamClient = new SteamUser(steamUserOptions);
    this._steamTradeOfferManager = new TradeOfferManager({
      steam: this._steamClient,
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

    tm._user = new User(loginData.username, loginData.proxy);

    const loginPromise = new Promise<void>((resolve, reject) => {
      tm._steamClient.logOn({
        accountName: loginData.username,
        password: loginData.password,
        twoFactorCode: loginData.authCode,
      });

      tm.setListeners();

      tm._steamClient.once(
        "steamGuard",
        async (domain, callback, lastCodeWrong) => {
          if (lastCodeWrong) reject(new Error("Invalid Steam guard code."));
        }
      );

      tm._steamClient.once("loggedOn", async () => {
        const sid64 = tm._steamClient.steamID.getSteamID64(); // steamID is not null since it's loggedOn
        tm.infoLogger(`Acc ${sid64} loged on`);
        resolve();
      });

      tm._steamClient.once("error", async (err) => {
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
      tm._user = await User.findOneByUsername(username);

      await new Promise<void>((resolve) => {
        tm._steamClient.logOn({
          refreshToken: refreshToken,
        });

        tm.setListeners();

        tm._steamClient.once("loggedOn", () => {
          const sid64 = tm._steamClient.steamID.getSteamID64(); // steamID is not null since it's loggedOn
          tm.infoLogger(`Acc ${sid64} loged on`);
          resolve();
        });

        tm._steamClient.once("error", (err) => {
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
    this._steamClient.on("refreshToken", async (token) => {
      try {
        this._user.refreshToken = token;
        await this._user.save();
        this.infoLogger(`Acc ${this._user.username} was registered to DB`);
        this.infoLogger(`updated refreshToken`);
      } catch (err) {
        this.handleError(err);
      }
    });

    this._steamClient.on("webSession", (sessionID, cookies) => {
      this._steamCookies = cookies;
      this._steamTradeOfferManager.setCookies(cookies);
      const accessToken = this.getSteamLoginSecure();
      this.updateAccessTokenWaxpeer(accessToken); // doesn't throw errors, no need to wait it
    });

    this._steamTradeOfferManager.on("newOffer", (offer) => {
      const isGift =
        offer.itemsToGive.length == 0 && offer.itemsToReceive.length > 0;
      if (isGift && this._user.userSettings.acceptGifts)
        this.acceptTradeOffer(offer.id);
    });
  }

  private async updateAccessTokenWaxpeer(accessToken: string) {
    if (!this._wpWebsocket || !this._wpClient) return; // not running
    let done = false;
    let retries = 0;
    do {
      try {
        await this._wpClient.setSteamToken(accessToken);
        done = true;
      } catch (err) {
        if (!(err instanceof FetchError)) continue; // There is no reason to log fetch errors
        this.handleError(err);
        retries++;
        await sleepAsync(minutesToMS());
      }
    } while (!done || retries < 10); // retry till setSteamToken done or 10 retries/minutes;
    if (!done) {
      await this.stopWaxpeerClient();
      return;
    } // Something wrong happened, disconnect user to show it's wrong
    this._wpWebsocket.disconnectWss();
    const twsOptions = this._wpClient.getTWSInitObject();
    this._wpWebsocket = new WaxpeerWebsocket(twsOptions);
  }

  public async createTradeForWaxpeer(data: TradeWebsocketCreateTradeData) {
    const tradeURL = data.tradelink;
    const apps_contexts = getAppidContextidByCreateTradeData(data);
    const offer = this._steamTradeOfferManager.createOffer(tradeURL);
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
      this.registerPendingTradeToFile(offer.id);
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
      this._steamTradeOfferManager.getOffer(offerId, (err, offer) => {
        if (err) reject(err);

        resolve(offer);
      });
    });
  }

  private async isItemsInTrade(items: CEconItem[]) {
    return new Promise<boolean>((res, rej) => {
      this._steamTradeOfferManager.getOffersContainingItems(
        items,
        (err, sent, received) => {
          if (err) rej(err);
          if (sent.length > 0 || received.length > 0) res(true);
          res(false);
        }
      );
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
    for (const cookie of this._steamCookies) {
      const [key, value] = cookie.split("=");
      if (key == "steamLoginSecure") {
        return value.split("%7C%7C")[1];
      }
    }
    return "";
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
      this._steamTradeOfferManager.getInventoryContents(
        appid,
        contextid,
        true,
        (err, inv) => {
          if (err) rej(err);
          res(inv);
        }
      );
    });
  }

  public async updateWaxpeerApiKey(newWaxpeerApiKey: string) {
    this._user.waxpeerSettings.apiKey = newWaxpeerApiKey;
    await this._user.save();
    return;
  }

  /**
   * @throw DB or Fetch error.
   */
  public async startWaxpeerClient(): Promise<void> {
    if (this._wpClient || this._wpWebsocket) return;
    if (!this._steamClient.steamID) return; // Steam accound failed in login, don't try to start waxpeer
    this._wpClient = await WaxpeerClient.getInstance(
      this._user.waxpeerSettings.apiKey,
      this._user.proxy
    );
    let accessToken = this.getSteamLoginSecure();
    // TODO this is necessary since when app start it need to await steam send the cookies before star waxpeer, maybe change it to a event
    while (!accessToken || accessToken == "") {
      await sleepAsync(100);
      accessToken = this.getSteamLoginSecure();
    }
    await this._wpClient.setSteamToken(accessToken);
    const twsOptions = this._wpClient.getTWSInitObject();
    this._wpWebsocket = new WaxpeerWebsocket(twsOptions);
    this._wpWebsocket.on("userChange", async (data) => {
      if (data.can_p2p == this._user.waxpeerSettings.state) return;
      this._user.waxpeerSettings.state = data.can_p2p;
      this.emit("waxpeerStateChanged", data.can_p2p, this._user.username);
      await this._user.save();
    });
    this._wpWebsocket.on("acceptWithdraw", (data) => {
      this.acceptTradeOffer(data.tradeid); // error catched inside, can't throw err
    });
    this._wpWebsocket.on("cancelTrade", (data) => {
      this.cancelTradeOffer(data.trade_id, true); // retring till cancel or not cancellable anymore, can't throw err
    });
    this._wpWebsocket.on("sendTrade", async (data) => {
      if (!this._user.waxpeerSettings.sentTrades.includes(data.wax_id)) {
        const tradeOfferId = await this.createTradeForWaxpeer(data);
        if (!tradeOfferId) return; // wasn't possible send the offer, reason was registered to acc/logErrors.

        try {
          const steamTradeRes = await this._wpClient.steamTrade(
            tradeOfferId,
            data.waxid
          );
          if (steamTradeRes.success)
            this.infoLogger(
              `Steam trade offer ${tradeOfferId} was successfully associated with waxpeer trade ${data.waxid}`
            );
          this._user.waxpeerSettings.sentTrades.push(data.wax_id);
          await this._user.save();
        } catch (err) {
          this.handleError(err);
        }
      }
    });
    return;
  }

  /**
   * @return Promise that resolve if it's all OK
   * @throw (DB error) Fatal error.
   */
  public async stopWaxpeerClient() {
    if (!this._wpWebsocket || !this._wpClient) return; // Already stopped
    this._wpWebsocket.disconnectWss();
    this._wpWebsocket.removeAllListeners();
    this._wpClient = undefined;
    this._wpWebsocket = undefined;
    this._user.waxpeerSettings.state = false;
    await this._user.save(); // TODO
    // A DB error should close the app?
    return;
  }

  public async logout() {
    this._steamClient.logOff();
    this._steamCookies = [];
    this._steamTradeOfferManager.shutdown();
    await this._user.waxpeerSettings.remove();
    await this._user.remove();
    this._wpClient = undefined;
    if (this._wpWebsocket) this._wpWebsocket.disconnectWss();
    this._wpWebsocket = undefined;
    return;
  }

  public async updateSettings(newSettings: IUserSettings) {
    this._user.userSettings = Object.assign(
      this._user.userSettings,
      newSettings
    );
    await this._user.save();
  }

  private async registerPendingTradeToFile(offerID: string) {
    if (
      this._user.userSettings.pendingTradesFilePath == "" ||
      !this._user.userSettings.pendingTradesFilePath
    )
      return;
    await pushElementToJsonFile(
      this._user.userSettings.pendingTradesFilePath,
      offerID
    );
    return;
  }
}

interface TradeManagerEvents {
  waxpeerStateChanged: (state: boolean, username: string) => void;
  loggedOn: (tm: TradeManager) => void;
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

  once<U extends keyof TradeManagerEvents>(
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
