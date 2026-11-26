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

// US-32: adding a set, an exercise or a block while the session runs. What
// is added carries no plan and can be removed; the plan never moves
// (RM-043, RM-048).

const PREFIX = "test_add_";
const ORIGIN = "http://localhost:3000";

let lea: TestUser;
let someoneElse: TestUser;
let workoutId: number;
let blockId: number;
let exerciseId: number;
let plannedSetId: number;
let catalogExerciseId: number;

async function prepareVersion(versionId: number) {
  const [exercises] = await client.execute<Rows[]>(
    `SELECT tbe.id FROM template_block_exercise tbe
       JOIN template_block tb ON tb.id = tbe.template_block_id
      WHERE tb.session_version_id = ?`,
    [versionId],
  );
  for (const exercise of exercises) {
    await client.execute(
      "INSERT INTO planned_set (template_block_exercise_id, position, reps) VALUES (?, 1, 10)",
      [exercise.id],
    );
  }
}

async function readTree(user: TestUser, id: number) {
  const response = await request(app)
    .get(`/api/workout-sessions/${id}`)
    .set("Cookie", user.cookie);
  expect(response.status).toBe(200);
  return response.body;
}

beforeAll(async () => {
  await ensureCatalog();
  lea = await createTestUser(PREFIX);
  someoneElse = await createTestUser(PREFIX);

  const [rows] = await client.query<Rows[]>(
    "SELECT id FROM exercise WHERE owner_user_id IS NULL ORDER BY id LIMIT 1",
  );
  catalogExerciseId = Number(rows[0]?.id);

  const { appointmentId, versionId } = await createTestAppointment(lea, {
    name: "Haut du corps",
    date: "2026-11-26",
    blocks: [1],
  });
  await prepareVersion(versionId);

  const started = await request(app)
    .post("/api/workout-sessions")
    .set("Origin", ORIGIN)
    .set("Cookie", lea.cookie)
    .send({ appointment_id: appointmentId });
  expect(started.status).toBe(201);
  workoutId = Number(started.body.id);

  const tree = await readTree(lea, workoutId);
  blockId = tree.blocks[0].id;
  exerciseId = tree.blocks[0].exercises[0].id;
  plannedSetId = tree.blocks[0].exercises[0].sets[0].id;
}, 120_000);

afterAll(async () => {
  await deleteTestUsers(PREFIX);
  await client.end();
});

describe("POST /api/workout-exercises/:id/sets", () => {
  it("adds an empty set at the end, marked as added", async () => {
    const response = await request(app)
      .post(`/api/workout-exercises/${exerciseId}/sets`)
      .set("Origin", ORIGIN)
      .set("Cookie", lea.cookie);

    expect(response.status).toBe(201);
    const tree = await readTree(lea, workoutId);
    const sets = tree.blocks[0].exercises[0].sets;
    const last = sets[sets.length - 1];
    expect(last.id).toBe(response.body.id);
    expect(last.is_added).toBe(true);
    expect(last.reps_planned).toBeNull();
    expect(last.position).toBe(sets.length);
    // The planned set did not move (RM-043)
    expect(sets[0].is_added).toBe(false);
    expect(sets[0].reps_planned).toBe(10);
  });

  it("answers 404 for the exercise of somebody else", async () => {
    const response = await request(app)
      .post(`/api/workout-exercises/${exerciseId}/sets`)
      .set("Origin", ORIGIN)
      .set("Cookie", someoneElse.cookie);

    expect(response.status).toBe(404);
  });
});

describe("DELETE /api/workout-sets/:id", () => {
  it("removes a set that was added", async () => {
    const added = await request(app)
      .post(`/api/workout-exercises/${exerciseId}/sets`)
      .set("Origin", ORIGIN)
      .set("Cookie", lea.cookie);

    const response = await request(app)
      .delete(`/api/workout-sets/${added.body.id}`)
      .set("Origin", ORIGIN)
      .set("Cookie", lea.cookie);

    expect(response.status).toBe(204);
    const [rows] = await client.execute<Rows[]>(
      "SELECT id FROM workout_set WHERE id = ?",
      [added.body.id],
    );
    expect(rows).toHaveLength(0);
  });

  it("refuses to remove a planned set (RM-048)", async () => {
    const response = await request(app)
      .delete(`/api/workout-sets/${plannedSetId}`)
      .set("Origin", ORIGIN)
      .set("Cookie", lea.cookie);

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("PLANNED_ITEM_NOT_REMOVABLE");
  });
});

describe("POST /api/workout-blocks/:id/exercises", () => {
  it("adds an exercise at the end of the block, with one empty set", async () => {
    const response = await request(app)
      .post(`/api/workout-blocks/${blockId}/exercises`)
      .set("Origin", ORIGIN)
      .set("Cookie", lea.cookie)
      .send({ exercise_ids: [catalogExerciseId] });

    expect(response.status).toBe(201);
    const tree = await readTree(lea, workoutId);
    const exercises = tree.blocks[0].exercises;
    const last = exercises[exercises.length - 1];
    expect(last.is_added).toBe(true);
    expect(last.exercise_id).toBe(catalogExerciseId);
    expect(last.sets).toHaveLength(1);
    expect(last.sets[0].is_added).toBe(true);
  });

  it("refuses an empty list", async () => {
    const response = await request(app)
      .post(`/api/workout-blocks/${blockId}/exercises`)
      .set("Origin", ORIGIN)
      .set("Cookie", lea.cookie)
      .send({ exercise_ids: [] });

    expect(response.status).toBe(400);
  });
});

