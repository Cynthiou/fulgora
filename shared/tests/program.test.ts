import { describe, expect, it } from "vitest";
import type { AppointmentListItem } from "../appointment.js";
import {
  buildProgramSessionName,
  canActivateProgram,
  computeProgramProgress,
  computeProgramStatus,
  countProgramAppointments,
  countProgramWeeks,
  describeAbandon,
  describeAddedSessions,
  describeDayAfterAdding,
  describeProgramDeletion,
  describeRemovedDay,
  formatDateList,
  formatPeriod,
  formatPeriodShort,
  formatProgramProgress,
  formatProgramReview,
  formatReadySessions,
  formatWeekCount,
  formatWeekdays,
  getAvailableProgramActions,
  getProgramWeekIndex,
  getWeekday,
  groupProgramWeeks,
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
    schedule_id: weekday,
    weekday,
    planned_time: "18:30",
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

describe("seeing a program (US-48)", () => {
  // An appointment of the program, with or without its realized session.
  function appointment(
    id: number,
    date: string,
    workout: "completed" | "unfinished" | "in_progress" | null = null,
  ): AppointmentListItem {
    return {
      id,
      planned_date: date,
      planned_time: "18:30",
      status: "planned",
      moved_manually: false,
      initial_date: null,
      session_version_id: id,
      session_name: `Séance ${id}`,
      program: { id: 1, name: "Force" },
      block_count: 1,
      exercise_count: 3,
      workout_session:
        workout === null
          ? null
          : {
              id,
              status: workout,
              started_at: `${date}T17:00:00.000Z`,
              validated_sets: 3,
              planned_sets: 3,
            },
    };
  }

  const program = { start_date: "2026-11-02", end_date: "2026-12-13" };
  const items = [
    appointment(1, "2026-11-02", "completed"),
    appointment(2, "2026-11-05", "completed"),
    appointment(3, "2026-11-09", "unfinished"),
    appointment(4, "2026-11-12"),
    appointment(5, "2026-11-23"),
    appointment(6, "2026-12-10"),
  ];

  it("counts what is past and what is done (PRO-07)", () => {
    const progress = computeProgramProgress(items, "2026-11-23");
    expect(progress).toEqual({ total: 6, past: 4, done: 3, percent: 50 });
    expect(formatProgramProgress(progress)).toBe(
      "4 / 6 séances passées · 3 faites",
    );
    expect(formatProgramReview(progress)).toBe(
      "6 séances prévues · 50 % réalisées",
    );
  });

  it("gives 0 % and no session for an empty program", () => {
    expect(computeProgramProgress([], "2026-11-23")).toEqual({
      total: 0,
      past: 0,
      done: 0,
      percent: 0,
    });
  });

  it("cuts the program into weeks with their state (PRO-07)", () => {
    const weeks = groupProgramWeeks(program, items, "2026-11-23");
    expect(weeks).toHaveLength(6);
    expect(weeks[0]?.from).toBe("2026-11-02");
    expect(weeks[0]?.to).toBe("2026-11-08");
    expect(weeks[0]?.state).toBe("done");
    // The third week holds nothing and is over
    expect(weeks[1]?.state).toBe("partial");
    expect(weeks[2]?.state).toBe("missed");
    expect(weeks[3]?.items.map((item) => item.id)).toEqual([5]);
    expect(weeks[3]?.state).toBe("current");
    expect(weeks[5]?.state).toBe("coming");
  });

  it("says which week a day belongs to", () => {
    expect(getProgramWeekIndex(program, "2026-11-02")).toBe(1);
    expect(getProgramWeekIndex(program, "2026-11-23")).toBe(4);
    expect(getProgramWeekIndex(program, "2026-12-20")).toBeNull();
  });

  it("offers only the actions the state allows (PRO-07b)", () => {
    expect(getAvailableProgramActions({ status: "draft" })).toEqual({
      canEdit: true,
      canAbandon: false,
      canDelete: true,
      canReuse: false,
    });
    // Nothing started yet: the program is thrown away, not given up
    expect(getAvailableProgramActions({ status: "in_progress" })).toEqual({
      canEdit: true,
      canAbandon: false,
      canDelete: true,
      canReuse: false,
    });
    // One session started: the other way round (US-21)
    expect(
      getAvailableProgramActions({ status: "in_progress" }, false, 1),
    ).toEqual({
      canEdit: true,
      canAbandon: true,
      canDelete: false,
      canReuse: false,
    });
    // A session in progress holds the program (RM-034)
    expect(
      getAvailableProgramActions({ status: "in_progress" }, true, 1).canAbandon,
    ).toBe(false);
    expect(getAvailableProgramActions({ status: "finished" })).toEqual({
      canEdit: false,
      canAbandon: false,
      canDelete: false,
      canReuse: true,
    });
    expect(getAvailableProgramActions({ status: "abandoned" }).canReuse).toBe(
      true,
    );
  });
});

// US-19: several sessions can share a day, and every counter follows.
describe("several sessions on the same day (US-19)", () => {
  // Six weeks, Monday, Thursday and Saturday: the example of the mockup.
  const START = "2026-11-30";
  const END = "2027-01-10";
  const week = [
    { weekday: 1, name: "Haut du corps", planned_time: "18:30" },
    { weekday: 4, name: "Jambes", planned_time: "07:00" },
    { weekday: 6, name: "Cardio", planned_time: null },
    { weekday: 6, name: "Mobilité", planned_time: null },
  ];

  it("counts one appointment per session and per week (RM-075)", () => {
    expect(countProgramAppointments(START, END, week)).toBe(24);
    expect(countProgramAppointments(START, END, [])).toBe(0);
  });

  it("says what one more session adds (PRO-03a)", () => {
    expect(describeAddedSessions(START, END, week, 1)).toBe(
      "Ajoute 6 rendez-vous de plus (1 par semaine) : le total passe de 24 à 30.",
    );
  });

  it("says what unchecking a day removes (PRO-03b)", () => {
    const removed = describeRemovedDay(START, END, week, 6);
    expect(removed?.title).toBe("Samedi décoché : 2 séances seront retirées");
    expect(removed?.detail).toBe(
      "« Cardio » et « Mobilité », avec leurs blocs et exercices. Le programme passe de 24 à 12 rendez-vous.",
    );
    // A day without any session removes nothing
    expect(describeRemovedDay(START, END, week, 2)).toBeNull();
  });

  it("says what the day will hold once the session is added", () => {
    expect(describeDayAfterAdding(week, 1)).toBe(
      "Le lundi aura 2 séances : « Haut du corps » à 18:30 et celle-ci.",
    );
    expect(describeDayAfterAdding(week, 2)).toBeNull();
  });
});

// US-21: what the two dialogs say before stopping a program.
describe("stopping a program (US-21)", () => {
  it("writes the dates of the sessions to cancel, month by month", () => {
    expect(
      formatDateList([
        "2026-11-26",
        "2026-12-03",
        "2026-12-10",
        "2026-12-17",
        "2026-12-25",
      ]),
    ).toBe("26 nov., 3, 10, 17 et 25 déc.");
    expect(formatDateList(["2026-12-03"])).toBe("3 déc.");
    expect(formatDateList([])).toBe("");
  });

  it("says what the abandon cancels and what it keeps (PRO-11)", () => {
    expect(describeAbandon(["2026-11-26", "2026-12-03"], 3)).toBe(
      "Les 2 séances à venir (26 nov. et 3 déc.) seront annulées. Tes 3 séances passées et leurs résultats sont conservés.",
    );
    expect(describeAbandon(["2026-11-26"], 1)).toBe(
      "La séance à venir (26 nov.) sera annulée. Ta séance passée et ses résultats sont conservés.",
    );
    expect(describeAbandon([], 0)).toBe(
      "Aucune séance à venir ne sera annulée. Rien de ce qui est passé ne change.",
    );
  });

  it("says what the deletion removes (PRO-11c)", () => {
    expect(describeProgramDeletion(24)).toBe(
      "Aucune séance n'a été démarrée. Les 24 séances prévues seront retirées du Planning.",
    );
    expect(describeProgramDeletion(1)).toBe(
      "Aucune séance n'a été démarrée. La séance prévue sera retirée du Planning.",
    );
  });
});
