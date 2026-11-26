import { describe, expect, it } from "vitest";
import {
  buildProgressSeries,
  computeExerciseRecords,
  describeProgressSeries,
  estimateOneRepMax,
  formatBestResult,
  formatProgressTrend,
  getAvailableMetrics,
  type ProgressSet,
} from "../progress.js";

// US-39: everything is computed from the sets really done (RM-051).

function set(date: string, values: Partial<ProgressSet> = {}): ProgressSet {
  return {
    date,
    is_partial: false,
    reps: null,
    weight_kg: null,
    duration_seconds: null,
    distance_meters: null,
    speed_kmh: null,
    ...values,
  };
}

// The example of SUI-09: two sessions on the bench press.
const bench: ProgressSet[] = [
  set("2026-11-12", { reps: 10, weight_kg: 50 }),
  set("2026-11-12", { reps: 8, weight_kg: 50 }),
  set("2026-11-19", { reps: 8, weight_kg: 62.5 }),
  set("2026-11-19", { reps: 8, weight_kg: 60 }),
];

describe("estimateOneRepMax (RM-079)", () => {
  it("applies the formula of Epley", () => {
    // 62,5 × (1 + 8 / 30) = 79,2
    expect(estimateOneRepMax(62.5, 8)).toBe(79.2);
    expect(estimateOneRepMax(50, 10)).toBe(66.7);
  });

  it("says nothing beyond ten repetitions, or without a load", () => {
    expect(estimateOneRepMax(50, 11)).toBeNull();
    expect(estimateOneRepMax(null, 8)).toBeNull();
    expect(estimateOneRepMax(50, null)).toBeNull();
    expect(estimateOneRepMax(50, 0)).toBeNull();
  });
});

describe("buildProgressSeries (RM-081)", () => {
  it("keeps the best value of each session, in order", () => {
    const points = buildProgressSeries(bench, "weight_max");

    expect(points).toEqual([
      { date: "2026-11-12", value: 50, is_partial: false },
      { date: "2026-11-19", value: 62.5, is_partial: false },
    ]);
    expect(formatProgressTrend(points, "weight_max")).toBe(
      "De 50 kg à 62,5 kg en 2 séances",
    );
  });

  it("marks the point of a session given up", () => {
    const points = buildProgressSeries(
      [
        set("2026-11-07", {
          distance_meters: 5000,
          is_partial: true,
        }),
        set("2026-11-14", { distance_meters: 7000 }),
      ],
      "distance",
    );

    expect(points[0]).toMatchObject({ value: 5000, is_partial: true });
    expect(points[1]).toMatchObject({ value: 7000, is_partial: false });
  });

  it("gives one point only after a single session", () => {
    const points = buildProgressSeries([bench[0] as ProgressSet], "weight_max");

    expect(points).toHaveLength(1);
    // The curve appears from the second session on (RM-081)
    expect(formatProgressTrend(points, "weight_max")).toBeNull();
  });

  it("says the curve in words, for a screen reader", () => {
    expect(
      describeProgressSeries(
        buildProgressSeries(bench, "weight_max"),
        "weight_max",
      ),
    ).toBe("12 novembre : 50 kg · 19 novembre : 62,5 kg");
  });
});

describe("computeExerciseRecords (SUI-09)", () => {
  it("finds the figures of the mockup", () => {
    const records = computeExerciseRecords(bench);

    expect(records.weight_max).toEqual({ weight_kg: 62.5, reps: 8 });
    expect(records.one_rep_max).toBe(79.2);
    expect(records.best_set_volume).toEqual({
      reps: 8,
      weight_kg: 62.5,
      volume: 500,
    });
    // 10 × 50 + 8 × 50 = 900, then 8 × 62,5 + 8 × 60 = 980
    expect(records.best_session_volume).toBe(980);
    expect(records.max_reps).toBe(10);
    expect(records.session_count).toBe(2);
  });

  it("holds nothing when nothing was recorded", () => {
    const records = computeExerciseRecords([]);

    expect(records.weight_max).toBeNull();
    expect(records.best_session_volume).toBeNull();
    expect(records.session_count).toBe(0);
  });
});

describe("getAvailableMetrics", () => {
  it("offers only what the sets hold", () => {
    expect(getAvailableMetrics(bench, "weighted")).toEqual([
      "weight_max",
      "one_rep_max",
      "reps_max",
    ]);
    // Body weight: no load, so no 1RM (SUI-10)
    expect(
      getAvailableMetrics([set("2026-11-12", { reps: 12 })], "bodyweight"),
    ).toEqual(["reps_max"]);
    expect(
      getAvailableMetrics(
        [set("2026-11-12", { distance_meters: 5000, speed_kmh: 9 })],
        "cardio",
      ),
    ).toEqual(["distance", "speed"]);
  });
});

describe("formatBestResult (SUI-08)", () => {
  it("writes the best result of the exercise", () => {
    expect(formatBestResult(bench, ["reps", "weight"])).toBe("62,5 kg × 8");
    expect(formatBestResult([set("2026-11-12", { reps: 12 })], ["reps"])).toBe(
      "12 rép.",
    );
    expect(formatBestResult([], ["reps"])).toBeNull();
  });
});
