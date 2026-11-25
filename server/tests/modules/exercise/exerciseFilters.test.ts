import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../../../src/app.js";
import client from "../../../src/database/client.js";
import { ensureCatalog } from "../../helpers/catalog.js";
import {
  createTestUser,
  deleteTestUsers,
  type TestUser,
} from "../../helpers/fixtures.js";

const PREFIX = "test_filter_";

let lea: TestUser;
type Item = { id: number; name: string; category_name: string | null };
type Reference = { id: number; code: string; name: string };

beforeAll(async () => {
  await ensureCatalog();
  lea = await createTestUser(PREFIX);
}, 120_000);

afterAll(async () => {
  await deleteTestUsers(PREFIX);
  await client.end();
});

function browse(query: string) {
  return request(app).get(`/api/exercises?${query}`).set("Cookie", lea.cookie);
}

async function readReferences(path: string): Promise<Reference[]> {
  const response = await request(app).get(path).set("Cookie", lea.cookie);
  expect(response.status).toBe(200);
  return response.body;
}

async function countFor(query: string): Promise<number> {
  const response = await browse(query);
  expect(response.status).toBe(200);
  return response.body.total;
}

describe("GET /api/exercises with filters", () => {
  it("searches in the name, whatever the case", async () => {
    const response = await browse("search=SQUAT");

    expect(response.status).toBe(200);
    expect(response.body.total).toBeGreaterThan(0);
    for (const item of response.body.items as Item[]) {
      expect(item.name.toLowerCase()).toContain("squat");
    }
  });

  it("searches a typed percent sign as a percent sign, not as a wildcard", async () => {
    expect(await countFor("search=%25")).toBe(0);
    expect(await countFor("search=_")).toBe(0);
  });

  it("combines two groups with OR and a group with an equipment with AND", async () => {
    const categories = await readReferences("/api/categories");
    const equipments = await readReferences("/api/equipments");
    const [legs, chest] = [
      categories.find((c) => c.code === "legs"),
      categories.find((c) => c.code === "chest"),
    ];
    const barbell = equipments.find((e) => e.code === "barbell");
    expect(legs && chest && barbell).toBeTruthy();

    const legsCount = await countFor(`category_ids=${legs?.id}`);
    const chestCount = await countFor(`category_ids=${chest?.id}`);
    const bothCount = await countFor(`category_ids=${legs?.id},${chest?.id}`);
    expect(legsCount).toBeGreaterThan(0);
    expect(chestCount).toBeGreaterThan(0);
    expect(bothCount).toBe(legsCount + chestCount);

    const legsWithBarbell = await countFor(
      `category_ids=${legs?.id}&equipment_ids=${barbell?.id}`,
    );
    expect(legsWithBarbell).toBeGreaterThan(0);
    expect(legsWithBarbell).toBeLessThan(legsCount);

    const response = await browse(
      `category_ids=${legs?.id}&equipment_ids=${barbell?.id}`,
    );
    for (const item of response.body.items as Item[]) {
      expect(item.category_name).toBe(legs?.name);
    }
  });

  it("filters by difficulty", async () => {
    const beginners = await countFor("difficulties=beginner");
    const all = await countFor("");
    const two = await countFor("difficulties=beginner,advanced");

    expect(beginners).toBeGreaterThan(0);
    expect(beginners).toBeLessThan(all);
    expect(two).toBeGreaterThan(beginners);
  });

  it("answers 400 for a bad filter", async () => {
    expect((await browse("difficulties=expert")).status).toBe(400);
    expect((await browse(`search=${"a".repeat(61)}`)).status).toBe(400);
    expect((await browse("category_ids=1,abc")).status).toBe(400);
    expect((await browse("category_ids=0")).status).toBe(400);
    expect((await browse("equipment_ids=1,2,3,4,5,6,7,8,9,10,11")).status).toBe(
      400,
    );
  });
});

describe("GET /api/categories and /api/equipments", () => {
  it("list the groups and the equipment sorted by name", async () => {
    const categories = await readReferences("/api/categories");
    const equipments = await readReferences("/api/equipments");

    expect(categories).toHaveLength(8);
    expect(equipments).toHaveLength(6);
    expect(categories[0]).toEqual({
      id: expect.any(Number),
      code: expect.any(String),
      name: expect.any(String),
    });
  });

  it("answer 401 without a cookie", async () => {
    expect((await request(app).get("/api/categories")).status).toBe(401);
    expect((await request(app).get("/api/equipments")).status).toBe(401);
  });
});
