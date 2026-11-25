import { afterAll, afterEach, describe, expect, it } from "vitest";
import client, { type Queryable, type Result, type Rows } from "./client.js";
import { withTransaction } from "./withTransaction.js";

// These tests write real rows into fulgora_test (see test-setup.ts), in the
// category table: no foreign key, so it is easy to insert and clean.
const PREFIX = "test_tx_";

async function createCategory(code: string, db: Queryable = client) {
  const [result] = await db.execute<Result>(
    "INSERT INTO category (code, name) VALUES (?, ?)",
    [`${PREFIX}${code}`, code],
  );
  return result.insertId;
}

async function countTestCategories(): Promise<number> {
  const [rows] = await client.execute<Rows[]>(
    "SELECT COUNT(*) AS total FROM category WHERE code LIKE ?",
    [`${PREFIX}%`],
  );
  return Number(rows[0]?.total);
}

describe("withTransaction", () => {
  afterEach(async () => {
    await client.execute("DELETE FROM category WHERE code LIKE ?", [
      `${PREFIX}%`,
    ]);
  });

  afterAll(async () => {
    await client.end();
  });

  it("keeps every write when the work succeeds", async () => {
    const ids = await withTransaction(async (connection) => {
      const first = await createCategory("first", connection);
      const second = await createCategory("second", connection);
      return [first, second];
    });

    expect(ids).toHaveLength(2);
    expect(await countTestCategories()).toBe(2);
  });

  it("undoes every write when the work throws in the middle", async () => {
    await expect(
      withTransaction(async (connection) => {
        await createCategory("kept?", connection);
        throw new Error("something went wrong after the first write");
      }),
    ).rejects.toThrow("something went wrong");

    expect(await countTestCategories()).toBe(0);
  });

  it("undoes the first write when the second one is refused by MySQL", async () => {
    await expect(
      withTransaction(async (connection) => {
        await createCategory("twice", connection);
        await createCategory("twice", connection); // same code: unique key
      }),
    ).rejects.toMatchObject({ code: "ER_DUP_ENTRY" });

    expect(await countTestCategories()).toBe(0);
  });

  it("gives the connection back even after 20 failures", async () => {
    // The pool lends 10 connections at most: if one leaked per failure,
    // the 11th transaction would wait forever.
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await withTransaction(async () => {
        throw new Error("fail");
      }).catch(() => undefined);
    }

    const [rows] = await client.query<Rows[]>("SELECT 1 AS alive");

    expect(rows[0]?.alive).toBe(1);
  }, 5_000);
});
