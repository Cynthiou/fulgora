import { describe, expect, it } from "vitest";
import {
  countReachedObjectives,
  formatActualSide,
  formatComparisonValue,
  formatPlannedSide,
} from "./history-detail.js";
import { createEmptySet } from "./session-template.js";
import type { WorkoutSetRow } from "./workout-session.js";

function set(
  id: number,
  planned: { reps: number; weight: number },
  actual: { reps: number; weight: number } | null,
): WorkoutSetRow {
  return {
    id,
    position: id,
    reps_planned: planned.reps,
    reps_actual: actual?.reps ?? null,
    weight_planned_kg: planned.weight,
    weight_actual_kg: actual?.weight ?? null,
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
    planned_rest_seconds: null,
    validated_at: actual === null ? null : "2026-11-19T06:10:00.000Z",
  };
}

describe("history detail helpers (US-36)", () => {
  it("counts the objectives reached, as on SUI-06 (6 / 10)", () => {
    const squat = [
      set(1, { reps: 8, weight: 60 }, { reps: 8, weight: 60 }),
      set(2, { reps: 8, weight: 60 }, { reps: 7, weight: 60 }),
      set(3, { reps: 8, weight: 60 }, { reps: 8, weight: 62.5 }),
      set(4, { reps: 8, weight: 60 }, { reps: 6, weight: 60 }),
    ];
    const lunges = [
      set(5, { reps: 10, weight: 0 }, { reps: 10, weight: 0 }),
      set(6, { reps: 10, weight: 0 }, { reps: 10, weight: 0 }),
      set(7, { reps: 10, weight: 0 }, { reps: 8, weight: 0 }),
    ];
    const plank = [
      {
        ...set(8, { reps: 0, weight: 0 }, null),
        reps_planned: null,
        weight_planned_kg: null,
        duration_planned_seconds: 60,
        duration_actual_seconds: 60,
        validated_at: "2026-11-19T06:30:00.000Z",
      },
      {
        ...set(9, { reps: 0, weight: 0 }, null),
        reps_planned: null,
        weight_planned_kg: null,
        duration_planned_seconds: 60,
        duration_actual_seconds: 70,
        validated_at: "2026-11-19T06:31:00.000Z",
      },
      {
        ...set(10, { reps: 0, weight: 0 }, null),
        reps_planned: null,
        weight_planned_kg: null,
        duration_planned_seconds: 60,
        duration_actual_seconds: 50,
        validated_at: "2026-11-19T06:32:00.000Z",
      },
    ];
    expect(countReachedObjectives(squat)).toBe(2);
    expect(countReachedObjectives(lunges)).toBe(2);
    expect(countReachedObjectives(plank)).toBe(2);
    expect(countReachedObjectives([...squat, ...lunges, ...plank])).toBe(6);
    expect(
      countReachedObjectives([set(11, { reps: 8, weight: 60 }, null)]),
    ).toBe(0);
  });

  it("writes one side of a comparison by profile", () => {
    const codes: ("reps" | "weight")[] = ["reps", "weight"];
    expect(
      formatPlannedSide(set(1, { reps: 8, weight: 60 }, null), codes),
    ).toBe("8 × 60 kg");
    expect(
      formatActualSide(
        set(1, { reps: 8, weight: 60 }, { reps: 8, weight: 62.5 }),
        codes,
      ),
    ).toBe("8 × 62,5 kg");
    expect(formatActualSide(set(1, { reps: 8, weight: 60 }, null), codes)).toBe(
      "—",
    );
    expect(
      formatComparisonValue({ ...createEmptySet(), reps: 10 }, ["reps"]),
    ).toBe("10 rép.");
    expect(
      formatComparisonValue({ ...createEmptySet(), duration_seconds: 70 }, [
        "duration",
      ]),
    ).toBe("1:10");
    expect(
      formatComparisonValue(
        {
          ...createEmptySet(),
          duration_seconds: 1800,
          speed_kmh: 9,
          incline_percent: 1,
        },
        ["duration", "distance", "speed", "incline", "calories"],
      ),
    ).toBe("30:00 · 9 km/h · 1 %");
  });
});
