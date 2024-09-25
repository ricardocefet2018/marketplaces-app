import { DataTypes, Model, Sequelize } from "sequelize";
import { getDBPath } from "../../shared/helpers";

export class User extends Model {
  declare id: number;
  declare username: string;
  declare refreshToken: string;
  declare proxy?: string;
}

export class DB {
  public sequelize: Sequelize;
  static instance: DB;

  constructor(dbPath: string) {
    this.sequelize = new Sequelize({
      dialect: "sqlite",
      storage: dbPath,
    });
  }

  static async start() {
    if (this.instance) return;
    const dbPath = await getDBPath();
    this.instance = new DB(dbPath);
    await this.instance.sequelize.authenticate();
    User.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        username: {
          type: DataTypes.STRING,
          unique: true,
          allowNull: false,
        },
        refreshToken: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        proxy: {
          type: DataTypes.STRING,
        },
      },
      {
        sequelize: this.instance.sequelize,
      }
    );
    this.instance.sequelize.sync();
    return;
  }
}
