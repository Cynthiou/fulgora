import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../../../src/app.js";
import client, { type Result } from "../../../src/database/client.js";
import { ensureCatalog } from "../../helpers/catalog.js";
import {
  createTestUser,
  deleteTestUsers,
  type TestUser,
} from "../../helpers/fixtures.js";

const PREFIX = "test_exo_";

let lea: TestUser;
let someoneElse: TestUser;
let catalogSize: number;

type Item = { id: number; name: string; is_personal: boolean };

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
  catalogSize = await ensureCatalog();
  lea = await createTestUser(PREFIX);
  someoneElse = await createTestUser(PREFIX);
  // Sorted by name: "AAA ..." come first, so they land on the first page.
  await createPersonalExercise(lea, "AAA mon exercice", false);
  await createPersonalExercise(lea, "AAA archivé", true);
  await createPersonalExercise(someoneElse, "AAA exercice d'un autre", false);
}, 120_000);

afterAll(async () => {
  await deleteTestUsers(PREFIX);
  await client.end();
});

function browse(query: string, cookie: string) {
  return request(app).get(`/api/exercises${query}`).set("Cookie", cookie);
}

describe("GET /api/exercises", () => {
  it("lists 20 exercises sorted by name, with the total and the next offset", async () => {
    const response = await browse("", lea.cookie);

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(20);
    expect(response.body.total).toBe(catalogSize + 1);
    expect(response.body.next_offset).toBe(20);

    const names = response.body.items.map((item: Item) => item.name);
    const sorted = [...names].sort((a, b) =>
      a.localeCompare(b, "fr", { sensitivity: "base" }),
    );
    expect(names).toEqual(sorted);
  });

  it("gives each card its group, its difficulty, its equipment and its images", async () => {
    const response = await browse("", lea.cookie);
    const fromCatalog = response.body.items.find(
      (item: Item) => !item.is_personal,
    );

    expect(fromCatalog).toMatchObject({
      id: expect.any(Number),
      slug: expect.any(String),
      difficulty: expect.stringMatching(/^(beginner|intermediate|advanced)$/),
      category_name: expect.any(String),
      equipment_names: expect.any(String),
      image_female_url: expect.any(String),
      image_male_url: expect.any(String),
      measure_codes: expect.arrayContaining([expect.any(String)]),
      is_personal: false,
    });
  });

  it("shows the user's own exercise, never an archived one nor another user's", async () => {
    const response = await browse("", lea.cookie);
    const names = response.body.items.map((item: Item) => item.name);

    expect(names).toContain("AAA mon exercice");
    expect(
      response.body.items.find((item: Item) => item.name === "AAA mon exercice")
        .is_personal,
    ).toBe(true);
    expect(names).not.toContain("AAA archivé");
    expect(names).not.toContain("AAA exercice d'un autre");
  });

  it("walks the whole catalog page by page until next_offset is null", async () => {
    const seen: number[] = [];
    let offset: number | null = 0;
    let calls = 0;

    while (offset !== null) {
      const response = await browse(`?offset=${offset}`, lea.cookie);
      expect(response.status).toBe(200);
      seen.push(...response.body.items.map((item: Item) => item.id));
      offset = response.body.next_offset;
      calls += 1;
    }

    const total = catalogSize + 1;
    expect(calls).toBe(Math.ceil(total / 20));
    expect(seen).toHaveLength(total);
    expect(new Set(seen).size).toBe(total);
  });

  it("tells which exercises can be done side by side (RM-084)", async () => {
    const lunges = await browse(
      `?search=${encodeURIComponent("Fentes avec haltères")}`,
      lea.cookie,
    );
    const squat = await browse(
      `?search=${encodeURIComponent("Squat à la barre")}`,
      lea.cookie,
    );

    expect(lunges.body.items[0]).toMatchObject({
      name: "Fentes avec haltères",
      allows_per_side: true,
    });
    expect(squat.body.items[0]).toMatchObject({
      name: "Squat à la barre",
      allows_per_side: false,
    });
  });

  it("answers 400 for a bad offset", async () => {
    expect((await browse("?offset=-1", lea.cookie)).status).toBe(400);
    expect((await browse("?offset=abc", lea.cookie)).status).toBe(400);
    expect((await browse("?offset=1.5", lea.cookie)).status).toBe(400);
  });

  it("answers 401 without a cookie", async () => {
    const response = await request(app).get("/api/exercises");

    expect(response.status).toBe(401);
  });
});
