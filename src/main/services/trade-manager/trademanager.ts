import path from "path";
import { EventEmitter } from "events";
import TradeOfferManager from "steam-tradeoffer-manager";
import SteamUser from "steam-user";
import {
  JsonTradeoffer,
  TradeWebsocketCreateTradeData,
} from "../../models/types";
import CEconItem from "steamcommunity/classes/CEconItem.js";
import {
  handleError,
  infoLogger,
  minutesToMS,
  pushElementToJsonFile,
} from "../../../shared/helpers";
import TradeOffer from "steam-tradeoffer-manager/lib/classes/TradeOffer.js";
import { sleepAsync } from "@doctormckay/stdlib/promises.js";
import {
  IUserSettings,
  LoginData,
  Marketplace,
  SteamAcc,
} from "../../../shared/types";
import { User } from "../../entities/user.entity";
import WaxpeerClient from "../waxpeer/waxpeerClient";
import { WaxpeerWebsocket } from "../waxpeer/waxpeerWebsocket";
import { app } from "electron";
import ShadowpayClient from "../shadowpay/shadowpayClient";
import { ShadowpayWebsocket } from "../shadowpay/shadowpayWebsocket";
import MarketcsgoClient from "../marketcsgo/marketcsgoClient";
import AppError from "../../models/AppError";
import { SendTradePayload } from "../shadowpay/interface/shadowpay.interface";
import { MarketcsgoTradeOfferPayload } from "../marketcsgo/interface/marketcsgo.interface";
import { TradeManagerOptions } from "./interface/tradeManager.interface";
import { MarketcsgoSocket } from "../marketcsgo/marketcsgoSocket";
import { AppController } from "../../controllers/app.controller";

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
  private _mcsgoClient?: MarketcsgoClient;
  private _mcsgoSocket?: MarketcsgoSocket;
  private _appController: AppController;

  public get steamAcc(): SteamAcc {
    return {
      username: this._user.username,
      status: !!this._steamClient.steamID,
      waxpeer: this._user.waxpeer,
      shadowpay: this._user.shadowpay,
      marketcsgo: this._user.marketcsgo,
      csfloat: this._user.csfloat,
      userSettings: this._user.userSettings,
    };
  }

  private constructor(options: TradeManagerOptions) {
    super();
    this._appController = AppController.getInstance();
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
      // doesn't throw errors, no need to wait it
      this.updateAccessTokenWaxpeer(accessToken);
      this.updateAccessTokenShadowpay(accessToken);
      this.updateAccessTokenMarketcsgo(accessToken);
      // TODO add csfloat here
    });

    this._steamTradeOfferManager.on("newOffer", (offer) => {
      const isGift =
        offer.itemsToGive.length == 0 && offer.itemsToReceive.length > 0;

      if (!isGift || (isGift && !this._user.userSettings.acceptGifts))
        this._appController.notify({
          title: `New offer for ${this._user.username}`,
          body: ``,
        });

      if (isGift && this._user.userSettings.acceptGifts)
        this.acceptTradeOffer(offer.id);
    });
  }

  private async updateAccessTokenWaxpeer(accessToken: string) {
    if (!this._wpWebsocket || !this._wpClient) return; // not running
    await this._wpClient.setSteamToken(accessToken);
    this._wpWebsocket.disconnectWss();
    const twsOptions = this._wpClient.getTWSInitObject();
    this._wpWebsocket = new WaxpeerWebsocket(twsOptions);
  }

  private async updateAccessTokenShadowpay(accessToken: string) {
    if (!this._spWebsocket || !this._spClient) return; // not running
    await this._spClient.setSteamToken(accessToken);
    this._spWebsocket.disconnect();
    this._spWebsocket = new ShadowpayWebsocket(this._spClient);
  }

  private async updateAccessTokenMarketcsgo(accessToken: string) {
    if (!this._mcsgoClient || !this._mcsgoSocket) return;
    this._mcsgoClient.setSteamToken(accessToken); // mcsgo ping with acessToken every 3 minutes, no need to send it instantly
  }

  public async createTradeForWaxpeer(data: TradeWebsocketCreateTradeData) {
    if (this._user.waxpeer.sentTrades.includes(data.wax_id)) return;

    this._appController.notify({
      title: `New Waxpeer sale!`,
      body: `Creating trade...`,
    });

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

        if (
          this._user.userSettings.pendingTradesFilePath == "" ||
          !this._user.userSettings.pendingTradesFilePath
        )
          this._appController.notify({
            title: `Waxpeer trade created.`,
            body: `Please confirm trade #${tradeOfferId} on your device.`,
          });

        this._user.waxpeer.sentTrades.push(data.wax_id);
        await this._user.save();
        if (this._user.userSettings.pendingTradesFilePath != "") {
          this.registerPendingTradeToFile(tradeOfferId);
          this._appController.notify({
            title: `Waxpeer trade created.`,
            body: `Trade #${tradeOfferId} was registered on pending trades file.`,
          });
        }
      }
    } catch (err) {
      this.handleError(err);
    }
  }

  public async createTradeForShadowpay(data: SendTradePayload) {
    if (this._user.shadowpay.sentTrades.includes(data.id.toString())) return;

    this._appController.notify({
      title: `New Shadowpay sale!`,
    });

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
          `Steam trade offer #${tradeOfferId} was successfully associated with shadowpay trade ${data.id}`
        );
        this._user.shadowpay.sentTrades.push(data.id.toString());
        await this._user.save();
        if (this._user.userSettings.pendingTradesFilePath != "") {
          this.registerPendingTradeToFile(tradeOfferId);
          this._appController.notify({
            title: `Shadowpay trade created.`,
            body: `Trade #${tradeOfferId} was registered on pending trades file`,
          });
        } else {
          this._appController.notify({
            title: `Shadowpay trade created.`,
            body: `Please confirm trade #${tradeOfferId} on your device.`,
          });
        }
      }
    } catch (err) {
      this.handleError(err);
    }
  }

  public async createTradeForMarketcsgo(data: MarketcsgoTradeOfferPayload) {
    if (this._user.marketcsgo.sentTrades.includes(data.hash)) return;

    const tradeUrl = `https://steamcommunity.com/tradeoffer/new/?partner=${data.partner}&token=${data.token}`;
    const id = data.hash;
    const message = data.tradeoffermessage;
    const marketplace: Marketplace = "MarketCSGO";
    const json_tradeoffer: JsonTradeoffer = {
      newversion: true,
      version: 2,
      me: {
        assets: data.items.map((i) => ({
          amount: i.amount,
          appid: i.appid,
          contextid: i.contextid.toString(),
          assetid: i.assetid,
        })),
        currency: [],
        ready: false,
      },
      them: {
        assets: [],
        currency: [],
        ready: false,
      },
    };
    const tradeOfferId = await this.createTrade(
      tradeUrl,
      json_tradeoffer,
      id,
      marketplace,
      message
    );
    if (!tradeOfferId) return;

    try {
      const reportedTrade = this._mcsgoClient.registerTradeOffer(tradeOfferId);
      if (reportedTrade) {
        this.infoLogger(
          `Steam trade offer #${tradeOfferId} was successfully associated with Marketcsgo trade ${data.hash}`
        );
        this._user.marketcsgo.sentTrades.push(data.hash);
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
        this._appController.notify({
          title: "Trade offer cancelled.",
          body: `Steam trade offer #${offerId} was cancelled.`,
        });
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
      // TODO update pkg @types/steam-tradeoffer-manager and update this name
      this._steamTradeOfferManager.getOffersContainingItem(
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
      this._appController.notify({
        title: `Accepted gift for ${this._user.username}.`,
        body: `Trade offer #${offer.id} was accepted.`,
      });
      this.infoLogger(`Steam trade offer #${offer.id} was accepted`);
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
    this._user.waxpeer.apiKey = newWaxpeerApiKey;
    await this._user.save();
    return;
  }

  public async updateShadowpayApiKey(newShadowpayApiKey: string) {
    this._user.shadowpay.apiKey = newShadowpayApiKey;
    await this._user.save();
    return;
  }

  public async updateMarketcsgoApiKey(newMarketcsgoApiKey: string) {
    this._user.marketcsgo.apiKey = newMarketcsgoApiKey;
    await this._user.save();
    return;
  }

  public async updateCSFloatApiKey(newCSFloatApiKey: string) {
    this._user.csfloat.apiKey = newCSFloatApiKey;
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
      this._user.waxpeer.apiKey,
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

  private registerWaxpeerSocketHandlers() {
    this._wpWebsocket.on("stateChange", async (data) => {
      this.emit("waxpeerStateChanged", data, this._user.username);
      if (data == this._user.waxpeer.state) return;
      this._user.waxpeer.state = data;
      await this._user.save();
    });
    this._wpWebsocket.on("acceptWithdraw", (tradeOfferId) => {
      this.acceptTradeOffer(tradeOfferId); // error catched inside, can't throw err
    });
    this._wpWebsocket.on("cancelTrade", (tradeOfferId) => {
      this._appController.notify({
        title: `Canceling Waxpeer sale...`,
      });
      this.cancelTradeOffer(tradeOfferId); // retring till cancel or not cancellable anymore, can't throw err
    });
    this._wpWebsocket.on("sendTrade", (data) => {
      this.createTradeForWaxpeer(data);
    });
    this._wpWebsocket.on("error", this.handleError);
  }

  public async startShadowpayClient(): Promise<void> {
    if (this._spClient || this._spWebsocket) return;
    if (!this._steamClient.steamID) return; // Steam account failed loging in, don't try to start
    this._spClient = await ShadowpayClient.getInstance(
      this._user.shadowpay.apiKey,
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

  private registerShadowpaySocketHandlers() {
    this._spWebsocket.on("stateChange", async (data) => {
      this.emit("shadowpayStateChanged", data, this._user.username);
      if (data == this._user.shadowpay.state) return;
      this._user.shadowpay.state = data;
      await this._user.save();
    });
    this._spWebsocket.on("acceptWithdraw", (tradeOfferId) => {
      this.acceptTradeOffer(tradeOfferId);
    });
    this._spWebsocket.on("cancelTrade", (tradeOfferId) => {
      this._appController.notify({
        title: `Canceling Shadowpay sale...`,
      });
      this.cancelTradeOffer(tradeOfferId);
    });
    this._spWebsocket.on("sendTrade", async (data) => {
      this.createTradeForShadowpay(data);
    });
    this._spWebsocket.on("error", this.handleError);
  }

  public async startMarketcsgoClient(): Promise<void> {
    if (this._mcsgoClient || this._mcsgoSocket) return;
    if (!this._steamClient.steamID) return; // Steam account failed loging in, don't try to start
    this._mcsgoClient = await MarketcsgoClient.getInstance(
      this._user.marketcsgo.apiKey,
      this._user.proxy
    );
    let accessToken = this.getSteamLoginSecure();
    // TODO this is necessary since when app start it need to await steam send the cookies before start shadowpay, maybe change it to a event
    while (!accessToken || accessToken == "") {
      await sleepAsync(100);
      accessToken = this.getSteamLoginSecure();
    }
    this._mcsgoClient.setSteamToken(accessToken);
    this._mcsgoSocket = new MarketcsgoSocket(this._mcsgoClient);
    this.registerMarketcsgoSocketHandlers();
    const success = await new Promise((resolve) => {
      this._mcsgoSocket.once("stateChange", (online) => {
        resolve(online);
      });
    });
    if (!success) {
      this.stopMarketcsgoClient();
      throw new AppError("Try again later!");
    }
  }

  private registerMarketcsgoSocketHandlers() {
    this._mcsgoSocket.on("stateChange", async (online) => {
      console.log("stateChange", online);
      this.emit("marketcsgoStateChanged", online, this._user.username);
      if (online == this._user.marketcsgo.state) return;
      this._user.marketcsgo.state = online;
      await this._user.save();
    });
    this._mcsgoSocket.on("acceptWithdraw", (tradeOfferId) => {
      this.acceptTradeOffer(tradeOfferId);
    });
    this._mcsgoSocket.on("cancelTrade", (tradeOfferId) => {
      this._appController.notify({
        title: `Canceling Marketcsgo sale.`,
      });
      this.cancelTradeOffer(tradeOfferId);
    });
    this._mcsgoSocket.on("sendTrade", (data) => {
      this._appController.notify({
        title: `New Marketcsgo sale!`,
      });
      this.createTradeForMarketcsgo(data);
    });
    this._mcsgoSocket.on("error", this.handleError);
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
    this._user.waxpeer.state = false;
    // TODO a DB error should close the app?
    await this._user.save();
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
    this._user.shadowpay.state = false;
    // TODO a DB error should close the app?
    await this._user.save();
    return;
  }

  public async stopMarketcsgoClient() {
    if (!this._mcsgoClient || !this._mcsgoSocket) return;
    this._mcsgoSocket.disconnect();
    this._mcsgoSocket.removeAllListeners();
    this._mcsgoClient = undefined;
    this._mcsgoSocket = undefined;
    this._user.marketcsgo.state = false;
    // TODO a DB error should close the app?
    await this._user.save();
    return;
  }

  public async logout() {
    this._steamClient.logOff();
    this._steamCookies = [];
    this._steamTradeOfferManager.shutdown();
    await this._user.waxpeer.remove();
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
