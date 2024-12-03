import "reflect-metadata";
import { getDBPath, infoLogger } from "../../shared/helpers";
import { DataSource } from "typeorm";
import { WaxpeerSettings } from "../models/waxpeerSettings";
import { User } from "../models/user";
import { UserSettings } from "../models/userSettings";
import { Settings } from "../models/settings";

export class DB {
  public dataSource: DataSource;
  static instance: DB;

  constructor(dbPath: string) {
    this.dataSource = new DataSource({
      type: "sqlite",
      database: dbPath,
      synchronize: process.env["NODE_ENV"] === "development",
      logging: false, //process.env["NODE_ENV"] === "development",
      entities: [User, WaxpeerSettings, UserSettings, Settings],
      migrations: [],
      subscribers: [],
    });
  }

  static async start() {
    if (this.instance) return;
    const dbPath = await getDBPath();
    this.instance = new DB(dbPath);
    if (process.env["NODE_ENV"] === "test") {
      const entities = this.instance.dataSource.entityMetadatas;
      for (const entity of entities) {
        const repository = this.instance.dataSource.getRepository(entity.name);
        await repository.clear();
      }
      infoLogger("DB cleared!");
    }
    await this.instance.dataSource.initialize();
    const settings = await Settings.find();
    if (settings.length == 0) await new Settings().save();
    return;
  }
}
