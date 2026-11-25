import { describe, expect, it } from "vitest";
import type { AppointmentListItem } from "../appointment.js";
import {
  buildDayEntries,
  buildMonthCell,
  countDaySessions,
  type DayEntry,
  describeEntry,
  formatDayCount,
  formatMovedFrom,
  getAppointmentDisplayDate,
  getEntryTime,
  isDoneAnotherDay,
} from "../planning.js";

type Options = Partial<AppointmentListItem>;

// The first entry of a day; the tests always build at least one.
function firstEntry(entries: DayEntry[]): DayEntry {
  const [entry] = entries;
  if (entry === undefined) {
    throw new Error("The day holds no entry");
  }
  return entry;
}

function appointment(id: number, date: string, options: Options = {}) {
  const item: AppointmentListItem = {
    id,
    planned_date: date,
    planned_time: "07:00",
    status: "planned",
    moved_manually: false,
    initial_date: null,
    session_version_id: id,
    session_name: `Séance ${id}`,
    program: null,
    block_count: 1,
    exercise_count: 2,
    workout_session: null,
    ...options,
  };
  return item;
}

// A session done on the 17th at 18:30 Paris time (17:30 UTC in November).
function doneOn17(id: number, plannedDate: string) {
  return appointment(id, plannedDate, {
    status: "attended",
    workout_session: {
      id: id * 10,
      status: "completed",
      started_at: "2026-11-17T17:30:00.000Z",
      validated_sets: 6,
      planned_sets: 6,
    },
  });
}

describe("getAppointmentDisplayDate", () => {
  it("keeps the planned date while the session was not started", () => {
    expect(getAppointmentDisplayDate(appointment(1, "2026-11-19"))).toBe(
      "2026-11-19",
    );
  });

  it("takes the real day of a session done in advance (RM-070)", () => {
    expect(getAppointmentDisplayDate(doneOn17(1, "2026-11-19"))).toBe(
      "2026-11-17",
    );
    expect(isDoneAnotherDay(doneOn17(1, "2026-11-19"))).toBe(true);
  });

  it("reads the day in Paris, not in UTC", () => {
    const lateAtNight = appointment(1, "2026-11-19", {
      workout_session: {
        id: 2,
        status: "completed",
        // 23:30 in Paris is already the next day in UTC
        started_at: "2026-11-17T22:30:00.000Z",
        validated_sets: 1,
        planned_sets: 1,
      },
    });
    expect(getAppointmentDisplayDate(lateAtNight)).toBe("2026-11-17");
  });
});

describe("buildDayEntries", () => {
  const items = [
    appointment(1, "2026-11-19", { planned_time: "12:30" }),
    appointment(2, "2026-11-19", { planned_time: "07:00" }),
    appointment(3, "2026-11-19", { planned_time: null }),
    doneOn17(4, "2026-11-19"),
  ];

  it("sorts the day by time, the ones without a time last", () => {
    const entries = buildDayEntries(items, "2026-11-19");
    expect(entries.map((entry) => entry.item.id)).toEqual([2, 1, 3, 4]);
    expect(entries.map((entry) => entry.isReminder)).toEqual([
      false,
      false,
      false,
      true,
    ]);
  });

  it("does not count the reminder of a session done elsewhere", () => {
    const entries = buildDayEntries(items, "2026-11-19");
    expect(countDaySessions(entries)).toBe(3);
    expect(formatDayCount(entries)).toBe("3 séances");
  });

  it("shows the session on the day it was really done", () => {
    const entries = buildDayEntries(items, "2026-11-17");
    expect(entries).toHaveLength(1);
    expect(entries[0]?.isReminder).toBe(false);
    expect(countDaySessions(entries)).toBe(1);
  });
});

describe("formatDayCount", () => {
  it("counts the sessions done", () => {
    const entries = buildDayEntries(
      [doneOn17(1, "2026-11-17"), appointment(2, "2026-11-17")],
      "2026-11-17",
    );
    expect(formatDayCount(entries)).toBe("2 séances · 1 effectuée");
  });

  it("says when everything waits for a confirmation", () => {
    const entries = buildDayEntries(
      [
        appointment(1, "2026-11-24", { status: "to_confirm" }),
        appointment(2, "2026-11-24", { status: "to_confirm" }),
      ],
      "2026-11-24",
    );
    expect(formatDayCount(entries)).toBe("2 séances à confirmer");
  });

  it("says when the day is empty", () => {
    expect(formatDayCount([])).toBe("aucune séance");
  });
});

describe("buildMonthCell", () => {
  it("shows three indicators at most and counts the rest", () => {
    const items = [
      appointment(1, "2026-11-26"),
      appointment(2, "2026-11-26"),
      appointment(3, "2026-11-26"),
      appointment(4, "2026-11-26"),
    ];
    expect(buildMonthCell(items, "2026-11-26")).toEqual({
      indicators: [
        { appointment_id: 1, status: "planned" },
        { appointment_id: 2, status: "planned" },
        { appointment_id: 3, status: "planned" },
      ],
      extra: 1,
      hasMoved: false,
    });
  });

  it("marks a day holding a session moved by hand", () => {
    const items = [
      appointment(1, "2026-11-24", {
        moved_manually: true,
        initial_date: "2026-11-21",
        status: "to_confirm",
      }),
    ];
    expect(buildMonthCell(items, "2026-11-24")).toEqual({
      indicators: [{ appointment_id: 1, status: "to_confirm" }],
      extra: 0,
      hasMoved: true,
    });
  });

  it("leaves the reminder out of the cell", () => {
    expect(buildMonthCell([doneOn17(1, "2026-11-19")], "2026-11-19")).toEqual({
      indicators: [],
      extra: 0,
      hasMoved: false,
    });
  });
});

describe("getEntryTime", () => {
  it("gives the real start of a session done", () => {
    const entry = firstEntry(
      buildDayEntries([doneOn17(1, "2026-11-19")], "2026-11-17"),
    );
    expect(getEntryTime(entry)).toBe("18:30");
  });

  it("gives the planned time otherwise, and nothing for a reminder", () => {
    const entry = firstEntry(
      buildDayEntries([appointment(1, "2026-11-19")], "2026-11-19"),
    );
    expect(getEntryTime(entry)).toBe("07:00");

    const reminder = firstEntry(
      buildDayEntries([doneOn17(1, "2026-11-19")], "2026-11-19"),
    );
    expect(getEntryTime(reminder)).toBeNull();
  });
});

describe("describeEntry", () => {
  it("names the planned day of a session done in advance", () => {
    const entry = firstEntry(
      buildDayEntries([doneOn17(1, "2026-11-19")], "2026-11-17"),
    );
    expect(describeEntry(entry)).toBe("Séance libre · prévue le 19 novembre");
  });

  it("names the real day in the reminder", () => {
    const reminder = firstEntry(
      buildDayEntries([doneOn17(1, "2026-11-19")], "2026-11-19"),
    );
    expect(describeEntry(reminder)).toBe("Effectuée le 17 novembre");
  });

  it("names the program and the move", () => {
    const item = appointment(1, "2026-11-24", {
      program: { id: 1, name: "Cardio base" },
      moved_manually: true,
      initial_date: "2026-11-21",
    });
    const entry = firstEntry(buildDayEntries([item], "2026-11-24"));
    expect(describeEntry(entry)).toBe("Cardio base · ↷ déplacée du 21");
    expect(formatMovedFrom(item)).toBe("déplacée du 21");
  });
});
