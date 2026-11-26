import { addDays, todayInParis } from "shared";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../../../src/app.js";
import client, { type Rows } from "../../../src/database/client.js";
import {
  createTestAppointment,
  createTestUser,
  deleteTestUsers,
  type TestUser,
} from "../../helpers/fixtures.js";

// US-38: a session done without the app is written afterwards, on its real
// date (RM-050, RM-054, RM-057, RM-058).

const PREFIX = "test_declare_";
const ORIGIN = "http://localhost:3000";

let lea: TestUser;
let someoneElse: TestUser;

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

// Gives every exercise of a version the reps measure and two planned sets.
async function prepareVersion(versionId: number) {
  const [measures] = await client.query<Rows[]>(
    "SELECT id FROM measure WHERE code = 'reps'",
  );
  const [exercises] = await client.execute<Rows[]>(
    `SELECT tbe.id, tbe.exercise_id FROM template_block_exercise tbe
       JOIN template_block tb ON tb.id = tbe.template_block_id
      WHERE tb.session_version_id = ?`,
    [versionId],
  );
  for (const exercise of exercises) {
    await client.execute(
      "INSERT INTO exercise_measure (exercise_id, measure_id) VALUES (?, ?)",
      [exercise.exercise_id, measures[0]?.id],
    );
    for (const position of [1, 2]) {
      await client.execute(
        "INSERT INTO planned_set (template_block_exercise_id, position, reps) VALUES (?, ?, 10)",
        [exercise.id, position],
      );
    }
  }
}

// A session of three days ago, waiting for an answer (US-27).
async function pastAppointment(user: TestUser, status: string) {
  const { appointmentId, versionId } = await createTestAppointment(user, {
    name: "Cardio léger",
    date: addDays(todayInParis(), -3),
    time: "18:30",
    blocks: [1],
  });
  await prepareVersion(versionId);
  await client.execute("UPDATE appointment SET status = ? WHERE id = ?", [
    status,
    appointmentId,
  ]);
  return appointmentId;
}

function declaration(id: number, user: TestUser) {
  return request(app)
    .get(`/api/appointments/${id}/declaration`)
    .set("Cookie", user.cookie);
}

function declare(id: number, body: object, user: TestUser) {
  return request(app)
    .post(`/api/appointments/${id}/declare-done`)
    .set("Origin", ORIGIN)
    .set("Cookie", user.cookie)
    .send(body);
}

beforeAll(async () => {
  lea = await createTestUser(PREFIX);
  someoneElse = await createTestUser(PREFIX);
}, 120_000);

afterAll(async () => {
  await client.query(
    "DELETE em FROM exercise_measure em JOIN exercise e ON e.id = em.exercise_id JOIN `user` u ON u.id = e.owner_user_id WHERE u.username LIKE ?",
    [`${PREFIX}%`],
  );
  await deleteTestUsers(PREFIX);
  await client.end();
});

describe("GET /api/appointments/:id/declaration", () => {
  it("gives the plan, set by set, with the id of each planned set", async () => {
    const id = await pastAppointment(lea, "to_confirm");

    const response = await declaration(id, lea);

    expect(response.status).toBe(200);
    expect(response.body.appointment).toMatchObject({
      session_name: "Cardio léger",
      planned_time: "18:30",
      status: "to_confirm",
    });
    const sets = response.body.blocks[0].exercises[0].sets;
    expect(sets).toHaveLength(2);
    expect(sets[0]).toMatchObject({
      reps_planned: 10,
      reps_actual: null,
      validated_at: null,
    });
    expect(sets[0].id).toEqual(expect.any(Number));
  });

  it("refuses a session that is not waiting for an answer", async () => {
    const { appointmentId } = await createTestAppointment(lea, {
      name: "Demain",
      date: addDays(todayInParis(), 1),
    });

    const response = await declaration(appointmentId, lea);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("APPOINTMENT_NOT_DECLARABLE");
  });
});

