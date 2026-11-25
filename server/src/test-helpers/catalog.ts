// The shared catalog (151 exercises) inside fulgora_test, for the tests that
// read it. Seeded once; test files run in parallel, so a file that finds the
// seed already running simply waits for it to finish.
import mysql, { type RowDataPacket } from "mysql2/promise";
import { readDatabaseConfig } from "../database/config.js";
import { readCatalogFile, seedCatalog } from "../database/seedCatalog.js";

const silent = () => {};

async function countExercisesInCatalog(): Promise<number> {
  const connection = await mysql.createConnection(readDatabaseConfig());
  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS total FROM exercise WHERE owner_user_id IS NULL",
    );
    return Number(rows[0]?.total ?? 0);
  } finally {
    await connection.end();
  }
}

// Returns the number of exercises in the shared catalog once it is in place.
export async function ensureCatalog(): Promise<number> {
  const catalog = readCatalogFile();
  const expected = catalog.exercises.length;

  const connection = await mysql.createConnection(readDatabaseConfig());
  try {
    await seedCatalog(connection, catalog, silent);
  } catch (error) {
    // Another test file is seeding right now: fall through and wait below.
    const code = (error as { code?: string }).code;
    if (code !== "ER_DUP_ENTRY") {
      throw error;
    }
  } finally {
    await connection.end();
  }

  const deadline = Date.now() + 60_000;
  while ((await countExercisesInCatalog()) < expected) {
    if (Date.now() > deadline) {
      throw new Error("The catalog did not finish seeding in time");
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return expected;
}
