import { HttpsProxyAgent } from "https-proxy-agent";
import fetch, { RequestInit, Response } from "node-fetch";
import { WalletBalance } from "../../entities/walletBalance.entity";
import { User } from "src/main/entities/user.entity";
import { EMarket } from "../../enum/global.enum";
import { ItemsPrices } from "../../entities/itemsPrices.entity";
import { minutesToMS } from "../../../shared/helpers";
import CEconItem from "steamcommunity/classes/CEconItem.js";
import { Raw } from "typeorm";

export default class InventoryPriceClient {
    private static API_URL = "https://prices.csgotrader.app/latest";
    private proxy: string;


    constructor(user: User, proxy?: string) {
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
            const myWallet = await WalletBalance.findOne({ where: { user: { id: user.id } } })
            const itemsPricesFromCSFloat = await this.getPriceFromCSFloat();
            const itemsPricesFromBuff163 = await this.getPriceFromBuff163();
            const itemsPricesToSave = this.mergeMarketPrices(itemsPricesFromCSFloat, itemsPricesFromBuff163);

            if (!myWallet) {
                const newWallet = new WalletBalance()
                newWallet.user = user

                itemsPricesToSave.map(async (item) => {
                    await ItemsPrices.save(item)
                })

                await ItemsPrices.save(itemsPricesToSave)

                newWallet.lastUpdate = new Date()

                await newWallet.save()

            } else {
                const shouldUpdate = myWallet?.lastUpdate.getTime() + minutesToMS(480) < Date.now()

                if (!shouldUpdate) return

                itemsPricesToSave.map(async (item) => {
                    await ItemsPrices.save(item)
                })

                await ItemsPrices.save(itemsPricesToSave)

                myWallet.lastUpdate = new Date()

                await myWallet.save()
            }
        } catch (error) {
            console.error('Erro na atualização global:', error);
        }
    }

    public async updateUserPrices(user: User, items: CEconItem[]): Promise<WalletBalance> {
        const myWallet = await WalletBalance.findOne({ where: { user: { id: user.id } } })
        if (!myWallet) {
            throw new Error(`Carteira do usuário ${user.username} não encontrada`);
        }

        let totalPriceFloat = 0
        let totalPriceBuff = 0

        for (const item of items) {
            const itemPrice = await ItemsPrices.findOne({ where: { market_hash_name: item.market_hash_name } })
            if (itemPrice) {
                if (itemPrice.buff163Price) {
                    totalPriceBuff += itemPrice.buff163Price
                }

                if (itemPrice.csfloatPrice) {
                    totalPriceFloat += itemPrice.csfloatPrice
                }
            }

        }

        myWallet.inventoryBalanceFloat = totalPriceFloat
        myWallet.inventoryBalanceBuff = totalPriceBuff
        return myWallet.save()
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
                itemPrice.market_hash_name = itemName;
                itemPrice.csfloatPrice = itemData.price !== null
                    ? Number(itemData.price)
                    : null;
                return itemPrice;
            });
        } catch (error) {
            throw new Error('Erro ao buscar preços do CSFloat');
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
                itemPrice.market_hash_name = itemName;
                itemPrice.buff163Price = this.calculateBuffPrice(itemData);
                return itemPrice;
            });
        } catch (error) {
            throw new Error(`Erro Buff163: ${error.message}`);
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
        const csFloatMap = new Map<string, ItemsPrices>(
            csFloatPrices.map(p => [p.market_hash_name, p])
        );

        const buffMap = new Map<string, ItemsPrices>(
            buffPrices.map(p => [p.market_hash_name, p])
        );

        const allKeys = new Set([
            ...Array.from(csFloatMap.keys()),
            ...Array.from(buffMap.keys())
        ]);

        return Array.from(allKeys).map(key => {
            const merged = new ItemsPrices();
            merged.market_hash_name = key;

            const csItem = csFloatMap.get(key);
            const buffItem = buffMap.get(key);

            merged.csfloatPrice = csItem?.csfloatPrice ?? null;
            merged.buff163Price = buffItem?.buff163Price ?? null;

            return merged;
        });
    }
}