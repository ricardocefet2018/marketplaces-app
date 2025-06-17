import {EventEmitter} from "events";
import {In, Repository} from "typeorm";
import {AppDataSource} from "../db";
import {Inventory} from "../../entities/inventory.entity";
import {User} from "../../entities/user.entity";
import {sleepAsync} from "@doctormckay/stdlib/promises";
import TradeOfferManager from "steam-tradeoffer-manager";
import CEconItem from "steamcommunity/classes/CEconItem.js";

export class InventoryManager extends EventEmitter {
    private static instance: InventoryManager;
    private inventoryRepository: Repository<Inventory>;

    private lastUpdate: { [key: string]: number } = {};
    private readonly user: User;
    private steamTradeOfferManager: TradeOfferManager;

    private lastInventoryRequestTime: { [key: string]: number } = {};
    private isUpdatingInventory: { [key: string]: boolean } = {};
    private inventoryUpdateInterval = 5000;

    private constructor(user: User, steamTradeOfferManager: TradeOfferManager) {
        super();
        this.inventoryRepository = AppDataSource.getRepository(Inventory);
        this.user = user;
        this.steamTradeOfferManager = steamTradeOfferManager;
    }

    public static getInstance(): InventoryManager {
        if (!this.instance) throw new Error("Factory method not called before!");
        return this.instance;
    }

    public static createInstance(user: User, steamTradeOfferManager: TradeOfferManager): InventoryManager {
        if (!this.instance) {
            this.instance = new InventoryManager(user, steamTradeOfferManager);
        }
        return this.instance;
    }

    async updateInventory(appid: number, contextid: string): Promise<void> {
        const now = Date.now();
        const cacheKey = `${appid}_${contextid}`;

        try {
            const items = await this.fetchInventoryFromSteam(appid, parseInt(contextid));
            if (!items || items.length === 0) return;

            await this.saveInventoryToDb(items, appid, contextid);
            this.lastUpdate[cacheKey] = now;
            this.emit("inventoryUpdated", appid, contextid);
        } catch (error) {
            if (error.message && error.message.includes("Too Many Requests")) {
                await sleepAsync(5000);
            }
            throw error;
        }
    }

    public async inInventory(appid: number, contextid: number, assetid?: string): Promise<boolean> {

        if (!assetid) {
            return false;
        }

        if (this.user.csfloat?.notAccept?.includes(assetid)) {
            return false;
        }

        try {
            const steamItems = await this.fetchInventoryFromSteam(appid, contextid);
            const foundInSteam = steamItems.some(item => item.assetid === assetid);

            if (!foundInSteam && this.user.csfloat && !this.user.csfloat.notAccept.includes(assetid)) {
                this.user.csfloat.notAccept.push(assetid);
                await this.user.save();
            }

            return foundInSteam;
        } catch (error) {
            console.error("Error checking inventory:", error);

            if (this.user.csfloat && !this.user.csfloat.notAccept.includes(assetid)) {
                this.user.csfloat.notAccept.push(assetid);
                await this.user.save();
            }

            return false;
        }
    }

    public async getInventory(appid: number, contextid: string): Promise<CEconItem[]> {
        const now = Date.now();
        const cacheKey = `${appid}_${contextid}`;

        if (this.isUpdatingInventory[cacheKey]) {
            console.log(`Duplicate request for inventory ${cacheKey} - using database data`);
            return this.getInventoryFromDb(appid, contextid);
        }

        if (this.lastInventoryRequestTime[cacheKey] &&
            (now - this.lastInventoryRequestTime[cacheKey] < this.inventoryUpdateInterval)) {
            console.log(`Request made recently for inventory ${cacheKey} - using database data`);
            return this.getInventoryFromDb(appid, contextid);
        }

        try {
            this.isUpdatingInventory[cacheKey] = true;
            this.lastInventoryRequestTime[cacheKey] = now;

            await this.updateInventory(appid, contextid);

            return this.getInventoryFromDb(appid, contextid);
        } catch (error) {
            console.error(`Error updating inventory ${cacheKey}:`, error);
            return this.getInventoryFromDb(appid, contextid);
        } finally {
            this.isUpdatingInventory[cacheKey] = false;
        }
    }

    private fetchInventoryFromSteam(appid: number, contextid: number): Promise<CEconItem[]> {
        return new Promise((resolve, reject) => {
            this.steamTradeOfferManager.getInventoryContents(
                appid,
                contextid,
                false,
                (err, inv) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(inv);
                }
            );
        });
    }

    private async saveInventoryToDb(items: CEconItem[], appid: number, contextid: string): Promise<void> {
        const currentItems = await this.inventoryRepository.find({
            where: {
                user: {id: this.user.id},
                appid: appid,
                contextid: contextid
            }
        });
        const currentAssetIds = new Set(currentItems.map(item => item.assetid));

        for (const [index, item] of items.entries()) {
            if (!item.assetid || !item.contextid || !item.classid) {
                continue;
            }

            const inventoryItem = new Inventory({
                assetid: item.assetid.toString(),
                appid: item.appid,
                contextid: item.contextid.toString(),
                classid: item.classid.toString(),
                instanceid: item.instanceid?.toString() || "0",
                pos: index,
                name: item.name || '',
                market_name: item.market_hash_name || item.name || '',
                image_url: `https://community.cloudflare.steamstatic.com/economy/image/${(item as any)?.['icon_url'] || ''}`,
                tradable: item.tradable === true,
                item_data: item,
                user: this.user
            });

            currentAssetIds.delete(item.assetid.toString());

            try {
                await this.inventoryRepository.save(inventoryItem);
            } catch (error) {
                console.error('Error saving item:', error);
            }
        }

        if (currentAssetIds.size > 0) {
            try {
                await this.inventoryRepository.delete({
                    assetid: In(Array.from(currentAssetIds)),
                    user: {id: this.user.id},
                    appid: appid,
                    contextid: contextid
                });
            } catch (error) {
                console.error(`Error removing old items:`, error);
            }
        }
    }

    private async getInventoryFromDb(appid: number, contextid: string): Promise<CEconItem[]> {
        const items = await this.inventoryRepository.find({
            where: {
                appid,
                contextid,
                user: {id: this.user.id}
            },
            order: {
                pos: "ASC"
            }
        });

        return items.map(item => item.item_data);
    }
}

