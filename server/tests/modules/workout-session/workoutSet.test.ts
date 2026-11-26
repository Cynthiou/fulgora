import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../../../src/app.js";
import client, { type Rows } from "../../../src/database/client.js";
import { ensureCatalog } from "../../helpers/catalog.js";
import {
  createTestAppointment,
  createTestUser,
  deleteTestUsers,
  type TestUser,
} from "../../helpers/fixtures.js";

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
  weight_left_kg: null,
  weight_right_kg: null,
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
  // The sides point at the sets (US-51): they go first.
  await client.query(
    `DELETE wss FROM workout_set_side wss
       JOIN workout_set wset ON wset.id = wss.workout_set_id
       JOIN workout_exercise we ON we.id = wset.workout_exercise_id
       JOIN workout_block wb ON wb.id = we.workout_block_id
       JOIN workout_session ws ON ws.id = wb.workout_session_id
       JOIN \`user\` u ON u.id = ws.owner_user_id
      WHERE u.username LIKE ?`,
    [`${PREFIX}%`],
  );
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
      weight_left_planned_kg: null,
      weight_right_planned_kg: null,
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
      weight_left_planned_kg: null,
      weight_right_planned_kg: null,
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

// US-37: a session already over is corrected, never refilled (RM-047).
describe("PUT /api/workout-sets/:id/correction", () => {
  function correct(setId: number, body: object, cookie: string) {
    return request(app)
      .put(`/api/workout-sets/${setId}/correction`)
      .set("Origin", ORIGIN)
      .set("Cookie", cookie)
      .send(body);
  }

  async function setStatus(status: string) {
    await client.execute("UPDATE workout_session SET status = ? WHERE id = ?", [
      status,
      workoutId,
    ]);
  }

  it("fixes a validated set, keeps the plan and the first date", async () => {
    await setStatus("completed");
    const [before] = await client.execute<Rows[]>(
      "SELECT validated_at, updated_at FROM workout_set WHERE id = ?",
      [firstSetId],
    );
    expect(before[0]?.updated_at).toBeNull();

    const response = await correct(
      firstSetId,
      { ...emptyValues, reps: 6, weight_kg: 60 },
      lea.cookie,
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      reps_planned: 10,
      weight_planned_kg: 40,
      reps_actual: 6,
      weight_actual_kg: 60,
      weight_left_planned_kg: null,
      weight_right_planned_kg: null,
    });
    // The first validation date never moves (RM-049)
    expect(new Date(response.body.validated_at).getTime()).toBe(
      new Date(before[0]?.validated_at as string).getTime(),
    );
    const [after] = await client.execute<Rows[]>(
      "SELECT updated_at FROM workout_set WHERE id = ?",
      [firstSetId],
    );
    expect(after[0]?.updated_at).not.toBeNull();
  });

  it("fills a set that was never done, and validates it", async () => {
    await setStatus("unfinished");

    const response = await correct(
      secondSetId,
      { ...emptyValues, reps: 8, weight_kg: 45 },
      lea.cookie,
    );

    expect(response.status).toBe(200);
    expect(response.body.validated_at).toEqual(expect.any(String));
    expect(response.body.reps_actual).toBe(8);
  });

  it("refuses an empty correction and a measure the exercise has not", async () => {
    await setStatus("completed");

    const empty = await correct(firstSetId, emptyValues, lea.cookie);
    expect(empty.status).toBe(422);
    expect(empty.body.error.code).toBe("EMPTY_SET");

    const wrong = await correct(
      firstSetId,
      { ...emptyValues, calories: 300 },
      lea.cookie,
    );
    expect(wrong.status).toBe(422);
    expect(wrong.body.error.code).toBe("MEASURE_NOT_ALLOWED");
  });

  it("answers 404 for somebody else and 409 while the session runs", async () => {
    await setStatus("completed");
    const theirs = await correct(
      firstSetId,
      { ...emptyValues, reps: 10 },
      someoneElse.cookie,
    );
    expect(theirs.status).toBe(404);

    await setStatus("in_progress");
    const running = await correct(
      firstSetId,
      { ...emptyValues, reps: 10 },
      lea.cookie,
    );
    expect(running.status).toBe(409);
    expect(running.body.error.code).toBe("WORKOUT_IN_PROGRESS");
    await setStatus("completed");
  });
});

// US-51: an exercise done side by side. The set waits for both sides.
describe("PUT /api/workout-sets/:id/sides/:side", () => {
  function side(setId: number, which: string, body: object, cookie: string) {
    return request(app)
      .put(`/api/workout-sets/${setId}/sides/${which}`)
      .set("Origin", ORIGIN)
      .set("Cookie", cookie)
      .send(body);
  }

  async function setPerSide(isPerSide: boolean) {
    await client.execute(
      `UPDATE workout_exercise we
         JOIN workout_block wb ON wb.id = we.workout_block_id
          SET we.is_per_side = ?
        WHERE wb.workout_session_id = ?`,
      [isPerSide, workoutId],
    );
    await client.execute(
      "UPDATE workout_session SET status = 'in_progress' WHERE id = ?",
      [workoutId],
    );
  }

  it("validates the set only once both sides are there (RM-044)", async () => {
    await setPerSide(true);
    await client.execute(
      "UPDATE workout_set SET validated_at = NULL WHERE id = ?",
      [secondSetId],
    );

    const left = await side(
      secondSetId,
      "left",
      { reps: 15, weight_kg: 10, duration_seconds: null },
      lea.cookie,
    );

    expect(left.status).toBe(200);
    expect(left.body.validated_at).toBeNull();
    expect(left.body.sides).toHaveLength(1);
    expect(left.body.sides[0]).toMatchObject({
      side: "left",
      reps_actual: 15,
      weight_actual_kg: 10,
    });

    const right = await side(
      secondSetId,
      "right",
      { reps: 13, weight_kg: 6, duration_seconds: null },
      lea.cookie,
    );

    expect(right.status).toBe(200);
    expect(right.body.validated_at).toEqual(expect.any(String));
    expect(right.body.sides).toHaveLength(2);

    // Written again: the side is updated, the set stays validated
    const again = await side(
      secondSetId,
      "left",
      { reps: 16, weight_kg: 10, duration_seconds: null },
      lea.cookie,
    );
    expect(again.status).toBe(200);
    expect(again.body.sides[0]?.reps_actual).toBe(16);
    expect(again.body.validated_at).toEqual(expect.any(String));
  });

  it("refuses an unknown side, an empty side and an exercise which is not per side", async () => {
    await setPerSide(true);

    const unknown = await side(
      secondSetId,
      "milieu",
      { reps: 10, weight_kg: null, duration_seconds: null },
      lea.cookie,
    );
    expect(unknown.status).toBe(400);

    const empty = await side(
      secondSetId,
      "left",
      { reps: null, weight_kg: null, duration_seconds: null },
      lea.cookie,
    );
    expect(empty.status).toBe(422);
    expect(empty.body.error.code).toBe("EMPTY_SET");

    await setPerSide(false);
    const notPerSide = await side(
      secondSetId,
      "left",
      { reps: 10, weight_kg: null, duration_seconds: null },
      lea.cookie,
    );
    expect(notPerSide.status).toBe(422);
    expect(notPerSide.body.error.code).toBe("EXERCISE_NOT_PER_SIDE");
  });

  it("answers 404 for somebody else's set", async () => {
    await setPerSide(true);

    const theirs = await side(
      secondSetId,
      "left",
      { reps: 10, weight_kg: null, duration_seconds: null },
      someoneElse.cookie,
    );

    expect(theirs.status).toBe(404);
  });
});
