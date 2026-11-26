import {
  createEmptySet,
  type EditableSession,
  type FreeSessionInput,
  type PlannedSetValues,
  type SessionDraft,
} from "shared";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../../../src/app.js";
import client, { type Rows } from "../../../src/database/client.js";
import { ensureCatalog } from "../../helpers/catalog.js";
import {
  createTestUser,
  deleteTestUsers,
  type TestUser,
} from "../../helpers/fixtures.js";

// US-17: modifying a planned session writes a new version and never touches
// the one already saved (RM-017).

const PREFIX = "test_edit_";
const ORIGIN = "http://localhost:3000";

let lea: TestUser;
let someoneElse: TestUser;
let benchId: number;
let plankId: number;

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

function set(values: Partial<PlannedSetValues>): PlannedSetValues {
  return { ...createEmptySet(), ...values };
}

function newSession(name: string): FreeSessionInput {
  return {
    name,
    planned_date: "2026-11-26",
    planned_time: "07:00",
    blocks: [
      {
        block_type: "classic",
        name: "Force",
        instructions: null,
        planned_rounds: null,
        time_limit_seconds: null,
        exercises: [
          {
            exercise_id: benchId,
            default_rest_seconds: 90,
            sets: [
              set({ reps: 8, weight_kg: 60 }),
              set({ reps: 8, weight_kg: 60 }),
            ],
          },
        ],
      },
    ],
  };
}

// A session of Léa, planned, ready to be edited.
async function planSession(name: string): Promise<number> {
  const response = await request(app)
    .post("/api/appointments")
    .set("Origin", ORIGIN)
    .set("Cookie", lea.cookie)
    .send(newSession(name));
  expect(response.status).toBe(201);
  return response.body.appointment_id as number;
}

function readDraft(id: number, cookie: string) {
  return request(app)
    .get(`/api/appointments/${id}/session`)
    .set("Cookie", cookie);
}

function edit(id: number, body: object, cookie: string) {
  return request(app)
    .put(`/api/appointments/${id}/session`)
    .set("Origin", ORIGIN)
    .set("Cookie", cookie)
    .send(body);
}

async function readVersionId(appointmentId: number): Promise<number> {
  const [rows] = await client.execute<Rows[]>(
    "SELECT session_version_id FROM appointment WHERE id = ?",
    [appointmentId],
  );
  return Number(rows[0]?.session_version_id);
}

async function countSets(versionId: number): Promise<number> {
  const [rows] = await client.execute<Rows[]>(
    `SELECT COUNT(*) AS total
       FROM planned_set ps
       JOIN template_block_exercise tbe ON tbe.id = ps.template_block_exercise_id
       JOIN template_block tb ON tb.id = tbe.template_block_id
      WHERE tb.session_version_id = ?`,
    [versionId],
  );
  return Number(rows[0]?.total ?? 0);
}

beforeAll(async () => {
  await ensureCatalog();
  lea = await createTestUser(PREFIX);
  someoneElse = await createTestUser(PREFIX);
  benchId = await findExerciseByMeasures(["reps", "weight"]);
  plankId = await findExerciseByMeasures(["duration"]);
}, 120_000);

afterAll(async () => {
  await deleteTestUsers(PREFIX);
  await client.end();
});

describe("GET /api/appointments/:id/session", () => {
  it("gives the planned session back as a draft", async () => {
    const appointmentId = await planSession("Jambes");

    const response = await readDraft(appointmentId, lea.cookie);

    expect(response.status).toBe(200);
    const body = response.body as EditableSession;
    expect(body).toMatchObject({
      appointment_id: appointmentId,
      program_name: null,
      can_apply_to_following: false,
    });
    expect(body.session.name).toBe("Jambes");
    expect(body.session.planned_date).toBe("2026-11-26");
    expect(body.session.planned_time).toBe("07:00");

    const [block] = body.session.blocks;
    expect(block).toMatchObject({
      block_type: "classic",
      name: "Force",
      instructions: null,
    });
    expect(block?.key).toMatch(/^bloc-\d+$/);

    const [exercise] = block?.exercises ?? [];
    expect(exercise).toMatchObject({
      exercise_id: benchId,
      default_rest_seconds: 90,
    });
    expect(exercise?.key).toMatch(/^ex-\d+$/);
    expect(exercise?.measure_codes).toContain("reps");
    expect(exercise?.sets).toEqual([
      set({ reps: 8, weight_kg: 60 }),
      set({ reps: 8, weight_kg: 60 }),
    ]);
  });

  it("answers 404 for the session of somebody else", async () => {
    const appointmentId = await planSession("Pas la sienne");

    const response = await readDraft(appointmentId, someoneElse.cookie);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("APPOINTMENT_NOT_FOUND");
  });

  it("answers 409 for a session already started", async () => {
    const appointmentId = await planSession("Déjà faite");
    await client.execute(
      "UPDATE appointment SET status = 'attended' WHERE id = ?",
      [appointmentId],
    );

    const response = await readDraft(appointmentId, lea.cookie);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("APPOINTMENT_NOT_EDITABLE");
  });
});

