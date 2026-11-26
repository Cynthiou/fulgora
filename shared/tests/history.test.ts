import { describe, expect, it } from "vitest";
import {
  describeHistoryDates,
  describeHistoryFilters,
  formatDayBadge,
  formatPeriodLabel,
  formatWeekLabel,
  getHistoryStatus,
  getPeriodRange,
  groupByWeek,
  type HistoryItem,
  historyQuerySchema,
  shiftPeriod,
  startOfWeek,
} from "../history.js";

function item(overrides: Partial<HistoryItem>): HistoryItem {
  return {
    appointment_id: 1,
    history_date: "2026-11-26",
    planned_date: "2026-11-26",
    planned_time: "07:00",
    initial_date: null,
    moved_manually: false,
    appointment_status: "attended",
    session_name: "Réveil musculaire",
    program_name: null,
    workout: {
      id: 1,
      status: "completed",
      started_at: "2026-11-26T06:02:00.000Z",
    },
    ...overrides,
  };
}

describe("history helpers (US-35)", () => {
  it("finds the status of a line", () => {
    expect(getHistoryStatus(item({}))).toBe("completed");
    expect(
      getHistoryStatus(
        item({ workout: { id: 2, status: "unfinished", started_at: "" } }),
      ),
    ).toBe("unfinished");
    expect(
      getHistoryStatus(item({ workout: null, appointment_status: "missed" })),
    ).toBe("missed");
    expect(
      getHistoryStatus(
        item({ workout: null, appointment_status: "cancelled" }),
      ),
    ).toBe("cancelled");
    expect(
      getHistoryStatus(
        item({ workout: null, appointment_status: "to_confirm" }),
      ),
    ).toBe("to_confirm");
  });

  it("groups the lines by week, a Sunday with the Monday before", () => {
    expect(startOfWeek("2026-11-26")).toBe("2026-11-23");
    expect(startOfWeek("2026-11-29")).toBe("2026-11-23");
    expect(startOfWeek("2026-11-23")).toBe("2026-11-23");

    const weeks = groupByWeek([
      item({ appointment_id: 1, history_date: "2026-11-29" }),
      item({ appointment_id: 2, history_date: "2026-11-24" }),
      item({ appointment_id: 3, history_date: "2026-11-21" }),
    ]);
    expect(weeks.map((week) => week.monday)).toEqual([
      "2026-11-23",
      "2026-11-16",
    ]);
    expect(weeks[0]?.items.map((line) => line.appointment_id)).toEqual([1, 2]);
    expect(formatWeekLabel("2026-11-23")).toBe("Semaine du 23 nov.");
  });

  it("writes the day badge and the date notes", () => {
    expect(formatDayBadge("2026-11-26")).toEqual({ weekday: "Jeu", day: 26 });
    expect(
      describeHistoryDates(
        item({ history_date: "2026-11-17", planned_date: "2026-11-19" }),
      ),
    ).toEqual(["Prévue le 19"]);
    expect(
      describeHistoryDates(
        item({
          workout: null,
          appointment_status: "to_confirm",
          planned_date: "2026-11-24",
          history_date: "2026-11-24",
          moved_manually: true,
          initial_date: "2026-11-21",
        }),
      ),
    ).toEqual(["↷ déplacée du 21"]);
    expect(describeHistoryDates(item({}))).toEqual([]);
  });

  it("reads the offset and the filters of the query", () => {
    // Nothing asked: the first page, no filter (US-35, US-52)
    expect(historyQuerySchema.parse({})).toEqual({
      offset: 0,
      period: "all",
      statuses: [],
    });
    expect(historyQuerySchema.parse({ offset: "20" })).toMatchObject({
      offset: 20,
    });
    expect(historyQuerySchema.safeParse({ offset: "-1" }).success).toBe(false);

    expect(
      historyQuerySchema.parse({
        period: "month",
        date: "2026-11-15",
        program: "free",
        statuses: "missed,cancelled",
      }),
    ).toEqual({
      offset: 0,
      period: "month",
      date: "2026-11-15",
      program: "free",
      statuses: ["missed", "cancelled"],
    });
    expect(historyQuerySchema.parse({ program: "12" }).program).toBe(12);
    expect(historyQuerySchema.safeParse({ statuses: "nimporte" }).success).toBe(
      false,
    );
    expect(historyQuerySchema.safeParse({ period: "année" }).success).toBe(
      false,
    );
  });

  it("gives the first and the last day of a period (US-52)", () => {
    expect(getPeriodRange("all", "2026-11-26")).toBeNull();
    expect(getPeriodRange("week", "2026-11-26")).toEqual({
      from: "2026-11-23",
      to: "2026-11-29",
    });
    expect(getPeriodRange("month", "2026-11-26")).toEqual({
      from: "2026-11-01",
      to: "2026-11-30",
    });
    expect(getPeriodRange("month", "2026-02-10")).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
  });

  it("moves the period with the arrows and names it (US-52)", () => {
    expect(shiftPeriod("week", "2026-11-26", -1)).toBe("2026-11-19");
    expect(shiftPeriod("month", "2026-11-26", 1)).toBe("2026-12-01");
    expect(shiftPeriod("all", "2026-11-26", 1)).toBe("2026-11-26");
    expect(formatPeriodLabel("week", "2026-11-26")).toBe(
      "Semaine du 23 novembre",
    );
    expect(formatPeriodLabel("month", "2026-11-26")).toBe("Novembre 2026");
  });

  it("names the active filters, one chip each (SUI-05g)", () => {
    expect(
      describeHistoryFilters(
        {
          period: "month",
          date: "2026-11-15",
          program: "free",
          statuses: ["missed", "cancelled"],
        },
        null,
      ).map((chip) => chip.label),
    ).toEqual(["Novembre 2026", "Séance libre", "Manquées", "Annulées"]);
    expect(
      describeHistoryFilters(
        { period: "all", date: "2026-11-15", program: 7, statuses: [] },
        "Force 8 semaines",
      ),
    ).toEqual([{ key: "program", label: "Force 8 semaines" }]);
  });
});
