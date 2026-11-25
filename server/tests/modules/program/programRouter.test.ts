import { addDays, todayInParis } from "shared";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../../../src/app.js";
import client, { type Rows } from "../../../src/database/client.js";
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
  await client.query(
    "DELETE a FROM appointment a JOIN `user` u ON u.id = a.owner_user_id WHERE u.username LIKE ?",
    [`${PREFIX}%`],
  );
  await client.query(
    "DELETE ws FROM weekly_schedule ws JOIN program p ON p.id = ws.program_id JOIN `user` u ON u.id = p.owner_user_id WHERE u.username LIKE ?",
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
