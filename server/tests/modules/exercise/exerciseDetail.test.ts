import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../../../src/app.js";
import client, {
  type Result,
  type Rows,
} from "../../../src/database/client.js";
import { ensureCatalog } from "../../helpers/catalog.js";
import {
  createTestUser,
  deleteTestUsers,
  type TestUser,
} from "../../helpers/fixtures.js";

const PREFIX = "test_detail_";

let lea: TestUser;
let someoneElse: TestUser;
let pullUpsId: number;
let privateId: number;
let archivedId: number;

beforeAll(async () => {
  await ensureCatalog();
  lea = await createTestUser(PREFIX);
  someoneElse = await createTestUser(PREFIX);

  const [rows] = await client.execute<Rows[]>(
    "SELECT id FROM exercise WHERE slug = 'pull-ups'",
  );
  pullUpsId = Number(rows[0]?.id);

  const [theirs] = await client.execute<Result>(
    "INSERT INTO exercise (owner_user_id, slug, name, difficulty) VALUES (?, ?, 'Leur exercice', 'beginner')",
    [someoneElse.id, `${someoneElse.username}-private`],
  );
  privateId = theirs.insertId;

  const [archived] = await client.execute<Result>(
    "INSERT INTO exercise (owner_user_id, slug, name, difficulty, is_archived) VALUES (?, ?, 'Mon archivé', 'beginner', TRUE)",
    [lea.id, `${lea.username}-archived`],
  );
  archivedId = archived.insertId;
}, 120_000);

afterAll(async () => {
  await deleteTestUsers(PREFIX);
  await client.end();
});

function readDetail(id: string | number, cookie: string) {
  return request(app).get(`/api/exercises/${id}`).set("Cookie", cookie);
}

describe("GET /api/exercises/:id", () => {
  it("returns the whole detail of a catalog exercise", async () => {
    const response = await readDetail(pullUpsId, lea.cookie);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: pullUpsId,
      slug: "pull-ups",
      name: "Tractions",
      difficulty: expect.stringMatching(/^(beginner|intermediate|advanced)$/),
      is_personal: false,
      image_female_url: expect.any(String),
      image_male_url: expect.any(String),
      categories: ["Dos"],
      equipments: ["Poids du corps"],
    });
    expect(response.body.instructions.length).toBeGreaterThan(0);
    expect(response.body.mistakes.length).toBeGreaterThan(0);
    expect(response.body.alternatives.length).toBeGreaterThan(0);
  });

  it("lists the primary muscles first and only the exercise's own measures", async () => {
    const response = await readDetail(pullUpsId, lea.cookie);
    const roles = response.body.muscles.map(
      (muscle: { role: string }) => muscle.role,
    );
    const firstSecondary = roles.indexOf("secondary");
    const lastPrimary = roles.lastIndexOf("primary");

    expect(roles).toContain("primary");
    expect(firstSecondary === -1 || lastPrimary < firstSecondary).toBe(true);
    expect(
      response.body.measures.map((measure: { code: string }) => measure.code),
    ).toEqual(["reps", "weight"]);
    expect(response.body.measures[0]).toEqual({
      code: "reps",
      label: expect.any(String),
    });
  });

  it("answers 404 for another user's exercise, an archived one or a missing id", async () => {
    const theirs = await readDetail(privateId, lea.cookie);
    const archived = await readDetail(archivedId, lea.cookie);
    const missing = await readDetail(999_999_999, lea.cookie);

    expect(theirs.status).toBe(404);
    expect(theirs.body.error).toEqual({
      code: "NOT_FOUND",
      message: "Exercice introuvable.",
    });
    expect(archived.status).toBe(404);
    expect(missing.status).toBe(404);
  });

  it("shows the owner their own personal exercise", async () => {
    const response = await readDetail(privateId, someoneElse.cookie);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      name: "Leur exercice",
      is_personal: true,
      alternatives: [],
    });
  });

  it("answers 400 for a bad id and 401 without a cookie", async () => {
    expect((await readDetail("abc", lea.cookie)).status).toBe(400);
    expect((await readDetail("1.5", lea.cookie)).status).toBe(400);
    expect((await request(app).get(`/api/exercises/${pullUpsId}`)).status).toBe(
      401,
    );
  });
});
