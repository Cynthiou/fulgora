import { addDays, todayInParis } from "shared";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../../../src/app.js";
import client, { type Rows } from "../../../src/database/client.js";
import { updateAppointmentStatuses } from "../../../src/modules/appointment/statusWatch.js";
import {
  createTestAppointment,
  createTestUser,
  deleteTestUsers,
  type TestUser,
} from "../../helpers/fixtures.js";

// US-46: the notifications of a user, and the two ways to read them. They
// are created by the scheduled task of US-27 (RM-055, RM-056, DT-16).

const PREFIX = "test_notif_";
const ORIGIN = "http://localhost:3000";

let lea: TestUser;
let someoneElse: TestUser;

async function countFor(user: TestUser): Promise<number> {
  const [rows] = await client.execute<Rows[]>(
    "SELECT COUNT(*) AS total FROM notification WHERE user_id = ?",
    [user.id],
  );
  return Number(rows[0]?.total ?? 0);
}

beforeAll(async () => {
  lea = await createTestUser(PREFIX);
  someoneElse = await createTestUser(PREFIX);
  const today = todayInParis();
  await createTestAppointment(lea, { name: "Dos", date: addDays(today, -2) });
  await createTestAppointment(lea, {
    name: "Course",
    date: addDays(today, -6),
  });
  await createTestAppointment(someoneElse, {
    name: "Pas la sienne",
    date: addDays(today, -2),
  });
  await updateAppointmentStatuses();
});

afterAll(async () => {
  await client.query(
    "DELETE n FROM notification n JOIN `user` u ON u.id = n.user_id WHERE u.username LIKE ?",
    [`${PREFIX}%`],
  );
  await deleteTestUsers(PREFIX);
  await client.end();
});

describe("GET /api/notifications", () => {
  it("lists the notifications of the user, newest first", async () => {
    const response = await request(app)
      .get("/api/notifications")
      .set("Cookie", lea.cookie);

    expect(response.status).toBe(200);
    const titles = response.body.items.map(
      (item: { title: string }) => item.title,
    );
    expect(titles).toContain("Séance à confirmer");
    expect(titles).toContain("Séance manquée");
    expect(response.body.unread_count).toBe(response.body.items.length);
    // Nothing from the other user
    expect(
      response.body.items.some((item: { message: string }) =>
        item.message.includes("Pas la sienne"),
      ),
    ).toBe(false);
  });

  it("creates one notification per appointment and per type", async () => {
    const before = await countFor(lea);
    await updateAppointmentStatuses();
    expect(await countFor(lea)).toBe(before);
  });
});

describe("PATCH /api/notifications", () => {
  it("reads one notification and gives the new count", async () => {
    const list = await request(app)
      .get("/api/notifications")
      .set("Cookie", lea.cookie);
    const [first] = list.body.items;

    const response = await request(app)
      .patch(`/api/notifications/${first.id}/read`)
      .set("Origin", ORIGIN)
      .set("Cookie", lea.cookie);

    expect(response.status).toBe(200);
    expect(response.body.unread_count).toBe(list.body.unread_count - 1);
  });

  it("answers 404 for the notification of somebody else", async () => {
    const list = await request(app)
      .get("/api/notifications")
      .set("Cookie", lea.cookie);
    const [first] = list.body.items;

    const response = await request(app)
      .patch(`/api/notifications/${first.id}/read`)
      .set("Origin", ORIGIN)
      .set("Cookie", someoneElse.cookie);

    expect(response.status).toBe(404);
  });

  it("marks everything read at once", async () => {
    const response = await request(app)
      .patch("/api/notifications/read-all")
      .set("Origin", ORIGIN)
      .set("Cookie", lea.cookie);

    expect(response.status).toBe(204);
    const count = await request(app)
      .get("/api/notifications/unread-count")
      .set("Cookie", lea.cookie);
    expect(count.body.unread_count).toBe(0);
  });
});

describe("POST /api/appointments/:id/not-done", () => {
  it("reads the notification of the session it answers (RM-067)", async () => {
    const today = todayInParis();
    const { appointmentId } = await createTestAppointment(lea, {
      name: "Répondue",
      date: addDays(today, -2),
    });
    await updateAppointmentStatuses();

    await request(app)
      .post(`/api/appointments/${appointmentId}/not-done`)
      .set("Origin", ORIGIN)
      .set("Cookie", lea.cookie);

    const [rows] = await client.execute<Rows[]>(
      "SELECT read_at FROM notification WHERE appointment_id = ?",
      [appointmentId],
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.read_at !== null)).toBe(true);
  });
});
