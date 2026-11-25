import { describe, expect, it } from "vitest";
import {
  countDaysBetween,
  dateRangeSchema,
  formatSessionContent,
  formatTodayCount,
  sortDayAppointments,
  toHourMinute,
} from "../appointment.js";

describe("countDaysBetween", () => {
  it("counts the days from one date to another", () => {
    expect(countDaysBetween("2026-11-26", "2026-11-26")).toBe(0);
    expect(countDaysBetween("2026-11-26", "2026-11-27")).toBe(1);
    expect(countDaysBetween("2026-11-27", "2026-11-26")).toBe(-1);
    expect(countDaysBetween("2026-02-27", "2026-03-02")).toBe(3);
  });
});

describe("dateRangeSchema", () => {
  it("accepts a single day and a 62 day period", () => {
    expect(
      dateRangeSchema.safeParse({ from: "2026-11-26", to: "2026-11-26" })
        .success,
    ).toBe(true);
    // 1 January to 3 March 2026 is 62 days.
    expect(
      dateRangeSchema.safeParse({ from: "2026-01-01", to: "2026-03-03" })
        .success,
    ).toBe(true);
  });

  it("refuses a reversed period", () => {
    const result = dateRangeSchema.safeParse({
      from: "2026-11-27",
      to: "2026-11-26",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "La date de fin doit suivre la date de début.",
    );
  });

  it("refuses more than 62 days", () => {
    const result = dateRangeSchema.safeParse({
      from: "2026-01-01",
      to: "2026-03-04",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "La période ne peut pas dépasser 62 jours.",
    );
  });

  it("refuses an unreal date", () => {
    expect(
      dateRangeSchema.safeParse({ from: "2026-02-30", to: "2026-03-01" })
        .success,
    ).toBe(false);
  });
});

describe("sortDayAppointments", () => {
  it("sorts by time, without a time last, then by id", () => {
    const sorted = sortDayAppointments([
      { id: 4, planned_time: null },
      { id: 3, planned_time: "12:30" },
      { id: 2, planned_time: "07:00" },
      { id: 1, planned_time: null },
      { id: 5, planned_time: "07:00" },
    ]);

    expect(sorted.map((item) => item.id)).toEqual([2, 5, 3, 1, 4]);
  });

  it("does not change the given list", () => {
    const items = [
      { id: 2, planned_time: null },
      { id: 1, planned_time: "07:00" },
    ];

    sortDayAppointments(items);

    expect(items[0]?.id).toBe(2);
  });
});

describe("toHourMinute", () => {
  it("keeps hours and minutes only", () => {
    expect(toHourMinute("18:30:00")).toBe("18:30");
    expect(toHourMinute("07:05")).toBe("07:05");
    expect(toHourMinute(null)).toBeNull();
  });
});

describe("formatSessionContent", () => {
  it("agrees blocks and exercises in number", () => {
    expect(formatSessionContent(1, 3)).toBe("1 bloc · 3 exercices");
    expect(formatSessionContent(2, 1)).toBe("2 blocs · 1 exercice");
    expect(formatSessionContent(0, 0)).toBe("0 bloc · 0 exercice");
  });
});

describe("formatTodayCount", () => {
  it("writes the selector label", () => {
    expect(formatTodayCount(4)).toBe("4 aujourd'hui");
  });
});
