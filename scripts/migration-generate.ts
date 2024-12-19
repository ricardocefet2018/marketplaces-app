import { execSync } from "child_process";
import path from "path";

const migrationName: string | undefined = process.argv[2];

if (!migrationName) {
  console.error("⚠️  Você precisa fornecer o nome da migration!");
  process.exit(1);
}

const command = `npx typeorm-ts-node-commonjs migration:generate ./src/migrations/${migrationName} -d ${path.resolve(
  __dirname,
  "../src/main/services/db.ts"
)}`;

try {
  console.log(`🚀 Gerando migration: ${migrationName}`);
  execSync(command, { stdio: "inherit" });
  console.log("✅ Migration gerada com sucesso!");
} catch (error: any) {
  console.error("❌ Erro ao gerar a migration:", error.message);
  process.exit(1);
}
