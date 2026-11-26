import { addDays, todayInParis } from "shared";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../../../src/app.js";
import client, { type Rows } from "../../../src/database/client.js";
import { updateProgramStatuses } from "../../../src/modules/program/programStatusWatch.js";
import {
  createTestUser,
  deleteTestUsers,
  type TestUser,
} from "../../helpers/fixtures.js";

// US-18: a program is a draft first, then it fills the Planning over its
// whole period (RM-071, RM-072, RM-075).

const PREFIX = "test_program_";
const ORIGIN = "http://localhost:3000";

let lea: TestUser;
let someoneElse: TestUser;
let exerciseId: number;

// Monday 30 November 2026 to Sunday 13 December: two weeks.
const START = "2026-11-30";
const END = "2026-12-13";

function post(path: string, body: object | undefined, cookie: string) {
  const call = request(app)
    .post(path)
    .set("Origin", ORIGIN)
    .set("Cookie", cookie);
  return body === undefined ? call : call.send(body);
}

function validInfo(overrides: object = {}) {
  return {
    name: "Hypertrophie",
    description: null,
    start_date: START,
    end_date: END,
    weekdays: [1, 4],
    planned_time: "18:30",
    ...overrides,
  };
}

// Puts one exercise in the session of a day, as the editor would.
async function fillSession(versionId: number) {
  const [block] = await client.execute<{ insertId: number }[] & Rows[]>(
    "INSERT INTO template_block (session_version_id, block_type, position) VALUES (?, 'classic', 1)",
    [versionId],
  );
  const blockId = (block as unknown as { insertId: number }).insertId;
  await client.execute(
    "INSERT INTO template_block_exercise (template_block_id, exercise_id, position) VALUES (?, ?, 1)",
    [blockId, exerciseId],
  );
}

beforeAll(async () => {
  lea = await createTestUser(PREFIX);
  someoneElse = await createTestUser(PREFIX);
  const [result] = await client.execute<{ insertId: number }[] & Rows[]>(
    "INSERT INTO exercise (owner_user_id, slug, name, difficulty) VALUES (?, ?, 'Squat', 'beginner')",
    [lea.id, `${lea.username}-squat`],
  );
  exerciseId = (result as unknown as { insertId: number }).insertId;
});

afterAll(async () => {
  // Everything that points at an appointment goes first (DT-17).
  await client.query(
    "DELETE n FROM notification n JOIN `user` u ON u.id = n.user_id WHERE u.username LIKE ?",
    [`${PREFIX}%`],
  );
  await client.query(
    "DELETE ws FROM workout_session ws JOIN `user` u ON u.id = ws.owner_user_id WHERE u.username LIKE ?",
    [`${PREFIX}%`],
  );
  await client.query(
    "DELETE a FROM appointment a JOIN `user` u ON u.id = a.owner_user_id WHERE u.username LIKE ?",
    [`${PREFIX}%`],
  );
  await client.query(
    "DELETE ws FROM weekly_schedule ws JOIN program p ON p.id = ws.program_id JOIN `user` u ON u.id = p.owner_user_id WHERE u.username LIKE ?",
    [`${PREFIX}%`],
  );
  await client.query(
    "DELETE n FROM notification n JOIN `user` u ON u.id = n.user_id WHERE u.username LIKE ?",
    [`${PREFIX}%`],
  );
  await client.query(
    "DELETE pc FROM program_change pc JOIN program p ON p.id = pc.program_id JOIN `user` u ON u.id = p.owner_user_id WHERE u.username LIKE ?",
    [`${PREFIX}%`],
  );
  await client.query(
    "DELETE p FROM program p JOIN `user` u ON u.id = p.owner_user_id WHERE u.username LIKE ?",
    [`${PREFIX}%`],
  );
  await deleteTestUsers(PREFIX);
  await client.end();
});

