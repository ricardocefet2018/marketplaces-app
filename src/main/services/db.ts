import "reflect-metadata";
import { getDBPath, infoLogger } from "../../shared/helpers";
import { DataSource } from "typeorm";
import { app } from "electron";
import path from "path";
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
      console.log(
        "Database is already initialized, skipping reinitialization."
      );
      return;
    }

    this.instance = new DB();
    console.log("==============================");
    console.log("Entities:", entities);
    console.log("==============================");

    await this.initializeDatabase();
  }

  private static async initializeDatabase(): Promise<void> {
    try {
      await this.instance.dataSource.initialize();
      console.log("Database initialized.");

      if (process.env.NODE_ENV === "test") {
        await this.clearDatabase();
      }

      await this.setupDefaultSettings();
    } catch (error) {
      console.error("Error during database initialization:", error.message);
      console.error(error.stack);
      process.exit(1);
    }

    console.log("Database setup complete!");
  }

  private static async clearDatabase(): Promise<void> {
    console.log("Running in test mode, clearing database...");
    const { entityMetadatas } = this.instance.dataSource;
    for (const entity of entityMetadatas) {
      const repository = this.instance.dataSource.getRepository(entity.name);
      await repository.clear();
    }
    infoLogger("Database cleared!");
  }

  private static async setupDefaultSettings(): Promise<void> {
    console.log("Setting up initial database configurations...");

    const settingsRepository = this.instance.dataSource.getRepository(Settings);
    const existingSettings = await settingsRepository.find();

    if (existingSettings.length === 0) {
      const defaultSettings = settingsRepository.create();
      await settingsRepository.save(defaultSettings);
      console.log("Default settings saved to database.");
    } else {
      console.log("Settings already exist in the database.");
    }
  }
}
