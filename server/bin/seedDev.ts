// Creates the "demo" account and its first session in the development
// database. The password comes from DEMO_PASSWORD in .env.
// Refused when NODE_ENV=production.
import "dotenv/config";
import mysql from "mysql2/promise";
import { readDatabaseConfig } from "../src/database/config.js";
import { SeedRefusedError, seedDemo } from "../src/database/seedDemo.js";
import { requireEnv } from "../src/utils/env.js";

async function main() {
  const password = requireEnv("DEMO_PASSWORD");
  const connection = await mysql.createConnection(readDatabaseConfig());
  try {
    await seedDemo(connection, { password });
  } finally {
    await connection.end();
  }
}

main().catch((error: unknown) => {
  if (error instanceof SeedRefusedError) {
    console.error(error.message);
  } else {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Demo seed failed:", message);
  }
  process.exitCode = 1;
});
