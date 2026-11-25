import { describe, expect, it } from "vitest";
import {
  countPlannedSets,
  countValidatedSets,
  formatElapsed,
  formatSetProgress,
  startWorkoutSchema,
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