describe("POST /api/programs", () => {
  it("saves a draft with one empty session per chosen day", async () => {
    const response = await post("/api/programs", validInfo(), lea.cookie);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: "Hypertrophie",
      status: "draft",
      start_date: START,
      end_date: END,
    });
    expect(response.body.sessions).toHaveLength(2);
    expect(response.body.sessions[0]).toMatchObject({
      weekday: 1,
      name: "Séance du lundi",
      exercise_count: 0,
    });
    expect(response.body.sessions[1].name).toBe("Séance du jeudi");

    // A draft never touches the Planning (RM-071)
    const [rows] = await client.execute<Rows[]>(
      "SELECT COUNT(*) AS total FROM appointment WHERE program_id = ?",
      [response.body.id],
    );
    expect(Number(rows[0]?.total)).toBe(0);
  });

  it("refuses an end before the start and a week without any day", async () => {
    const reversed = await post(
      "/api/programs",
      validInfo({ end_date: "2026-11-29" }),
      lea.cookie,
    );
    const noDay = await post(
      "/api/programs",
      validInfo({ weekdays: [] }),
      lea.cookie,
    );

    expect(reversed.status).toBe(400);
    expect(noDay.status).toBe(400);
  });
});

describe("POST /api/programs/:id/activate", () => {
  it("refuses while a session has no exercise (RM-072)", async () => {
    const draft = await post("/api/programs", validInfo(), lea.cookie);

    const response = await post(
      `/api/programs/${draft.body.id}/activate`,
      undefined,
      lea.cookie,
    );

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("PROGRAM_SESSION_EMPTY");
  });

  it("fills the Planning over the whole period", async () => {
    const draft = await post("/api/programs", validInfo(), lea.cookie);
    for (const session of draft.body.sessions) {
      await fillSession(session.session_version_id);
    }

    const response = await post(
      `/api/programs/${draft.body.id}/activate`,
      undefined,
      lea.cookie,
    );

    expect(response.status).toBe(200);
    // Two weeks, Monday and Thursday: four sessions
    expect(response.body).toMatchObject({
      appointment_count: 4,
      first_date: START,
      last_date: "2026-12-10",
      status: "programmed",
    });

    const [rows] = await client.execute<Rows[]>(
      `SELECT planned_date, planned_time, status, weekly_schedule_id
         FROM appointment WHERE program_id = ? ORDER BY planned_date`,
      [draft.body.id],
    );
    expect(rows.map((row) => row.planned_date)).toEqual([
      "2026-11-30",
      "2026-12-03",
      "2026-12-07",
      "2026-12-10",
    ]);
    expect(rows[0]?.planned_time).toBe("18:30:00");
    expect(rows[0]?.status).toBe("planned");
    expect(rows[0]?.weekly_schedule_id).not.toBeNull();

    // A second call changes nothing more
    const again = await post(
      `/api/programs/${draft.body.id}/activate`,
      undefined,
      lea.cookie,
    );
    expect(again.status).toBe(409);
  });

  it("starts a program of today right away", async () => {
    const today = todayInParis();
    const draft = await post(
      "/api/programs",
      validInfo({
        start_date: today,
        end_date: addDays(today, 6),
        weekdays: [1, 2, 3, 4, 5, 6, 7],
      }),
      lea.cookie,
    );
    for (const session of draft.body.sessions) {
      await fillSession(session.session_version_id);
    }

    const response = await post(
      `/api/programs/${draft.body.id}/activate`,
      undefined,
      lea.cookie,
    );

    expect(response.body.status).toBe("in_progress");
    expect(response.body.appointment_count).toBe(7);
  });
});

describe("GET et DELETE /api/programs", () => {
  it("lists the programs of the user, drafts first", async () => {
    const response = await request(app)
      .get("/api/programs")
      .set("Cookie", lea.cookie);

    expect(response.status).toBe(200);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0].status).toBe("draft");
    expect(response.body[0]).toHaveProperty("ready_count");
  });

  it("never shows the program of somebody else", async () => {
    const draft = await post("/api/programs", validInfo(), lea.cookie);

    const read = await request(app)
      .get(`/api/programs/${draft.body.id}`)
      .set("Cookie", someoneElse.cookie);

    expect(read.status).toBe(404);
  });

  it("throws a draft away, never a program already created", async () => {
    const draft = await post("/api/programs", validInfo(), lea.cookie);

    const removed = await request(app)
      .delete(`/api/programs/${draft.body.id}`)
      .set("Origin", ORIGIN)
      .set("Cookie", lea.cookie);

    expect(removed.status).toBe(204);
    const [rows] = await client.execute<Rows[]>(
      "SELECT id FROM program WHERE id = ?",
      [draft.body.id],
    );
    expect(rows).toHaveLength(0);
  });
});