describe("POST /api/workout-sessions/:id/blocks", () => {
  it("adds a block at the end with its exercises", async () => {
    const response = await request(app)
      .post(`/api/workout-sessions/${workoutId}/blocks`)
      .set("Origin", ORIGIN)
      .set("Cookie", lea.cookie)
      .send({ name: "En plus", exercise_ids: [catalogExerciseId] });

    expect(response.status).toBe(201);
    const tree = await readTree(lea, workoutId);
    const last = tree.blocks[tree.blocks.length - 1];
    expect(last.id).toBe(response.body.id);
    expect(last.name).toBe("En plus");
    expect(last.is_added).toBe(true);
    expect(last.exercises).toHaveLength(1);
  });

  // Léa already has a session running (only one at a time, RM-040), so the
  // finished one belongs to the other user.
  // US-37 changed this rule: a session which is over accepts an addition,
  // that is how an exercise forgotten on the day is caught up (D-18).
  it("accepts a block on a session which is over, for a correction", async () => {
    const { appointmentId, versionId } = await createTestAppointment(
      someoneElse,
      { name: "Finie", date: "2026-11-27", blocks: [1] },
    );
    await prepareVersion(versionId);
    const started = await request(app)
      .post("/api/workout-sessions")
      .set("Origin", ORIGIN)
      .set("Cookie", someoneElse.cookie)
      .send({ appointment_id: appointmentId });
    expect(started.status).toBe(201);
    const otherId = Number(started.body.id);
    await client.execute(
      "UPDATE workout_session SET status = 'completed', ended_at = NOW(3) WHERE id = ?",
      [otherId],
    );

    const response = await request(app)
      .post(`/api/workout-sessions/${otherId}/blocks`)
      .set("Origin", ORIGIN)
      .set("Cookie", someoneElse.cookie)
      .send({ name: null, exercise_ids: [catalogExerciseId] });

    expect(response.status).toBe(201);
    const tree = await readTree(someoneElse, otherId);
    const last = tree.blocks[tree.blocks.length - 1];
    expect(last.id).toBe(response.body.id);
    expect(last.exercises[0]?.is_added).toBe(true);
  });
});

// US-31: the total of a timed block, written once the block is over.
describe("PUT /api/workout-blocks/:id", () => {
  it("saves the rounds, the extra reps and the time of the block", async () => {
    const response = await request(app)
      .put(`/api/workout-blocks/${blockId}`)
      .set("Origin", ORIGIN)
      .set("Cookie", lea.cookie)
      .send({
        completed_rounds: 5,
        extra_reps: 8,
        actual_duration_seconds: 720,
      });

    expect(response.status).toBe(200);
    const tree = await readTree(lea, workoutId);
    expect(tree.blocks[0]).toMatchObject({
      completed_rounds: 5,
      extra_reps: 8,
      actual_duration_seconds: 720,
    });
  });

  it("refuses a value out of its limits and the block of somebody else", async () => {
    const tooMany = await request(app)
      .put(`/api/workout-blocks/${blockId}`)
      .set("Origin", ORIGIN)
      .set("Cookie", lea.cookie)
      .send({
        completed_rounds: 501,
        extra_reps: null,
        actual_duration_seconds: null,
      });
    expect(tooMany.status).toBe(400);

    const other = await request(app)
      .put(`/api/workout-blocks/${blockId}`)
      .set("Origin", ORIGIN)
      .set("Cookie", someoneElse.cookie)
      .send({
        completed_rounds: 1,
        extra_reps: null,
        actual_duration_seconds: null,
      });
    expect(other.status).toBe(404);
  });

  it("answers 409 once the session is over", async () => {
    // Its own user: Léa already has a session in progress (DT-15).
    const marc = await createTestUser(PREFIX);
    const { appointmentId, versionId } = await createTestAppointment(marc, {
      name: "Séance finie",
      date: "2026-11-25",
      blocks: [1],
    });
    await prepareVersion(versionId);
    const started = await request(app)
      .post("/api/workout-sessions")
      .set("Origin", ORIGIN)
      .set("Cookie", marc.cookie)
      .send({ appointment_id: appointmentId });
    expect(started.status).toBe(201);
    const finishedId = Number(started.body.id);
    const tree = await readTree(marc, finishedId);
    const finishedBlockId = tree.blocks[0].id;

    const ended = await request(app)
      .post(`/api/workout-sessions/${finishedId}/abandon`)
      .set("Origin", ORIGIN)
      .set("Cookie", marc.cookie);
    expect(ended.status).toBe(200);

    const response = await request(app)
      .put(`/api/workout-blocks/${finishedBlockId}`)
      .set("Origin", ORIGIN)
      .set("Cookie", marc.cookie)
      .send({
        completed_rounds: 2,
        extra_reps: null,
        actual_duration_seconds: 60,
      });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("SESSION_NOT_IN_PROGRESS");
  });
});
