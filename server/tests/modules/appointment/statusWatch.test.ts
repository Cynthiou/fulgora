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

// US-27: a planned session whose day is past waits for an answer, then is
// missed after 72 hours (RM-052, RM-053, RM-067).

const PREFIX = "test_confirm_";
const ORIGIN = "http://localhost:3000";

let lea: TestUser;
let someoneElse: TestUser;

async function readStatus(id: number): Promise<string> {
  const [rows] = await client.execute<Rows[]>(
    "SELECT status FROM appointment WHERE id = ?",
    [id],
  );
  return String(rows[0]?.status);
}

beforeAll(async () => {
  lea = await createTestUser(PREFIX);
  someoneElse = await createTestUser(PREFIX);
});

afterAll(async () => {
  await deleteTestUsers(PREFIX);
  await client.end();
});

describe("updateAppointmentStatuses", () => {
  it("asks for a confirmation the day after, and gives up after 72 hours", async () => {
    const today = todayInParis();
    const yesterday = await createTestAppointment(lea, {
      name: "Hier",
      date: addDays(today, -1),
    });
    const longAgo = await createTestAppointment(lea, {
      name: "Il y a 4 jours",
      date: addDays(today, -4),
    });
    const tomorrow = await createTestAppointment(lea, {
      name: "Demain",
      date: addDays(today, 1),
    });

    await updateAppointmentStatuses();

    expect(await readStatus(yesterday.appointmentId)).toBe("to_confirm");
    expect(await readStatus(longAgo.appointmentId)).toBe("missed");
    // The future is left alone
    expect(await readStatus(tomorrow.appointmentId)).toBe("planned");
  });

  it("never touches a session that was started (RM-053)", async () => {
    const today = todayInParis();
    const { appointmentId } = await createTestAppointment(lea, {
      name: "Faite il y a longtemps",
      date: addDays(today, -5),
    });
    await client.execute(
      "UPDATE appointment SET status = 'attended' WHERE id = ?",
      [appointmentId],
    );
    await client.execute(
      `INSERT INTO workout_session (appointment_id, owner_user_id, status, started_at, ended_at, last_activity_at)
       VALUES (?, ?, 'completed', NOW(3), NOW(3), NOW(3))`,
      [appointmentId, lea.id],
    );

    await updateAppointmentStatuses();

    expect(await readStatus(appointmentId)).toBe("attended");
  });

  it("changes nothing when it runs again", async () => {
    const today = todayInParis();
    const { appointmentId } = await createTestAppointment(lea, {
      name: "Deux passages",
      date: addDays(today, -2),
    });

    const first = await updateAppointmentStatuses();
    const second = await updateAppointmentStatuses();

    expect(first.toConfirm).toBeGreaterThan(0);
    expect(second.toConfirm).toBe(0);
    expect(await readStatus(appointmentId)).toBe("to_confirm");
  });
});

describe("POST /api/appointments/:id/not-done", () => {
  function notDone(id: number, cookie: string) {
    return request(app)
      .post(`/api/appointments/${id}/not-done`)
      .set("Origin", ORIGIN)
      .set("Cookie", cookie);
  }

  it("marks a session to confirm as missed", async () => {
    const today = todayInParis();
    const { appointmentId } = await createTestAppointment(lea, {
      name: "Pas faite",
      date: addDays(today, -2),
    });
    await updateAppointmentStatuses();

    const response = await notDone(appointmentId, lea.cookie);

    expect(response.status).toBe(200);
    expect(await readStatus(appointmentId)).toBe("missed");
  });

  it("refuses a session already done, and the one of somebody else", async () => {
    const today = todayInParis();
    const { appointmentId } = await createTestAppointment(lea, {
      name: "Déjà faite",
      date: addDays(today, -2),
    });
    await client.execute(
      "UPDATE appointment SET status = 'attended' WHERE id = ?",
      [appointmentId],
    );

    const mine = await notDone(appointmentId, lea.cookie);
    const other = await notDone(appointmentId, someoneElse.cookie);

    expect(mine.status).toBe(409);
    expect(mine.body.error.code).toBe("APPOINTMENT_NOT_CONFIRMABLE");
    expect(other.status).toBe(404);
  });
});
