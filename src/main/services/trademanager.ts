import path from "path";
import { EventEmitter } from "events";
import TradeOfferManager from "steam-tradeoffer-manager";
import SteamUser from "steam-user";
import { JsonTradeoffer, TradeWebsocketCreateTradeData } from "../models/types";
import CEconItem from "steamcommunity/classes/CEconItem.js";
import {
  handleError,
  infoLogger,
  minutesToMS,
  pushElementToJsonFile,
} from "../../shared/helpers";
import TradeOffer from "steam-tradeoffer-manager/lib/classes/TradeOffer.js";
import { sleepAsync } from "@doctormckay/stdlib/promises.js";
import {
  IUserSettings,
  LoginData,
  Marketplace,
  SteamAcc,
} from "../../shared/types";
import { User } from "../models/user";
import WaxpeerClient from "./waxpeerClient";
import { WaxpeerWebsocket } from "./waxpeerWebsocket";
import { FetchError } from "node-fetch";
import { app } from "electron";
import ShadowpayClient from "./shadowpayClient";
import { SendTradePayload, ShadowpayWebsocket } from "./shadowpayWebsocket";

export class TradeManager extends EventEmitter {
  private _steamClient: SteamUser;
  private _steamTradeOfferManager: TradeOfferManager;
  private _steamCookies: string[] = [];
  private _user: User;
  private logsPath: string;
  private _wpClient?: WaxpeerClient;
  private _wpWebsocket?: WaxpeerWebsocket;
  private _spClient?: ShadowpayClient;
  private _spWebsocket?: ShadowpayWebsocket;

