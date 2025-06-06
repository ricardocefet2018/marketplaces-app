import path from "path";
import {EventEmitter} from "events";
import TradeOfferManager, {EOfferFilter} from "steam-tradeoffer-manager";
import SteamUser, {EFriendRelationship} from "steam-user";
import {JsonTradeoffer, TradeWebsocketCreateTradeData,} from "../../models/types";
import CEconItem from "steamcommunity/classes/CEconItem.js";
import {handleError, infoLogger, minutesToMS, pushElementToJsonFile,} from "../../../shared/helpers";
import TradeOffer from "steam-tradeoffer-manager/lib/classes/TradeOffer.js";
import {sleepAsync} from "@doctormckay/stdlib/promises.js";
import {IUserSettings, LoginData, Marketplace, SteamAcc,} from "../../../shared/types";
import {User} from "../../entities/user.entity";
import WaxpeerClient from "../waxpeer/waxpeerClient";
import {WaxpeerWebsocket} from "../waxpeer/waxpeerWebsocket";
import {app} from "electron";
import ShadowpayClient from "../shadowpay/shadowpayClient";
import {ShadowpayWebsocket} from "../shadowpay/shadowpayWebsocket";
import MarketcsgoClient from "../marketcsgo/marketcsgoClient";
import AppError from "../../models/AppError";
import {SendTradePayload} from "../shadowpay/interface/shadowpay.interface";
import {MarketcsgoTradeOfferPayload} from "../marketcsgo/interface/marketcsgo.interface";
import {ICreateTradeData, TradeManagerOptions,} from "./interface/tradeManager.interface";
import {MarketcsgoSocket} from "../marketcsgo/marketcsgoSocket";
import {AppController} from "../../controllers/app.controller";
import CSFloatClient from "../csfloat/csfloatClient";
import {CSFloatSocket} from "../csfloat/csfloatSocket";
import {INotifyData} from "../csfloat/interfaces/csfloat.interface";
import {IGetTradeOffersResponse} from "../csfloat/interfaces/fetch.interface";
import {InventoryManager} from "../inventory/inventoryManager";

interface TradeManagerEvents {
    waxpeerStateChanged: (state: boolean, username: string) => void;
    waxpeerCanSellStateChanged: (state: boolean, username: string) => void;
    shadowpayStateChanged: (state: boolean, username: string) => void;
    shadowpayCanSellStateChanged: (state: boolean, username: string) => void;
    marketcsgoStateChanged: (state: boolean, username: string) => void;
    marketcsgoCanSellStateChanged: (state: boolean, username: string) => void;
    csfloatStateChanged: (state: boolean, username: string) => void;
    csfloatCanSellStateChanged: (state: boolean, username: string) => void;
    loggedOn: (tm: TradeManager) => void;
    notifyWindowsEvent: (title: string, body: string) => void;
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
    private _csfloatClient?: CSFloatClient;
    private _csfloatSocket?: CSFloatSocket;
    private _appController: AppController;
    private _inventoryManager: InventoryManager;
    private blockedUsersCache: string[] = [];
    private lastBlockedUsersUpdate = 0;
    private readonly CACHE_DURATION = 900000;

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

