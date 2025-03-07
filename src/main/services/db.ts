import "reflect-metadata";
import { getDBPath, infoLogger } from "../../shared/helpers";
import { DataSource } from "typeorm";
import {
  CSFloat,
  MarketCSGO,
  Settings,
  Shadowpay,
  User,
  UserSettings,
  Waxpeer,
} from "../entities/index.intities";

const entities = [
  CSFloat,
  MarketCSGO,
  Settings,
  Shadowpay,
  User,
  UserSettings,
  Waxpeer,
];

export const AppDataSource = new DataSource({
  type: "sqlite",
  database: getDBPath(),
  synchronize: true,
  logging: process.env.NODE_ENV === "development",
  entities,
  subscribers: [],
});

export class DB {
  private static instance: DB;
  private dataSource: DataSource;

  private constructor() {
    this.dataSource = AppDataSource;
  }

  static async start(): Promise<void> {
    if (this.instance?.dataSource.isInitialized) {
      return;
    }

    this.instance = new DB();

    await this.initializeDatabase();
  }

  private static async initializeDatabase(): Promise<void> {
    try {
      await this.instance.dataSource.initialize();

      if (process.env.NODE_ENV === "test") {
        await this.clearDatabase();
      }

      await this.setupDefaultSettings();
    } catch (error) {
      console.error("Error during database initialization:", error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }

  private static async clearDatabase(): Promise<void> {
    const { entityMetadatas } = this.instance.dataSource;
    for (const entity of entityMetadatas) {
      const repository = this.instance.dataSource.getRepository(entity.name);
      await repository.clear();
    }
    infoLogger("Database cleared!");
  }

  private static async setupDefaultSettings(): Promise<void> {
    const settingsRepository = this.instance.dataSource.getRepository(Settings);
    const existingSettings = await settingsRepository.find();

    if (existingSettings.length === 0) {
      const defaultSettings = settingsRepository.create();
      await settingsRepository.save(defaultSettings);
    } else {
      console.log("Settings already exist in the database.");
    }
  }
}