describe("les séances d'un jour du programme", () => {
  it("gives the session of a day as a draft, and saves a new version", async () => {
    const draft = await post("/api/programs", validInfo(), lea.cookie);
    const programId = draft.body.id;
    const thursdayId = draft.body.sessions.find(
      (item: { weekday: number }) => item.weekday === 4,
    ).schedule_id;

    const read = await request(app)
      .get(`/api/programs/${programId}/sessions/${thursdayId}`)
      .set("Cookie", lea.cookie);

    expect(read.status).toBe(200);
    expect(read.body.session).toMatchObject({
      name: "Séance du jeudi",
      blocks: [],
    });

    const session = {
      ...read.body.session,
      name: "Haut du corps",
      blocks: [
        {
          key: "b1",
          block_type: "classic",
          name: null,
          instructions: null,
          exercises: [
            {
              key: "e1",
              exercise_id: exerciseId,
              name: "Squat",
              measure_codes: [],
              default_rest_seconds: 90,
              sets: [
                {
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
                  rest_after_seconds: null,
                },
              ],
            },
          ],
        },
      ],
    };

    const written = await request(app)
      .put(`/api/programs/${programId}/sessions/${thursdayId}`)
      .set("Origin", ORIGIN)
      .set("Cookie", lea.cookie)
      .send({ scope: "this", session });

    expect(written.status).toBe(200);

    const after = await request(app)
      .get(`/api/programs/${programId}`)
      .set("Cookie", lea.cookie);
    const thursday = after.body.sessions.find(
      (item: { weekday: number }) => item.weekday === 4,
    );
    expect(thursday).toMatchObject({
      name: "Haut du corps",
      exercise_count: 1,
    });
  });

  it("answers 404 for a session outside the program", async () => {
    const draft = await post("/api/programs", validInfo(), lea.cookie);

    const response = await request(app)
      .get(`/api/programs/${draft.body.id}/sessions/999999`)
      .set("Cookie", lea.cookie);

    expect(response.status).toBe(404);
  });
});

// US-48: the detail of a program carries its appointments, and the watch
// moves the statuses by itself (RM-074).
describe("GET /api/programs/:id et la tâche des statuts", () => {
  it("gives the appointments of the program with the detail", async () => {
    const draft = await post("/api/programs", validInfo(), lea.cookie);
    for (const session of draft.body.sessions) {
      await fillSession(session.session_version_id);
    }
    await post(
      `/api/programs/${draft.body.id}/activate`,
      undefined,
      lea.cookie,
    );

    const response = await request(app)
      .get(`/api/programs/${draft.body.id}`)
      .set("Cookie", lea.cookie);

    expect(response.status).toBe(200);
    expect(response.body.appointments.length).toBe(4);
    expect(response.body.appointments[0]).toMatchObject({
      planned_date: START,
      planned_time: "18:30",
      status: "planned",
      exercise_count: 1,
    });
    expect(response.body.appointments[0].program.id).toBe(draft.body.id);
  });

  it("counts what is past and what is done in the list", async () => {
    const response = await request(app)
      .get("/api/programs")
      .set("Cookie", lea.cookie);

    expect(response.status).toBe(200);
    const created = response.body.find(
      (item: { status: string }) => item.status !== "draft",
    );
    expect(created).toHaveProperty("past_count");
    expect(created).toHaveProperty("done_count");
    expect(created.done_count).toBe(0);
  });

  it("starts a program on its first day and ends it the day after the last", async () => {
    // A program of yesterday only: the watch ends it right away.
    const over = await post(
      "/api/programs",
      validInfo({
        name: "Fini",
        start_date: addDays(todayInParis(), -8),
        end_date: addDays(todayInParis(), -1),
      }),
      lea.cookie,
    );
    for (const session of over.body.sessions) {
      await fillSession(session.session_version_id);
    }
    await post(`/api/programs/${over.body.id}/activate`, undefined, lea.cookie);
    await client.execute(
      "UPDATE program SET status = 'programmed' WHERE id = ?",
      [over.body.id],
    );

    // One pass is enough here: the program starts, then ends in the same
    // walk, because its last day is already behind us.
    const first = await updateProgramStatuses();
    expect(first.started).toBeGreaterThan(0);
    expect(first.finished).toBeGreaterThan(0);

    const [rows] = await client.execute<Rows[]>(
      "SELECT status FROM program WHERE id = ?",
      [over.body.id],
    );
    expect(rows[0]?.status).toBe("finished");

    // One notification, and only one: the status never changes twice.
    await updateProgramStatuses();
    const [notifications] = await client.execute<Rows[]>(
      "SELECT COUNT(*) AS total FROM notification WHERE program_id = ? AND `type` = 'program_finished'",
      [over.body.id],
    );
    expect(Number(notifications[0]?.total)).toBe(1);
  });
});

