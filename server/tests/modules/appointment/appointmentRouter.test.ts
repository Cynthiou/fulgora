import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../../../src/app.js";
import client from "../../../src/database/client.js";
import {
  createTestAppointment,
  createTestUser,
  deleteTestUsers,
  type TestUser,
} from "../../helpers/fixtures.js";

const PREFIX = "test_appt_";

let lea: TestUser;
let someoneElse: TestUser;

beforeAll(async () => {
  lea = await createTestUser(PREFIX);
  someoneElse = await createTestUser(PREFIX);

  // Three sessions on the 26th (one without a time), one on the 30th.
  await createTestAppointment(lea, {
    name: "Sans heure",
    date: "2026-11-26",
    time: null,
    blocks: [2],
  });
  await createTestAppointment(lea, {
    name: "Midi",
    date: "2026-11-26",
    time: "12:30:00",
    blocks: [1, 2],
  });
  await createTestAppointment(lea, {
    name: "Matin",
    date: "2026-11-26",
    time: "07:00:00",
    blocks: [3],
  });
  await createTestAppointment(lea, {
    name: "Plus tard",
    date: "2026-11-30",
    time: "18:30:00",
    blocks: [],
  });
  await createTestAppointment(someoneElse, {
    name: "Pas la mienne",
    date: "2026-11-26",
    time: "07:00:00",
  });
});

afterAll(async () => {
  await deleteTestUsers(PREFIX);
  await client.end();
});

function browse(query: string, cookie: string) {
  return request(app).get(`/api/appointments?${query}`).set("Cookie", cookie);
}

describe("GET /api/appointments", () => {
  it("lists the user's sessions of the day, by time, without a time last", async () => {
    const response = await browse("from=2026-11-26&to=2026-11-26", lea.cookie);

    expect(response.status).toBe(200);
    expect(
      response.body.map((item: { session_name: string }) => item.session_name),
    ).toEqual(["Matin", "Midi", "Sans heure"]);
  });

  it("gives the time as HH:MM, the counts and a null program for a free session", async () => {
    const response = await browse("from=2026-11-26&to=2026-11-26", lea.cookie);
    const [matin, midi] = response.body;

    expect(matin).toMatchObject({
      planned_date: "2026-11-26",
      planned_time: "07:00",
      status: "planned",
      moved_manually: false,
      session_name: "Matin",
      program: null,
      block_count: 1,
      exercise_count: 3,
      workout_session: null,
    });
    expect(midi).toMatchObject({
      planned_time: "12:30",
      block_count: 2,
      exercise_count: 3,
    });
  });

  it("counts zero for a session without any block", async () => {
    const response = await browse("from=2026-11-30&to=2026-11-30", lea.cookie);

    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      session_name: "Plus tard",
      block_count: 0,
      exercise_count: 0,
    });
  });

  it("covers a period and never shows another user's sessions", async () => {
    const response = await browse("from=2026-11-01&to=2026-12-31", lea.cookie);

    expect(response.body).toHaveLength(4);
    expect(
      response.body.some(
        (item: { session_name: string }) =>
          item.session_name === "Pas la mienne",
      ),
    ).toBe(false);
  });

  it("answers 400 for a reversed or too long period", async () => {
    const reversed = await browse("from=2026-11-27&to=2026-11-26", lea.cookie);
    const tooLong = await browse("from=2026-01-01&to=2026-03-04", lea.cookie);
    const missing = await browse("from=2026-01-01", lea.cookie);

    expect(reversed.status).toBe(400);
    expect(tooLong.status).toBe(400);
    expect(tooLong.body.error.fields[0]).toEqual({
      field: "to",
      message: "La période ne peut pas dépasser 62 jours.",
    });
    expect(missing.status).toBe(400);
  });

  it("answers 401 without a cookie", async () => {
    const response = await request(app).get(
      "/api/appointments?from=2026-11-26&to=2026-11-26",
    );

    expect(response.status).toBe(401);
  });
});
