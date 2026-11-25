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

// US-25: moving a session to another day. The date it was first planned for
// is kept, and the status follows the new date (RM-032, RM-068).

const PREFIX = "test_move_";
const ORIGIN = "http://localhost:3000";

let lea: TestUser;
let someoneElse: TestUser;

function move(id: number, body: object, cookie: string) {
  return request(app)
    .patch(`/api/appointments/${id}/move`)
    .set("Origin", ORIGIN)
    .set("Cookie", cookie)
    .send(body);
}

async function readRow(id: number) {
  const [rows] = await client.execute<Rows[]>(
    `SELECT planned_date, planned_time, initial_date, moved_manually, status
       FROM appointment WHERE id = ?`,
    [id],
  );
  return rows[0];
}

beforeAll(async () => {
  lea = await createTestUser(PREFIX);
  someoneElse = await createTestUser(PREFIX);
});

afterAll(async () => {
  await deleteTestUsers(PREFIX);
  await client.end();
});

describe("PATCH /api/appointments/:id/move", () => {
  it("moves the session, keeps the first date and plans it again", async () => {
    const today = todayInParis();
    const { appointmentId } = await createTestAppointment(lea, {
      name: "Jambes",
      date: addDays(today, 1),
      time: "07:00:00",
    });

    const response = await move(
      appointmentId,
      { planned_date: addDays(today, 3), planned_time: "18:30" },
      lea.cookie,
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      planned_date: addDays(today, 3),
      planned_time: "18:30",
      status: "planned",
    });
    const row = await readRow(appointmentId);
    expect(row?.initial_date).toBe(addDays(today, 1));
    expect(row?.moved_manually).toBe(1);
  });

  it("keeps the very first date after a second move", async () => {
    const today = todayInParis();
    const first = addDays(today, 1);
    const { appointmentId } = await createTestAppointment(lea, {
      name: "Deux fois",
      date: first,
    });

    await move(
      appointmentId,
      { planned_date: addDays(today, 2), planned_time: null },
      lea.cookie,
    );
    await move(
      appointmentId,
      { planned_date: addDays(today, 5), planned_time: null },
      lea.cookie,
    );

    const row = await readRow(appointmentId);
    expect(row?.initial_date).toBe(first);
    expect(row?.planned_date).toBe(addDays(today, 5));
  });

  // The example of CAL-05b: "Dos", missed, moved to a past day.
  it("asks for a confirmation when the new day is just past", async () => {
    const today = todayInParis();
    const { appointmentId } = await createTestAppointment(lea, {
      name: "Dos",
      date: addDays(today, -6),
    });

    const response = await move(
      appointmentId,
      { planned_date: addDays(today, -1), planned_time: null },
      lea.cookie,
    );

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("to_confirm");
  });

  it("marks a far away day as missed", async () => {
    const today = todayInParis();
    const { appointmentId } = await createTestAppointment(lea, {
      name: "Vieille",
      date: addDays(today, 1),
    });

    const response = await move(
      appointmentId,
      { planned_date: addDays(today, -10), planned_time: null },
      lea.cookie,
    );

    expect(response.body.status).toBe("missed");
  });

  it("refuses a session already done", async () => {
    const today = todayInParis();
    const { appointmentId } = await createTestAppointment(lea, {
      name: "Faite",
      date: today,
    });
    await client.execute(
      "UPDATE appointment SET status = 'attended' WHERE id = ?",
      [appointmentId],
    );

    const response = await move(
      appointmentId,
      { planned_date: addDays(today, 1), planned_time: null },
      lea.cookie,
    );

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("APPOINTMENT_NOT_MOVABLE");
  });

  it("refuses a date out of range and the session of somebody else", async () => {
    const today = todayInParis();
    const { appointmentId } = await createTestAppointment(lea, {
      name: "Jambes",
      date: today,
    });

    const tooFar = await move(
      appointmentId,
      { planned_date: "2099-01-01", planned_time: null },
      lea.cookie,
    );
    const notMine = await move(
      appointmentId,
      { planned_date: addDays(today, 1), planned_time: null },
      someoneElse.cookie,
    );

    expect(tooFar.status).toBe(400);
    expect(notMine.status).toBe(404);
  });
});
