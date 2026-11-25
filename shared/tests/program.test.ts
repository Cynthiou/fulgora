import { describe, expect, it } from "vitest";
import {
  buildProgramSessionName,
  canActivateProgram,
  computeProgramStatus,
  countProgramWeeks,
  formatPeriod,
  formatPeriodShort,
  formatReadySessions,
  formatWeekCount,
  formatWeekdays,
  getWeekday,
  listProgramDates,
  type ProgramSessionSummary,
  programInfoSchema,
  statusAfterCreation,
} from "../program.js";

function session(
  weekday: number,
  exerciseCount: number,
): ProgramSessionSummary {
  return {
    weekday,
    session_template_id: weekday,
    session_version_id: weekday,
    name: buildProgramSessionName(weekday),
    exercise_count: exerciseCount,
    exercise_names: exerciseCount === 0 ? null : "Squat à la barre",
  };
}

describe("weekdays", () => {
  it("reads the ISO weekday of a day", () => {
    // 30 November 2026 is a Monday, 6 December a Sunday
    expect(getWeekday("2026-11-30")).toBe(1);
    expect(getWeekday("2026-12-06")).toBe(7);
  });

  it("names the session of a day", () => {
    expect(buildProgramSessionName(1)).toBe("Séance du lundi");
    expect(buildProgramSessionName(4)).toBe("Séance du jeudi");
  });

  it("writes the days of the week and their number", () => {
    expect(formatWeekdays([4, 1, 6])).toBe(
      "Lundi · Jeudi · Samedi · 3 jours par semaine",
    );
    expect(formatWeekdays([2])).toBe("Mardi · 1 jour par semaine");
    expect(formatWeekdays([])).toBe("Aucun jour choisi");
  });
});

describe("the period", () => {
  it("counts the weeks, rounded up", () => {
    expect(countProgramWeeks("2026-11-30", "2026-12-06")).toBe(1);
    expect(countProgramWeeks("2026-11-30", "2026-12-07")).toBe(2);
    expect(formatWeekCount("2026-11-30", "2027-01-10")).toBe("6 semaines");
    expect(formatWeekCount("2026-11-30", "2026-12-06")).toBe("1 semaine");
  });

  it("lists every day of the period falling on the chosen days", () => {
    // Monday and Thursday, from Monday 30 November to Sunday 13 December
    const dates = listProgramDates("2026-11-30", "2026-12-13", [1, 4]);
    expect(dates).toEqual([
      "2026-11-30",
      "2026-12-03",
      "2026-12-07",
      "2026-12-10",
    ]);
  });

  it("writes the period in words", () => {
    expect(formatPeriod("2026-11-30", "2027-01-10")).toBe(
      "du lundi 30 novembre au dimanche 10 janvier",
    );
  });

  it("writes the short period of a card, with the year once (PRO-01)", () => {
    expect(formatPeriodShort("2026-11-02", "2026-12-27")).toBe(
      "2 nov. → 27 déc. 2026",
    );
    expect(formatPeriodShort("2026-11-30", "2027-01-10")).toBe(
      "30 nov. 2026 → 10 janv. 2027",
    );
  });
});

describe("the status of a program", () => {
  it("follows the dates (RM-074)", () => {
    const program = {
      status: "programmed" as const,
      start_date: "2026-12-01",
      end_date: "2026-12-31",
    };
    expect(computeProgramStatus(program, "2026-11-30")).toBe("programmed");
    expect(computeProgramStatus(program, "2026-12-01")).toBe("in_progress");
    expect(computeProgramStatus(program, "2027-01-01")).toBe("finished");
  });

  it("leaves a draft and a finished program alone (RM-071)", () => {
    const draft = {
      status: "draft" as const,
      start_date: "2026-12-01",
      end_date: "2026-12-31",
    };
    expect(computeProgramStatus(draft, "2026-12-15")).toBe("draft");
  });

  it("says which status a new program takes", () => {
    expect(statusAfterCreation("2026-12-01", "2026-11-25")).toBe("programmed");
    expect(statusAfterCreation("2026-11-25", "2026-11-25")).toBe("in_progress");
  });
});

describe("the sessions of a program", () => {
  it("counts the ones which are ready", () => {
    expect(formatReadySessions([session(1, 3), session(4, 0)])).toBe(
      "1 / 2 séances prêtes",
    );
    expect(formatReadySessions([session(1, 3)])).toBe("1 / 1 séance prête");
  });

  it("only lets a program start when every session holds an exercise", () => {
    expect(canActivateProgram([session(1, 3), session(4, 2)])).toBe(true);
    expect(canActivateProgram([session(1, 3), session(4, 0)])).toBe(false);
    expect(canActivateProgram([])).toBe(false);
  });
});

describe("programInfoSchema", () => {
  const valid = {
    name: "Hypertrophie 6 semaines",
    description: null,
    start_date: "2026-11-30",
    end_date: "2027-01-10",
    weekdays: [1, 4, 6],
    planned_time: "18:30",
  };

  it("accepts a whole program", () => {
    expect(programInfoSchema.safeParse(valid).success).toBe(true);
  });

  it("refuses an end before the start, no day, and a name missing", () => {
    expect(
      programInfoSchema.safeParse({ ...valid, end_date: "2026-11-29" }).success,
    ).toBe(false);
    expect(
      programInfoSchema.safeParse({ ...valid, weekdays: [] }).success,
    ).toBe(false);
    expect(programInfoSchema.safeParse({ ...valid, name: "" }).success).toBe(
      false,
    );
  });

  it("refuses a period longer than 52 weeks", () => {
    expect(
      programInfoSchema.safeParse({ ...valid, end_date: "2028-01-01" }).success,
    ).toBe(false);
  });
});