describe("POST /api/appointments/:id/declare-done", () => {
  it("writes the session on its real date, with only the confirmed sets", async () => {
    const id = await pastAppointment(lea, "missed");
    const plan = await declaration(id, lea);
    const sets = plan.body.blocks[0].exercises[0].sets;
    const actualDate = addDays(todayInParis(), -2);

    const response = await declare(
      id,
      {
        actual_date: actualDate,
        sets: [
          { planned_set_id: sets[0].id, values: { ...emptyValues, reps: 12 } },
        ],
      },
      lea,
    );

    expect(response.status).toBe(201);
    const workoutId = Number(response.body.id);

    const [rows] = await client.execute<Rows[]>(
      `SELECT status, declared_afterwards, started_at, ended_at
         FROM workout_session WHERE id = ?`,
      [workoutId],
    );
    // Not everything was confirmed: the session is unfinished (RM-046)
    expect(rows[0]?.status).toBe("unfinished");
    expect(Number(rows[0]?.declared_afterwards)).toBe(1);
    expect(
      new Date(rows[0]?.started_at as Date).toISOString().slice(0, 10),
    ).toBe(actualDate);

    const [written] = await client.execute<Rows[]>(
      `SELECT wset.reps_planned, wset.reps_actual, wset.validated_at
         FROM workout_set wset
         JOIN workout_exercise we ON we.id = wset.workout_exercise_id
         JOIN workout_block wb ON wb.id = we.workout_block_id
        WHERE wb.workout_session_id = ?
        ORDER BY wset.position`,
      [workoutId],
    );
    expect(written).toHaveLength(2);
    expect(written[0]).toMatchObject({ reps_planned: 10, reps_actual: 12 });
    expect(written[0]?.validated_at).not.toBeNull();
    // The set nobody confirmed stays undone
    expect(written[1]?.reps_actual).toBeNull();
    expect(written[1]?.validated_at).toBeNull();

    // The appointment is attended, and the plan never moved
    const [appointment] = await client.execute<Rows[]>(
      "SELECT status, planned_date FROM appointment WHERE id = ?",
      [id],
    );
    expect(appointment[0]?.status).toBe("attended");
    expect(appointment[0]?.planned_date).toBe(addDays(todayInParis(), -3));

    // A second declaration is refused (RM-038)
    const again = await declare(id, { actual_date: actualDate, sets: [] }, lea);
    expect(again.status).toBe(409);
  });

  it("marks the session finished when every set is confirmed, and reads the notification", async () => {
    const id = await pastAppointment(lea, "missed");
    await client.execute(
      `INSERT INTO notification (user_id, type, title, appointment_id)
       VALUES (?, 'session_missed', 'Séance manquée', ?)`,
      [lea.id, id],
    );
    const plan = await declaration(id, lea);
    const sets = plan.body.blocks[0].exercises[0].sets;

    const response = await declare(
      id,
      {
        actual_date: todayInParis(),
        sets: sets.map((set: { id: number }) => ({
          planned_set_id: set.id,
          values: { ...emptyValues, reps: 10 },
        })),
      },
      lea,
    );

    expect(response.status).toBe(201);
    const [rows] = await client.execute<Rows[]>(
      "SELECT status FROM workout_session WHERE id = ?",
      [Number(response.body.id)],
    );
    expect(rows[0]?.status).toBe("completed");

    const [notifications] = await client.execute<Rows[]>(
      "SELECT read_at FROM notification WHERE appointment_id = ?",
      [id],
    );
    expect(notifications[0]?.read_at).not.toBeNull();
  });

  it("refuses a date in the future, a set of another session and somebody else", async () => {
    const id = await pastAppointment(lea, "to_confirm");
    const plan = await declaration(id, lea);
    const sets = plan.body.blocks[0].exercises[0].sets;

    const future = await declare(
      id,
      { actual_date: addDays(todayInParis(), 1), sets: [] },
      lea,
    );
    expect(future.status).toBe(400);
    expect(future.body.error.code).toBe("DATE_IN_THE_FUTURE");

    const stranger = await declare(
      id,
      { actual_date: todayInParis(), sets: [] },
      someoneElse,
    );
    expect(stranger.status).toBe(404);

    const wrongSet = await declare(
      id,
      {
        actual_date: todayInParis(),
        sets: [
          { planned_set_id: 999_999_999, values: { ...emptyValues, reps: 5 } },
          { planned_set_id: sets[0].id, values: { ...emptyValues, reps: 5 } },
        ],
      },
      lea,
    );
    expect(wrongSet.status).toBe(422);
    expect(wrongSet.body.error.code).toBe("SET_NOT_IN_SESSION");

    // Nothing was written: the appointment is untouched
    const [rows] = await client.execute<Rows[]>(
      "SELECT status FROM appointment WHERE id = ?",
      [id],
    );
    expect(rows[0]?.status).toBe("to_confirm");
  });
});