    public get steamAcc(): SteamAcc {
        return {
            username: this._user.username,
            status: !!this._steamClient.steamID,
            waxpeer: this._user.waxpeer,
            shadowpay: this._user.shadowpay,
            marketcsgo: this._user.marketcsgo,
            csfloat: this._user.csfloat,
            userSettings: this._user.userSettings,
            avatar: this._user.avatarUrl,
        };
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
                tm._inventoryManager = InventoryManager.getInstance(tm._user, tm._steamTradeOfferManager);
                resolve();
            });

            tm._steamClient.once("user", (sid, user) => {
                tm._user.avatarUrl = user.avatar_url_full;
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
                    tm._inventoryManager = InventoryManager.getInstance(tm._user, tm._steamTradeOfferManager);
                    resolve();
                });

                tm._steamClient.once("user", (sid, user) => {
                    tm._user.avatarUrl = user.avatar_url_full;
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

    public inTradeOffer(offerId: string): void {
        if (this._user.waxpeer.sentTrades.includes(offerId)) return;
        if (this._user.shadowpay.sentTrades.includes(offerId)) return;
        if (this._user.marketcsgo.sentTrades.includes(offerId)) return;
        if (this._user.csfloat.sentTrades.includes(offerId)) return;
    }

    public async createTradeForWaxpeer(data: TradeWebsocketCreateTradeData) {
       this.inTradeOffer(data.wax_id);
        this._appController.notify({
            title: `New Waxpeer sale!`,
            body: `Creating trade...`,
        });

        const tradeURL = data.tradelink;
        const json_tradeoffer = data.json_tradeoffer;
        const id = data.wax_id;
        const marketplace: Marketplace = "Waxpeer";
        const message = data.tradeoffermessage;
        const tradeOfferId = await this.createTrade({
            tradeURL,
            json_tradeoffer,
            id,
            marketplace,
            message,
        });

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

                this._user.waxpeer.sentTrades.push(data.wax_id);
                await this._user.save();
                if (this._user.userSettings.pendingTradesFilePath != "") {
                    this.registerPendingTradeToFile(tradeOfferId);
                    this._appController.notify({
                        title: `Waxpeer trade created.`,
                        body: `Trade #${tradeOfferId} was registered on pending trades file.`,
                    });
                } else {
                    this._appController.notify({
                        title: `Waxpeer trade created.`,
                        body: `Please confirm trade #${tradeOfferId} on your device.`,
                    });
                }
            }
        } catch (err) {
            this.handleError(err);
        }
    }

    public async createTradeForShadowpay(data: SendTradePayload) {
        this.inTradeOffer(data.id.toString());

        this._appController.notify({
            title: `New Shadowpay sale!`,
            body: `Creating trade...`,
        });

        const tradeURL = data.tradelink;
        const json_tradeoffer = data.json_tradeoffer;
        const id = data.id;
        const marketplace: Marketplace = "Shadowpay";
        const tradeOfferId = await this.createTrade({
            tradeURL,
            json_tradeoffer,
            id,
            marketplace,
            message: "",
        });
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
        this.inTradeOffer(data.hash);

        this._appController.notify({
            title: `New MarketCSGO sale!`,
            body: `Creating trade...`,
        });

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
        const tradeOfferId = await this.createTrade({
            tradeURL: tradeUrl,
            json_tradeoffer,
            id,
            marketplace,
            message,
        });
        if (!tradeOfferId) return;

        try {
            const reportedTrade = this._mcsgoClient.registerTradeOffer(tradeOfferId);
            if (reportedTrade) {
                this.infoLogger(
                    `Steam trade offer #${tradeOfferId} was successfully associated with Marketcsgo trade ${data.hash}`
                );
                this._user.marketcsgo.sentTrades.push(data.hash);
                await this._user.save();

                if (this._user.userSettings.pendingTradesFilePath != "") {
                    this.registerPendingTradeToFile(tradeOfferId);
                    this._appController.notify({
                        title: `MarketCSGO trade created.`,
                        body: `Trade #${tradeOfferId} was registered on pending trades file`,
                    });
                } else {
                    this._appController.notify({
                        title: `MarketCSGO trade created.`,
                        body: `Please confirm trade #${tradeOfferId} on your device.`,
                    });
                }
            }
        } catch (err) {
            this.handleError(err);
        }
    }

    public async createTradeForCSFloat(createTradeData: ICreateTradeData) {
        this.inTradeOffer(createTradeData.id.toString());

        this._appController.notify({
            title: `New CSFloat sale!`,
            body: `Creating trade...`,
        });

        const tradeOfferId = await this.createTrade(createTradeData);

        if (!tradeOfferId) return;

        this._user.csfloat.sentTrades.push(createTradeData.id.toString());
        await this._user.save();
        await this.registerPendingTradeToFile(tradeOfferId);
    }

    public sendOffer(offer: TradeOffer): Promise<"pending" | "sent"> {
        return new Promise<"pending" | "sent">((res, rej) => {
            offer.send((err, status) => {
                if (err) rej(err);

                res(status);
            });
        });
    }

    public async cancelTradeOffer(
        offerId: string,
        marketplace: Marketplace,
        retry = true
    ) {
        let retriedTimes = 0;
        do {
            try {
                const offer = await this.getTradeOffer(offerId);
                const {ETradeOfferState} = TradeOfferManager;

                if (
                    offer.state != ETradeOfferState.Active &&
                    offer.state != ETradeOfferState.CreatedNeedsConfirmation
                )
                    return; // Offer was found but isn't cancellable

                await cancelOffer(offer);
                this._appController.notify({
                    title: `${marketplace} sale cancelled.`,
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

        this.emit("waxpeerStateChanged", true, this._user.username);
        this._user.waxpeer.state = true;
        await this._user.save();

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
            this._user.shadowpay.apiKey,
            this._user.proxy
        );

        this.emit("shadowpayStateChanged", true, this._user.username);
        this._user.shadowpay.state = true;
        await this._user.save();

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

    public async startMarketcsgoClient(): Promise<void> {
        if (this._mcsgoClient || this._mcsgoSocket) return;
        if (!this._steamClient.steamID) return; // Steam account failed loging in, don't try to start
        this._mcsgoClient = await MarketcsgoClient.getInstance(
            this._user.marketcsgo.apiKey,
            this._user.proxy
        );

        this.emit("marketcsgoStateChanged", true, this._user.username);
        this._user.marketcsgo.state = true;
        await this._user.save();

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

    public async startCSFloatClient(): Promise<void> {
        if (this._csfloatClient || this._csfloatSocket) return;

        this.infoLogger("Iniciando CSFloat client...");
        this.emit("csfloatStateChanged", true, this._user.username);
        this._user.csfloat.state = true;
        await this._user.save();

        try {
            this._csfloatClient = await CSFloatClient.getInstance(
                this._user.csfloat.apiKey,
                this._user.proxy
            );

            this._csfloatSocket = new CSFloatSocket(
                this._csfloatClient,
                this._steamClient.steamID.getSteamID64()
            );
            this.registerCSFloatSocketHandlers();

            const success = await new Promise((resolve) => {
                this._csfloatSocket.once("stateChange", (online) => {
                    this.infoLogger(`CSFloat stateChange: ${online}`);
                    resolve(online);
                });
            });

            if (!success) {
                await this.stopCSFloatClient();
            }

        } catch (error) {
            this.handleError(error);
            await this.stopCSFloatClient();
            throw error;
        }
    }

    /**
     * @return Promise that resolve if it's all OK
     * @throw (DB error) Fatal error.
     */
    public async stopWaxpeerClient() {
        if (this._wpWebsocket) {
            this._wpWebsocket.disconnectWss();
            this._wpWebsocket.removeAllListeners();
        }
        this._wpClient = undefined;
        this._wpWebsocket = undefined;
        this._user.waxpeer.state = false;
        this._user.waxpeer.canSell = false;
        this.emit("waxpeerStateChanged", false, this._user.username);
        this.emit("waxpeerCanSellStateChanged", false, this._user.username);
        // TODO a DB error should close the app?
        await this._user.save();
        return;
    }

    /**
     * @return Promise that resolve if it's all OK
     * @throw (DB error) Fatal error.
     */
    public async stopShadowpayClient() {
        if (this._spWebsocket) {
            this._spWebsocket.disconnect();
            this._spWebsocket.removeAllListeners();
        }
        this._spClient = undefined;
        this._spWebsocket = undefined;
        this._user.shadowpay.state = false;
        this._user.shadowpay.canSell = false;
        this.emit("shadowpayStateChanged", false, this._user.username);
        this.emit("shadowpayCanSellStateChanged", false, this._user.username);
        // TODO a DB error should close the app?
        await this._user.save();
        return;
    }

    public async stopMarketcsgoClient() {
        if (this._mcsgoSocket) {
            this._mcsgoSocket.disconnect();
            this._mcsgoSocket.removeAllListeners();
        }
        this._mcsgoClient = undefined;
        this._mcsgoSocket = undefined;
        this._user.marketcsgo.state = false;
        this._user.marketcsgo.canSell = false;
        this.emit("marketcsgoStateChanged", false, this._user.username);
        this.emit("marketcsgoCanSellStateChanged", false, this._user.username);
        // TODO a DB error should close the app?
        await this._user.save();
        return;
    }

    async stopCSFloatClient() {
        if (this._csfloatSocket) {
            this._csfloatSocket.disconnect();
            this._csfloatSocket.removeAllListeners();
        }
        this._csfloatClient = undefined;
        this._csfloatSocket = undefined;
        this._user.csfloat.state = false;
        this._user.csfloat.canSell = false;
        this.emit("csfloatStateChanged", false, this._user.username);
        this.emit("csfloatCanSellStateChanged", false, this._user.username);

        await this._user.save();
        return;
    }

    public async logout() {
        this._steamClient.logOff();
        this._steamCookies = [];
        this._steamTradeOfferManager.shutdown();
        await this._user.remove();
        this._wpClient = undefined;
        if (this._wpWebsocket) this._wpWebsocket.disconnectWss();
        this._wpWebsocket = undefined;

        this._spClient = undefined;
        if (this._spWebsocket) this._spWebsocket.disconnect();
        this._spWebsocket = undefined;

        this._mcsgoClient = undefined;
        if (this._mcsgoSocket) this._mcsgoSocket.disconnect();
        this._mcsgoSocket = undefined;

        this._csfloatClient = undefined;
        if (this._csfloatSocket) this._csfloatSocket.disconnect();
        this._csfloatSocket = undefined;

        return;
    }

    public async updateSettings(newSettings: IUserSettings) {
        this._user.userSettings = Object.assign(
            this._user.userSettings,
            newSettings
        );
        await this._user.save();
    }

    public notifyWindows(notifyData: INotifyData): void {
        return this._appController.notify({
            title: notifyData.title,
            body: notifyData.body,
        });
    }

    public getBlockerdOrIgnoredUsers(): string[] {
        const now = Date.now();

        if (now - this.lastBlockedUsersUpdate < this.CACHE_DURATION) {
            return this.blockedUsersCache;
        }

        this.lastBlockedUsersUpdate = now;
        const friendList = Object.entries(this._steamClient.myFriends);
        const blockOrIgnoredUsersList: string[] = [];

        for (const [steamID, friendRelationship] of friendList) {
            if (
                friendRelationship === EFriendRelationship.Blocked ||
                friendRelationship === EFriendRelationship.Ignored ||
                friendRelationship === EFriendRelationship.IgnoredFriend
            ) {
                blockOrIgnoredUsersList.push(steamID.toString());
            }
        }

        this.blockedUsersCache = blockOrIgnoredUsersList;
        return blockOrIgnoredUsersList;
    }

    public getTradeOffers(): Promise<IGetTradeOffersResponse> {
        return new Promise((resolve, reject) => {
            const response: IGetTradeOffersResponse = {
                sent: [],
                received: [],
            };

            this._steamTradeOfferManager.getOffers(
                EOfferFilter.All,
                (err, sent, received) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    response.sent = sent;
                    response.received = received;
                    resolve(response);
                }
            );
        });
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
            //float dont need access token
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

    private async createTrade(
        createTradeData: ICreateTradeData
    ): Promise<string> {
        const offer = this._steamTradeOfferManager.createOffer(
            createTradeData.tradeURL
        );
        try {
            const itemsToSend = await this.getItemsToSend(
                createTradeData.json_tradeoffer
            );
            if (!itemsToSend.every((v) => typeof v != "undefined")) {
                this.infoLogger(
                    `One or more items of ${createTradeData.marketplace} sale #${createTradeData.id} wasn't in inventory`
                );
                return; // Don't want to create trade if we don't have all items that we need
            }

            const alreadyInTrade = await this.isItemsInTrade(itemsToSend);
            if (alreadyInTrade) {
                this.infoLogger(
                    `One or more items of ${createTradeData.marketplace} sale #${createTradeData.id} was already in trade`
                );
                return; // Don't want to create trade one (or more item) is already in trade
            }
            offer.addMyItems(itemsToSend);
            offer.setMessage(createTradeData.message);
            const offerStatus = await this.sendOffer(offer);
            this.infoLogger(`Steam offer #${offer.id} is ${offerStatus}`);
            return offer.id;
        } catch (err) {
            this.handleError(err);
            return;
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
        return assets.map((asset) =>
            unifiedInv.find(
                (econItem) =>
                    econItem.assetid == asset.assetid &&
                    econItem.appid == asset.appid &&
                    econItem.contextid.toString() == asset.contextid
            )
        );


        function getAppidContextidByJsonTradeOffer(
            json_tradeoffer: JsonTradeoffer
        ) {
            const app_contextFromAssets = json_tradeoffer.me.assets.map(
                (a) => a.appid.toString() + "_" + a.contextid
            );
            return app_contextFromAssets
                .filter((value, index, self) => self.indexOf(value) == index)
                .map((v) => ({
                    appid: Number(v.split("_")[0]),
                    contextid: Number(v.split("_")[1]),
                }));
        }
    }

    /**
     * Get inventory contents based on appid and contextid
     * @returns Array containing all intenvory items
     */
    private async getInventoryContents(
        appid: number,
        contextid: number
    ): Promise<CEconItem[]> {
        return this._inventoryManager.getInventory(appid, contextid.toString());
    }

    private registerWaxpeerSocketHandlers() {
        this._wpWebsocket.on("stateChange", async (data) => {
            this.emit("waxpeerCanSellStateChanged", data, this._user.username);
            this._user.waxpeer.canSell = data;
        });
        this._wpWebsocket.on("acceptWithdraw", (tradeOfferId) => {
            this.acceptTradeOffer(tradeOfferId); // error catched inside, can't throw err
        });
        this._wpWebsocket.on("cancelTrade", (tradeOfferId) => {
            this.cancelTradeOffer(tradeOfferId, "Waxpeer"); // retring till cancel or not cancellable anymore, can't throw err
        });
        this._wpWebsocket.on("sendTrade", (data) => {
            this.createTradeForWaxpeer(data);
        });
        this._wpWebsocket.on("error", this.handleError);
    }

    private registerShadowpaySocketHandlers() {
        this._spWebsocket.on("stateChange", async (data) => {
            this.emit("shadowpayCanSellStateChanged", data, this._user.username);
            this._user.shadowpay.canSell = data;
        });
        this._spWebsocket.on("acceptWithdraw", (tradeOfferId) => {
            this.acceptTradeOffer(tradeOfferId);
        });
        this._spWebsocket.on("cancelTrade", (tradeOfferId) => {
            this.cancelTradeOffer(tradeOfferId, "Shadowpay");
        });
        this._spWebsocket.on("sendTrade", async (data) => {
            this.createTradeForShadowpay(data);
        });
        this._spWebsocket.on("error", this.handleError);
    }

    private registerMarketcsgoSocketHandlers() {
        this._mcsgoSocket.on("stateChange", async (online) => {
            this.emit("marketcsgoCanSellStateChanged", online, this._user.username);
            this._user.marketcsgo.canSell = online;
        });
        this._mcsgoSocket.on("acceptWithdraw", (tradeOfferId) => {
            this.acceptTradeOffer(tradeOfferId);
        });
        this._mcsgoSocket.on("cancelTrade", (tradeOfferId) => {
            this.cancelTradeOffer(tradeOfferId, "MarketCSGO");
        });
        this._mcsgoSocket.on("sendTrade", (data) => {
            this.createTradeForMarketcsgo(data);
        });
        this._mcsgoSocket.on("error", this.handleError);
    }

    private async registerCSFloatSocketHandlers() {
        this._csfloatSocket.on("stateChange", async (data) => {
            this.emit("csfloatCanSellStateChanged", data, this._user.username);
            this._user.csfloat.canSell = data;
        });
        this._csfloatSocket.on("acceptWithdraw", (tradeOfferId) => {
            this.acceptTradeOffer(tradeOfferId);
        });
        this._csfloatSocket.on("cancelTrade", (tradeOfferId) => {
            this.cancelTradeOffer(tradeOfferId, "CSFloat");
        });
        this._csfloatSocket.on("sendTrade", (createTradeData: ICreateTradeData) => {
            this.createTradeForCSFloat(createTradeData);
        });
        this._csfloatSocket.on("error", this.handleError);
        this._csfloatSocket.on("notifyWindows", (notifyData: INotifyData) => {
            this.notifyWindows(notifyData);
        });
        this._csfloatSocket.on("getTradeOffers", async (callback) => {
            try {
                const sentTradeOffers = await this.getTradeOffers();
                callback(sentTradeOffers);
            } catch (err) {
                callback({
                    sent: [],
                    received: [],
                }, err);
            }
        });
        this._csfloatSocket.on("getBlockerUsers", (callback) => {
            callback(this.getBlockerdOrIgnoredUsers());
        });
        this._csfloatSocket.on("getInventory", async (callback) => {
            try {
                const items = await this.getInventoryContents(730, 2);
                callback(items);
            } catch (err) {
                callback([], err);
            }
        });

        await this._csfloatSocket.connect();
    }

    private async registerPendingTradeToFile(
        offerID: string | number
    ): Promise<void> {
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
