import mysql, { type Connection, type RowDataPacket } from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readDatabaseConfig } from "./config.js";
import { migrateDatabase } from "./migrations.js";
import { readCatalogFile, seedCatalog } from "./seedCatalog.js";
import { DEMO_USERNAME, SeedRefusedError, seedDemo } from "./seedDemo.js";

// A fresh database of its own: migrated from nothing, then seeded, then
// dropped. This is exactly "seed on an empty database" from the DoD.
const TEST_DATABASE = "fulgora_seed_test";
const config = { ...readDatabaseConfig(), database: TEST_DATABASE };
const silent = () => {};

let connection: Connection;

async function count(table: string): Promise<number> {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM \`${table}\``,
  );
  return Number(rows[0]?.total);
}

beforeAll(async () => {
  await migrateDatabase(config, { reset: true, nodeEnv: "test", log: silent });
  connection = await mysql.createConnection(config);
}, 60_000);

afterAll(async () => {
  await connection.query(`DROP DATABASE IF EXISTS \`${TEST_DATABASE}\``);
  await connection.end();
});

describe("seedCatalog", () => {
  it("inserts the whole catalog on an empty database", async () => {
    const inserted = await seedCatalog(connection, readCatalogFile(), silent);

    expect(inserted).toBe(151);
    expect(await count("exercise")).toBe(151);
    expect(await count("equipment")).toBe(6);
  }, 120_000);

  it("gives the bodyweight exercises the weight measure, for a load", async () => {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT m.code
         FROM exercise e
         JOIN exercise_measure em ON em.exercise_id = e.id
         JOIN measure m ON m.id = em.measure_id
        WHERE e.slug = ?
        ORDER BY m.code`,
      ["pull-ups"],
    );

    expect(rows.map((row) => row.code)).toEqual(["reps", "weight"]);
  });

  it("does nothing when run again", async () => {
    expect(await seedCatalog(connection, readCatalogFile(), silent)).toBe(0);
    expect(await count("exercise")).toBe(151);
  });
});

describe("seedDemo", () => {
  it("refuses to run in production", async () => {
    await expect(
      seedDemo(connection, { password: "demo-1234", nodeEnv: "production" }),
    ).rejects.toBeInstanceOf(SeedRefusedError);
    expect(await count("user")).toBe(0);
  });

  it("creates the demo account with one free session planned today", async () => {
    const result = await seedDemo(connection, {
      password: "demo-1234",
      nodeEnv: "test",
      today: "2026-11-26",
      log: silent,
    });

    expect(result).toBe("created");
    expect(await count("user")).toBe(1);
    expect(await count("session_template")).toBe(1);
    expect(await count("session_version")).toBe(1);
    expect(await count("template_block")).toBe(1);
    expect(await count("template_block_exercise")).toBe(6);
    expect(await count("planned_set")).toBe(16);
    expect(await count("appointment")).toBe(1);

    const [users] = await connection.execute<RowDataPacket[]>(
      "SELECT username, password_hash, terms_accepted_at FROM `user` WHERE username = ?",
      [DEMO_USERNAME],
    );
    expect(String(users[0]?.password_hash).startsWith("$argon2id$")).toBe(true);
    expect(users[0]?.terms_accepted_at).not.toBeNull();

    const [appointments] = await connection.query<RowDataPacket[]>(
      "SELECT DATE_FORMAT(planned_date, '%Y-%m-%d') AS planned_date, program_id, status FROM appointment",
    );
    expect(appointments[0]).toMatchObject({
      planned_date: "2026-11-26",
      program_id: null,
      status: "planned",
    });
  }, 30_000);

  it("does nothing when the demo account already exists", async () => {
    const result = await seedDemo(connection, {
      password: "demo-1234",
      nodeEnv: "test",
      log: silent,
    });

    expect(result).toBe("skipped");
    expect(await count("user")).toBe(1);
    expect(await count("appointment")).toBe(1);
  });
});
