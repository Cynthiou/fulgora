import { describe, expect, it } from "vitest";
import {
  addDays,
  formatLongDate,
  formatTimeOfDay,
  todayIn,
  todayInParis,
} from "./dates.js";

describe("todayIn", () => {
  it("gives the calendar day of the time zone, not of UTC", () => {
    // 23:30 UTC on the 25th is already 00:30 on the 26th in Paris (UTC+1).
    const lateEvening = new Date("2026-11-25T23:30:00Z");

    expect(todayIn("Europe/Paris", lateEvening)).toBe("2026-11-26");
    expect(todayIn("UTC", lateEvening)).toBe("2026-11-25");
  });

  it("goes the other way west of Greenwich", () => {
    // 05:00 UTC on the 26th is still the evening of the 25th in Los Angeles.
    const earlyMorning = new Date("2026-11-26T05:00:00Z");

    expect(todayIn("America/Los_Angeles", earlyMorning)).toBe("2026-11-25");
  });

  it("always pads month and day on two digits", () => {
    expect(todayIn("UTC", new Date("2026-03-05T12:00:00Z"))).toBe("2026-03-05");
  });
});

describe("todayInParis", () => {
  it("uses Europe/Paris", () => {
    expect(todayInParis(new Date("2026-07-31T22:30:00Z"))).toBe("2026-08-01");
  });
});

describe("formatTimeOfDay", () => {
  it("shows hours and minutes in the Paris time zone by default", () => {
    // 17:34 UTC in November is 18:34 in Paris.
    expect(formatTimeOfDay("2026-11-25T17:34:00.000Z")).toBe("18:34");
  });

  it("accepts a Date and another time zone", () => {
    const moment = new Date("2026-11-25T17:34:00.000Z");

    expect(formatTimeOfDay(moment, "UTC")).toBe("17:34");
  });

  it("pads the hour on two digits", () => {
    expect(formatTimeOfDay("2026-11-25T06:05:00.000Z", "UTC")).toBe("06:05");
  });
});

describe("addDays", () => {
  it("shifts a date forwards and backwards, across months and years", () => {
    expect(addDays("2026-11-26", 1)).toBe("2026-11-27");
    expect(addDays("2026-11-26", -31)).toBe("2026-10-26");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2024-03-01", -1)).toBe("2024-02-29");
  });
});

describe("formatLongDate", () => {
  it("writes the weekday, the day and the month in French", () => {
    expect(formatLongDate("2026-11-26")).toBe("Jeudi 26 novembre");
    expect(formatLongDate("2026-08-01")).toBe("Samedi 1 août");
  });
});
