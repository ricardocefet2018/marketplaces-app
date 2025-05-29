import {HttpsProxyAgent} from "https-proxy-agent";
import fetch, {RequestInit, Response} from "node-fetch";
import {WalletBalance} from "../../entities/walletBalance.entity";
import {User} from "../../entities/user.entity";
import {EMarket} from "../../enum/global.enum";
import {ItemsPrices} from "../../entities/itemsPrices.entity";
import {minutesToMS} from "../../../shared/helpers";
import CEconItem from "steamcommunity/classes/CEconItem.js";
import {In} from "typeorm";

export default class InventoryPriceClient {
    private static API_URL = "https://prices.csgotrader.app/latest";
    private readonly proxy: string;

    constructor(proxy?: string) {
        this.proxy = proxy;
    }

    private internalFetch(
        url: string,
        init: RequestInit = {}
    ): Promise<Response> {
        if (this.proxy) init.agent = new HttpsProxyAgent(this.proxy);

        const headers = new Headers(init.headers as HeadersInit);

        headers.set("Accept", "application/json");
        init.headers = Object.fromEntries(headers.entries());

        return fetch(url, init);
    }

    public async updateDBPrices(user: User): Promise<void> {
        try {
            const myWallet = await WalletBalance.findOne({where: {user: {id: user.id}}});

            if (myWallet && myWallet.lastUpdatedAt.getTime() + minutesToMS(480) >= Date.now()) {
                return;
            }

            const [itemsPricesFromCSFloat, itemsPricesFromBuff163] = await Promise.all([
                this.getPriceFromCSFloat(),
                this.getPriceFromBuff163()
            ]);

            const itemsPricesToSave = this.mergeMarketPrices(
                itemsPricesFromCSFloat,
                itemsPricesFromBuff163
            );

            if (itemsPricesToSave.length > 0) {
                await ItemsPrices.save(itemsPricesToSave);

                const currentDate = new Date();

                if (!myWallet) {
                    const newWallet = new WalletBalance();
                    newWallet.user = user;
                    newWallet.lastUpdatedAt = currentDate;
                    await newWallet.save();
                } else {
                    myWallet.lastUpdatedAt = currentDate;
                    await myWallet.save();
                }
            }
        } catch (error) {
            throw new Error(`Failed to update prices: ${error.message}`);
        }
    }

    public async updateUserPrices(user: User, items: CEconItem[]): Promise<WalletBalance> {
        try {
            const myWallet = await WalletBalance.findOne({where: {user: {id: user.id}}});

            let totalPriceFloat = 0;
            let totalPriceBuff = 0;


            const itemCounts = new Map<string, number>();
            for (const item of items) {
                const hashName = item.market_hash_name;
                if (hashName) {
                    itemCounts.set(hashName, (itemCounts.get(hashName) || 0) + 1);
                }
            }


            const marketHashNames = Array.from(itemCounts.keys());

            const chunkSize = 100; // Adjust this value based on database limitations
            const chunks = [];
            for (let i = 0; i < marketHashNames.length; i += chunkSize) {
                chunks.push(marketHashNames.slice(i, i + chunkSize));
            }

            let itemPrices: ItemsPrices[] = [];
            for (const chunk of chunks) {
                const chunkResults = await ItemsPrices.find({
                    where: chunk.length > 0
                        ? {marketHashName: In(chunk)}
                        : {marketHashName: ''}
                });
                itemPrices = [...itemPrices, ...chunkResults];
            }

            const priceMap = new Map<string, ItemsPrices>();
            for (const price of itemPrices) {
                priceMap.set(price.marketHashName, price);
            }

            const notFoundItems = [];
            for (const hashName of marketHashNames) {
                if (!priceMap.has(hashName)) {
                    notFoundItems.push(hashName);
                }
            }

            if (notFoundItems.length > 0) {
                console.log("Sample of items not found:", notFoundItems.slice(0, 5));
            }

            for (const [hashName, count] of itemCounts.entries()) {
                const itemPrice = priceMap.get(hashName);
                if (itemPrice) {
                    if (itemPrice.priceBuff163) {
                        totalPriceBuff += itemPrice.priceBuff163 * count;
                    }

                    if (itemPrice.priceCSFloat) {
                        totalPriceFloat += itemPrice.priceCSFloat * count;
                    }
                }
            }

            myWallet.csFloatInventoryValue = Number(totalPriceFloat.toFixed(2));
            myWallet.buffInventoryValue = Number(totalPriceBuff.toFixed(2));

            return myWallet.save();
        } catch (error) {
            throw new Error(`Failed to update user prices: ${error.message}`);
        }
    }