describe("PUT /api/appointments/:id/session", () => {
  it("writes a new version, leaves the old one alone and moves the appointment", async () => {
    const appointmentId = await planSession("Jambes");
    const oldVersionId = await readVersionId(appointmentId);
    const before = (await readDraft(appointmentId, lea.cookie))
      .body as EditableSession;

    const session: SessionDraft = {
      ...before.session,
      blocks: [
        {
          ...before.session.blocks[0],
          exercises: [
            {
              ...before.session.blocks[0].exercises[0],
              sets: [
                set({ reps: 5, weight_kg: 70 }),
                set({ reps: 5, weight_kg: 70 }),
                set({ reps: 5, weight_kg: 70 }),
              ],
            },
          ],
        },
      ],
    };

    const response = await edit(
      appointmentId,
      { scope: "this", session },
      lea.cookie,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      version_id: expect.any(Number),
      updated_appointment_ids: [appointmentId],
    });

    const newVersionId = response.body.version_id as number;
    expect(newVersionId).not.toBe(oldVersionId);
    expect(await readVersionId(appointmentId)).toBe(newVersionId);
    // The saved version keeps its two sets (RM-017, RM-058)
    expect(await countSets(oldVersionId)).toBe(2);
    expect(await countSets(newVersionId)).toBe(3);

    const [versions] = await client.execute<Rows[]>(
      `SELECT version_number FROM session_version
        WHERE session_template_id = (SELECT session_template_id FROM session_version WHERE id = ?)
        ORDER BY version_number`,
      [oldVersionId],
    );
    expect(versions.map((row) => Number(row.version_number))).toEqual([1, 2]);
  });

  it("adds an exercise and renames the session", async () => {
    const appointmentId = await planSession("Jambes");
    const before = (await readDraft(appointmentId, lea.cookie))
      .body as EditableSession;

    const session: SessionDraft = {
      ...before.session,
      name: "Bas du corps",
      blocks: [
        {
          ...before.session.blocks[0],
          exercises: [
            ...before.session.blocks[0].exercises,
            {
              key: "ex-new",
              exercise_id: plankId,
              name: "Gainage",
              measure_codes: ["duration"],
              default_rest_seconds: 60,
              sets: [set({ duration_seconds: 60 })],
            },
          ],
        },
      ],
    };

    const response = await edit(
      appointmentId,
      { scope: "this", session },
      lea.cookie,
    );

    expect(response.status).toBe(200);
    const after = (await readDraft(appointmentId, lea.cookie))
      .body as EditableSession;
    expect(after.session.name).toBe("Bas du corps");
    expect(after.session.blocks[0]?.exercises).toHaveLength(2);
    expect(after.session.blocks[0]?.exercises[1]?.exercise_id).toBe(plankId);
  });

  it("refuses the scope « and the following ones » on a free session", async () => {
    const appointmentId = await planSession("Jambes");
    const before = (await readDraft(appointmentId, lea.cookie))
      .body as EditableSession;

    const response = await edit(
      appointmentId,
      { scope: "following", session: before.session },
      lea.cookie,
    );

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("SCOPE_NOT_ALLOWED");
  });

  it("refuses a session already started", async () => {
    const appointmentId = await planSession("Déjà faite");
    const before = (await readDraft(appointmentId, lea.cookie))
      .body as EditableSession;
    const versionId = await readVersionId(appointmentId);
    await client.execute(
      "UPDATE appointment SET status = 'attended' WHERE id = ?",
      [appointmentId],
    );

    const response = await edit(
      appointmentId,
      { scope: "this", session: before.session },
      lea.cookie,
    );

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("APPOINTMENT_NOT_EDITABLE");
    expect(await readVersionId(appointmentId)).toBe(versionId);
  });

  it("answers 404 for the session of somebody else", async () => {
    const appointmentId = await planSession("Pas la sienne");
    const before = (await readDraft(appointmentId, lea.cookie))
      .body as EditableSession;

    const response = await edit(
      appointmentId,
      { scope: "this", session: before.session },
      someoneElse.cookie,
    );

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("APPOINTMENT_NOT_FOUND");
  });

  it("refuses a measure the exercise does not have", async () => {
    const appointmentId = await planSession("Jambes");
    const before = (await readDraft(appointmentId, lea.cookie))
      .body as EditableSession;

    const session: SessionDraft = {
      ...before.session,
      blocks: [
        {
          ...before.session.blocks[0],
          exercises: [
            {
              ...before.session.blocks[0].exercises[0],
              sets: [set({ reps: 8, calories: 120 })],
            },
          ],
        },
      ],
    };

    const response = await edit(
      appointmentId,
      { scope: "this", session },
      lea.cookie,
    );

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("MEASURE_NOT_ALLOWED");
  });

  it("refuses a session without a name", async () => {
    const appointmentId = await planSession("Jambes");
    const before = (await readDraft(appointmentId, lea.cookie))
      .body as EditableSession;

    const response = await edit(
      appointmentId,
      { scope: "this", session: { ...before.session, name: "" } },
      lea.cookie,
    );

    expect(response.status).toBe(400);
  });
});
