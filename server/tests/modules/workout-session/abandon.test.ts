import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../../../src/app.js";
import client, { type Rows } from "../../../src/database/client.js";
import { closeInactiveWorkoutSessions } from "../../../src/modules/workout-session/workoutSessionRepository.js";
import { ensureCatalog } from "../../helpers/catalog.js";
import {
  createTestAppointment,
  createTestUser,
  deleteTestUsers,
  type TestUser,
} from "../../helpers/fixtures.js";

const PREFIX = "test_abandon_";
const ORIGIN = "http://localhost:3000";

let lea: TestUser;
let someoneElse: TestUser;

beforeAll(async () => {
  await ensureCatalog();
  lea = await createTestUser(PREFIX);
  someoneElse = await createTestUser(PREFIX);
});

afterAll(async () => {
  await client.query(
    "DELETE em FROM exercise_measure em JOIN exercise e ON e.id = em.exercise_id JOIN `user` u ON u.id = e.owner_user_id WHERE u.username LIKE ?",
    [`${PREFIX}%`],
  );
  await deleteTestUsers(PREFIX);
  await client.end();
});

async function startSession(user: TestUser, name: string): Promise<number> {
  const { appointmentId, versionId } = await createTestAppointment(user, {
    name,
    date: "2026-11-26",
    blocks: [1],
  });
  const [exercises] = await client.execute<Rows[]>(
    `SELECT tbe.id, tbe.exercise_id FROM template_block_exercise tbe
       JOIN template_block tb ON tb.id = tbe.template_block_id
      WHERE tb.session_version_id = ?`,
    [versionId],
  );
  // The fixture exercise measures reps, so a set can be validated
  await client.execute(
    "INSERT INTO exercise_measure (exercise_id, measure_id) SELECT ?, id FROM measure WHERE code = 'reps'",
    [exercises[0]?.exercise_id],
  );
  await client.execute(
    "INSERT INTO planned_set (template_block_exercise_id, position, reps) VALUES (?, 1, 10)",
    [exercises[0]?.id],
  );
  const response = await request(app)
    .post("/api/workout-sessions")
    .set("Origin", ORIGIN)
    .set("Cookie", user.cookie)
    .send({ appointment_id: appointmentId });
  expect(response.status).toBe(201);
  return Number(response.body.id);
}

function complete(id: number, cookie: string) {
  return request(app)
    .post(`/api/workout-sessions/${id}/complete`)
    .set("Origin", ORIGIN)
    .set("Cookie", cookie);
}

function abandon(id: number, cookie: string) {
  return request(app)
    .post(`/api/workout-sessions/${id}/abandon`)
    .set("Origin", ORIGIN)
    .set("Cookie", cookie);
}

describe("POST /api/workout-sessions/:id/abandon", () => {
  it("ends the session as unfinished, keeps the validated sets and the attended appointment", async () => {
    const id = await startSession(lea, "Abandonnée");
    const tree = await request(app)
      .get(`/api/workout-sessions/${id}`)
      .set("Cookie", lea.cookie);
    const setId = tree.body.blocks[0].exercises[0].sets[0].id;
    await request(app)
      .put(`/api/workout-sets/${setId}`)
      .set("Origin", ORIGIN)
      .set("Cookie", lea.cookie)
      .send({
        reps: 10,
        weight_kg: null,
        weight_left_kg: null,
        weight_right_kg: null,
        duration_seconds: null,
        distance_meters: null,
        speed_kmh: null,
        resistance: null,
        incline_percent: null,
        calories: null,
      })
      .expect(200);

    const response = await abandon(id, lea.cookie);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id,
      status: "unfinished",
      auto_closed: false,
    });
    expect(response.body.ended_at).toEqual(expect.any(String));
    expect(response.body.blocks[0].exercises[0].sets[0]).toMatchObject({
      reps_actual: 10,
    });

    const [appointments] = await client.execute<Rows[]>(
      "SELECT a.status FROM appointment a JOIN workout_session ws ON ws.appointment_id = a.id WHERE ws.id = ?",
      [id],
    );
    expect(appointments[0]?.status).toBe("attended");

    // Over: no second abandon, no more set validation
    const again = await abandon(id, lea.cookie);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("WORKOUT_NOT_IN_PROGRESS");

    const current = await request(app)
      .get("/api/workout-sessions/current")
      .set("Cookie", lea.cookie);
    expect(current.body).toBeNull();
  });

  it("answers 404 for another user's session", async () => {
    const id = await startSession(someoneElse, "Pas la mienne");

    expect((await abandon(id, lea.cookie)).status).toBe(404);
    expect((await abandon(999_999_999, lea.cookie)).status).toBe(404);

    await abandon(id, someoneElse.cookie).expect(200);
  });
});