    async getPriceFromCSFloat(): Promise<ItemsPrices[]> {
        try {
            const response = await this.internalFetch(
                `${InventoryPriceClient.API_URL}/${EMarket.CSFLOAT}.json`
            );

            const itemsData: {
                [key: string]: { price: number | null }
            } = await response.json();

            return Object.entries(itemsData).map(([itemName, itemData]) => {
                const itemPrice = new ItemsPrices();
                itemPrice.marketHashName = itemName;
                itemPrice.priceCSFloat = itemData.price !== null
                    ? Number(itemData.price)
                    : null;
                itemPrice.lastUpdatedAtCSFloat = new Date()
                return itemPrice;
            });
        } catch (error) {
            throw new Error(`Error fetching prices from CSFloat:${error}`);
        }
    }

    async getPriceFromBuff163(): Promise<ItemsPrices[]> {
        try {
            const response = await this.internalFetch(
                `${InventoryPriceClient.API_URL}/${EMarket.BUFF163}.json`
            );

            const itemsData: {
                [key: string]: {
                    starting_at?: { price?: number | null } | null,
                    highest_order?: { price?: number | null } | null
                }
            } = await response.json();

            return Object.entries(itemsData).map(([itemName, itemData]) => {
                const itemPrice = new ItemsPrices();
                itemPrice.marketHashName = itemName;
                itemPrice.priceBuff163 = this.calculateBuffPrice(itemData);
                itemPrice.lastUpdatedAtBuff163 = new Date();
                return itemPrice;
            });
        } catch (error) {
            throw new Error(`Error fetching prices from Buff163:${error}`);
        }
    }

    private calculateBuffPrice(itemData: {
        starting_at?: { price?: number | null } | null,
        highest_order?: { price?: number | null } | null
    }): number | null {
        if (itemData.starting_at?.price) {
            return Number(itemData.starting_at.price);
        }

        if (itemData.highest_order?.price) {
            return Number(itemData.highest_order.price);
        }

        return null;
    }

    private mergeMarketPrices(
        csFloatPrices: ItemsPrices[],
        buffPrices: ItemsPrices[]
    ): ItemsPrices[] {
        try {
            const csFloatMap = new Map<string, ItemsPrices>();
            for (const item of csFloatPrices) {
                if (item.marketHashName) {
                    csFloatMap.set(item.marketHashName, item);
                }
            }

            const buffMap = new Map<string, ItemsPrices>();
            for (const item of buffPrices) {
                if (item.marketHashName) {
                    buffMap.set(item.marketHashName, item);
                }
            }

            const allKeys = new Set([
                ...csFloatMap.keys(),
                ...buffMap.keys()
            ]);

            const currentDate = new Date();
            const result: ItemsPrices[] = [];

            for (const key of allKeys) {
                const merged = new ItemsPrices();
                merged.marketHashName = key;

                const csFloatItem = csFloatMap.get(key);
                const buffItem = buffMap.get(key);

                merged.priceCSFloat = csFloatItem?.priceCSFloat ?? null;
                merged.priceBuff163 = buffItem?.priceBuff163 ?? null;

                merged.lastUpdatedAtCSFloat = currentDate;
                merged.lastUpdatedAtBuff163 = currentDate;

                result.push(merged);
            }

            return result;
        } catch (error) {
            console.error(`Error merging market prices: ${error.message}`);
            return [];
        }
    }
}