  public get steamAcc(): SteamAcc {
    return {
      username: this._user.username,
      status: !!this._steamClient.steamID,
      waxpeerSettings: this._user.waxpeerSettings,
      shadowpaySettings: this._user.shadowpaySettings,
      marketcsgoSettings: this._user.marketcsgoSettings,
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

    this.logsPath = path.join(
      options.storagePathBase,
      `acc_${options.username}`
    );
  }

  public static async login(loginData: LoginData): Promise<TradeManager> {
    const tm = new TradeManager({
      username: loginData.username,
      login: loginData,
      storagePathBase: app.getPath("logs"),
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
      storagePathBase: app.getPath("logs"),
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
    if (this._user.waxpeerSettings.sentTrades.includes(data.wax_id)) return;

    const tradeURL = data.tradelink;
    const json_tradeoffer = data.json_tradeoffer;
    const id = data.wax_id;
    const marketplace: Marketplace = "Waxpeer";
    const message = data.tradeoffermessage;
    const tradeOfferId = await this.createTrade(
      tradeURL,
      json_tradeoffer,
      id,
      marketplace,
      message
    );

    if (!tradeOfferId) return; // wasn't possible send the offer, reason was registered to acc/logErrors.

    try {
      const steamTradeRes = await this._wpClient.steamTrade(
        tradeOfferId,
        data.waxid
      );
      if (steamTradeRes.success) {
        this.infoLogger(
          `Steam trade offer ${tradeOfferId} was successfully associated with waxpeer trade ${data.waxid}`
        );
        this._user.waxpeerSettings.sentTrades.push(data.wax_id);
        await this._user.save();
        if (this._user.userSettings.pendingTradesFilePath != "")
          this.registerPendingTradeToFile(tradeOfferId);
      }
    } catch (err) {
      this.handleError(err);
    }
  }

  public async createTradeForShadowpay(data: SendTradePayload) {
    if (this._user.shadowpaySettings.sentTrades.includes(data.id.toString()))
      return;

    const tradeURL = data.tradelink;
    const json_tradeoffer = data.json_tradeoffer;
    const id = data.id;
    const marketplace: Marketplace = "Shadowpay";
    const tradeOfferId = await this.createTrade(
      tradeURL,
      json_tradeoffer,
      id,
      marketplace
    );
    if (!tradeOfferId) return;

    try {
      const reportedTrade = await this._spClient.reportTradeOffer(
        data.id,
        tradeOfferId
      );
      if (reportedTrade) {
        this.infoLogger(
          `Steam trade offer ${tradeOfferId} was successfully associated with shadowpay trade ${data.id}`
        );
        this._user.shadowpaySettings.sentTrades.push(data.id.toString());
        await this._user.save();
        if (this._user.userSettings.pendingTradesFilePath != "")
          this.registerPendingTradeToFile(tradeOfferId);
      }
    } catch (err) {
      this.handleError(err);
    }
  }

  private async createTrade(
    tradeURL: string,
    json_tradeoffer: JsonTradeoffer,
    id: string | number,
    marketplace: Marketplace,
    message = ""
  ) {
    const offer = this._steamTradeOfferManager.createOffer(tradeURL);
    try {
      const itemsToSend = await this.getItemsToSend(json_tradeoffer);
      if (!itemsToSend.every((v) => typeof v != "undefined")) {
        this.infoLogger(
          `One or more items of ${marketplace} sale #${id} wasn't in inventory`
        );
        return; // Don't want to create trade if we don't have all items that we need
      }

      const alreadyInTrade = await this.isItemsInTrade(itemsToSend);
      if (alreadyInTrade) {
        this.infoLogger(
          `One or more items of ${marketplace} sale #${id} was already in trade`
        );
        return; // Don't want to create trade one (or more item) is already in trade
      }
      offer.addMyItems(itemsToSend);
      offer.setMessage(message);
      const offerStatus = await this.sendOffer(offer);
      this.infoLogger(`Steam offer #${offer.id} is ${offerStatus}`);
      return offer.id;
    } catch (err) {
      this.handleError(err);
      return;
    }
  }

  public sendOffer(offer: TradeOffer): Promise<"pending" | "sent"> {
    return new Promise<"pending" | "sent">((res, rej) => {
      offer.send((err, status) => {
        if (err) rej(err);

        res(status);
      });
    });
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
        this.infoLogger(`Trade offer #${offer.id} was canceled`);
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

  /**
   * Doesn't throw errors
   */
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
      handleError(err, this.logsPath);
    } catch (err) {
      // do nothing
    }
  }

  public infoLogger(info: string) {
    try {
      infoLogger(info, this.logsPath);
    } catch (err) {
      // do nothing
    }
  }

  private async getItemsToSend(
    json_tradeoffer: JsonTradeoffer
  ): Promise<CEconItem[]> {
    const apps_contexts = getAppidContextidByJsonTradeOffer(json_tradeoffer);
    const inventories = await Promise.all(
      apps_contexts.map((app_context) =>
        this.getInventoryContents(app_context.appid, app_context.contextid)
      )
    );
    const unifiedInv = inventories.reduce((a, b) => [...a, ...b]);
    const assets = json_tradeoffer.me.assets;
    const itemsToSend = assets.map((asset) =>
      unifiedInv.find(
        (econItem) =>
          econItem.assetid == asset.assetid &&
          econItem.appid == asset.appid &&
          econItem.contextid.toString() == asset.contextid
      )
    );
    return itemsToSend;

    function getAppidContextidByJsonTradeOffer(
      json_tradeoffer: JsonTradeoffer
    ) {
      const app_contextFromAssets = json_tradeoffer.me.assets.map(
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

  /**
   * Get inventory contents based on appid and contextid
   * @returns Array containing all intenvory items
   */
  private getInventoryContents(
    appid: number,
    contextid: number
  ): Promise<CEconItem[]> {
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

  public async updateShadowpayApiKey(newShadowpayApiKey: string) {
    this._user.shadowpaySettings.apiKey = newShadowpayApiKey;
    await this._user.save();
    return;
  }

  public async updateMarketcsgoApiKey(newMarketcsgoApiKey: string) {
    this._user.marketcsgoSettings.apiKey = newMarketcsgoApiKey;
    await this._user.save();
    return;
  }

  /**
   * @throw DB or Fetch error.
   */
  public async startWaxpeerClient(): Promise<void> {
    if (this._wpClient || this._wpWebsocket) return;
    if (!this._steamClient.steamID) return; // Steam accound failed in login, don't try to start
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
    this.registerWaxpeerSocketHandlers();
    return;
  }

  public async startShadowpayClient(): Promise<void> {
    if (this._spClient || this._spWebsocket) return;
    if (!this._steamClient.steamID) return; // Steam account failed loging in, don't try to start
    this._spClient = await ShadowpayClient.getInstance(
      this._user.shadowpaySettings.apiKey,
      this._user.proxy
    );
    let accessToken = this.getSteamLoginSecure();
    // TODO this is necessary since when app start it need to await steam send the cookies before start shadowpay, maybe change it to a event
    while (!accessToken || accessToken == "") {
      await sleepAsync(100);
      accessToken = this.getSteamLoginSecure();
    }
    await this._spClient.setSteamToken(accessToken);
    this._spWebsocket = new ShadowpayWebsocket(this._spClient);
    this.registerShadowpaySocketHandlers();
    return;
  }

  private registerWaxpeerSocketHandlers() {
    this._wpWebsocket.on("stateChange", async (data) => {
      if (data == this._user.waxpeerSettings.state) return;
      this._user.waxpeerSettings.state = data;
      this.emit("waxpeerStateChanged", data, this._user.username);
      await this._user.save();
    });
    this._wpWebsocket.on("acceptWithdraw", (tradeOfferId) => {
      this.acceptTradeOffer(tradeOfferId); // error catched inside, can't throw err
    });
    this._wpWebsocket.on("cancelTrade", (tradeOfferId) => {
      this.cancelTradeOffer(tradeOfferId); // retring till cancel or not cancellable anymore, can't throw err
    });
    this._wpWebsocket.on("sendTrade", (data) => {
      this.createTradeForWaxpeer(data);
    });
    this._wpWebsocket.on("error", this.handleError);
  }

  private registerShadowpaySocketHandlers() {
    this._spWebsocket.on("stateChange", async (data) => {
      if (data == this._user.shadowpaySettings.state) return;
      this._user.shadowpaySettings.state = data;
      this.emit("shadowpayStateChanged", data, this._user.username);
      await this._user.save();
    });
    this._spWebsocket.on("acceptWithdraw", (tradeOfferId) => {
      this.acceptTradeOffer(tradeOfferId);
    });
    this._spWebsocket.on("cancelTrade", (tradeOfferId) => {
      this.cancelTradeOffer(tradeOfferId);
    });
    this._spWebsocket.on("sendTrade", async (data) => {
      this.createTradeForShadowpay(data);
    });
    this._spWebsocket.on("error", this.handleError);
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

  /**
   * @return Promise that resolve if it's all OK
   * @throw (DB error) Fatal error.
   */
  public async stopShadowpayClient() {
    if (!this._spWebsocket || !this._spClient) return; // Already stopped
    this._spWebsocket.disconnect();
    this._spWebsocket.removeAllListeners();
    this._spClient = undefined;
    this._spWebsocket = undefined;
    this._user.shadowpaySettings.state = false;
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

  private async registerPendingTradeToFile(offerID: string | number) {
    if (
      this._user.userSettings.pendingTradesFilePath == "" ||
      !this._user.userSettings.pendingTradesFilePath
    )
      return;
    await pushElementToJsonFile<number>(
      this._user.userSettings.pendingTradesFilePath,
      Number(offerID)
    );
    return;
  }
}

interface TradeManagerEvents {
  waxpeerStateChanged: (state: boolean, username: string) => void;
  shadowpayStateChanged: (state: boolean, username: string) => void;
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