// US-19: a day may hold several sessions, each with its own hour.
describe("plusieurs séances le même jour", () => {
  it("adds a session on a day, removes it and puts it back", async () => {
    const draft = await post("/api/programs", validInfo(), lea.cookie);
    const programId = draft.body.id;

    const added = await post(
      `/api/programs/${programId}/sessions`,
      { weekday: 1, name: "Gainage", planned_time: "20:00" },
      lea.cookie,
    );

    expect(added.status).toBe(201);
    const monday = added.body.sessions.filter(
      (item: { weekday: number }) => item.weekday === 1,
    );
    expect(monday).toHaveLength(2);
    expect(monday[1]).toMatchObject({
      name: "Gainage",
      planned_time: "20:00",
    });

    const scheduleId = monday[1].schedule_id;
    const removed = await request(app)
      .delete(`/api/programs/${programId}/sessions/${scheduleId}`)
      .set("Origin", ORIGIN)
      .set("Cookie", lea.cookie);

    expect(removed.status).toBe(200);
    expect(
      removed.body.sessions.filter(
        (item: { weekday: number }) => item.weekday === 1,
      ),
    ).toHaveLength(1);

    const back = await post(
      `/api/programs/${programId}/sessions/${scheduleId}/restore`,
      undefined,
      lea.cookie,
    );

    expect(back.status).toBe(200);
    expect(
      back.body.sessions.filter(
        (item: { weekday: number }) => item.weekday === 1,
      ),
    ).toHaveLength(2);
  });

  it("plans one appointment per session of the day (RM-075)", async () => {
    const draft = await post(
      "/api/programs",
      validInfo({ weekdays: [1] }),
      lea.cookie,
    );
    const programId = draft.body.id;
    await post(
      `/api/programs/${programId}/sessions`,
      { weekday: 1, name: "Gainage", planned_time: null },
      lea.cookie,
    );

    const detail = await request(app)
      .get(`/api/programs/${programId}`)
      .set("Cookie", lea.cookie);
    for (const session of detail.body.sessions) {
      await fillSession(session.session_version_id);
    }

    const created = await post(
      `/api/programs/${programId}/activate`,
      undefined,
      lea.cookie,
    );

    // Two Mondays in the period, two sessions each: four appointments.
    expect(created.status).toBe(200);
    expect(created.body.appointment_count).toBe(4);
  });

  it("refuses to touch the sessions of a program already created", async () => {
    const draft = await post("/api/programs", validInfo(), lea.cookie);
    for (const session of draft.body.sessions) {
      await fillSession(session.session_version_id);
    }
    await post(
      `/api/programs/${draft.body.id}/activate`,
      undefined,
      lea.cookie,
    );

    const response = await post(
      `/api/programs/${draft.body.id}/sessions`,
      { weekday: 2, name: "Trop tard", planned_time: null },
      lea.cookie,
    );

    expect(response.status).toBe(409);
  });
});

