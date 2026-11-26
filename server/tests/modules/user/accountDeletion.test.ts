import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import request from "supertest";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import app from "../../../src/app.js";
import client from "../../../src/database/client.js";
import { authLimiterStore } from "../../../src/middlewares/rateLimiters.js";
import {
  createTestAppointment,
  deleteTestUsers,
} from "../../helpers/fixtures.js";

// US-06: deleting an account empties every table that holds its data
// (RM-006, DT-17). Its own prefix, so parallel files never collide.
const ORIGIN = "http://localhost:3000";
const PREFIX = "test_delete_";
const PASSWORD = "secret-2026";

function uniqueSignup() {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 100_000)}`;
  return {
    username: `${PREFIX}${stamp}`,
    email: `${PREFIX}${stamp}@exemple.fr`,
    password: PASSWORD,
    terms_accepted: true,
  };
}

function readSetCookie(headers: Record<string, unknown>): string {
  const value = headers["set-cookie"];
  return Array.isArray(value) ? String(value[0]) : String(value);
}

// A real account, with a real hash: the deletion checks the password.
async function createAccount() {
  const body = uniqueSignup();
  const response = await request(app)
    .post("/api/users")
    .set("Origin", ORIGIN)
    .send(body);
  expect(response.status).toBe(201);
  return {
    id: Number(response.body.id),
    username: body.username,
    cookie: readSetCookie(response.headers),
  };
}

async function insert(sql: string, values: unknown[]): Promise<number> {
  const [result] = await client.execute<ResultSetHeader>(sql, values);
  return result.insertId;
}

async function count(sql: string, values: unknown[]): Promise<number> {
  const [rows] = await client.execute<RowDataPacket[]>(sql, values);
  return Number(rows[0]?.total ?? -1);
}

// Everything a user can own: a session template and its appointment, a
// realized session down to its sides, a program with its weeks and its
// history, a notification and a personal exercise with its links.
async function fillAccount(user: {
  id: number;
  username: string;
  cookie: string;
}) {
  const { appointmentId, versionId } = await createTestAppointment(user, {
    name: "Haut du corps",
    date: "2026-11-20",
    blocks: [1],
  });

  const [exercises] = await client.execute<RowDataPacket[]>(
    "SELECT e.id FROM exercise e WHERE e.owner_user_id = ?",
    [user.id],
  );
  const exerciseId = Number(exercises[0]?.id);

  // The links of a personal exercise
  await client.execute(
    "INSERT INTO exercise_text (exercise_id, `type`, position, content) VALUES (?, 'instruction', 1, 'Garde le dos droit.')",
    [exerciseId],
  );
  for (const [table, source] of [
    ["exercise_category", "category"],
    ["exercise_equipment", "equipment"],
    ["exercise_measure", "measure"],
  ] as const) {
    await client.query(
      `INSERT INTO ${table} (exercise_id, ${source}_id) SELECT ?, id FROM ${source} LIMIT 1`,
      [exerciseId],
    );
  }
  await client.query(
    "INSERT INTO exercise_muscle (exercise_id, muscle_id, role) SELECT ?, id, 'primary' FROM muscle LIMIT 1",
    [exerciseId],
  );

  // One planned set, then the realized session that copies it
  const plannedSetId = await insert(
    "INSERT INTO planned_set (template_block_exercise_id, position, reps, weight_kg) SELECT tbe.id, 1, 10, 40 FROM template_block_exercise tbe JOIN template_block tb ON tb.id = tbe.template_block_id WHERE tb.session_version_id = ? LIMIT 1",
    [versionId],
  );
  const sessionId = await insert(
    "INSERT INTO workout_session (appointment_id, owner_user_id, status, started_at, last_activity_at) VALUES (?, ?, 'completed', NOW(3), NOW(3))",
    [appointmentId, user.id],
  );
  const blockId = await insert(
    "INSERT INTO workout_block (workout_session_id, block_type, position) VALUES (?, 'classic', 1)",
    [sessionId],
  );
  const workoutExerciseId = await insert(
    "INSERT INTO workout_exercise (workout_block_id, exercise_id, position, is_per_side) VALUES (?, ?, 1, TRUE)",
    [blockId, exerciseId],
  );
  const setId = await insert(
    "INSERT INTO workout_set (workout_exercise_id, source_planned_set_id, position, reps_planned, reps_actual, validated_at) VALUES (?, ?, 1, 10, 10, NOW(3))",
    [workoutExerciseId, plannedSetId],
  );
  await client.execute(
    "INSERT INTO workout_set_side (workout_set_id, side, reps_actual) VALUES (?, 'left', 10), (?, 'right', 9)",
    [setId, setId],
  );

  // A program, its week and its history
  const programId = await insert(
    "INSERT INTO program (owner_user_id, name, start_date, end_date) VALUES (?, 'Prise de masse', '2026-11-01', '2026-12-31')",
    [user.id],
  );
  const scheduleId = await insert(
    "INSERT INTO weekly_schedule (program_id, session_template_id, weekday) SELECT ?, st.id, 1 FROM session_template st WHERE st.owner_user_id = ? LIMIT 1",
    [programId, user.id],
  );
  await client.execute(
    "INSERT INTO program_change (program_id, change_type) VALUES (?, 'created')",
    [programId],
  );

  // A notification pointing at the appointment and at the exercise
  await client.execute(
    "INSERT INTO notification (user_id, `type`, title, appointment_id) VALUES (?, 'session_to_confirm', 'Tu as fait cette séance ?', ?)",
    [user.id, appointmentId],
  );

  return {
    appointmentId,
    versionId,
    exerciseId,
    plannedSetId,
    sessionId,
    blockId,
    workoutExerciseId,
    setId,
    programId,
    scheduleId,
  };
}

describe("DELETE /api/users/me", () => {
  beforeEach(async () => {
    await authLimiterStore.resetAll();
  });

  afterEach(async () => {
    await client.query(
      "DELETE em FROM exercise_muscle em JOIN exercise e ON e.id = em.exercise_id JOIN `user` u ON u.id = e.owner_user_id WHERE u.username LIKE ?",
      [`${PREFIX}%`],
    );
    for (const table of [
      "exercise_text",
      "exercise_category",
      "exercise_equipment",
      "exercise_measure",
    ]) {
      await client.query(
        `DELETE x FROM ${table} x JOIN exercise e ON e.id = x.exercise_id JOIN \`user\` u ON u.id = e.owner_user_id WHERE u.username LIKE ?`,
        [`${PREFIX}%`],
      );
    }
    await client.query(
      "DELETE wss FROM workout_set_side wss JOIN workout_set ws ON ws.id = wss.workout_set_id JOIN workout_exercise we ON we.id = ws.workout_exercise_id JOIN workout_block wb ON wb.id = we.workout_block_id JOIN workout_session s ON s.id = wb.workout_session_id JOIN `user` u ON u.id = s.owner_user_id WHERE u.username LIKE ?",
      [`${PREFIX}%`],
    );
    await client.query(
      "DELETE pc FROM program_change pc JOIN program p ON p.id = pc.program_id JOIN `user` u ON u.id = p.owner_user_id WHERE u.username LIKE ?",
      [`${PREFIX}%`],
    );
    await deleteTestUsers(PREFIX);
  });

  it("empties every table that held something of the account", async () => {
    const user = await createAccount();
    const data = await fillAccount(user);

    const response = await request(app)
      .delete("/api/users/me")
      .set("Origin", ORIGIN)
      .set("Cookie", user.cookie)
      .send({ password: PASSWORD });

    expect(response.status).toBe(204);
    // The cookie of the session is cleared
    expect(readSetCookie(response.headers)).toContain("fulgora_token=;");

    // Table by table, nothing is left (Definition of Done of the card)
    const checks: [string, unknown[]][] = [
      ["SELECT COUNT(*) AS total FROM `user` WHERE id = ?", [user.id]],
      [
        "SELECT COUNT(*) AS total FROM notification WHERE user_id = ?",
        [user.id],
      ],
      [
        "SELECT COUNT(*) AS total FROM workout_set_side WHERE workout_set_id = ?",
        [data.setId],
      ],
      ["SELECT COUNT(*) AS total FROM workout_set WHERE id = ?", [data.setId]],
      [
        "SELECT COUNT(*) AS total FROM workout_exercise WHERE id = ?",
        [data.workoutExerciseId],
      ],
      [
        "SELECT COUNT(*) AS total FROM workout_block WHERE id = ?",
        [data.blockId],
      ],
      [
        "SELECT COUNT(*) AS total FROM workout_session WHERE owner_user_id = ?",
        [user.id],
      ],
      [
        "SELECT COUNT(*) AS total FROM appointment WHERE owner_user_id = ?",
        [user.id],
      ],
      [
        "SELECT COUNT(*) AS total FROM weekly_schedule WHERE id = ?",
        [data.scheduleId],
      ],
      [
        "SELECT COUNT(*) AS total FROM program_change WHERE program_id = ?",
        [data.programId],
      ],
      [
        "SELECT COUNT(*) AS total FROM program WHERE owner_user_id = ?",
        [user.id],
      ],
      [
        "SELECT COUNT(*) AS total FROM planned_set WHERE id = ?",
        [data.plannedSetId],
      ],
      [
        "SELECT COUNT(*) AS total FROM template_block_exercise tbe JOIN template_block tb ON tb.id = tbe.template_block_id WHERE tb.session_version_id = ?",
        [data.versionId],
      ],
      [
        "SELECT COUNT(*) AS total FROM template_block WHERE session_version_id = ?",
        [data.versionId],
      ],
      [
        "SELECT COUNT(*) AS total FROM session_version WHERE id = ?",
        [data.versionId],
      ],
      [
        "SELECT COUNT(*) AS total FROM session_template WHERE owner_user_id = ?",
        [user.id],
      ],
      [
        "SELECT COUNT(*) AS total FROM exercise_text WHERE exercise_id = ?",
        [data.exerciseId],
      ],
      [
        "SELECT COUNT(*) AS total FROM exercise_category WHERE exercise_id = ?",
        [data.exerciseId],
      ],
      [
        "SELECT COUNT(*) AS total FROM exercise_muscle WHERE exercise_id = ?",
        [data.exerciseId],
      ],
      [
        "SELECT COUNT(*) AS total FROM exercise_equipment WHERE exercise_id = ?",
        [data.exerciseId],
      ],
      [
        "SELECT COUNT(*) AS total FROM exercise_measure WHERE exercise_id = ?",
        [data.exerciseId],
      ],
      [
        "SELECT COUNT(*) AS total FROM exercise WHERE owner_user_id = ?",
        [user.id],
      ],
    ];
    for (const [sql, values] of checks) {
      expect({ sql, total: await count(sql, values) }).toEqual({
        sql,
        total: 0,
      });
    }

    // The catalog is untouched
    expect(
      await count(
        "SELECT COUNT(*) AS total FROM exercise WHERE owner_user_id IS NULL",
        [],
      ),
    ).toBeGreaterThan(0);

    // The old cookie does not open anything any more: the account is gone
    const me = await request(app)
      .get("/api/auth/me")
      .set("Cookie", user.cookie);
    expect(me.status).toBe(401);
  });

  it("leaves the data of another user alone", async () => {
    const lea = await createAccount();
    const other = await createAccount();
    await fillAccount(lea);
    const kept = await fillAccount(other);

    await authLimiterStore.resetAll();
    const response = await request(app)
      .delete("/api/users/me")
      .set("Origin", ORIGIN)
      .set("Cookie", lea.cookie)
      .send({ password: PASSWORD });
    expect(response.status).toBe(204);

    expect(
      await count("SELECT COUNT(*) AS total FROM `user` WHERE id = ?", [
        other.id,
      ]),
    ).toBe(1);
    expect(
      await count("SELECT COUNT(*) AS total FROM workout_set WHERE id = ?", [
        kept.setId,
      ]),
    ).toBe(1);
    expect(
      await count(
        "SELECT COUNT(*) AS total FROM appointment WHERE owner_user_id = ?",
        [other.id],
      ),
    ).toBe(1);
  });

  it("cuts the link of a copy without deleting it", async () => {
    const lea = await createAccount();
    const other = await createAccount();
    const source = await fillAccount(lea);

    // The other user copied the program and the exercise of Lea
    const copiedProgram = await insert(
      "INSERT INTO program (owner_user_id, source_program_id, name, start_date, end_date) VALUES (?, ?, 'Copie', '2026-11-01', '2026-12-31')",
      [other.id, source.programId],
    );
    const copiedExercise = await insert(
      "INSERT INTO exercise (owner_user_id, source_exercise_id, slug, name, difficulty) VALUES (?, ?, ?, 'Copie', 'beginner')",
      [other.id, source.exerciseId, `${other.username}-copie`],
    );

    await authLimiterStore.resetAll();
    const response = await request(app)
      .delete("/api/users/me")
      .set("Origin", ORIGIN)
      .set("Cookie", lea.cookie)
      .send({ password: PASSWORD });
    expect(response.status).toBe(204);

    const [programs] = await client.execute<RowDataPacket[]>(
      "SELECT source_program_id FROM program WHERE id = ?",
      [copiedProgram],
    );
    expect(programs[0]?.source_program_id).toBeNull();
    const [copies] = await client.execute<RowDataPacket[]>(
      "SELECT source_exercise_id FROM exercise WHERE id = ?",
      [copiedExercise],
    );
    expect(copies[0]?.source_exercise_id).toBeNull();
  });

  it("deletes nothing when the password is wrong", async () => {
    const user = await createAccount();
    await fillAccount(user);

    const response = await request(app)
      .delete("/api/users/me")
      .set("Origin", ORIGIN)
      .set("Cookie", user.cookie)
      .send({ password: "pas-le-bon-1" });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("WRONG_PASSWORD");
    expect(
      await count("SELECT COUNT(*) AS total FROM `user` WHERE id = ?", [
        user.id,
      ]),
    ).toBe(1);
    expect(
      await count(
        "SELECT COUNT(*) AS total FROM appointment WHERE owner_user_id = ?",
        [user.id],
      ),
    ).toBe(1);
  });

  it("refuses an anonymous visitor and an empty password", async () => {
    const anonymous = await request(app)
      .delete("/api/users/me")
      .set("Origin", ORIGIN)
      .send({ password: PASSWORD });
    expect(anonymous.status).toBe(401);

    const user = await createAccount();
    const empty = await request(app)
      .delete("/api/users/me")
      .set("Origin", ORIGIN)
      .set("Cookie", user.cookie)
      .send({ password: "" });
    expect(empty.status).toBe(400);
  });
});

// The pool is shared by the whole file: it closes once, at the very end.
afterAll(async () => {
  await client.end();
});
