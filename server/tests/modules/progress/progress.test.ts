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

// US-39: the progress of an exercise, computed from the validated sets of
// the finished or unfinished sessions (RM-051, RM-081).

const PREFIX = "test_progress_";

let lea: TestUser;
let someoneElse: TestUser;
let benchId: number;

// One session done on a day, with its sets on one exercise.
async function doSession(
  user: TestUser,
  exerciseId: number,
  date: string,
  status: "completed" | "unfinished",
  sets: { reps: number; weight: number }[],
) {
  const { appointmentId, versionId } = await createTestAppointment(user, {
    name: `Séance ${date}`,
    date,
    blocks: [0],
  });
  const [block] = await client.execute<Rows[] & { insertId: number }[]>(
    "INSERT INTO template_block (session_version_id, block_type, position) VALUES (?, 'classic', 9)",
    [versionId],
  );
  const blockId = (block as unknown as { insertId: number }).insertId;
  const [tbe] = await client.execute<Rows[] & { insertId: number }[]>(
    "INSERT INTO template_block_exercise (template_block_id, exercise_id, position) VALUES (?, ?, 1)",
    [blockId, exerciseId],
  );
  const tbeId = (tbe as unknown as { insertId: number }).insertId;

  const [session] = await client.execute<Rows[] & { insertId: number }[]>(
    `INSERT INTO workout_session (appointment_id, owner_user_id, status, started_at,
        ended_at, last_activity_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      appointmentId,
      user.id,
      status,
      `${date} 07:00:00`,
      `${date} 08:00:00`,
      `${date} 08:00:00`,
    ],
  );
  const sessionId = (session as unknown as { insertId: number }).insertId;
  const [workoutBlock] = await client.execute<Rows[] & { insertId: number }[]>(
    `INSERT INTO workout_block (workout_session_id, source_template_block_id, block_type, position)
     VALUES (?, ?, 'classic', 1)`,
    [sessionId, blockId],
  );
  const workoutBlockId = (workoutBlock as unknown as { insertId: number })
    .insertId;
  const [workoutExercise] = await client.execute<
    Rows[] & { insertId: number }[]
  >(
    `INSERT INTO workout_exercise (workout_block_id, exercise_id,
        source_template_block_exercise_id, position)
     VALUES (?, ?, ?, 1)`,
    [workoutBlockId, exerciseId, tbeId],
  );
  const workoutExerciseId = (workoutExercise as unknown as { insertId: number })
    .insertId;

  for (const [index, set] of sets.entries()) {
    await client.execute(
      `INSERT INTO workout_set (workout_exercise_id, position, reps_planned,
          reps_actual, weight_actual_kg, validated_at)
       VALUES (?, ?, ?, ?, ?, NOW(3))`,
      [workoutExerciseId, index + 1, set.reps, set.reps, set.weight],
    );
  }
  await client.execute(
    "UPDATE appointment SET status = 'attended' WHERE id = ?",
    [appointmentId],
  );
}

// A session started through the API, with its sets filled in: the end of
// the session is what looks for records (US-40).
async function startSessionWith(
  user: TestUser,
  exerciseId: number,
  date: string,
  sets: { reps: number; weight: number }[],
) {
  const { appointmentId, versionId } = await createTestAppointment(user, {
    name: `Record ${date}`,
    date,
    blocks: [0],
  });
  const [block] = await client.execute<Rows[] & { insertId: number }[]>(
    "INSERT INTO template_block (session_version_id, block_type, position) VALUES (?, 'classic', 2)",
    [versionId],
  );
  const blockId = (block as unknown as { insertId: number }).insertId;
  const [tbe] = await client.execute<Rows[] & { insertId: number }[]>(
    "INSERT INTO template_block_exercise (template_block_id, exercise_id, position) VALUES (?, ?, 1)",
    [blockId, exerciseId],
  );
  const tbeId = (tbe as unknown as { insertId: number }).insertId;
  for (const [index, set] of sets.entries()) {
    await client.execute(
      "INSERT INTO planned_set (template_block_exercise_id, position, reps, weight_kg) VALUES (?, ?, ?, ?)",
      [tbeId, index + 1, set.reps, set.weight],
    );
  }

  const started = await request(app)
    .post("/api/workout-sessions")
    .set("Origin", "http://localhost:3000")
    .set("Cookie", user.cookie)
    .send({ appointment_id: appointmentId });
  expect(started.status).toBe(201);
  const workoutId = Number(started.body.id);

  const tree = await request(app)
    .get(`/api/workout-sessions/${workoutId}`)
    .set("Cookie", user.cookie);
  const copied = tree.body.blocks
    .flatMap(
      (block: { exercises: { exercise_id: number; sets: unknown[] }[] }) =>
        block.exercises,
    )
    .find(
      (one: { exercise_id: number }) => one.exercise_id === exerciseId,
    ).sets;
  for (const [index, set] of sets.entries()) {
    const written = await request(app)
      .put(`/api/workout-sets/${copied[index].id}`)
      .set("Origin", "http://localhost:3000")
      .set("Cookie", user.cookie)
      .send({
        reps: set.reps,
        weight_kg: set.weight,
        duration_seconds: null,
        distance_meters: null,
        speed_kmh: null,
        resistance: null,
        incline_percent: null,
        calories: null,
      });
    expect(written.status).toBe(200);
  }
  return { workoutId, appointmentId };
}

beforeAll(async () => {
  lea = await createTestUser(PREFIX);
  someoneElse = await createTestUser(PREFIX);

  const [exercise] = await client.execute<Rows[] & { insertId: number }[]>(
    "INSERT INTO exercise (owner_user_id, slug, name, difficulty) VALUES (?, ?, 'Développé couché', 'beginner')",
    [lea.id, `${lea.username}-bench`],
  );
  benchId = (exercise as unknown as { insertId: number }).insertId;
  const [measures] = await client.query<Rows[]>(
    "SELECT id, code FROM measure WHERE code IN ('reps', 'weight')",
  );
  for (const measure of measures) {
    await client.execute(
      "INSERT INTO exercise_measure (exercise_id, measure_id) VALUES (?, ?)",
      [benchId, measure.id],
    );
  }

  // The two sessions of SUI-09
  await doSession(lea, benchId, "2026-11-12", "completed", [
    { reps: 10, weight: 50 },
    { reps: 8, weight: 50 },
  ]);
  await doSession(lea, benchId, "2026-11-19", "completed", [
    { reps: 8, weight: 62.5 },
    { reps: 8, weight: 60 },
  ]);
}, 120_000);

afterAll(async () => {
  await client.query(
    "DELETE n FROM notification n JOIN `user` u ON u.id = n.user_id WHERE u.username LIKE ?",
    [`${PREFIX}%`],
  );
  await client.query(
    "DELETE em FROM exercise_measure em JOIN exercise e ON e.id = em.exercise_id JOIN `user` u ON u.id = e.owner_user_id WHERE u.username LIKE ?",
    [`${PREFIX}%`],
  );
  await deleteTestUsers(PREFIX);
  await client.end();
});

describe("GET /api/progress/exercises", () => {
  it("lists the exercises already done, with their best result", async () => {
    const response = await request(app)
      .get("/api/progress/exercises")
      .set("Cookie", lea.cookie);

    expect(response.status).toBe(200);
    const bench = response.body.find(
      (item: { exercise_id: number }) => item.exercise_id === benchId,
    );
    expect(bench).toMatchObject({
      name: "Développé couché",
      last_date: "2026-11-19",
      session_count: 2,
      best: "62,5 kg × 8",
    });
  });

  it("searches by name and shows nothing to somebody else", async () => {
    const found = await request(app)
      .get("/api/progress/exercises?search=couch")
      .set("Cookie", lea.cookie);
    expect(
      found.body.some(
        (item: { exercise_id: number }) => item.exercise_id === benchId,
      ),
    ).toBe(true);

    const missing = await request(app)
      .get("/api/progress/exercises?search=rameur")
      .set("Cookie", lea.cookie);
    expect(
      missing.body.some(
        (item: { exercise_id: number }) => item.exercise_id === benchId,
      ),
    ).toBe(false);

    const theirs = await request(app)
      .get("/api/progress/exercises")
      .set("Cookie", someoneElse.cookie);
    expect(theirs.body).toEqual([]);
  });
});

describe("GET /api/progress/exercises/:id", () => {
  it("gives every validated set, oldest first", async () => {
    const response = await request(app)
      .get(`/api/progress/exercises/${benchId}`)
      .set("Cookie", lea.cookie);

    expect(response.status).toBe(200);
    expect(response.body.name).toBe("Développé couché");
    expect(
      response.body.sets.map((set: { date: string; weight_kg: number }) => [
        set.date,
        set.weight_kg,
      ]),
    ).toEqual([
      ["2026-11-12", 50],
      ["2026-11-12", 50],
      ["2026-11-19", 62.5],
      ["2026-11-19", 60],
    ]);
  });

  it("gives an empty list for an exercise never done", async () => {
    const [created] = await client.execute<Rows[] & { insertId: number }[]>(
      "INSERT INTO exercise (owner_user_id, slug, name, difficulty) VALUES (?, ?, 'Jamais fait', 'beginner')",
      [lea.id, `${lea.username}-never`],
    );
    const id = (created as unknown as { insertId: number }).insertId;

    const response = await request(app)
      .get(`/api/progress/exercises/${id}`)
      .set("Cookie", lea.cookie);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ name: "Jamais fait", sets: [] });
  });

  it("answers 404 for an exercise of somebody else", async () => {
    const response = await request(app)
      .get(`/api/progress/exercises/${benchId}`)
      .set("Cookie", someoneElse.cookie);

    expect(response.status).toBe(404);
  });
});

// US-40: a new maximum writes a notification; a correction downwards
// takes it back (RM-055, RM-080).
describe("records personnels", () => {
  async function readRecordNotifications() {
    const [rows] = await client.execute<Rows[]>(
      `SELECT n.message, n.exercise_id
         FROM notification n
        WHERE n.user_id = ? AND n.type = 'personal_record'
        ORDER BY n.id`,
      [lea.id],
    );
    return rows as { message: string; exercise_id: number }[];
  }

  it("writes one notification when a session beats everything before", async () => {
    const { workoutId, appointmentId } = await startSessionWith(
      lea,
      benchId,
      "2026-11-26",
      [{ reps: 8, weight: 70 }],
    );

    const finished = await request(app)
      .post(`/api/workout-sessions/${workoutId}/complete`)
      .set("Origin", "http://localhost:3000")
      .set("Cookie", lea.cookie);
    expect(finished.status).toBe(200);

    const notifications = await readRecordNotifications();
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.message).toBe(
      "Développé couché · charge max : 70 kg × 8",
    );
    expect(Number(notifications[0]?.exercise_id)).toBe(benchId);

    // A second call changes nothing (RM-055)
    await request(app)
      .post(`/api/workout-sessions/${workoutId}/complete`)
      .set("Origin", "http://localhost:3000")
      .set("Cookie", lea.cookie);
    expect(await readRecordNotifications()).toHaveLength(1);

    // Corrected downwards: the record is not one any more (RM-080)
    const [sets] = await client.execute<Rows[]>(
      `SELECT wset.id FROM workout_set wset
         JOIN workout_exercise we ON we.id = wset.workout_exercise_id
         JOIN workout_block wb ON wb.id = we.workout_block_id
        WHERE wb.workout_session_id = ?`,
      [workoutId],
    );
    const setId = Number((sets[0] as { id: number }).id);
    const corrected = await request(app)
      .put(`/api/workout-sets/${setId}/correction`)
      .set("Origin", "http://localhost:3000")
      .set("Cookie", lea.cookie)
      .send({
        reps: 8,
        weight_kg: 40,
        duration_seconds: null,
        distance_meters: null,
        speed_kmh: null,
        resistance: null,
        incline_percent: null,
        calories: null,
      });

    expect(corrected.status).toBe(200);
    expect(await readRecordNotifications()).toHaveLength(0);
    expect(appointmentId).toEqual(expect.any(Number));
  });
});

// US-41: the summary of a period (RM-076, RM-077).
describe("GET /api/progress/summary", () => {
  it("counts every appointment once, and says what was done", async () => {
    const response = await request(app)
      .get("/api/progress/summary?period=month&date=2026-11-15")
      .set("Cookie", lea.cookie);

    expect(response.status).toBe(200);
    const { regularity, work, comparison } = response.body;
    // The sum of the categories is the number of planned sessions
    expect(
      regularity.done +
        regularity.unfinished +
        regularity.to_confirm +
        regularity.missed +
        regularity.cancelled +
        regularity.upcoming,
    ).toBe(regularity.planned);
    expect(regularity.done).toBeGreaterThanOrEqual(2);
    expect(work.sessions).toBeGreaterThanOrEqual(2);
    // A month is compared with the same number of days before (RM-077)
    expect(comparison).toMatchObject({
      from: "2026-10-01",
      to: "2026-10-15",
    });
  });

  it("gives an empty week and the records of the period", async () => {
    const response = await request(app)
      .get("/api/progress/summary?period=week&date=2020-01-06")
      .set("Cookie", lea.cookie);

    expect(response.status).toBe(200);
    expect(response.body.regularity.planned).toBe(0);
    expect(response.body.work.sessions).toBe(0);
    expect(response.body.comparison).toBeNull();
    expect(response.body.records).toEqual([]);
  });

  it("refuses an unknown period and a program of somebody else", async () => {
    const bad = await request(app)
      .get("/api/progress/summary?period=trimestre")
      .set("Cookie", lea.cookie);
    expect(bad.status).toBe(400);

    const [created] = await client.execute<Rows[] & { insertId: number }[]>(
      `INSERT INTO program (owner_user_id, name, start_date, end_date, status)
       VALUES (?, 'Pas le mien', '2026-11-02', '2026-12-13', 'programmed')`,
      [someoneElse.id],
    );
    const programId = (created as unknown as { insertId: number }).insertId;

    const theirs = await request(app)
      .get(`/api/progress/summary?period=program&program_id=${programId}`)
      .set("Cookie", lea.cookie);
    expect(theirs.status).toBe(404);

    await client.execute("DELETE FROM program WHERE id = ?", [programId]);
  });
});

// US-50: the sets of each muscle over the period (RM-078, D-19).
describe("les muscles travaillés", () => {
  it("counts a main muscle once and a secondary one by half", async () => {
    const [muscles] = await client.query<Rows[]>(
      "SELECT id, code FROM muscle WHERE code IN ('chest', 'triceps')",
    );
    for (const muscle of muscles) {
      await client.execute(
        "INSERT INTO exercise_muscle (exercise_id, muscle_id, role) VALUES (?, ?, ?)",
        [benchId, muscle.id, muscle.code === "chest" ? "primary" : "secondary"],
      );
    }

    const response = await request(app)
      .get("/api/progress/summary?period=month&date=2026-11-15")
      .set("Cookie", lea.cookie);

    expect(response.status).toBe(200);
    const byCode = new Map(
      response.body.muscles.map((muscle: { code: string; sets: number }) => [
        muscle.code,
        muscle.sets,
      ]),
    );
    // Every validated set of the bench press counts once for the chest
    // and half for the triceps (RM-078)
    const chest = Number(byCode.get("chest"));
    expect(chest).toBeGreaterThanOrEqual(4);
    expect(Number(byCode.get("triceps"))).toBe(chest / 2);

    await client.execute("DELETE FROM exercise_muscle WHERE exercise_id = ?", [
      benchId,
    ]);
  });
});
