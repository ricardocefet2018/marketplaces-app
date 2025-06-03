import { EventEmitter } from "events";
import { Repository, In } from "typeorm";
import { AppDataSource } from "../db";
import { Inventory } from "../../entities/inventory.entity";
import { User } from "../../entities/user.entity";
import { sleepAsync } from "@doctormckay/stdlib/promises";
import TradeOfferManager from "steam-tradeoffer-manager";
import CEconItem from "steamcommunity/classes/CEconItem.js";

export class InventoryManager extends EventEmitter {
    private static instance: InventoryManager;
    private inventoryRepository: Repository<Inventory>;
    private updateInterval = 500000;
    private isUpdating = false;
    private isRunning = false;
    private lastUpdate: { [key: string]: number } = {};
    private readonly user: User;
    private steamTradeOfferManager: TradeOfferManager;

    private constructor(user: User, steamTradeOfferManager: TradeOfferManager) {
        super();
        this.inventoryRepository = AppDataSource.getRepository(Inventory);
        this.user = user;
        this.steamTradeOfferManager = steamTradeOfferManager;
        this.isRunning = true;
        this.startUpdateLoop().catch(error => {
            console.error('Error in loop:', error);
        });
    }

    public static getInstance(user: User, steamTradeOfferManager: TradeOfferManager): InventoryManager {
        if (!this.instance) {
            this.instance = new InventoryManager(user, steamTradeOfferManager);
        }
        return this.instance;
    }

    private async startUpdateLoop() {
        this.isRunning = true;

        while (this.isRunning) {
            try {
                if (this.user && !this.isUpdating) {
                    this.isUpdating = true;
                    await this.updateInventory(730, "2");
                    this.isUpdating = false;
                }
            } catch (error) {
                console.error("Erro ao atualizar inventário:", error);
                this.isUpdating = false;
            }
            await sleepAsync(this.updateInterval);
        }
    }

    async updateInventory(appid: number, contextid: string): Promise<void> {
        const now = Date.now();
        const cacheKey = `${appid}_${contextid}`;

        if (this.lastUpdate[cacheKey] && now - this.lastUpdate[cacheKey] < this.updateInterval) {
            return;
        }

        try {
            const items = await this.fetchInventoryFromSteam(appid, parseInt(contextid));
            await this.saveInventoryToDb(items);
            this.lastUpdate[cacheKey] = now;
            this.emit("inventoryUpdated", appid, contextid);
        } catch (error) {
            if (error.message.includes("Too Many Requests")) {
                await sleepAsync(5000);
            }
            throw error;
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

    private async saveInventoryToDb(items: CEconItem[]): Promise<void> {
        const currentItems = await this.inventoryRepository.find({
            where: {
                user: { id: this.user.id },
                appid: 730,
                contextid: "2"
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
                console.error('Erro ao salvar item:', error);
            }
        }

        if (currentAssetIds.size > 0) {
            try {
                await this.inventoryRepository.delete({
                    assetid: In(Array.from(currentAssetIds)),
                    user: { id: this.user.id },
                    appid: 730,
                    contextid: "2"
                });
            } catch (error) {
                console.error('Erro ao remover itens antigos:', error);
            }
        }
    }

    public async getInventory(appid: number, contextid: string): Promise<CEconItem[]> {
        const items = await this.inventoryRepository.find({
            where: {
                appid,
                contextid,
                user: { id: this.user.id }
            },
            order: {
                pos: "ASC"
            }
        });

        return items.map(item => item.item_data);
    }
}

