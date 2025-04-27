import { DataSource } from "typeorm";
import { getDBPath } from "../../../shared/helpers";
import entities from "../../entities/entities.index";
import migrations from "../../migrations/migrations.index";

export default new DataSource({
  type: "sqlite",
  database: getDBPath(),
  synchronize: false,
  logging: process.env.NODE_ENV === "development",
  entities,
  subscribers: [],
  migrations,
});
