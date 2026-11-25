import mysql, { type RowDataPacket } from "mysql2/promise";
import { afterAll, describe, expect, it } from "vitest";
import {
  type DatabaseConfig,
  listMigrationFiles,
  migrateDatabase,
  parseMigrationVersion,
  ResetRefusedError,
} from "./migrations.js";

// A database of its own, so these tests never touch fulgora or fulgora_test.
const TEST_DATABASE = "fulgora_migration_test";

const config: DatabaseConfig = {
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER ?? "",
  password: process.env.DB_PASSWORD ?? "",
  database: TEST_DATABASE,
};

const silent = () => {};

async function readColumnNames(table: string): Promise<string[]> {
  const connection = await mysql.createConnection({
    ...config,
    database: TEST_DATABASE,
  });
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?",
      [TEST_DATABASE, table],
    );
    return rows.map((row) => String(row.COLUMN_NAME));
  } finally {
    await connection.end();
  }
}

describe("parseMigrationVersion", () => {
  it("reads the number at the start of the file name", () => {
    expect(parseMigrationVersion("001_initial_schema.sql")).toBe(1);
    expect(parseMigrationVersion("042_anything.sql")).toBe(42);
  });

  it("ignores files that are not migrations", () => {
    expect(parseMigrationVersion("README.md")).toBeNull();
    expect(parseMigrationVersion("notes.sql")).toBeNull();
    expect(parseMigrationVersion("1_short.sql")).toBeNull();
  });
});

describe("listMigrationFiles", () => {
  it("finds the four migrations of the project, in order", () => {
    expect(listMigrationFiles().map((file) => file.version)).toEqual([
      1, 2, 3, 4,
    ]);
  });
});

describe("migrateDatabase", () => {
  afterAll(async () => {
    const connection = await mysql.createConnection({
      ...config,
      database: "",
    });
    try {
      await connection.query(`DROP DATABASE IF EXISTS \`${TEST_DATABASE}\``);
    } finally {
      await connection.end();
    }
  });

  it("refuses a reset in production without touching the database", async () => {
    await expect(
      migrateDatabase(config, { reset: true, nodeEnv: "production" }),
    ).rejects.toBeInstanceOf(ResetRefusedError);
  });

  it("applies the four migrations on an empty database", async () => {
    const applied = await migrateDatabase(config, {
      reset: true,
      nodeEnv: "test",
      log: silent,
    });

    expect(applied).toEqual([1, 2, 3, 4]);
    expect(await readColumnNames("appointment")).toContain("cancelled_at");
    expect(await readColumnNames("user")).toEqual(
      expect.arrayContaining(["terms_accepted_at", "timezone"]),
    );
    expect(await readColumnNames("workout_session")).toEqual(
      expect.arrayContaining(["auto_closed", "declared_afterwards"]),
    );
  });

  it("does nothing when run again", async () => {
    const applied = await migrateDatabase(config, { log: silent });

    expect(applied).toEqual([]);
  });
});
