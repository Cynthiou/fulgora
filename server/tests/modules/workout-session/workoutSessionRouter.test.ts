import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../../../src/app.js";
import client, {
  type Result,
  type Rows,
} from "../../../src/database/client.js";
import {
  createTestAppointment,
  createTestUser,
  deleteTestUsers,
  type TestUser,
} from "../../helpers/fixtures.js";

const PREFIX = "test_workout_";
const ORIGIN = "http://localhost:3000";

let lea: TestUser;
let someoneElse: TestUser;

// Two planned sets on every exercise of a version: 10 x 40 kg, then 8 x 45 kg
// with its own rest.
async function addPlannedSets(versionId: number) {
  const [exercises] = await client.execute<Rows[]>(
    `SELECT tbe.id FROM template_block_exercise tbe
       JOIN template_block tb ON tb.id = tbe.template_block_id
      WHERE tb.session_version_id = ?`,
    [versionId],
  );
  for (const exercise of exercises) {
    await client.execute(
      "INSERT INTO planned_set (template_block_exercise_id, position, reps, weight_kg) VALUES (?, 1, 10, 40)",
      [exercise.id],
    );
    await client.execute(
      "INSERT INTO planned_set (template_block_exercise_id, position, reps, weight_kg, rest_after_seconds) VALUES (?, 2, 8, 45, 120)",
      [exercise.id],
    );
  }
}

beforeAll(async () => {
  lea = await createTestUser(PREFIX);
  someoneElse = await createTestUser(PREFIX);
});

afterAll(async () => {
  await deleteTestUsers(PREFIX);
  await client.end();
});

function startAs(user: TestUser, appointmentId: number) {
  return request(app)
    .post("/api/workout-sessions")
    .set("Origin", ORIGIN)
    .set("Cookie", user.cookie)
    .send({ appointment_id: appointmentId });
}

function get(path: string, cookie: string) {
  return request(app).get(path).set("Cookie", cookie);
}

// Ends a session so the user can start another one in the next test.
async function finish(workoutId: number) {
  await client.execute(
    "UPDATE workout_session SET status = 'completed', ended_at = NOW(3) WHERE id = ?",
    [workoutId],
  );
}

