// Fills the catalog tables with database/seed/catalog.json.
// Run "npm run db:migrate" first: the tables must be empty.
import "dotenv/config";
import mysql from "mysql2/promise";
import { readDatabaseConfig } from "../src/database/config.js";
import { readCatalogFile, seedCatalog } from "../src/database/seedCatalog.js";

async function main() {
  const connection = await mysql.createConnection(readDatabaseConfig());
  try {
    await seedCatalog(connection, readCatalogFile());
  } finally {
    await connection.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Seed failed:", message);
  process.exitCode = 1;
});
