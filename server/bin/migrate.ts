// Applies the missing migrations to the database named in .env.
//   npm run db:migrate          -> only what is missing, never erases anything
//   npm run db:reset            -> drops the database first (refused in production)
import "dotenv/config";
import {
  migrateDatabase,
  ResetRefusedError,
} from "../src/database/migrations.js";

// Credentials come from the environment only, never from the code.
function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value;
}

async function main() {
  const reset = process.argv.includes("--reset");

  await migrateDatabase(
    {
      host: requireEnv("DB_HOST"),
      port: Number(requireEnv("DB_PORT")),
      user: requireEnv("DB_USER"),
      password: requireEnv("DB_PASSWORD"),
      database: requireEnv("DB_NAME"),
    },
    { reset },
  );
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
