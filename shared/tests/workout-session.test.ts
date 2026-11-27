import { describe, expect, it } from "vitest";
import type { BlockType } from "../session-template.js";
import {
  actualSetSchema,
  computeDurationSeconds,
  computeTonnage,
  countAddedSets,
  countPlannedSets,
  countValidatedSets,
  formatActualValues,
  formatAddedSets,
  formatBlockResult,
  formatBothSides,
  formatClock,
  formatElapsed,
  formatExerciseResult,
  formatSetProgress,
  formatSideState,
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
  type WorkoutBlockTree,
  type WorkoutSetRow,
} from "../workout-session.js";

function set(id: number, validated: boolean): WorkoutSetRow {
  return {
    id,
    position: id,
    reps_planned: 10,
    reps_actual: validated ? 10 : null,
    reps_left_planned: null,
    reps_right_planned: null,
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
    weight_left_planned_kg: null,
    weight_right_planned_kg: null,
    updated_at: null,
    is_added: false,
    sides: [],
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
      reps_left: null,
      reps_right: null,
      weight_kg: 40,
      weight_left_kg: null,
      weight_right_kg: null,
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
      reps_left_planned: null,
      reps_right_planned: null,
      weight_planned_kg: null,
      weight_actual_kg: null,
      weight_left_planned_kg: null,
      weight_right_planned_kg: null,
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
      reps_left_planned: null,
      reps_right_planned: null,
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

// US-51: an exercise done side by side, left then right (D-02, RM-044).
describe("per-side sets (US-51)", () => {
  function perSideSet(
    id: number,
    sides: { side: "left" | "right"; reps: number; weight: number }[],
  ): WorkoutSetRow {
    return {
      ...set(id, false),
      weight_planned_kg: null,
      weight_left_planned_kg: 10,
      weight_right_planned_kg: 6,
      // Both sides done: the server validated the set (RM-044)
      validated_at: sides.length === 2 ? "2026-11-26T07:10:00.000Z" : null,
      sides: sides.map((one) => ({
        side: one.side,
        reps_actual: one.reps,
        reps_left_planned: null,
        reps_right_planned: null,
        weight_actual_kg: one.weight,
        duration_actual_seconds: null,
        validated_at: "2026-11-26T07:10:00.000Z",
      })),
    };
  }

  it("counts the tonnage side by side", () => {
    const sets = [
      perSideSet(1, [
        { side: "left", reps: 15, weight: 10 },
        { side: "right", reps: 13, weight: 6 },
      ]),
    ];

    // 15 × 10 + 13 × 6
    expect(computeTonnage(sets)).toBe(228);
  });

  it("counts nothing for a set with one side only", () => {
    const sets = [perSideSet(1, [{ side: "left", reps: 15, weight: 10 }])];

    expect(computeTonnage(sets)).toBe(0);
    expect(countValidatedSets({ blocks: [] })).toBe(0);
  });

  it("writes both sides in the result of the exercise (B6)", () => {
    const exercise = {
      measure_codes: ["reps", "weight"] as const,
      is_bodyweight: false,
      sets: [
        perSideSet(1, [
          { side: "left", reps: 15, weight: 10 },
          { side: "right", reps: 13, weight: 6 },
        ]),
      ],
    };

    expect(
      formatExerciseResult({
        ...exercise,
        measure_codes: [...exercise.measure_codes],
      }),
    ).toBe("1 / 1 · G 15 rép. · 10 kg / D 13 rép. · 6 kg");
  });

  it("says which side is missing on an incomplete set", () => {
    const exercise = {
      measure_codes: ["duration"] as const,
      is_bodyweight: false,
      sets: [
        {
          ...perSideSet(1, []),
          duration_planned_seconds: 30,
          sides: [
            {
              side: "left" as const,
              reps_actual: null,
              reps_left_planned: null,
              reps_right_planned: null,
              weight_actual_kg: null,
              duration_actual_seconds: 30,
              validated_at: "2026-11-26T07:10:00.000Z",
            },
          ],
        },
      ],
    };

    expect(
      formatExerciseResult({
        ...exercise,
        measure_codes: [...exercise.measure_codes],
      }),
    ).toBe("0 / 1 · série 1 incomplète : gauche 30 s, droite non faite");
  });

  it("says what each side holds, and what is missing", () => {
    const one = perSideSet(1, [{ side: "left", reps: 15, weight: 10 }]);

    expect(formatSideState(one, "left", ["reps", "weight"])).toBe(
      "Gauche : 15 rép. · 10 kg ✓",
    );
    expect(formatSideState(one, "right", ["reps", "weight"])).toBe(
      "Droite : non faite",
    );
    expect(formatBothSides(one, ["reps", "weight"])).toBe(
      "G 15 rép. · 10 kg / D non faite",
    );
  });
});

// US-31: the total of a timed block, once it is over (D-06).
describe("formatBlockResult", () => {
  function block(values: Partial<WorkoutBlockTree> = {}) {
    return {
      block_type: "amrap" as BlockType,
      planned_rounds: null,
      completed_rounds: null,
      extra_reps: null,
      actual_duration_seconds: null,
      ...values,
    };
  }

  it("says nothing for a block that is not timed", () => {
    expect(
      formatBlockResult(block({ block_type: "classic", completed_rounds: 3 })),
    ).toBeNull();
  });

  it("says nothing while the block has not run", () => {
    expect(formatBlockResult(block())).toBeNull();
    expect(formatBlockResult(block({ block_type: "for_time" }))).toBeNull();
  });

  it("writes the rounds and the extra repetitions of an AMRAP", () => {
    expect(
      formatBlockResult(block({ completed_rounds: 5, extra_reps: 8 })),
    ).toBe("AMRAP · 5 tours + 8 rép.");
    expect(formatBlockResult(block({ completed_rounds: 1 }))).toBe(
      "AMRAP · 1 tour",
    );
    expect(
      formatBlockResult(block({ completed_rounds: 5, extra_reps: 0 })),
    ).toBe("AMRAP · 5 tours");
  });

  it("writes the time of a For Time", () => {
    expect(
      formatBlockResult(
        block({ block_type: "for_time", actual_duration_seconds: 872 }),
      ),
    ).toBe("For Time · 14:32");
  });

  it("writes the rounds done out of the rounds planned of a circuit", () => {
    expect(
      formatBlockResult(
        block({
          block_type: "circuit",
          planned_rounds: 3,
          completed_rounds: 3,
        }),
      ),
    ).toBe("Circuit · 3 / 3 tours");
  });
});
