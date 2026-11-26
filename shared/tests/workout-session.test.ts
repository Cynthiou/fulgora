import { describe, expect, it } from "vitest";
import {
  actualSetSchema,
  computeDurationSeconds,
  computeTonnage,
  countAddedSets,
  countPlannedSets,
  countValidatedSets,
  formatActualValues,
  formatAddedSets,
  formatClock,
  formatElapsed,
  formatExerciseResult,
  formatSetProgress,
  formatSummaryDuration,
  formatTonnage,
  getRestDuration,
  getSetGap,
  isEmptySet,
  isObjectiveReached,
  plannedAsActual,
  startWorkoutSchema,
  toActualValues,
  toPlannedValues,
  type WorkoutSetRow,
} from "../workout-session.js";

function set(id: number, validated: boolean): WorkoutSetRow {
  return {
    id,
    position: id,
    reps_planned: 10,
    reps_actual: validated ? 10 : null,
    weight_planned_kg: 40,
    weight_actual_kg: validated ? 40 : null,
    duration_planned_seconds: null,
    duration_actual_seconds: null,
    distance_planned_meters: null,
    distance_actual_meters: null,
    speed_planned_kmh: null,
    speed_actual_kmh: null,
    resistance_planned: null,
    resistance_actual: null,
    incline_planned_percent: null,
    incline_actual_percent: null,
    calories_planned: null,
    calories_actual: null,
    planned_rest_seconds: 90,
    validated_at: validated ? "2026-11-26T07:10:00.000Z" : null,
    updated_at: null,
    is_added: false,
  };
}

const tree = {
  blocks: [
    {
      exercises: [
        {
          measure_codes: [],
          sets: [set(1, true), set(2, true), set(3, false)],
        },
        { measure_codes: [], sets: [set(4, false)] },
      ],
    },
    { exercises: [{ measure_codes: [], sets: [set(5, true)] }] },
  ],
} as never;

describe("workout session helpers (US-28)", () => {
  it("counts the planned and validated sets of the whole tree", () => {
    expect(countPlannedSets(tree)).toBe(5);
    expect(countValidatedSets(tree)).toBe(3);
  });

  it("writes the progress of an exercise, in sets or stages", () => {
    expect(
      formatSetProgress(
        {
          measure_codes: [],
          sets: [set(1, true), set(2, false), set(3, false)],
        },
        false,
      ),
    ).toBe("1 / 3 séries");
    expect(
      formatSetProgress({ measure_codes: [], sets: [set(1, false)] }, true),
    ).toBe("0 / 1 étape");
  });

  it("maps the planned side of a set to the editor's shape", () => {
    expect(toPlannedValues(set(1, false))).toEqual({
      reps: 10,
      weight_kg: 40,
      duration_seconds: null,
      distance_meters: null,
      speed_kmh: null,
      resistance: null,
      incline_percent: null,
      calories: null,
      rest_after_seconds: 90,
    });
  });

  it("formats the time since the start, never negative", () => {
    const start = "2026-11-26T07:00:00.000Z";
    expect(formatElapsed(start, new Date("2026-11-26T07:12:40.000Z"))).toBe(
      "12:40",
    );
    expect(formatElapsed(start, new Date("2026-11-26T08:02:05.000Z"))).toBe(
      "1:02:05",
    );
    expect(formatElapsed(start, new Date("2026-11-26T06:59:00.000Z"))).toBe(
      "0:00",
    );
  });

  it("validates the start request", () => {
    expect(startWorkoutSchema.safeParse({ appointment_id: 12 }).success).toBe(
      true,
    );
    expect(startWorkoutSchema.safeParse({ appointment_id: "12" }).success).toBe(
      false,
    );
    expect(startWorkoutSchema.safeParse({ appointment_id: 0 }).success).toBe(
      false,
    );
  });
});

describe("validating a set (US-29)", () => {
  const planned = set(1, false);

  it("accepts the actual values within the limits of the plan", () => {
    expect(actualSetSchema.safeParse(plannedAsActual(planned)).success).toBe(
      true,
    );
    expect(
      actualSetSchema.safeParse({ ...plannedAsActual(planned), reps: 1001 })
        .success,
    ).toBe(false);
    expect("rest_after_seconds" in actualSetSchema.shape).toBe(false);
  });

  it("refuses a set with nothing done", () => {
    const empty = toActualValues(planned);
    expect(isEmptySet(empty)).toBe(true);
    expect(isEmptySet({ ...empty, reps: 0, weight_kg: 0 })).toBe(true);
    expect(isEmptySet({ ...empty, reps: 1 })).toBe(false);
  });

  it("tells the gap with the plan and whether the objective is reached", () => {
    const asPlanned = set(1, true);
    expect(getSetGap(asPlanned)).toBe("=");
    expect(isObjectiveReached(asPlanned)).toBe(true);

    const heavier = { ...asPlanned, weight_actual_kg: 42.5 };
    expect(getSetGap(heavier)).toBe("▲ 2,5 kg");
    expect(isObjectiveReached(heavier)).toBe(true);

    const fewer = { ...asPlanned, reps_actual: 9 };
    expect(getSetGap(fewer)).toBe("▼ 1 rép.");
    expect(isObjectiveReached(fewer)).toBe(false);

    const shorter = {
      ...asPlanned,
      reps_planned: null,
      reps_actual: null,
      weight_planned_kg: null,
      weight_actual_kg: null,
      duration_planned_seconds: 60,
      duration_actual_seconds: 42,
    };
    expect(getSetGap(shorter)).toBe("▼ 18 s");
    expect(isObjectiveReached(shorter)).toBe(false);
    expect(isObjectiveReached(set(1, false))).toBe(false);
  });

  it("writes the actual values of a set", () => {
    expect(formatActualValues(set(1, true), ["reps", "weight"])).toBe(
      "10 rép. · 40 kg",
    );
    expect(formatActualValues(set(1, false), ["reps", "weight"])).toBe(
      "Aucun objectif",
    );
  });
});

