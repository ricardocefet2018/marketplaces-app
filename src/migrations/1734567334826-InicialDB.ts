import { MigrationInterface, QueryRunner } from "typeorm";

export class InicialDB1734567334826 implements MigrationInterface {
  name = "InicialDB1734567334826";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "settings" ("id" integer PRIMARY KEY NOT NULL DEFAULT (1), "startWithWindow" boolean NOT NULL DEFAULT (0), "notification" boolean NOT NULL DEFAULT (1))`
    );
    await queryRunner.query(
      `CREATE TABLE "shadowpay" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "apiKey" text NOT NULL DEFAULT (''), "state" boolean NOT NULL DEFAULT (0), "sentTrades" text NOT NULL DEFAULT (''), "createDate" datetime NOT NULL DEFAULT (datetime('now')), "updateDate" datetime NOT NULL DEFAULT (datetime('now')), "userId" integer NOT NULL, CONSTRAINT "REL_259c7163ab9930e567ab70670f" UNIQUE ("userId"))`
    );
    await queryRunner.query(
      `CREATE TABLE "market_csgo" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "apiKey" text NOT NULL DEFAULT (''), "state" boolean NOT NULL DEFAULT (0), "sentTrades" text NOT NULL DEFAULT (''), "createDate" datetime NOT NULL DEFAULT (datetime('now')), "updateDate" datetime NOT NULL DEFAULT (datetime('now')), "userId" integer NOT NULL, CONSTRAINT "REL_fdef318206355095ff8d593a20" UNIQUE ("userId"))`
    );
    await queryRunner.query(
      `CREATE TABLE "cs_float" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "apiKey" text NOT NULL DEFAULT (''), "state" boolean NOT NULL DEFAULT (0), "sentTrades" text NOT NULL DEFAULT (''), "createDate" datetime NOT NULL DEFAULT (datetime('now')), "updateDate" datetime NOT NULL DEFAULT (datetime('now')), "userId" integer NOT NULL, CONSTRAINT "REL_b60424db43e7cd158385036d6a" UNIQUE ("userId"))`
    );
    await queryRunner.query(
      `CREATE TABLE "waxpeer" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "apiKey" text NOT NULL DEFAULT (''), "state" boolean NOT NULL DEFAULT (0), "sentTrades" text NOT NULL DEFAULT (''), "createDate" datetime NOT NULL DEFAULT (datetime('now')), "updateDate" datetime NOT NULL DEFAULT (datetime('now')), "userId" integer NOT NULL, CONSTRAINT "REL_ecc653e950764d3d2192a1cf84" UNIQUE ("userId"))`
    );
    await queryRunner.query(
      `CREATE TABLE "user" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "username" text NOT NULL, "refreshToken" text NOT NULL, "proxy" text, "createDate" datetime NOT NULL DEFAULT (datetime('now')), "updateDate" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE ("username"))`
    );
    await queryRunner.query(
      `CREATE TABLE "user_settings" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "acceptGifts" boolean NOT NULL DEFAULT (1), "pendingTradesFilePath" text NOT NULL DEFAULT (''), "createDate" datetime NOT NULL DEFAULT (datetime('now')), "updateDate" datetime NOT NULL DEFAULT (datetime('now')), "userId" integer NOT NULL, CONSTRAINT "REL_986a2b6d3c05eb4091bb8066f7" UNIQUE ("userId"))`
    );
    await queryRunner.query(
      `CREATE TABLE "temporary_shadowpay" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "apiKey" text NOT NULL DEFAULT (''), "state" boolean NOT NULL DEFAULT (0), "sentTrades" text NOT NULL DEFAULT (''), "createDate" datetime NOT NULL DEFAULT (datetime('now')), "updateDate" datetime NOT NULL DEFAULT (datetime('now')), "userId" integer NOT NULL, CONSTRAINT "REL_259c7163ab9930e567ab70670f" UNIQUE ("userId"), CONSTRAINT "FK_259c7163ab9930e567ab70670ff" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`
    );
    await queryRunner.query(
      `INSERT INTO "temporary_shadowpay"("id", "apiKey", "state", "sentTrades", "createDate", "updateDate", "userId") SELECT "id", "apiKey", "state", "sentTrades", "createDate", "updateDate", "userId" FROM "shadowpay"`
    );
    await queryRunner.query(`DROP TABLE "shadowpay"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_shadowpay" RENAME TO "shadowpay"`
    );
    await queryRunner.query(
      `CREATE TABLE "temporary_market_csgo" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "apiKey" text NOT NULL DEFAULT (''), "state" boolean NOT NULL DEFAULT (0), "sentTrades" text NOT NULL DEFAULT (''), "createDate" datetime NOT NULL DEFAULT (datetime('now')), "updateDate" datetime NOT NULL DEFAULT (datetime('now')), "userId" integer NOT NULL, CONSTRAINT "REL_fdef318206355095ff8d593a20" UNIQUE ("userId"), CONSTRAINT "FK_fdef318206355095ff8d593a20f" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`
    );
    await queryRunner.query(
      `INSERT INTO "temporary_market_csgo"("id", "apiKey", "state", "sentTrades", "createDate", "updateDate", "userId") SELECT "id", "apiKey", "state", "sentTrades", "createDate", "updateDate", "userId" FROM "market_csgo"`
    );
    await queryRunner.query(`DROP TABLE "market_csgo"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_market_csgo" RENAME TO "market_csgo"`
    );
    await queryRunner.query(
      `CREATE TABLE "temporary_cs_float" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "apiKey" text NOT NULL DEFAULT (''), "state" boolean NOT NULL DEFAULT (0), "sentTrades" text NOT NULL DEFAULT (''), "createDate" datetime NOT NULL DEFAULT (datetime('now')), "updateDate" datetime NOT NULL DEFAULT (datetime('now')), "userId" integer NOT NULL, CONSTRAINT "REL_b60424db43e7cd158385036d6a" UNIQUE ("userId"), CONSTRAINT "FK_b60424db43e7cd158385036d6ab" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`
    );
    await queryRunner.query(
      `INSERT INTO "temporary_cs_float"("id", "apiKey", "state", "sentTrades", "createDate", "updateDate", "userId") SELECT "id", "apiKey", "state", "sentTrades", "createDate", "updateDate", "userId" FROM "cs_float"`
    );
    await queryRunner.query(`DROP TABLE "cs_float"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_cs_float" RENAME TO "cs_float"`
    );
    await queryRunner.query(
      `CREATE TABLE "temporary_waxpeer" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "apiKey" text NOT NULL DEFAULT (''), "state" boolean NOT NULL DEFAULT (0), "sentTrades" text NOT NULL DEFAULT (''), "createDate" datetime NOT NULL DEFAULT (datetime('now')), "updateDate" datetime NOT NULL DEFAULT (datetime('now')), "userId" integer NOT NULL, CONSTRAINT "REL_ecc653e950764d3d2192a1cf84" UNIQUE ("userId"), CONSTRAINT "FK_ecc653e950764d3d2192a1cf848" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`
    );
    await queryRunner.query(
      `INSERT INTO "temporary_waxpeer"("id", "apiKey", "state", "sentTrades", "createDate", "updateDate", "userId") SELECT "id", "apiKey", "state", "sentTrades", "createDate", "updateDate", "userId" FROM "waxpeer"`
    );
    await queryRunner.query(`DROP TABLE "waxpeer"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_waxpeer" RENAME TO "waxpeer"`
    );
    await queryRunner.query(
      `CREATE TABLE "temporary_user_settings" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "acceptGifts" boolean NOT NULL DEFAULT (1), "pendingTradesFilePath" text NOT NULL DEFAULT (''), "createDate" datetime NOT NULL DEFAULT (datetime('now')), "updateDate" datetime NOT NULL DEFAULT (datetime('now')), "userId" integer NOT NULL, CONSTRAINT "REL_986a2b6d3c05eb4091bb8066f7" UNIQUE ("userId"), CONSTRAINT "FK_986a2b6d3c05eb4091bb8066f78" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`
    );
    await queryRunner.query(
      `INSERT INTO "temporary_user_settings"("id", "acceptGifts", "pendingTradesFilePath", "createDate", "updateDate", "userId") SELECT "id", "acceptGifts", "pendingTradesFilePath", "createDate", "updateDate", "userId" FROM "user_settings"`
    );
    await queryRunner.query(`DROP TABLE "user_settings"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_user_settings" RENAME TO "user_settings"`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_settings" RENAME TO "temporary_user_settings"`
    );
    await queryRunner.query(
      `CREATE TABLE "user_settings" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "acceptGifts" boolean NOT NULL DEFAULT (1), "pendingTradesFilePath" text NOT NULL DEFAULT (''), "createDate" datetime NOT NULL DEFAULT (datetime('now')), "updateDate" datetime NOT NULL DEFAULT (datetime('now')), "userId" integer NOT NULL, CONSTRAINT "REL_986a2b6d3c05eb4091bb8066f7" UNIQUE ("userId"))`
    );
    await queryRunner.query(
      `INSERT INTO "user_settings"("id", "acceptGifts", "pendingTradesFilePath", "createDate", "updateDate", "userId") SELECT "id", "acceptGifts", "pendingTradesFilePath", "createDate", "updateDate", "userId" FROM "temporary_user_settings"`
    );
    await queryRunner.query(`DROP TABLE "temporary_user_settings"`);
    await queryRunner.query(
      `ALTER TABLE "waxpeer" RENAME TO "temporary_waxpeer"`
    );
    await queryRunner.query(
      `CREATE TABLE "waxpeer" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "apiKey" text NOT NULL DEFAULT (''), "state" boolean NOT NULL DEFAULT (0), "sentTrades" text NOT NULL DEFAULT (''), "createDate" datetime NOT NULL DEFAULT (datetime('now')), "updateDate" datetime NOT NULL DEFAULT (datetime('now')), "userId" integer NOT NULL, CONSTRAINT "REL_ecc653e950764d3d2192a1cf84" UNIQUE ("userId"))`
    );
    await queryRunner.query(
      `INSERT INTO "waxpeer"("id", "apiKey", "state", "sentTrades", "createDate", "updateDate", "userId") SELECT "id", "apiKey", "state", "sentTrades", "createDate", "updateDate", "userId" FROM "temporary_waxpeer"`
    );
    await queryRunner.query(`DROP TABLE "temporary_waxpeer"`);
    await queryRunner.query(
      `ALTER TABLE "cs_float" RENAME TO "temporary_cs_float"`
    );
    await queryRunner.query(
      `CREATE TABLE "cs_float" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "apiKey" text NOT NULL DEFAULT (''), "state" boolean NOT NULL DEFAULT (0), "sentTrades" text NOT NULL DEFAULT (''), "createDate" datetime NOT NULL DEFAULT (datetime('now')), "updateDate" datetime NOT NULL DEFAULT (datetime('now')), "userId" integer NOT NULL, CONSTRAINT "REL_b60424db43e7cd158385036d6a" UNIQUE ("userId"))`
    );
    await queryRunner.query(
      `INSERT INTO "cs_float"("id", "apiKey", "state", "sentTrades", "createDate", "updateDate", "userId") SELECT "id", "apiKey", "state", "sentTrades", "createDate", "updateDate", "userId" FROM "temporary_cs_float"`
    );
    await queryRunner.query(`DROP TABLE "temporary_cs_float"`);
    await queryRunner.query(
      `ALTER TABLE "market_csgo" RENAME TO "temporary_market_csgo"`
    );
    await queryRunner.query(
      `CREATE TABLE "market_csgo" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "apiKey" text NOT NULL DEFAULT (''), "state" boolean NOT NULL DEFAULT (0), "sentTrades" text NOT NULL DEFAULT (''), "createDate" datetime NOT NULL DEFAULT (datetime('now')), "updateDate" datetime NOT NULL DEFAULT (datetime('now')), "userId" integer NOT NULL, CONSTRAINT "REL_fdef318206355095ff8d593a20" UNIQUE ("userId"))`
    );
    await queryRunner.query(
      `INSERT INTO "market_csgo"("id", "apiKey", "state", "sentTrades", "createDate", "updateDate", "userId") SELECT "id", "apiKey", "state", "sentTrades", "createDate", "updateDate", "userId" FROM "temporary_market_csgo"`
    );
    await queryRunner.query(`DROP TABLE "temporary_market_csgo"`);
    await queryRunner.query(
      `ALTER TABLE "shadowpay" RENAME TO "temporary_shadowpay"`
    );
    await queryRunner.query(
      `CREATE TABLE "shadowpay" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "apiKey" text NOT NULL DEFAULT (''), "state" boolean NOT NULL DEFAULT (0), "sentTrades" text NOT NULL DEFAULT (''), "createDate" datetime NOT NULL DEFAULT (datetime('now')), "updateDate" datetime NOT NULL DEFAULT (datetime('now')), "userId" integer NOT NULL, CONSTRAINT "REL_259c7163ab9930e567ab70670f" UNIQUE ("userId"))`
    );
    await queryRunner.query(
      `INSERT INTO "shadowpay"("id", "apiKey", "state", "sentTrades", "createDate", "updateDate", "userId") SELECT "id", "apiKey", "state", "sentTrades", "createDate", "updateDate", "userId" FROM "temporary_shadowpay"`
    );
    await queryRunner.query(`DROP TABLE "temporary_shadowpay"`);
    await queryRunner.query(`DROP TABLE "user_settings"`);
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP TABLE "waxpeer"`);
    await queryRunner.query(`DROP TABLE "cs_float"`);
    await queryRunner.query(`DROP TABLE "market_csgo"`);
    await queryRunner.query(`DROP TABLE "shadowpay"`);
    await queryRunner.query(`DROP TABLE "settings"`);
  }
}
