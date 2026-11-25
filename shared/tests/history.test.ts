import { describe, expect, it } from "vitest";
import {
  describeHistoryDates,
  formatDayBadge,
  formatWeekLabel,
  getHistoryStatus,
  groupByWeek,
  type HistoryItem,
  historyQuerySchema,
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

  it("reads the offset of the query", () => {
    expect(historyQuerySchema.parse({})).toEqual({ offset: 0 });
    expect(historyQuerySchema.parse({ offset: "20" })).toEqual({ offset: 20 });
    expect(historyQuerySchema.safeParse({ offset: "-1" }).success).toBe(false);
  });
});
