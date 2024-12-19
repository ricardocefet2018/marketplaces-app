import "reflect-metadata";
import { getDBPath, infoLogger } from "../../shared/helpers";
import { DataSource } from "typeorm";
import { Settings } from "../entities/settings";
import { exec } from "child_process";
import path from "path";
import util from "util";
import { CSFloat } from "../entities/csfloat.entity";
import { MarketCSGO } from "../entities/marketcsgo.entity";
import { Shadowpay } from "../entities/shadowpay.entity";
import { User } from "../entities/user.entity";
import { UserSettings } from "../entities/userSettings";
import { Waxpeer } from "../entities/waxpeer.entity";

const execAsync = util.promisify(exec);
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
  database: path.resolve(__dirname, "../../../db/db.sqlite"),
  synchronize: false,
  logging: process.env["NODE_ENV"] === "development", //process.env["NODE_ENV"] === "development",
  entities: entities,
  migrations: [path.resolve(__dirname, "../../migrations/*.ts")],
  subscribers: [],
});

export class DB {
  public dataSource: DataSource;
  static instance: DB;

  constructor(dbPath: string) {
    this.dataSource = AppDataSource.setOptions({
      database: dbPath,
    });
  }

  static async start() {
    if (this.instance) return;

    const dbPath = await getDBPath();
    this.instance = new DB(dbPath);

    if (process.env["NODE_ENV"] === "test") {
      console.log("Running in test mode, clearing database...");
      const entities = this.instance.dataSource.entityMetadatas;
      for (const entity of entities) {
        const repository = this.instance.dataSource.getRepository(entity.name);
        await repository.clear();
      }
      infoLogger("Database cleared!");
    }

    console.log("Initializing database...");
    await this.instance.dataSource.initialize();

    console.log("Running migrations...");
    try {
      const command = `npx typeorm-ts-node-commonjs migration:run -d ./src/main/services/db.ts`;
      const { stdout, stderr } = await execAsync(command);
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
    } catch (error: any) {
      console.error("Error running migrations:", error.message);
      console.error(error.stack);
      process.exit(1);
    }

    console.log("Starting database...");
    const settings = await this.instance.dataSource
      .getRepository(Settings)
      .find();
    if (settings.length === 0) {
      const newSettings = new Settings();
      await this.instance.dataSource.getRepository(Settings).save(newSettings);
    }
    console.log("Database setup complete!");
  }
}