// US-20: changing the day, the hour or the end of a program already
// created. The preview and the writing must agree (RM-031, RM-033).
describe("modifier les jours, les heures et la fin", () => {
  function put(path: string, body: object, cookie: string) {
    return request(app)
      .put(path)
      .set("Origin", ORIGIN)
      .set("Cookie", cookie)
      .send(body);
  }

  // A program of two weeks, Monday and Thursday, already in the Planning.
  async function runningProgram() {
    const draft = await post("/api/programs", validInfo(), lea.cookie);
    for (const session of draft.body.sessions) {
      await fillSession(session.session_version_id);
    }
    await post(
      `/api/programs/${draft.body.id}/activate`,
      undefined,
      lea.cookie,
    );
    const read = await request(app)
      .get(`/api/programs/${draft.body.id}`)
      .set("Cookie", lea.cookie);
    const monday = read.body.sessions.find(
      (session: { weekday: number }) => session.weekday === 1,
    );
    const thursday = read.body.sessions.find(
      (session: { weekday: number }) => session.weekday === 4,
    );
    return { id: draft.body.id as number, monday, thursday };
  }

  function wish(
    monday: { schedule_id: number },
    thursday: { schedule_id: number },
    overrides: { weekday?: number; time?: string | null; end?: string } = {},
  ) {
    return {
      name: "Hypertrophie",
      end_date: overrides.end ?? END,
      sessions: [
        {
          schedule_id: monday.schedule_id,
          weekday: overrides.weekday ?? 1,
          planned_time: overrides.time === undefined ? "18:30" : overrides.time,
        },
        {
          schedule_id: thursday.schedule_id,
          weekday: 4,
          planned_time: "18:30",
        },
      ],
    };
  }

  async function datesOf(programId: number) {
    const [rows] = await client.execute<Rows[]>(
      `SELECT planned_date, status FROM appointment
        WHERE program_id = ? ORDER BY planned_date`,
      [programId],
    );
    return rows as { planned_date: string; status: string }[];
  }

  it("moves the Mondays to Tuesday, exactly as the preview said", async () => {
    const { id, monday, thursday } = await runningProgram();
    const body = wish(monday, thursday, { weekday: 2 });

    const preview = await post(
      `/api/programs/${id}/schedule/preview`,
      body,
      lea.cookie,
    );

    expect(preview.status).toBe(200);
    expect(
      preview.body.moved.map(
        (moved: { from_date: string; to_date: string }) =>
          `${moved.from_date} → ${moved.to_date}`,
      ),
    ).toEqual(["2026-11-30 → 2026-12-01", "2026-12-07 → 2026-12-08"]);
    expect(preview.body.created).toEqual([]);
    expect(preview.body.cancelled).toEqual([]);
    expect(preview.body.notes).toContain(
      "Séance du jeudi du jeudi : inchangé.",
    );

    const applied = await put(`/api/programs/${id}/schedule`, body, lea.cookie);

    expect(applied.status).toBe(200);
    expect((await datesOf(id)).map((row) => row.planned_date)).toEqual([
      "2026-12-01",
      "2026-12-03",
      "2026-12-08",
      "2026-12-10",
    ]);

    // The old rule keeps its date, a new one takes the appointments
    const [schedules] = await client.execute<Rows[]>(
      `SELECT weekday, deactivated_at FROM weekly_schedule
        WHERE program_id = ? ORDER BY id`,
      [id],
    );
    expect(schedules).toHaveLength(3);
    expect(schedules[0]?.deactivated_at).not.toBeNull();
    expect(schedules[2]?.weekday).toBe(2);

    // And the change left a trace (RM-037)
    const [changes] = await client.execute<Rows[]>(
      "SELECT change_type FROM program_change WHERE program_id = ?",
      [id],
    );
    expect(changes.map((row) => row.change_type)).toContain("schedule");

    // Asking the same thing again, with the new rules, changes nothing
    const read = await request(app)
      .get(`/api/programs/${id}`)
      .set("Cookie", lea.cookie);
    const again = await post(
      `/api/programs/${id}/schedule/preview`,
      {
        name: "Hypertrophie",
        end_date: END,
        sessions: read.body.sessions.map(
          (session: {
            schedule_id: number;
            weekday: number;
            planned_time: string | null;
          }) => ({
            schedule_id: session.schedule_id,
            weekday: session.weekday,
            planned_time: session.planned_time,
          }),
        ),
      },
      lea.cookie,
    );
    expect(again.body.moved).toEqual([]);
    expect(again.body.created).toEqual([]);
  });

  it("keeps an appointment moved by hand and cancels what falls after a shorter end", async () => {
    const { id, monday, thursday } = await runningProgram();
    // Thursday 10 December moved by hand to Friday 11 December (US-25)
    await client.execute(
      `UPDATE appointment
          SET planned_date = '2026-12-11', initial_date = '2026-12-10',
              moved_manually = TRUE
        WHERE program_id = ? AND planned_date = '2026-12-10'`,
      [id],
    );

    const body = wish(monday, thursday, { end: "2026-12-06" });
    const preview = await post(
      `/api/programs/${id}/schedule/preview`,
      body,
      lea.cookie,
    );

    expect(
      preview.body.cancelled.map(
        (one: { planned_date: string }) => one.planned_date,
      ),
    ).toEqual(["2026-12-07"]);
    expect(preview.body.moved).toEqual([]);

    await put(`/api/programs/${id}/schedule`, body, lea.cookie);

    const after = await datesOf(id);
    expect(after.map((row) => `${row.planned_date} ${row.status}`)).toEqual([
      "2026-11-30 planned",
      "2026-12-03 planned",
      "2026-12-07 cancelled",
      "2026-12-11 planned",
    ]);
  });

  it("adds the weeks of a longer program", async () => {
    const { id, monday, thursday } = await runningProgram();
    const body = wish(monday, thursday, { end: "2026-12-20" });

    const preview = await post(
      `/api/programs/${id}/schedule/preview`,
      body,
      lea.cookie,
    );
    expect(
      preview.body.created.map(
        (one: { planned_date: string }) => one.planned_date,
      ),
    ).toEqual(["2026-12-14", "2026-12-17"]);

    await put(`/api/programs/${id}/schedule`, body, lea.cookie);

    expect((await datesOf(id)).map((row) => row.planned_date)).toEqual([
      "2026-11-30",
      "2026-12-03",
      "2026-12-07",
      "2026-12-10",
      "2026-12-14",
      "2026-12-17",
    ]);
  });

  it("refuses to change a draft, and the program of somebody else", async () => {
    const draft = await post("/api/programs", validInfo(), lea.cookie);
    const session = draft.body.sessions[0];
    const body = {
      name: "Hypertrophie",
      end_date: END,
      sessions: [
        {
          schedule_id: session.schedule_id,
          weekday: 2,
          planned_time: "18:30",
        },
      ],
    };

    const onDraft = await put(
      `/api/programs/${draft.body.id}/schedule`,
      body,
      lea.cookie,
    );
    expect(onDraft.status).toBe(409);
    expect(onDraft.body.error.code).toBe("PROGRAM_NOT_EDITABLE");

    const stranger = await put(
      `/api/programs/${draft.body.id}/schedule`,
      body,
      someoneElse.cookie,
    );
    expect(stranger.status).toBe(404);
  });
});