describe("rest timer helpers (US-30)", () => {
  it("takes the rest of the set, else the exercise's, else 1 min 30", () => {
    const exercise = { default_rest_seconds: 120 };
    expect(getRestDuration({ planned_rest_seconds: 45 }, exercise)).toBe(45);
    expect(getRestDuration({ planned_rest_seconds: null }, exercise)).toBe(120);
    expect(
      getRestDuration(
        { planned_rest_seconds: null },
        { default_rest_seconds: null },
      ),
    ).toBe(90);
  });

  it("writes the clock, never below zero", () => {
    expect(formatClock(72)).toBe("1:12");
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(-3)).toBe("0:00");
  });
});

describe("summary of a session (US-34)", () => {
  it("computes the duration from the start to the end, or to now", () => {
    expect(
      computeDurationSeconds(
        "2026-11-26T07:00:00.000Z",
        "2026-11-26T07:48:00.000Z",
      ),
    ).toBe(2880);
    expect(
      computeDurationSeconds(
        "2026-11-26T07:00:00.000Z",
        null,
        new Date("2026-11-26T07:10:30.000Z"),
      ),
    ).toBe(630);
    expect(formatSummaryDuration(2880)).toBe("48 min");
  });

  it("adds up reps x weight of the validated sets only", () => {
    const sets = [
      { ...set(1, true), reps_actual: 10, weight_actual_kg: 40 },
      { ...set(2, true), reps_actual: 8, weight_actual_kg: 62.5 },
      { ...set(3, false), reps_actual: null, weight_actual_kg: null },
      { ...set(4, true), reps_actual: 12, weight_actual_kg: null },
    ];
    expect(computeTonnage(sets)).toBe(900);
    expect(formatTonnage(3240)).toBe("3 240 kg".replace(" ", "\u202f"));
    expect(computeTonnage([])).toBe(0);
  });

  it("writes the result of an exercise, with the sets not done", () => {
    const reps = (value: number, validated = true) => ({
      ...set(value, validated),
      reps_actual: validated ? value : null,
    });
    expect(
      formatExerciseResult({
        measure_codes: ["reps", "weight"],
        sets: [reps(10), reps(8), reps(10)],
      }),
    ).toBe("3 / 3 · 10, 8, 10 rép.");
    expect(
      formatExerciseResult({
        measure_codes: ["reps"],
        sets: [reps(10), reps(8), reps(3, false)],
      }),
    ).toBe("2 / 3 · 10, 8 rép. · série 3 non faite");
    expect(
      formatExerciseResult({
        measure_codes: ["reps"],
        sets: [reps(1, false), reps(2, false), reps(3, false)],
      }),
    ).toBe("0 / 3 · séries 1, 2 et 3 non faites");
    expect(
      formatExerciseResult({
        measure_codes: ["duration"],
        sets: [
          { ...set(1, true), duration_actual_seconds: 60 },
          { ...set(2, true), duration_actual_seconds: 42 },
        ],
      }),
    ).toBe("2 / 2 · 1 min, 42 s");
    expect(
      formatExerciseResult({
        measure_codes: ["duration", "distance"],
        sets: [
          { ...set(1, true), duration_actual_seconds: 600 },
          { ...set(2, true), duration_actual_seconds: 492 },
        ],
      }),
    ).toBe("2 / 2 · 18 min 12");
  });
});

describe("countAddedSets et formatAddedSets", () => {
  it("counts only the sets added during the session", () => {
    const withAdded = {
      blocks: [
        {
          exercises: [
            {
              measure_codes: [],
              sets: [
                { ...set(1, true), is_added: false },
                { ...set(2, true), is_added: true },
                { ...set(3, false), is_added: true },
              ],
            },
          ],
        },
      ],
    } as never;
    expect(countAddedSets(withAdded)).toBe(2);
  });

  it("agrees in number", () => {
    expect(formatAddedSets(1)).toBe("1 série supplémentaire");
    expect(formatAddedSets(2)).toBe("2 séries supplémentaires");
  });
});
