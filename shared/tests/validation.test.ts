import { describe, expect, it } from "vitest";
import {
  dateSchema,
  idParamSchema,
  idSchema,
  timeSchema,
  trimStrings,
} from "../validation.js";

describe("idSchema", () => {
  it("turns a digit string into a number", () => {
    expect(idSchema.parse("12")).toBe(12);
  });

  it.each(["0", "-1", "1.5", "abc", "", "007"])("refuses %j", (value) => {
    expect(idSchema.safeParse(value).success).toBe(false);
  });

  it("gives a French message for a wrong type", () => {
    const result = idSchema.safeParse(5);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).not.toContain("expected");
  });

  it("validates the id of a params object", () => {
    expect(idParamSchema.parse({ id: "7" })).toEqual({ id: 7 });
  });
});

describe("dateSchema", () => {
  it.each(["2026-11-25", "2024-02-29", "2026-01-01"])("accepts %s", (value) => {
    expect(dateSchema.parse(value)).toBe(value);
  });

  it.each(["2026-02-30", "2026-13-01", "2026-00-10", "25/11/2026", "2026-1-5"])(
    "refuses %s",
    (value) => {
      const result = dateSchema.safeParse(value);

      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe(
        "Date invalide (format AAAA-MM-JJ).",
      );
    },
  );
});

describe("timeSchema", () => {
  it.each(["00:00", "07:00", "23:59"])("accepts %s", (value) => {
    expect(timeSchema.parse(value)).toBe(value);
  });

  it.each(["24:00", "7:00", "07:60", "0700", "07:00:00"])(
    "refuses %s",
    (value) => {
      expect(timeSchema.safeParse(value).success).toBe(false);
    },
  );
});

describe("trimStrings", () => {
  it("trims strings at any depth and leaves the rest alone", () => {
    const input = {
      name: "  Jambes ",
      count: 3,
      done: false,
      note: null,
      tags: [" force ", "cardio"],
      block: { title: " Échauffement" },
    };

    expect(trimStrings(input)).toEqual({
      name: "Jambes",
      count: 3,
      done: false,
      note: null,
      tags: ["force", "cardio"],
      block: { title: "Échauffement" },
    });
  });

  it("returns a plain value unchanged", () => {
    expect(trimStrings(42)).toBe(42);
    expect(trimStrings(undefined)).toBeUndefined();
  });
});
