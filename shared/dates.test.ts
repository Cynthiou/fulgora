import { describe, expect, it } from "vitest";
import { todayIn, todayInParis } from "./dates.js";

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
