import { afterEach, describe, expect, test } from "vitest";
import {
  DEFAULT_PREFERENCES,
  formatPreferencesPreview,
  preferencesSchema,
} from "../preferences.js";
import { setDisplayUnits } from "../units.js";

afterEach(() => {
  setDisplayUnits({ weight: "kg", distance: "km" });
});

describe("preferencesSchema", () => {
  test("accepts one preference alone", () => {
    const result = preferencesSchema.safeParse({ weight_unit: "lb" });
    expect(result.success).toBe(true);
  });

  test("accepts several preferences at once", () => {
    const result = preferencesSchema.safeParse({
      distance_unit: "mi",
      sound_enabled: false,
      home_metric: "none",
    });
    expect(result.success).toBe(true);
  });

  test("refuses an unknown column", () => {
    const result = preferencesSchema.safeParse({ password_hash: "x" });
    expect(result.success).toBe(false);
  });

  test("refuses an unknown value", () => {
    expect(preferencesSchema.safeParse({ weight_unit: "stone" }).success).toBe(
      false,
    );
    expect(
      preferencesSchema.safeParse({ home_metric: "whatever" }).success,
    ).toBe(false);
  });

  test("refuses an empty change", () => {
    expect(preferencesSchema.safeParse({}).success).toBe(false);
  });
});

describe("formatPreferencesPreview", () => {
  test("shows the example in kilograms and kilometres", () => {
    const lines = formatPreferencesPreview(DEFAULT_PREFERENCES);
    expect(lines[0]?.value).toBe("4 × 8 · 60 kg");
    expect(lines[1]?.value).toBe("5,2 km");
    expect(lines[2]?.value).toBe("2 séances faites");
  });

  test("follows the units and the indicator being chosen", () => {
    const lines = formatPreferencesPreview({
      ...DEFAULT_PREFERENCES,
      weight_unit: "lb",
      distance_unit: "mi",
      home_metric: "none",
    });
    expect(lines[0]?.value).toBe("4 × 8 · 132,3 lb");
    expect(lines[1]?.value).toBe("3,2 mi");
    expect(lines[2]?.value).toBe("Aucun indicateur");
  });
});
