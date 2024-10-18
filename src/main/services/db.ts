import "reflect-metadata";
import { getDBPath } from "../../shared/helpers";
import { DataSource } from "typeorm";
import { WaxpeerSettings } from "../models/waxpeerSettings";
import { User } from "../models/user";
import { UserSettings } from "../models/userSettings";

export class DB {
  public dataSource: DataSource;
  static instance: DB;

  constructor(dbPath: string) {
    this.dataSource = new DataSource({
      type: "sqlite",
      database: dbPath,
      synchronize: true,
      logging: false,
      entities: [User, WaxpeerSettings, UserSettings],
      migrations: [],
      subscribers: [],
    });
  }

  static async start() {
    if (this.instance) return;
    const dbPath = await getDBPath();
    this.instance = new DB(dbPath);
    await this.instance.dataSource.initialize();
    return;
  }
}