describe("closeInactiveWorkoutSessions", () => {
  it("closes a session inactive for 4 h 01 and leaves one at 3 h 59", async () => {
    const fresh = await startSession(lea, "Récente");
    // Started 5 hours ago (the end can never precede the start, ck_workout_end)
    await client.execute(
      "UPDATE workout_session SET started_at = NOW(3) - INTERVAL 300 MINUTE, last_activity_at = NOW(3) - INTERVAL 239 MINUTE WHERE id = ?",
      [fresh],
    );
    await closeInactiveWorkoutSessions();
    const [stillOpen] = await client.execute<Rows[]>(
      "SELECT status, auto_closed FROM workout_session WHERE id = ?",
      [fresh],
    );
    expect(stillOpen[0]).toMatchObject({
      status: "in_progress",
      auto_closed: 0,
    });

    await client.execute(
      "UPDATE workout_session SET last_activity_at = NOW(3) - INTERVAL 241 MINUTE WHERE id = ?",
      [fresh],
    );
    const closed = await closeInactiveWorkoutSessions();

    expect(closed).toBeGreaterThanOrEqual(1);
    const [row] = await client.execute<Rows[]>(
      "SELECT status, auto_closed, ended_at, last_activity_at FROM workout_session WHERE id = ?",
      [fresh],
    );
    expect(row[0]).toMatchObject({ status: "unfinished", auto_closed: 1 });
    expect(new Date(row[0]?.ended_at).getTime()).toBe(
      new Date(row[0]?.last_activity_at).getTime(),
    );

    const tree = await request(app)
      .get(`/api/workout-sessions/${fresh}`)
      .set("Cookie", lea.cookie);
    expect(tree.body).toMatchObject({
      status: "unfinished",
      auto_closed: true,
    });
  });
});

describe("POST /api/workout-sessions/:id/complete", () => {
  it("refuses without any validated set, then completes and leaves the others empty", async () => {
    const id = await startSession(lea, "Terminée");
    await client.execute(
      `INSERT INTO workout_set (workout_exercise_id, position, reps_planned)
       SELECT we.id, 2, 8 FROM workout_exercise we
         JOIN workout_block wb ON wb.id = we.workout_block_id
        WHERE wb.workout_session_id = ?`,
      [id],
    );

    const empty = await complete(id, lea.cookie);
    expect(empty.status).toBe(422);
    expect(empty.body.error.code).toBe("NO_VALIDATED_SET");

    const tree = await request(app)
      .get(`/api/workout-sessions/${id}`)
      .set("Cookie", lea.cookie);
    const [first] = tree.body.blocks[0].exercises[0].sets;
    await request(app)
      .put(`/api/workout-sets/${first.id}`)
      .set("Origin", ORIGIN)
      .set("Cookie", lea.cookie)
      .send({
        reps: 10,
        weight_kg: null,
        weight_left_kg: null,
        weight_right_kg: null,
        duration_seconds: null,
        distance_meters: null,
        speed_kmh: null,
        resistance: null,
        incline_percent: null,
        calories: null,
      })
      .expect(200);

    const response = await complete(id, lea.cookie);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id, status: "completed" });
    expect(response.body.ended_at).toEqual(expect.any(String));
    const sets = response.body.blocks[0].exercises[0].sets;
    expect(sets[0].validated_at).toEqual(expect.any(String));
    expect(sets[1].validated_at).toBeNull();

    expect((await complete(id, lea.cookie)).status).toBe(409);
    expect((await abandon(id, lea.cookie)).status).toBe(409);
  });

  it("answers 404 for another user's session", async () => {
    const id = await startSession(someoneElse, "Pas la mienne non plus");
    expect((await complete(id, lea.cookie)).status).toBe(404);
    await abandon(id, someoneElse.cookie).expect(200);
  });
});
