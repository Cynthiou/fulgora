import { addDays, todayInParis } from "shared";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../../app.js";
import client from "../../database/client.js";
import {
  createTestAppointment,
  createTestUser,
  deleteTestUsers,
  type TestUser,
} from "../../test-helpers/fixtures.js";

const PREFIX = "test_hist_";

let lea: TestUser;
let someoneElse: TestUser;
const today = todayInParis();

// A realized session on an appointment, started on a given day.
async function addWorkout(
  user: TestUser,
  appointmentId: number,
  status: "completed" | "unfinished" | "in_progress",
  startedOn: string,
) {
  await client.execute(
    `INSERT INTO workout_session (appointment_id, owner_user_id, status, started_at, ended_at, last_activity_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      appointmentId,
      user.id,
      status,
      `${startedOn} 07:02:00`,
      status === "in_progress" ? null : `${startedOn} 07:50:00`,
      `${startedOn} 07:50:00`,
    ],
  );
  await client.execute(
    "UPDATE appointment SET status = 'attended' WHERE id = ?",
    [appointmentId],
  );
}

beforeAll(async () => {
  lea = await createTestUser(PREFIX);
  someoneElse = await createTestUser(PREFIX);

  // Planned on day -7, done on day -9: filed under day -9 with "Prévue le"
  const early = await createTestAppointment(lea, {
    name: "Haut du corps",
    date: addDays(today, -7),
  });
  await addWorkout(lea, early.appointmentId, "completed", addDays(today, -9));

  const unfinished = await createTestAppointment(lea, {
    name: "Dos",
    date: addDays(today, -3),
  });
  await addWorkout(
    lea,
    unfinished.appointmentId,
    "unfinished",
    addDays(today, -3),
  );

  const missed = await createTestAppointment(lea, {
    name: "Course",
    date: addDays(today, -5),
  });
  await client.execute(
    "UPDATE appointment SET status = 'missed' WHERE id = ?",
    [missed.appointmentId],
  );

  // Not in the history: in progress, planned, cancelled in the future, others'
  const running = await createTestAppointment(lea, {
    name: "En cours",
    date: today,
  });
  await addWorkout(lea, running.appointmentId, "in_progress", today);
  await createTestAppointment(lea, {
    name: "À venir",
    date: addDays(today, 2),
  });
  const futureCancelled = await createTestAppointment(lea, {
    name: "Annulée demain",
    date: addDays(today, 1),
  });
  await client.execute(
    "UPDATE appointment SET status = 'cancelled', cancelled_at = NOW(3) WHERE id = ?",
    [futureCancelled.appointmentId],
  );
  const theirs = await createTestAppointment(someoneElse, {
    name: "Pas la mienne",
    date: addDays(today, -4),
  });
  await addWorkout(
    someoneElse,
    theirs.appointmentId,
    "completed",
    addDays(today, -4),
  );
});

afterAll(async () => {
  await deleteTestUsers(PREFIX);
  await client.end();
});

function browse(query: string, cookie: string) {
  return request(app).get(`/api/history${query}`).set("Cookie", cookie);
}

function read(id: number | string, cookie: string) {
  return request(app).get(`/api/history/${id}`).set("Cookie", cookie);
}

describe("GET /api/history", () => {
  it("lists the past sessions newest first, filed under the real day", async () => {
    const response = await browse("", lea.cookie);

    expect(response.status).toBe(200);
    expect(response.body.has_more).toBe(false);
    expect(
      response.body.items.map(
        (item: { session_name: string; history_date: string }) => [
          item.session_name,
          item.history_date,
        ],
      ),
    ).toEqual([
      ["Dos", addDays(today, -3)],
      ["Course", addDays(today, -5)],
      ["Haut du corps", addDays(today, -9)],
    ]);

    const [done, , early] = response.body.items;
    expect(done).toMatchObject({
      appointment_status: "attended",
      program_name: null,
      workout: { status: "unfinished" },
    });
    expect(early).toMatchObject({
      planned_date: addDays(today, -7),
      history_date: addDays(today, -9),
      workout: { status: "completed" },
    });
    expect(early.workout.started_at).toEqual(expect.any(String));
  });

  it("pages 20 at a time and says whether more remain", async () => {
    const paged = await browse("?offset=2", lea.cookie);
    expect(paged.status).toBe(200);
    expect(paged.body.items).toHaveLength(1);
    expect(paged.body.items[0].session_name).toBe("Haut du corps");

    expect((await browse("?offset=-1", lea.cookie)).status).toBe(400);
    expect((await request(app).get("/api/history")).status).toBe(401);
  });
});

describe("GET /api/history/:id", () => {
  it("gives the realized tree of a started session, the plan of a missed one", async () => {
    const list = await browse("", lea.cookie);
    const done = list.body.items.find(
      (item: { session_name: string }) => item.session_name === "Dos",
    );
    const missed = list.body.items.find(
      (item: { session_name: string }) => item.session_name === "Course",
    );

    const doneDetail = await read(done.appointment_id, lea.cookie);
    expect(doneDetail.status).toBe(200);
    expect(doneDetail.body).toMatchObject({
      kind: "done",
      appointment: {
        id: done.appointment_id,
        status: "attended",
        session_name: "Dos",
        program_name: null,
      },
      workout: { status: "unfinished" },
    });

    const missedDetail = await read(missed.appointment_id, lea.cookie);
    expect(missedDetail.status).toBe(200);
    expect(missedDetail.body).toMatchObject({
      kind: "planned_only",
      appointment: { status: "missed", session_name: "Course" },
    });
    expect(missedDetail.body.blocks).toHaveLength(1);
    expect(missedDetail.body.blocks[0].exercises).toHaveLength(1);
    expect(missedDetail.body.blocks[0].exercises[0]).toMatchObject({
      name: expect.stringMatching(/^Exercice /),
      measure_codes: [],
      sets: [],
    });

    expect((await read(done.appointment_id, someoneElse.cookie)).status).toBe(
      404,
    );
    expect((await read("abc", lea.cookie)).status).toBe(400);
  });
});
