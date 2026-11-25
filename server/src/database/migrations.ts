// Applies the numbered SQL files of database/migrations/ to a database.
// The table schema_migration remembers which versions were applied, so running
// the migration twice never redoes anything. Used by bin/migrate.ts and tests.
import fs from "node:fs";
import path from "node:path";
import mysql, { type RowDataPacket } from "mysql2/promise";
import type { DatabaseConfig } from "./config.js";

export type { DatabaseConfig };

export const MIGRATIONS_DIR = path.join(
  import.meta.dirname,
  "../../database/migrations",
);

export type MigrationFile = {
  version: number;
  fileName: string;
};

export type MigrateOptions = {
  // Drop the database first, then rebuild it from scratch.
  reset?: boolean;
  // Defaults to process.env.NODE_ENV; a parameter so tests can simulate production.
  nodeEnv?: string;
  migrationsDir?: string;
  log?: (message: string) => void;
};

// Thrown when a reset is asked in production: the data must never be erased.
export class ResetRefusedError extends Error {
  constructor() {
    super("Reset refused: NODE_ENV is production, the database is kept.");
    this.name = "ResetRefusedError";
  }
}

// "003_program_draft_status.sql" -> 3. Any other file name -> null.
export function parseMigrationVersion(fileName: string): number | null {
  const match = /^(\d{3})_.+\.sql$/.exec(fileName);
  return match === null ? null : Number(match[1]);
}

// The migration files of a folder, sorted by version.
export function listMigrationFiles(
  migrationsDir = MIGRATIONS_DIR,
): MigrationFile[] {
  const files: MigrationFile[] = [];
  for (const fileName of fs.readdirSync(migrationsDir)) {
    const version = parseMigrationVersion(fileName);
    if (version !== null) {
      files.push({ version, fileName });
    }
  }
  return files.sort((a, b) => a.version - b.version);
}

// A database name cannot be passed as a "?" parameter, so it is checked
// before being placed between backticks.
function assertSafeDatabaseName(name: string) {
  if (!/^[A-Za-z0-9_]+$/.test(name)) {
    throw new Error(`Unsafe database name: "${name}"`);
  }
}

// Creates the database if needed, then applies every missing migration in
// order. Returns the versions applied by this run.
export async function migrateDatabase(
  config: DatabaseConfig,
  options: MigrateOptions = {},
): Promise<number[]> {
  const {
    reset = false,
    nodeEnv = process.env.NODE_ENV,
    migrationsDir = MIGRATIONS_DIR,
    log = console.info,
  } = options;

  if (reset && nodeEnv === "production") {
    throw new ResetRefusedError();
  }
  assertSafeDatabaseName(config.database);

  // No "database" option: it may not exist yet.
  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    multipleStatements: true, // a migration file holds several statements
  });

  try {
    if (reset) {
      await connection.query(`DROP DATABASE IF EXISTS \`${config.database}\``);
      log(`Database "${config.database}" dropped`);
    }

    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
    );
    await connection.query(`USE \`${config.database}\``);
    await connection.query(
      `CREATE TABLE IF NOT EXISTS schema_migration (
        version INT NOT NULL,
        applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (version)
      ) ENGINE=InnoDB`,
    );

    const [rows] = await connection.query<RowDataPacket[]>(
      "SELECT version FROM schema_migration",
    );
    const alreadyApplied = new Set(rows.map((row) => Number(row.version)));

    const appliedNow: number[] = [];
    for (const migration of listMigrationFiles(migrationsDir)) {
      if (alreadyApplied.has(migration.version)) {
        continue;
      }
      const sql = fs.readFileSync(
        path.join(migrationsDir, migration.fileName),
        "utf8",
      );
      await connection.query(sql);
      await connection.execute(
        "INSERT INTO schema_migration (version) VALUES (?)",
        [migration.version],
      );
      log(`Applied ${migration.fileName}`);
      appliedNow.push(migration.version);
    }

    if (appliedNow.length === 0) {
      log(`Database "${config.database}" is already up to date`);
    }
    return appliedNow;
  } finally {
    await connection.end();
  }
}
