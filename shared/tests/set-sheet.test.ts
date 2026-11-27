import { describe, expect, it } from "vitest";
import { createEmptySet, type PlannedSetValues } from "../session-template.js";
import {
  fromSetLines,
  getSetMeasures,
  readSideSplit,
  type SetMeasure,
  stepMeasure,
  toSetLines,
} from "../set-sheet.js";

function set(values: Partial<PlannedSetValues>): PlannedSetValues {
  return { ...createEmptySet(), ...values };
}

function headsOf(measures: ReturnType<typeof getSetMeasures>): string[] {
  return measures.map((measure) => measure.head);
}

// The case at that place, which the tests know is there.
function caseAt(
  measures: ReturnType<typeof getSetMeasures>,
  index: number,
): SetMeasure {
  const measure = measures[index];
  if (measure === undefined) {
    throw new Error(`Pas de case à la place ${index}`);
  }
  return measure;
}

describe("lines of sets", () => {
  it("groups the sets that follow each other and carry the same values", () => {
    const lines = toSetLines([
      set({ reps: 10, weight_kg: 60 }),
      set({ reps: 10, weight_kg: 60 }),
      set({ reps: 10, weight_kg: 60 }),
      set({ reps: 8, weight_kg: 65 }),
    ]);

    expect(lines.map((line) => line.count)).toEqual([3, 1]);
    expect(lines[0]?.values.weight_kg).toBe(60);
    expect(lines[1]?.values.reps).toBe(8);
  });

  it("keeps two runs apart when the same values come back later", () => {
    const lines = toSetLines([
      set({ reps: 10 }),
      set({ reps: 8 }),
      set({ reps: 10 }),
    ]);

    expect(lines.map((line) => line.count)).toEqual([1, 1, 1]);
  });

  it("gives one row per set again, without sharing them", () => {
    const lines = toSetLines([set({ reps: 10 }), set({ reps: 10 })]);
    const sets = fromSetLines(lines);

    expect(sets).toHaveLength(2);
    expect(sets[0]).not.toBe(sets[1]);
    expect(sets[0]).toEqual(sets[1]);
  });

  it("makes the round trip of an empty list", () => {
    expect(fromSetLines(toSetLines([]))).toEqual([]);
  });
});

