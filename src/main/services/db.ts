import "reflect-metadata";
import { infoLogger } from "../../shared/helpers";
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
import * as dotenv from "dotenv";
import asar from "asar";
import fs from "fs";
import { app } from "electron"; // Certifique-se de que esta importação está correta e disponível

// Carrega as variáveis de ambiente
dotenv.config();

// Promisifica a execução de comandos
const execAsync = util.promisify(exec);

// Função para extrair migrações de app.asar
const extractMigrations = () => {
  const asarPath = path.join(__dirname, "app.asar");
  const extractPath = path.join(__dirname, "extracted");

  if (!fs.existsSync(asarPath)) {
    console.error("Arquivo app.asar não encontrado:", asarPath);
    process.exit(1);
  }

  if (!fs.existsSync(extractPath)) {
    fs.mkdirSync(extractPath);
  }

  asar.extractAll(asarPath, extractPath);
};

// Chama a função de extração quando necessário
if (process.env.NODE_ENV === "production") {
  console.log("Production mode detected, extracting migrations...");
  extractMigrations();
}

// Função para obter o caminho das migrações
const getMigrationsPath = () => {
  if (process.env.NODE_ENV === "production") {
    return path.join(app.getPath("userData"), "migrations");
  } else {
    return path.resolve(__dirname, "../../migrations");
  }
};

// Função para definir o caminho do banco de dados
const getDBPath = () => {
  const basePath =
    process.env.NODE_ENV === "production"
      ? path.join(app.getPath("userData"), "db")
      : path.resolve(__dirname, "../../../db");

  console.log(
    `==========getDBPath=========${process.env.NODE_ENV?.toUpperCase()}=`,
    basePath
  );

  return path.join(basePath, "db.sqlite");
};

// Função para definir o caminho da fonte de dados
const getDataSourcePath = () => {
  if (process.env.NODE_ENV === "production") {
    console.log("==========getDataSourcePath=========PRODUCAO=");
    return path.join(app.getAppPath(), "resources", "app.asar");
  } else {
    console.log("==========getDataSourcePath=========DEV=");
    return path.resolve(__dirname, "../../../src/main/services/db.ts");
  }
};

// Inicializa o caminho das migrações e configurações
const migrationsPath = getMigrationsPath();
const pathDB = getDBPath();
const entities = [
  CSFloat,
  MarketCSGO,
  Settings,
  Shadowpay,
  User,
  UserSettings,
  Waxpeer,
];

// Configura o DataSource do TypeORM
export const AppDataSource = new DataSource({
  type: "sqlite",
  database: pathDB,
  synchronize: false,
  logging: process.env.NODE_ENV === "development",
  entities: entities,
  migrations: [
    path.resolve(migrationsPath, "*.ts"), // Para desenvolvimento
    path.resolve(migrationsPath, "*.js"), // Para produção
  ],
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

  // Método estático para iniciar o banco de dados
  static async start() {
    if (this.instance && this.instance.dataSource.isInitialized) {
      console.log(
        "Database is already initialized, skipping reinitialization."
      );
      return;
    }

    const dbPath = getDBPath();
    this.instance = new DB(dbPath);

    if (process.env.NODE_ENV === "test") {
      console.log("Running in test mode, clearing database...");
      const entities = this.instance.dataSource.entityMetadatas;
      for (const entity of entities) {
        const repository = this.instance.dataSource.getRepository(entity.name);
        await repository.clear();
      }
      infoLogger("Database cleared!");
    }

    try {
      console.log("Initializing database...");
      await this.instance.dataSource.initialize();
      console.log("Database initialized successfully.");
    } catch (error: any) {
      console.error("Error initializing database:", error.message);
      console.error(error.stack);
      process.exit(1);
    }

    // Verifica e executa migrações se necessário
    try {
      console.log("Running migrations...");
      const dataSourcePath = getDataSourcePath();
      console.log("DataSource Path:", dataSourcePath);

      const hasMigrations = await this.instance.dataSource.showMigrations();
      if (!hasMigrations) {
        const command = `npx typeorm migration:run -d ${dataSourcePath}`;
        const { stdout, stderr } = await execAsync(command);
        if (stdout) console.log(stdout);
        if (stderr) console.error(stderr);
      } else {
        console.log("Migrations are already up to date.");
      }
    } catch (error: any) {
      console.error("Error running migrations:", error.message);
      console.error(error.stack);
      process.exit(1);
    }

    // Configura as configurações do banco
    try {
      console.log("Setting up initial database configurations...");
      const settings = await this.instance.dataSource
        .getRepository(Settings)
        .find();
      if (settings.length === 0) {
        const newSettings = new Settings();
        await this.instance.dataSource
          .getRepository(Settings)
          .save(newSettings);
        console.log("Default settings saved to database.");
      }
    } catch (error: any) {
      console.error("Error setting up initial settings:", error.message);
      console.error(error.stack);
      process.exit(1);
    }

    console.log("Database setup complete!");
  }
}
