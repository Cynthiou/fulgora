// Applies the missing migrations to the database named in .env.
//   npm run db:migrate          -> only what is missing, never erases anything
//   npm run db:reset            -> drops the database first (refused in production)
import "dotenv/config";
import { readDatabaseConfig } from "../src/database/config.js";
import {
  migrateDatabase,
  ResetRefusedError,
} from "../src/database/migrations.js";

async function main() {
  const reset = process.argv.includes("--reset");
  await migrateDatabase(readDatabaseConfig(), { reset });
}

main().catch((error: unknown) => {
  if (error instanceof ResetRefusedError) {
    console.error(error.message);
  } else {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Migration failed:", message);
  }
  process.exitCode = 1;
});
