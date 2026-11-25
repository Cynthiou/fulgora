import { describe, expect, it } from "vitest";
import {
  actualSetSchema,
  countPlannedSets,
  countValidatedSets,
  formatActualValues,
  formatElapsed,
  formatSetProgress,
  getSetGap,
  isEmptySet,
  isObjectiveReached,
  plannedAsActual,
  startWorkoutSchema,
  toActualValues,
  toPlannedValues,
  type WorkoutSetRow,
} from "./workout-session.js";

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
