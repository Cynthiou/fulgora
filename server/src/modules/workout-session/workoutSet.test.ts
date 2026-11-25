import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../../app.js";
import client, { type Rows } from "../../database/client.js";
import { ensureCatalog } from "../../test-helpers/catalog.js";
import {
  createTestAppointment,
  createTestUser,
  deleteTestUsers,
  type TestUser,
} from "../../test-helpers/fixtures.js";

const PREFIX = "test_wset_";
const ORIGIN = "http://localhost:3000";

let lea: TestUser;
let someoneElse: TestUser;
let workoutId: number;
// The two sets of the single exercise, which measures reps and weight
let firstSetId: number;
let secondSetId: number;

const emptyValues = {
  reps: null,
  weight_kg: null,
  duration_seconds: null,
  distance_meters: null,
  speed_kmh: null,
  resistance: null,
  incline_percent: null,
  calories: null,
};

// Gives the fixture exercises of a version the reps and weight measures and
// two planned sets each.
async function prepareVersion(versionId: number) {
  const [measures] = await client.query<Rows[]>(
    "SELECT id, code FROM measure WHERE code IN ('reps', 'weight')",
  );
  const [exercises] = await client.execute<Rows[]>(
    `SELECT tbe.id, tbe.exercise_id FROM template_block_exercise tbe
       JOIN template_block tb ON tb.id = tbe.template_block_id
      WHERE tb.session_version_id = ?`,
    [versionId],
  );
  for (const exercise of exercises) {
    for (const measure of measures) {
      await client.execute(
        "INSERT INTO exercise_measure (exercise_id, measure_id) VALUES (?, ?)",
        [exercise.exercise_id, measure.id],
      );
    }
    await client.execute(
      "INSERT INTO planned_set (template_block_exercise_id, position, reps, weight_kg) VALUES (?, 1, 10, 40)",
      [exercise.id],
    );
    await client.execute(
      "INSERT INTO planned_set (template_block_exercise_id, position, reps, weight_kg) VALUES (?, 2, 8, 45)",
      [exercise.id],
    );
  }
}

async function startSession(user: TestUser, appointmentId: number) {
  const response = await request(app)
    .post("/api/workout-sessions")
    .set("Origin", ORIGIN)
    .set("Cookie", user.cookie)
    .send({ appointment_id: appointmentId });
  expect(response.status).toBe(201);
  return Number(response.body.id);
}

async function readSetIds(user: TestUser, id: number): Promise<number[]> {
  const tree = await request(app)
    .get(`/api/workout-sessions/${id}`)
    .set("Cookie", user.cookie);
  return tree.body.blocks[0].exercises[0].sets.map(
    (set: { id: number }) => set.id,
  );
}

beforeAll(async () => {
  await ensureCatalog();
  lea = await createTestUser(PREFIX);
  someoneElse = await createTestUser(PREFIX);
  const { appointmentId, versionId } = await createTestAppointment(lea, {
    name: "Haut du corps",
    date: "2026-11-26",
    blocks: [1],
  });
  await prepareVersion(versionId);
  workoutId = await startSession(lea, appointmentId);
  [firstSetId = 0, secondSetId = 0] = await readSetIds(lea, workoutId);
}, 120_000);

afterAll(async () => {
  // Fixture exercises are deleted by deleteTestUsers; their measures first.
  await client.query(
    "DELETE em FROM exercise_measure em JOIN exercise e ON e.id = em.exercise_id JOIN `user` u ON u.id = e.owner_user_id WHERE u.username LIKE ?",
    [`${PREFIX}%`],
  );
  await deleteTestUsers(PREFIX);
  await client.end();
});

function put(setId: number, body: object, cookie: string) {
  return request(app)
    .put(`/api/workout-sets/${setId}`)
    .set("Origin", ORIGIN)
    .set("Cookie", cookie)
    .send(body);
}

describe("PUT /api/workout-sets/:id", () => {
  it("records the actual values, keeps the plan and the first validation date", async () => {
    const [before] = await client.execute<Rows[]>(
      "SELECT last_activity_at FROM workout_session WHERE id = ?",
      [workoutId],
    );
    await new Promise((resolve) => setTimeout(resolve, 20));

    const response = await put(
      firstSetId,
      { ...emptyValues, reps: 10, weight_kg: 40 },
      lea.cookie,
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: firstSetId,
      reps_planned: 10,
      weight_planned_kg: 40,
      reps_actual: 10,
      weight_actual_kg: 40,
    });
    expect(response.body.validated_at).toEqual(expect.any(String));
    const firstValidation = response.body.validated_at;

    const [after] = await client.execute<Rows[]>(
      "SELECT last_activity_at FROM workout_session WHERE id = ?",
      [workoutId],
    );
    expect(new Date(after[0]?.last_activity_at).getTime()).toBeGreaterThan(
      new Date(before[0]?.last_activity_at).getTime(),
    );

    // Validated again with other values: the plan and the first date stay
    await new Promise((resolve) => setTimeout(resolve, 20));
    const again = await put(
      firstSetId,
      { ...emptyValues, reps: 8, weight_kg: 42.5 },
      lea.cookie,
    );
    expect(again.status).toBe(200);
    expect(again.body).toMatchObject({
      reps_planned: 10,
      weight_planned_kg: 40,
      reps_actual: 8,
      weight_actual_kg: 42.5,
      validated_at: firstValidation,
    });

    const current = await request(app)
      .get("/api/workout-sessions/current")
      .set("Cookie", lea.cookie);
    expect(current.body).toMatchObject({ validated_sets: 1, planned_sets: 2 });
  });

  it("refuses an empty set, a measure the exercise does not have, and bad values", async () => {
    const empty = await put(secondSetId, emptyValues, lea.cookie);
    expect(empty.status).toBe(422);
    expect(empty.body.error.code).toBe("EMPTY_SET");

    const zeros = await put(
      secondSetId,
      { ...emptyValues, reps: 0, weight_kg: 0 },
      lea.cookie,
    );
    expect(zeros.status).toBe(422);

    const duration = await put(
      secondSetId,
      { ...emptyValues, reps: 8, duration_seconds: 60 },
      lea.cookie,
    );
    expect(duration.status).toBe(422);
    expect(duration.body.error).toMatchObject({
      code: "MEASURE_NOT_ALLOWED",
      field: "duration_seconds",
    });

    const invalid = await put(
      secondSetId,
      { ...emptyValues, reps: 8, weight_kg: 40.3 },
      lea.cookie,
    );
    expect(invalid.status).toBe(400);

    const [row] = await client.execute<Rows[]>(
      "SELECT reps_actual, validated_at FROM workout_set WHERE id = ?",
      [secondSetId],
    );
    expect(row[0]).toMatchObject({ reps_actual: null, validated_at: null });
  });

  it("answers 404 for another user's set and 409 once the session is over", async () => {
    const theirs = await put(
      firstSetId,
      { ...emptyValues, reps: 10 },
      someoneElse.cookie,
    );
    expect(theirs.status).toBe(404);
    expect(
      (await put(999_999_999, { ...emptyValues, reps: 10 }, lea.cookie)).status,
    ).toBe(404);

    await client.execute(
      "UPDATE workout_session SET status = 'completed', ended_at = NOW(3) WHERE id = ?",
      [workoutId],
    );
    const over = await put(
      secondSetId,
      { ...emptyValues, reps: 8 },
      lea.cookie,
    );
    expect(over.status).toBe(409);
    expect(over.body.error.code).toBe("WORKOUT_NOT_IN_PROGRESS");
  });
});
