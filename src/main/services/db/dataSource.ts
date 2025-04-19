import { DataSource } from "typeorm";
import { getDBPath } from "../../../shared/helpers";

export default new DataSource({
  type: "sqlite",
  database: getDBPath(),
  synchronize: false,
  logging: process.env.NODE_ENV === "development",
  entities: ["src/main/entities/*.entity{.ts,.js}"],
  subscribers: [],
  migrations: ["src/main/migration/*{.ts,.js}"],
});
