import { afterEach, describe, expect, test } from "vitest";
import {
  formatDistance,
  formatSpeed,
  formatWeight,
  formatWeightStepMessage,
  fromDisplayDistance,
  fromDisplayWeight,
  getSpeedUnitLabel,
  isPlateWeight,
  setDisplayUnits,
  toDisplayDistance,
  toDisplayWeight,
} from "../units.js";

// The screens change, the stored value never does (DT-11).
afterEach(() => {
  setDisplayUnits({ weight: "kg", distance: "km" });
});

describe("weight conversions", () => {
  test("keeps the value as it is in kilograms", () => {
    expect(toDisplayWeight(60, "kg")).toBe(60);
    expect(fromDisplayWeight(60, "kg")).toBe(60);
  });

  test("turns 60 kg into pounds and back without losing anything", () => {
    expect(toDisplayWeight(60, "lb")).toBe(132.277);
    expect(fromDisplayWeight(132.277, "lb")).toBe(60);
  });

  test("stores a load typed in pounds in kilograms (US-05)", () => {
    expect(fromDisplayWeight(135, "lb")).toBe(61.235);
  });

  test("goes back and forth on several loads", () => {
    for (const kilograms of [2.5, 20, 42.5, 100]) {
      const pounds = toDisplayWeight(kilograms, "lb");
      expect(fromDisplayWeight(pounds, "lb")).toBeCloseTo(kilograms, 3);
    }
  });
});

describe("distance conversions", () => {
  test("reads meters in kilometres or in miles", () => {
    expect(toDisplayDistance(5200, "km")).toBe(5.2);
    expect(toDisplayDistance(5200, "mi")).toBe(3.231);
  });

  test("stores a distance typed in miles in meters", () => {
    expect(fromDisplayDistance(3.231, "mi")).toBe(5199.79);
    expect(fromDisplayDistance(5.2, "km")).toBe(5200);
  });
});

describe("the chosen units", () => {
  test("prints kilograms and kilometres by default", () => {
    expect(formatWeight(60)).toBe("60 kg");
    expect(formatDistance(5200)).toBe("5,2 km");
    expect(formatSpeed(9)).toBe("9 km/h");
    expect(getSpeedUnitLabel()).toBe("km/h");
  });

  test("prints pounds and miles once they are chosen", () => {
    setDisplayUnits({ weight: "lb", distance: "mi" });
    expect(formatWeight(60)).toBe("132,3 lb");
    expect(formatDistance(5200)).toBe("3,2 mi");
    expect(formatSpeed(9)).toBe("5,6 mph");
    expect(getSpeedUnitLabel()).toBe("mph");
  });

  test("prints more decimals when the screen asks for them", () => {
    setDisplayUnits({ weight: "lb", distance: "km" });
    expect(formatWeight(60, 2)).toBe("132,28 lb");
  });
});

// US-15 and US-05 together: a load is a multiple of 0,25 kg, or of 0,5 lb
// for someone who works in pounds.
describe("the step of a load", () => {
  test("accepts a plate step in kilograms", () => {
    expect(isPlateWeight(40)).toBe(true);
    expect(isPlateWeight(40.25)).toBe(true);
    expect(isPlateWeight(40.3)).toBe(false);
  });

  test("accepts a load typed in pounds", () => {
    // 135 lb, the value of the card
    expect(fromDisplayWeight(135, "lb")).toBe(61.235);
    expect(isPlateWeight(61.235)).toBe(true);
    // 132,277 lb is 60 kg, a plate step as well
    expect(isPlateWeight(60)).toBe(true);
  });

  test("says the step in the unit of the screen", () => {
    expect(formatWeightStepMessage("kg")).toBe(
      "Entre une valeur par pas de 0,25.",
    );
    expect(formatWeightStepMessage("lb")).toBe(
      "Entre une valeur par pas de 0,5 lb.",
    );
  });
});