describe("POST /api/workout-sessions", () => {
  it("copies the plan, freezes it, marks the appointment attended and tells the current session", async () => {
    const { appointmentId, versionId } = await createTestAppointment(lea, {
      name: "Haut du corps",
      date: "2026-11-26",
      time: "18:30:00",
      blocks: [2, 1],
    });
    await addPlannedSets(versionId);

    const response = await startAs(lea, appointmentId);

    expect(response.status).toBe(201);
    const workoutId = Number(response.body.id);
    expect(workoutId).toBeGreaterThan(0);

    const [appointments] = await client.execute<Rows[]>(
      "SELECT status FROM appointment WHERE id = ?",
      [appointmentId],
    );
    expect(appointments[0]?.status).toBe("attended");

    const [blocks] = await client.execute<Rows[]>(
      "SELECT position, block_type, source_template_block_id FROM workout_block WHERE workout_session_id = ? ORDER BY position",
      [workoutId],
    );
    expect(blocks.map((row) => row.position)).toEqual([1, 2]);
    expect(blocks[0]?.source_template_block_id).not.toBeNull();

    const [sets] = await client.execute<Rows[]>(
      `SELECT wset.position, wset.reps_planned, wset.weight_planned_kg, wset.reps_actual,
              wset.weight_actual_kg, wset.planned_rest_seconds, wset.validated_at
         FROM workout_set wset
         JOIN workout_exercise we ON we.id = wset.workout_exercise_id
         JOIN workout_block wb ON wb.id = we.workout_block_id
        WHERE wb.workout_session_id = ?
        ORDER BY we.id, wset.position`,
      [workoutId],
    );
    // 3 exercises x 2 sets
    expect(sets).toHaveLength(6);
    expect(sets[0]).toMatchObject({
      position: 1,
      reps_planned: 10,
      reps_actual: null,
      weight_actual_kg: null,
      planned_rest_seconds: null,
      validated_at: null,
    });
    expect(Number(sets[0]?.weight_planned_kg)).toBe(40);
    expect(sets[1]).toMatchObject({
      position: 2,
      reps_planned: 8,
      planned_rest_seconds: 120,
    });

    // Changing the plan afterwards does not touch the copy (RM-041)
    await client.execute(
      `UPDATE planned_set ps JOIN template_block_exercise tbe ON tbe.id = ps.template_block_exercise_id
         JOIN template_block tb ON tb.id = tbe.template_block_id
          SET ps.reps = 99 WHERE tb.session_version_id = ?`,
      [versionId],
    );
    const [after] = await client.execute<Rows[]>(
      `SELECT wset.reps_planned FROM workout_set wset
         JOIN workout_exercise we ON we.id = wset.workout_exercise_id
         JOIN workout_block wb ON wb.id = we.workout_block_id
        WHERE wb.workout_session_id = ? ORDER BY we.id, wset.position LIMIT 1`,
      [workoutId],
    );
    expect(after[0]?.reps_planned).toBe(10);

    // The current session
    const current = await get("/api/workout-sessions/current", lea.cookie);
    expect(current.status).toBe(200);
    expect(current.body).toMatchObject({
      id: workoutId,
      appointment_id: appointmentId,
      session_name: "Haut du corps",
      validated_sets: 0,
      planned_sets: 6,
    });
    expect(new Date(current.body.started_at).getTime()).toBeGreaterThan(
      Date.now() - 60_000,
    );

    // The whole tree
    const tree = await get(`/api/workout-sessions/${workoutId}`, lea.cookie);
    expect(tree.status).toBe(200);
    expect(tree.body).toMatchObject({
      id: workoutId,
      session_name: "Haut du corps",
      program_name: null,
      status: "in_progress",
      ended_at: null,
    });
    expect(tree.body.blocks).toHaveLength(2);
    expect(tree.body.blocks[0].exercises).toHaveLength(2);
    expect(tree.body.blocks[1].exercises).toHaveLength(1);
    expect(tree.body.blocks[0].exercises[0].sets[0]).toMatchObject({
      position: 1,
      reps_planned: 10,
      weight_planned_kg: 40,
      reps_actual: null,
      validated_at: null,
    });
    expect(tree.body.blocks[0].exercises[0].name).toMatch(/^Exercice /);

    // The same appointment cannot start twice (it is attended now)
    const again = await startAs(lea, appointmentId);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("APPOINTMENT_NOT_STARTABLE");

    // Another appointment cannot start while this one runs (RM-040)
    const { appointmentId: otherId } = await createTestAppointment(lea, {
      name: "Jambes",
      date: "2026-11-27",
    });
    const second = await startAs(lea, otherId);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("WORKOUT_ALREADY_IN_PROGRESS");
    expect(second.body.error.message).toContain("Haut du corps");

    // Someone else cannot read it
    const theirs = await get(
      `/api/workout-sessions/${workoutId}`,
      someoneElse.cookie,
    );
    expect(theirs.status).toBe(404);

    await finish(workoutId);
  });

  it("keeps a single session when two starts arrive at the same time (DT-15)", async () => {
    const first = await createTestAppointment(lea, {
      name: "Simultanée A",
      date: "2026-11-28",
    });
    const second = await createTestAppointment(lea, {
      name: "Simultanée B",
      date: "2026-11-28",
    });

    const responses = await Promise.all([
      startAs(lea, first.appointmentId),
      startAs(lea, second.appointmentId),
    ]);

    const statuses = responses.map((response) => response.status).sort();
    expect(statuses).toEqual([201, 409]);
    const refused = responses.find((response) => response.status === 409);
    expect(refused?.body.error.code).toBe("WORKOUT_ALREADY_IN_PROGRESS");

    const [rows] = await client.execute<Rows[]>(
      "SELECT COUNT(*) AS total FROM workout_session WHERE owner_user_id = ? AND status = 'in_progress'",
      [lea.id],
    );
    expect(Number(rows[0]?.total)).toBe(1);

    const started = responses.find((response) => response.status === 201);
    await finish(Number(started?.body.id));
  });

  it("refuses a session without any exercise, another user's and a cancelled one", async () => {
    const empty = await createTestAppointment(lea, {
      name: "Vide",
      date: "2026-11-29",
      blocks: [],
    });
    const emptyResponse = await startAs(lea, empty.appointmentId);
    expect(emptyResponse.status).toBe(422);
    expect(emptyResponse.body.error.code).toBe("SESSION_WITHOUT_EXERCISE");

    const theirs = await createTestAppointment(someoneElse, {
      name: "Pas la mienne",
      date: "2026-11-29",
    });
    const notMine = await startAs(lea, theirs.appointmentId);
    expect(notMine.status).toBe(404);

    const cancelled = await createTestAppointment(lea, {
      name: "Annulée",
      date: "2026-11-29",
    });
    await client.execute<Result>(
      "UPDATE appointment SET status = 'cancelled', cancelled_at = NOW(3) WHERE id = ?",
      [cancelled.appointmentId],
    );
    const cancelledResponse = await startAs(lea, cancelled.appointmentId);
    expect(cancelledResponse.status).toBe(409);
    expect(cancelledResponse.body.error.code).toBe("APPOINTMENT_NOT_STARTABLE");

    expect((await startAs(lea, 999_999_999)).status).toBe(404);
    const invalid = await request(app)
      .post("/api/workout-sessions")
      .set("Origin", ORIGIN)
      .set("Cookie", lea.cookie)
      .send({ appointment_id: "abc" });
    expect(invalid.status).toBe(400);
  });

  it("answers 401 without a cookie, and null when nothing is in progress", async () => {
    expect(
      (await request(app).get("/api/workout-sessions/current")).status,
    ).toBe(401);
    const nothing = await get(
      "/api/workout-sessions/current",
      someoneElse.cookie,
    );
    expect(nothing.status).toBe(200);
    expect(nothing.body).toBeNull();
  });
});

describe("GET /api/appointments/:id", () => {
  it("gives the planned session with its blocks and exercise names", async () => {
    const { appointmentId } = await createTestAppointment(lea, {
      name: "Détail",
      date: "2026-12-01",
      time: "07:00:00",
      blocks: [2],
    });

    const response = await get(
      `/api/appointments/${appointmentId}`,
      lea.cookie,
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: appointmentId,
      planned_date: "2026-12-01",
      planned_time: "07:00",
      status: "planned",
      session_name: "Détail",
      program_name: null,
      workout_session: null,
    });
    expect(response.body.blocks).toHaveLength(1);
    expect(response.body.blocks[0]).toMatchObject({
      block_type: "classic",
      position: 1,
    });
    expect(response.body.blocks[0].exercises).toHaveLength(2);
    expect(response.body.blocks[0].exercises[0].name).toMatch(/^Exercice /);

    expect(
      (await get(`/api/appointments/${appointmentId}`, someoneElse.cookie))
        .status,
    ).toBe(404);
    expect((await get("/api/appointments/abc", lea.cookie)).status).toBe(400);
  });
});