// US-21: a program is given up (its past kept) or thrown away whole
// (RM-034, RM-035, RM-073, DT-25).
describe("abandonner ou supprimer un programme", () => {
  function del(path: string, cookie: string) {
    return request(app)
      .delete(path)
      .set("Origin", ORIGIN)
      .set("Cookie", cookie);
  }

  // A program of two weeks already in the Planning, Monday and Thursday.
  async function runningProgram() {
    const draft = await post("/api/programs", validInfo(), lea.cookie);
    for (const session of draft.body.sessions) {
      await fillSession(session.session_version_id);
    }
    await post(
      `/api/programs/${draft.body.id}/activate`,
      undefined,
      lea.cookie,
    );
    return draft.body.id as number;
  }

  // Starts the first appointment of the program, as the workout would.
  async function startFirstSession(programId: number, status: string) {
    const [rows] = await client.execute<Rows[]>(
      `SELECT id FROM appointment WHERE program_id = ?
        ORDER BY planned_date LIMIT 1`,
      [programId],
    );
    const appointmentId = Number((rows[0] as { id: number }).id);
    await client.execute(
      `INSERT INTO workout_session (appointment_id, owner_user_id, status, started_at, last_activity_at)
       VALUES (?, ?, ?, NOW(3), NOW(3))`,
      [appointmentId, lea.id, status],
    );
    await client.execute(
      "UPDATE appointment SET status = 'attended' WHERE id = ?",
      [appointmentId],
    );
    return appointmentId;
  }

  it("gives up the rest of the program and keeps the past", async () => {
    const id = await runningProgram();
    const started = await startFirstSession(id, "completed");

    const response = await post(
      `/api/programs/${id}/abandon`,
      undefined,
      lea.cookie,
    );

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("abandoned");

    const [rows] = await client.execute<Rows[]>(
      `SELECT id, status, cancelled_at FROM appointment
        WHERE program_id = ? ORDER BY planned_date`,
      [id],
    );
    const kept = rows.find((row) => Number(row.id) === started);
    expect(kept?.status).toBe("attended");
    const cancelled = rows.filter((row) => row.status === "cancelled");
    expect(cancelled).toHaveLength(3);
    expect(cancelled[0]?.cancelled_at).not.toBeNull();

    // The change is written down (RM-037)
    const [changes] = await client.execute<Rows[]>(
      "SELECT change_type, new_value FROM program_change WHERE program_id = ?",
      [id],
    );
    expect(changes.map((row) => row.change_type)).toContain("status");
  });

  it("refuses the abandon while a session is in progress (RM-034)", async () => {
    const id = await runningProgram();
    await startFirstSession(id, "in_progress");

    const response = await post(
      `/api/programs/${id}/abandon`,
      undefined,
      lea.cookie,
    );

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("PROGRAM_HAS_WORKOUT_IN_PROGRESS");
  });

  it("sends back to the deletion when no session was ever started", async () => {
    const id = await runningProgram();

    const response = await post(
      `/api/programs/${id}/abandon`,
      undefined,
      lea.cookie,
    );

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("USE_DELETE_INSTEAD");
  });

  it("throws a program nobody started away, leaving no orphan row", async () => {
    const id = await runningProgram();
    const [templates] = await client.execute<Rows[]>(
      "SELECT session_template_id FROM weekly_schedule WHERE program_id = ?",
      [id],
    );
    const templateIds = templates.map((row) => Number(row.session_template_id));
    expect(templateIds).toHaveLength(2);

    const response = await del(`/api/programs/${id}`, lea.cookie);

    expect(response.status).toBe(204);
    for (const [sql, params] of [
      ["SELECT id FROM program WHERE id = ?", [id]],
      ["SELECT id FROM appointment WHERE program_id = ?", [id]],
      ["SELECT id FROM weekly_schedule WHERE program_id = ?", [id]],
      ["SELECT id FROM program_change WHERE program_id = ?", [id]],
      ["SELECT id FROM notification WHERE program_id = ?", [id]],
      ["SELECT id FROM session_template WHERE id IN (?)", [templateIds]],
      [
        "SELECT id FROM session_version WHERE session_template_id IN (?)",
        [templateIds],
      ],
      [
        `SELECT tb.id FROM template_block tb
           JOIN session_version sv ON sv.id = tb.session_version_id
          WHERE sv.session_template_id IN (?)`,
        [templateIds],
      ],
    ] as [string, unknown[]][]) {
      const [rows] = await client.query<Rows[]>(sql, params);
      expect({ sql, rows }).toEqual({ sql, rows: [] });
    }
  });

  it("keeps a prepared session another program still uses", async () => {
    const id = await runningProgram();
    const other = await post("/api/programs", validInfo(), lea.cookie);
    const [templates] = await client.execute<Rows[]>(
      `SELECT session_template_id FROM weekly_schedule
        WHERE program_id = ? LIMIT 1`,
      [id],
    );
    const shared = Number(
      (templates[0] as { session_template_id: number }).session_template_id,
    );
    // The other program points at the same prepared session
    await client.execute(
      `INSERT INTO weekly_schedule (program_id, session_template_id, weekday, planned_time)
       VALUES (?, ?, 5, '18:30')`,
      [other.body.id, shared],
    );

    await del(`/api/programs/${id}`, lea.cookie);

    const [rows] = await client.execute<Rows[]>(
      "SELECT id FROM session_template WHERE id = ?",
      [shared],
    );
    expect(rows).toHaveLength(1);
  });

  it("refuses to delete a program with a started session", async () => {
    const id = await runningProgram();
    await startFirstSession(id, "completed");

    const response = await del(`/api/programs/${id}`, lea.cookie);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("PROGRAM_HAS_STARTED_SESSIONS");
  });
});
