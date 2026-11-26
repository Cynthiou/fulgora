import { describe, expect, it } from "vitest";
import {
  countPlanChanges,
  formatMovedAppointment,
  type ProgramAppointment,
  planScheduleChange,
  type ScheduleNow,
} from "../program-schedule.js";

// Today is Thursday 26 November 2026; the program runs from Monday
// 2 November to Sunday 20 December, with one session on Saturday.
const TODAY = "2026-11-26";

const running: ScheduleNow = {
  schedule_id: 1,
  weekday: 6,
  planned_time: "10:00",
  name: "Course",
};

function appointment(
  id: number,
  date: string,
  extra: Partial<ProgramAppointment> = {},
): ProgramAppointment {
  return {
    id,
    schedule_id: 1,
    planned_date: date,
    planned_time: "10:00",
    moved_manually: false,
    status: "planned",
    is_started: false,
    ...extra,
  };
}

// The Saturdays of the period: three are past, one was moved by hand to the
// Friday, three are still to come.
function saturdays(): ProgramAppointment[] {
  return [
    appointment(1, "2026-11-07"),
    appointment(2, "2026-11-14"),
    appointment(3, "2026-11-21"),
    appointment(4, "2026-11-28"),
    appointment(5, "2026-12-04", { moved_manually: true }),
    appointment(6, "2026-12-12"),
    appointment(7, "2026-12-19"),
  ];
}

function plan(
  overrides: {
    end_date?: string;
    weekday?: number;
    planned_time?: string | null;
    appointments?: ProgramAppointment[];
  } = {},
) {
  return planScheduleChange({
    start_date: "2026-11-02",
    end_date: overrides.end_date ?? "2026-12-20",
    schedules: [running],
    wishes: [
      {
        schedule_id: 1,
        weekday: overrides.weekday ?? 6,
        planned_time:
          overrides.planned_time === undefined
            ? "10:00"
            : overrides.planned_time,
      },
    ],
    appointments: overrides.appointments ?? saturdays(),
    today: TODAY,
  });
}

describe("planScheduleChange (US-20)", () => {
  it("moves the Saturdays to Sunday without touching the past", () => {
    const result = plan({ weekday: 7 });

    expect(result.moved.map(formatMovedAppointment)).toEqual([
      "Sam 28 nov. → Dim 29 nov. · 10:00",
      "Sam 12 déc. → Dim 13 déc. · 10:00",
      "Sam 19 déc. → Dim 20 déc. · 10:00",
    ]);
    expect(result.created).toEqual([]);
    expect(result.cancelled).toEqual([]);
    expect(countPlanChanges(result)).toBe(3);
  });

  it("keeps an appointment moved by hand where it is", () => {
    const result = plan({ weekday: 7 });

    expect(result.moved.some((moved) => moved.appointment_id === 5)).toBe(
      false,
    );
    expect(result.notes).toContain(
      "Non modifié : ven 4 déc., déplacé manuellement.",
    );
    expect(result.notes).toContain(
      "Séances passées (7 → 21 nov.) : inchangées.",
    );
  });

  it("says nothing changed when the day and the hour stay the same", () => {
    const result = plan();

    expect(countPlanChanges(result)).toBe(0);
    expect(result.notes).toContain("Course du samedi : inchangé.");
  });

  it("moves only the hour when only the hour changes", () => {
    const result = plan({ planned_time: "18:30" });

    expect(result.moved.map(formatMovedAppointment)).toEqual([
      "Sam 28 nov. → Sam 28 nov. · 18:30",
      "Sam 12 déc. → Sam 12 déc. · 18:30",
      "Sam 19 déc. → Sam 19 déc. · 18:30",
    ]);
  });

  it("adds the weeks of a longer program", () => {
    const result = plan({ end_date: "2027-01-02" });

    expect(result.created.map((created) => created.planned_date)).toEqual([
      "2026-12-26",
      "2027-01-02",
    ]);
    expect(result.cancelled).toEqual([]);
  });

  it("cancels what falls after a shorter program", () => {
    const result = plan({ end_date: "2026-12-05" });

    expect(result.cancelled.map((one) => one.planned_date)).toEqual([
      "2026-12-12",
      "2026-12-19",
    ]);
    expect(result.moved).toEqual([]);
  });

  it("never moves a session already started", () => {
    const started = saturdays().map((one) =>
      one.id === 6 ? { ...one, is_started: true } : one,
    );
    const result = plan({ weekday: 7, appointments: started });

    expect(result.moved.map((moved) => moved.appointment_id)).toEqual([4, 7]);
    expect(result.notes).toContain(
      "Une séance commencée n'est jamais déplacée.",
    );
  });

  it("leaves a cancelled appointment alone and fills its week again", () => {
    const cancelled = saturdays().map((one) =>
      one.id === 7 ? { ...one, status: "cancelled" } : one,
    );
    const result = plan({ weekday: 7, appointments: cancelled });

    expect(result.cancelled).toEqual([]);
    expect(result.created.map((created) => created.planned_date)).toEqual([
      "2026-12-20",
    ]);
  });
});
