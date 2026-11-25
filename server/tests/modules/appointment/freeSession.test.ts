import {
  addDays,
  createEmptySet,
  type FreeSessionInput,
  todayInParis,
} from "shared";
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

const PREFIX = "test_free_";
const ORIGIN = "http://localhost:3000";

let lea: TestUser;
let someoneElse: TestUser;
// A catalog exercise measured in reps and weight, one measured in duration only
let benchId: number;
let plankId: number;
let othersExerciseId: number;

// The first catalog exercise whose measures are exactly the given codes.
async function findExerciseByMeasures(codes: string[]): Promise<number> {
  const [rows] = await client.query<Rows[]>(
    `SELECT e.id
       FROM exercise e
       JOIN exercise_measure em ON em.exercise_id = e.id
       JOIN measure m ON m.id = em.measure_id
      WHERE e.owner_user_id IS NULL
      GROUP BY e.id
     HAVING GROUP_CONCAT(m.code ORDER BY m.code) = ?
      ORDER BY e.id
      LIMIT 1`,
    [[...codes].sort().join(",")],
  );
  return Number(rows[0]?.id);
}

// How many rows the user owns in each of the six tables of a session.
async function countUserRows(userId: number) {
  const count = async (sql: string) => {
    const [rows] = await client.execute<Rows[]>(sql, [userId]);
    return Number(rows[0]?.total ?? 0);
  };
  return {
    templates: await count(
      "SELECT COUNT(*) AS total FROM session_template WHERE owner_user_id = ?",
    ),
    versions: await count(
      "SELECT COUNT(*) AS total FROM session_version sv JOIN session_template st ON st.id = sv.session_template_id WHERE st.owner_user_id = ?",
    ),
    blocks: await count(
      "SELECT COUNT(*) AS total FROM template_block tb JOIN session_version sv ON sv.id = tb.session_version_id JOIN session_template st ON st.id = sv.session_template_id WHERE st.owner_user_id = ?",
    ),
    exercises: await count(
      "SELECT COUNT(*) AS total FROM template_block_exercise tbe JOIN template_block tb ON tb.id = tbe.template_block_id JOIN session_version sv ON sv.id = tb.session_version_id JOIN session_template st ON st.id = sv.session_template_id WHERE st.owner_user_id = ?",
    ),
    sets: await count(
      "SELECT COUNT(*) AS total FROM planned_set ps JOIN template_block_exercise tbe ON tbe.id = ps.template_block_exercise_id JOIN template_block tb ON tb.id = tbe.template_block_id JOIN session_version sv ON sv.id = tb.session_version_id JOIN session_template st ON st.id = sv.session_template_id WHERE st.owner_user_id = ?",
    ),
    appointments: await count(
      "SELECT COUNT(*) AS total FROM appointment WHERE owner_user_id = ?",
    ),
  };
}

function set(values: Partial<ReturnType<typeof createEmptySet>>) {
  return { ...createEmptySet(), ...values };
}

function validSession(date = todayInParis()): FreeSessionInput {
  return {
    name: "Haut du corps",
    planned_date: date,
    planned_time: "18:30",
    blocks: [
      {
        block_type: "classic",
        name: "Force",
        instructions: null,
        exercises: [
          {
            exercise_id: benchId,
            default_rest_seconds: 90,
            sets: [
              set({ reps: 10, weight_kg: 40 }),
              set({ reps: 8, weight_kg: 45 }),
            ],
          },
          {
            exercise_id: plankId,
            default_rest_seconds: 60,
            sets: [set({ duration_seconds: 60, rest_after_seconds: 30 })],
          },
        ],
      },
      {
        block_type: "note",
        name: null,
        instructions: "Penser à respirer.",
        exercises: [],
      },
    ],
  };
}

beforeAll(async () => {
  await ensureCatalog();
  lea = await createTestUser(PREFIX);
  someoneElse = await createTestUser(PREFIX);
  benchId = await findExerciseByMeasures(["reps", "weight"]);
  plankId = await findExerciseByMeasures(["duration"]);
  const [result] = await client.execute<Result>(
    "INSERT INTO exercise (owner_user_id, slug, name, difficulty) VALUES (?, ?, 'Secret', 'beginner')",
    [someoneElse.id, `${someoneElse.username}-secret`],
  );
  othersExerciseId = result.insertId;
}, 120_000);

afterAll(async () => {
  await deleteTestUsers(PREFIX);
  await client.end();
});

function post(body: object, cookie: string) {
  return request(app)
    .post("/api/appointments")
    .set("Origin", ORIGIN)
    .set("Cookie", cookie)
    .send(body);
}

