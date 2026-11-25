import { afterAll, beforeAll, describe, expect, it } from "vitest";
import client, { type Result, type Rows } from "../../database/client.js";
import { ensureCatalog } from "../../test-helpers/catalog.js";
import {
  createTestUser,
  deleteTestUsers,
  type TestUser,
} from "../../test-helpers/fixtures.js";
import { readAvailableExerciseIds } from "./exerciseRepository.js";

const PREFIX = "test_avail_";

let lea: TestUser;
let someoneElse: TestUser;
let catalogId: number;
let mineId: number;
let archivedId: number;
let othersId: number;

async function createPersonalExercise(
  owner: TestUser,
  name: string,
  isArchived: boolean,
) {
  const [result] = await client.execute<Result>(
    "INSERT INTO exercise (owner_user_id, slug, name, difficulty, is_archived) VALUES (?, ?, ?, 'beginner', ?)",
    [owner.id, `${owner.username}-${name}`, name, isArchived],
  );
  return result.insertId;
}

beforeAll(async () => {
  await ensureCatalog();
  lea = await createTestUser(PREFIX);
  someoneElse = await createTestUser(PREFIX);
  const [rows] = await client.query<Rows[]>(
    "SELECT id FROM exercise WHERE owner_user_id IS NULL ORDER BY id LIMIT 1",
  );
  catalogId = Number(rows[0]?.id);
  mineId = await createPersonalExercise(lea, "mine", false);
  archivedId = await createPersonalExercise(lea, "archived", true);
  othersId = await createPersonalExercise(someoneElse, "theirs", false);
}, 120_000);

afterAll(async () => {
  await deleteTestUsers(PREFIX);
  await client.end();
});

describe("readAvailableExerciseIds", () => {
  it("keeps the catalog and the user's own exercises only", async () => {
    const ids = await readAvailableExerciseIds(lea.id, [
      catalogId,
      mineId,
      archivedId,
      othersId,
      999_999_999,
    ]);

    expect(ids.sort((a, b) => a - b)).toEqual(
      [catalogId, mineId].sort((a, b) => a - b),
    );
  });

  it("asks nothing for an empty list", async () => {
    expect(await readAvailableExerciseIds(lea.id, [])).toEqual([]);
  });
});
