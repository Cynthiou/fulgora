import { describe, expect, it } from "vitest";
import {
  buildProgressSeries,
  computeExerciseRecords,
  describeProgressSeries,
  describeRegularity,
  detectNewRecords,
  estimateOneRepMax,
  formatBestResult,
  formatDelta,
  formatPlannedCount,
  formatProgressTrend,
  formatRecordMessage,
  getAvailableMetrics,
  getComparisonRange,
  type NewRecord,
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

// US-40: a record is what beats every session before (RM-080).
describe("detectNewRecords (US-40)", () => {
  const before: ProgressSet[] = [
    set("2026-11-12", { reps: 10, weight_kg: 50 }),
    set("2026-11-12", { reps: 8, weight_kg: 50 }),
  ];

  it("sees a heavier set as a new record", () => {
    const records = detectNewRecords(
      before,
      [set("2026-11-19", { reps: 8, weight_kg: 62.5 })],
      "weighted",
    );

    expect(records).toEqual([{ kind: "weight_max", text: "62,5 kg × 8" }]);
    expect(formatRecordMessage(records[0] as NewRecord)).toBe(
      "Charge max : 62,5 kg × 8",
    );
  });

  it("says nothing on an equal result", () => {
    expect(
      detectNewRecords(
        before,
        [set("2026-11-19", { reps: 10, weight_kg: 50 })],
        "weighted",
      ),
    ).toEqual([]);
  });

  it("says nothing on the very first session", () => {
    expect(
      detectNewRecords(
        [],
        [set("2026-11-19", { reps: 10, weight_kg: 50 })],
        "weighted",
      ),
    ).toEqual([]);
  });

  it("counts the repetitions of a body weight exercise", () => {
    const records = detectNewRecords(
      [set("2026-11-12", { reps: 8 })],
      [set("2026-11-19", { reps: 10 })],
      "bodyweight",
    );

    expect(records).toEqual([{ kind: "reps_max", text: "10 rép." }]);
  });

  it("counts the distance of a cardio exercise", () => {
    const records = detectNewRecords(
      [set("2026-11-12", { distance_meters: 5000 })],
      [set("2026-11-19", { distance_meters: 5200 })],
      "cardio",
    );

    expect(records).toEqual([{ kind: "distance_max", text: "5,2 km" }]);
  });
});

// US-41: the summary of the tracking (RM-076, RM-077).
describe("getComparisonRange (RM-077)", () => {
  it("takes the same number of days, one month earlier", () => {
    // Looked at on 20 November: 1 to 20 October
    expect(getComparisonRange("2026-11-01", "2026-11-20")).toEqual({
      from: "2026-10-01",
      to: "2026-10-20",
    });
  });

  it("stops at the last day of the month before", () => {
    // 31 March: February has 28 days in 2026
    expect(getComparisonRange("2026-03-01", "2026-03-31")).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
    // A leap year keeps the 29th
    expect(getComparisonRange("2028-03-01", "2028-03-31")).toEqual({
      from: "2028-02-01",
      to: "2028-02-29",
    });
  });

  it("crosses the year", () => {
    expect(getComparisonRange("2026-01-01", "2026-01-15")).toEqual({
      from: "2025-12-01",
      to: "2025-12-15",
    });
  });
});

describe("the regularity card (RM-076)", () => {
  it("adds up to the number of planned sessions", () => {
    const counts = {
      planned: 21,
      done: 9,
      unfinished: 1,
      to_confirm: 2,
      missed: 2,
      cancelled: 1,
      upcoming: 6,
      moved: 1,
    };

    // The example of SUI-02: 21 = 9 + 1 + 2 + 2 + 1 + 6
    const lines = describeRegularity(counts);
    expect(lines.reduce((sum, line) => sum + line.value, 0)).toBe(
      counts.planned,
    );
    // The moved ones are not a line of their own
    expect(lines.map((line) => line.label)).toEqual([
      "Faites",
      "Inachevées",
      "À confirmer",
      "Manquées",
      "Annulées",
      "À venir",
    ]);
    expect(formatPlannedCount(counts.planned)).toBe("21 prévues");
    expect(formatPlannedCount(1)).toBe("1 prévue");
  });

  it("writes a gap, never a colour alone", () => {
    expect(formatDelta(3)).toBe("+3");
    expect(formatDelta(-2)).toBe("-2");
    expect(formatDelta(0)).toBe("=");
  });
});