describe("POST /api/appointments", () => {
  it("saves the whole session with positions 1, 2, 3 and plans it", async () => {
    const response = await post(validSession("2026-11-26"), lea.cookie);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ appointment_id: expect.any(Number) });

    const [appointments] = await client.execute<Rows[]>(
      "SELECT planned_date, planned_time, status, program_id, session_version_id FROM appointment WHERE id = ?",
      [response.body.appointment_id],
    );
    expect(appointments[0]).toMatchObject({
      planned_date: "2026-11-26",
      planned_time: "18:30:00",
      status: "planned",
      program_id: null,
    });
    const versionId = Number(appointments[0]?.session_version_id);

    const [blocks] = await client.execute<Rows[]>(
      "SELECT block_type, name, position, instructions FROM template_block WHERE session_version_id = ? ORDER BY position",
      [versionId],
    );
    expect(blocks).toEqual([
      expect.objectContaining({
        block_type: "classic",
        name: "Force",
        position: 1,
        instructions: null,
      }),
      expect.objectContaining({
        block_type: "note",
        name: null,
        position: 2,
        instructions: "Penser à respirer.",
      }),
    ]);

    const [exercises] = await client.execute<Rows[]>(
      `SELECT tbe.exercise_id, tbe.position, tbe.default_rest_seconds
         FROM template_block_exercise tbe
         JOIN template_block tb ON tb.id = tbe.template_block_id
        WHERE tb.session_version_id = ?
        ORDER BY tbe.position`,
      [versionId],
    );
    expect(exercises).toEqual([
      expect.objectContaining({
        exercise_id: benchId,
        position: 1,
        default_rest_seconds: 90,
      }),
      expect.objectContaining({
        exercise_id: plankId,
        position: 2,
        default_rest_seconds: 60,
      }),
    ]);

    const [sets] = await client.execute<Rows[]>(
      `SELECT ps.position, ps.reps, ps.weight_kg, ps.duration_seconds, ps.rest_after_seconds
         FROM planned_set ps
         JOIN template_block_exercise tbe ON tbe.id = ps.template_block_exercise_id
         JOIN template_block tb ON tb.id = tbe.template_block_id
        WHERE tb.session_version_id = ?
        ORDER BY tbe.position, ps.position`,
      [versionId],
    );
    expect(
      sets.map((row) => [row.position, row.reps, Number(row.weight_kg)]),
    ).toEqual([
      [1, 10, 40],
      [2, 8, 45],
      [1, null, 0],
    ]);
    expect(sets[2]).toMatchObject({
      duration_seconds: 60,
      rest_after_seconds: 30,
    });
  });

  it("accepts a session without any block (RM-018)", async () => {
    const response = await post(
      { ...validSession(), name: "Vide", blocks: [] },
      lea.cookie,
    );

    expect(response.status).toBe(201);
  });

  it("refuses the exercise of another user and writes nothing at all", async () => {
    const before = await countUserRows(lea.id);
    const body = validSession();
    body.blocks.push({
      block_type: "classic",
      name: null,
      instructions: null,
      exercises: [
        {
          exercise_id: othersExerciseId,
          default_rest_seconds: null,
          sets: [set({})],
        },
      ],
    });

    const response = await post(body, lea.cookie);

    expect(response.status).toBe(422);
    expect(response.body.error).toMatchObject({
      code: "EXERCISE_NOT_AVAILABLE",
      field: "blocks.2.exercises.0",
    });
    expect(response.body.error.message).not.toContain("Secret");
    expect(await countUserRows(lea.id)).toEqual(before);
  });

  it("refuses a measure the exercise does not have (RM-010)", async () => {
    const before = await countUserRows(lea.id);
    const body = validSession();
    const bench = body.blocks[0]?.exercises[0];
    if (bench === undefined) {
      throw new Error("missing exercise");
    }
    bench.sets = [set({ reps: 10, duration_seconds: 60 })];

    const response = await post(body, lea.cookie);

    expect(response.status).toBe(422);
    expect(response.body.error).toMatchObject({
      code: "MEASURE_NOT_ALLOWED",
      field: "blocks.0.exercises.0.sets.0.duration_seconds",
    });
    expect(response.body.error.message).toContain("Durée");
    expect(await countUserRows(lea.id)).toEqual(before);
  });

  it("refuses a date out of range, a missing name and bad values with a 400", async () => {
    const tooFar = await post(
      validSession(addDays(todayInParis(), 800)),
      lea.cookie,
    );
    expect(tooFar.status).toBe(400);
    expect(tooFar.body.error.fields).toEqual([
      {
        field: "planned_date",
        message: "La date ne peut pas dépasser deux ans.",
      },
    ]);

    const tooOld = await post(
      validSession(addDays(todayInParis(), -400)),
      lea.cookie,
    );
    expect(tooOld.status).toBe(400);

    const body = validSession();
    body.name = "";
    const bench = body.blocks[0]?.exercises[0];
    if (bench !== undefined) {
      bench.sets = [set({ weight_kg: 40.3 })];
    }
    const invalid = await post(body, lea.cookie);
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe("VALIDATION_ERROR");
    expect(
      invalid.body.error.fields.map((field: { field: string }) => field.field),
    ).toEqual(
      expect.arrayContaining(["name", "blocks.0.exercises.0.sets.0.weight_kg"]),
    );
  });

  it("answers 401 without a cookie and 403 without an allowed origin", async () => {
    const anonymous = await request(app)
      .post("/api/appointments")
      .set("Origin", ORIGIN)
      .send(validSession());
    expect(anonymous.status).toBe(401);

    const elsewhere = await request(app)
      .post("/api/appointments")
      .set("Origin", "https://ailleurs.example")
      .set("Cookie", lea.cookie)
      .send(validSession());
    expect(elsewhere.status).toBe(403);
  });
});
