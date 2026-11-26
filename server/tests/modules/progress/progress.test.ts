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