describe("the cases of the sheet", () => {
  it("asks the number of sets, the repetitions and the load", () => {
    const measures = getSetMeasures({ measure_codes: ["reps", "weight"] });

    expect(headsOf(measures)).toEqual(["SÉRIES", "RÉPÉTITIONS", "CHARGE"]);
    expect(measures.map((measure) => measure.step)).toEqual([1, 1, 2.5]);
    expect(measures.map((measure) => measure.min)).toEqual([1, 1, 0]);
  });

  it("writes the unit with the number it follows", () => {
    const [count, reps] = getSetMeasures({ measure_codes: ["reps"] });

    expect(count?.unit(1)).toBe("série");
    expect(count?.unit(4)).toBe("séries");
    expect(reps?.unit(10)).toBe("rép.");
  });

  it("counts a duration in seconds, by 5 and never under 5", () => {
    const duration = caseAt(getSetMeasures({ measure_codes: ["duration"] }), 1);

    expect(duration.head).toBe("DURÉE");
    expect(duration.unit(45)).toBe("s");
    expect(duration.step).toBe(5);
    expect(duration.min).toBe(5);
    expect(stepMeasure(duration, 45, 1)).toBe(50);
    expect(stepMeasure(duration, 5, -1)).toBe(5);
  });

  it("reads a cardio machine in minutes, and hides its distance", () => {
    const measures = getSetMeasures({
      measure_codes: ["duration", "distance", "speed", "incline", "calories"],
    });

    expect(headsOf(measures)).toEqual([
      "NOMBRE DE TOURS",
      "DURÉE",
      "VITESSE",
      "INCLINAISON",
    ]);
    const duration = caseAt(measures, 1);
    expect(duration.unit(10)).toBe("min");
    // 600 seconds are stored, 10 minutes are shown
    expect(duration.toDisplay(600)).toBe(10);
    expect(stepMeasure(duration, 600, 1)).toBe(660);
    expect(stepMeasure(duration, 60, -1)).toBe(60);
  });

  it("adds the distance and the calories when they are asked for", () => {
    const measures = getSetMeasures(
      {
        measure_codes: ["duration", "distance", "speed", "incline", "calories"],
      },
      undefined,
      ["distance_meters", "calories"],
    );

    expect(headsOf(measures)).toEqual([
      "NOMBRE DE TOURS",
      "DURÉE",
      "DISTANCE",
      "VITESSE",
      "INCLINAISON",
      "CALORIES",
    ]);
  });

  it("says « par côté » on a per-side exercise", () => {
    const measures = getSetMeasures({
      measure_codes: ["reps", "weight"],
      is_per_side: true,
    });

    expect(headsOf(measures)).toEqual([
      "SÉRIES",
      "RÉPÉTITIONS PAR CÔTÉ",
      "CHARGE",
    ]);
    expect(measures[1]?.unit(10)).toBe("rép. / côté");
  });

  it("splits the repetitions, the load, or both (handoff « Gauche ≠ droite »)", () => {
    const exercise = {
      measure_codes: ["reps", "weight"] as const,
      is_per_side: true,
    };

    expect(
      headsOf(
        getSetMeasures(
          { ...exercise, measure_codes: ["reps", "weight"] },
          {
            reps: true,
            weight: false,
          },
        ),
      ),
    ).toEqual(["SÉRIES", "RÉP. GAUCHE", "RÉP. DROITE", "CHARGE"]);
    expect(
      headsOf(
        getSetMeasures(
          { ...exercise, measure_codes: ["reps", "weight"] },
          {
            reps: false,
            weight: true,
          },
        ),
      ),
    ).toEqual([
      "SÉRIES",
      "RÉPÉTITIONS PAR CÔTÉ",
      "CHARGE GAUCHE",
      "CHARGE DROITE",
    ]);
    const both = getSetMeasures(
      { ...exercise, measure_codes: ["reps", "weight"] },
      { reps: true, weight: true },
    );
    expect(headsOf(both)).toEqual([
      "SÉRIES",
      "RÉP. GAUCHE",
      "RÉP. DROITE",
      "CHARGE GAUCHE",
      "CHARGE DROITE",
    ]);
    // One side at a time moves by 1 kg, both sides at once by 2,5
    expect(caseAt(both, 3).step).toBe(1);
  });

  it("never splits an exercise that is not done side by side", () => {
    expect(
      headsOf(
        getSetMeasures(
          { measure_codes: ["reps", "weight"] },
          {
            reps: true,
            weight: true,
          },
        ),
      ),
    ).toEqual(["SÉRIES", "RÉPÉTITIONS", "CHARGE"]);
  });

  it("opens on the state the line was left in", () => {
    expect(readSideSplit(set({ reps: 10 }))).toEqual({
      reps: false,
      weight: false,
    });
    expect(readSideSplit(set({ reps_left: 10, reps_right: 8 }))).toEqual({
      reps: true,
      weight: false,
    });
    expect(
      readSideSplit(set({ weight_left_kg: 8, weight_right_kg: 12 })),
    ).toEqual({ reps: false, weight: true });
  });

  it("steps a load by 2,5 kg and stops at zero", () => {
    const weight = caseAt(
      getSetMeasures({ measure_codes: ["reps", "weight"] }),
      2,
    );

    expect(stepMeasure(weight, 60, 1)).toBe(62.5);
    expect(stepMeasure(weight, 60, -1)).toBe(57.5);
    expect(stepMeasure(weight, 1, -1)).toBe(0);
    // An empty case starts at its minimum
    expect(stepMeasure(weight, null, 1)).toBe(2.5);
  });
});
