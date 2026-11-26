import { describe, expect, it } from "vitest";
import { addDays, todayInParis } from "../dates.js";
import {
  AVAILABLE_BLOCK_TYPES,
  BLOCK_TYPE_CODES,
  BLOCK_TYPE_LABELS,
  BLOCK_TYPES,
  CREATABLE_BLOCK_TYPES,
  countDraftExercises,
  createDefaultSet,
  createEmptyDraft,
  createEmptySet,
  type DraftBlock,
  draftBlockSchema,
  findTimedBlockProblem,
  formatBlockCardLine,
  formatBlockCount,
  formatBlockSummary,
  formatDuration,
  formatExerciseSummary,
  formatMinSec,
  formatRangeMessage,
  formatSelectedCount,
  formatSetSummary,
  formatSetValues,
  formatTrackedMeasures,
  freeSessionSchema,
  getBlockLabel,
  getDisallowedSetFields,
  getMeasureProfile,
  getSetFieldLabel,
  getSetFieldStepper,
  getSetFields,
  getSetLabel,
  isPlannedDateInRange,
  NO_GOAL,
  parseMinSec,
  plannedSetSchema,
  SET_LIMITS,
  sessionDraftSchema,
  validateSetValue,
} from "../session-template.js";
import { setDisplayUnits } from "../units.js";

function validSet() {
  return { ...createEmptySet(), reps: 10, weight_kg: 40 };
}

function validBlock(): DraftBlock {
  return {
    key: "b1",
    block_type: "classic",
    name: "Force",
    instructions: null,
    planned_rounds: null,
    time_limit_seconds: null,
    exercises: [
      {
        key: "e1",
        exercise_id: 31,
        name: "Développé couché",
        measure_codes: ["reps", "weight"],
        default_rest_seconds: 90,
        sets: [validSet()],
      },
    ],
  };
}

function firstMessage(result: { error?: { issues: { message: string }[] } }) {
  return result.error?.issues[0]?.message;
}

describe("sessionDraftSchema", () => {
  it("accepts a complete draft and drops the local display fields", () => {
    const draft = {
      ...createEmptyDraft("2026-11-26"),
      name: "Haut du corps",
      planned_time: "18:30",
      blocks: [validBlock()],
    };

    const result = sessionDraftSchema.parse(draft);

    expect(result.blocks[0]?.exercises[0]).toEqual({
      exercise_id: 31,
      default_rest_seconds: 90,
      sets: [validSet()],
    });
    expect(JSON.stringify(result)).not.toContain("Développé");
  });

  it("requires a name and accepts a session without any block (RM-018)", () => {
    const empty = sessionDraftSchema.safeParse(createEmptyDraft("2026-11-26"));
    expect(empty.success).toBe(false);
    expect(firstMessage(empty)).toBe("Ce champ est obligatoire.");

    const named = sessionDraftSchema.safeParse({
      ...createEmptyDraft("2026-11-26"),
      name: "Jambes",
    });
    expect(named.success).toBe(true);
  });

  it("refuses more than 20 blocks", () => {
    const blocks = Array.from({ length: 21 }, (_, index) => ({
      ...validBlock(),
      key: `b${index}`,
    }));
    const result = sessionDraftSchema.safeParse({
      ...createEmptyDraft("2026-11-26"),
      name: "Trop",
      blocks,
    });

    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe("20 blocs au maximum.");
  });
});

describe("draftBlockSchema", () => {
  it("refuses the timed types of V1 and a Note with exercises", () => {
    const amrap = draftBlockSchema.safeParse({
      ...validBlock(),
      block_type: "amrap",
    });
    expect(amrap.success).toBe(false);

    const note = draftBlockSchema.safeParse({
      ...validBlock(),
      block_type: "note",
    });
    expect(note.success).toBe(false);
    expect(firstMessage(note)).toBe("Un bloc Note ne contient pas d'exercice.");

    const emptyNote = draftBlockSchema.safeParse({
      ...validBlock(),
      block_type: "note",
      exercises: [],
      instructions: "Penser à respirer.",
    });
    expect(emptyNote.success).toBe(true);
  });

  it("limits the exercises to 30 and the sets to 1 to 20", () => {
    const exercise = validBlock().exercises[0];
    const tooMany = draftBlockSchema.safeParse({
      ...validBlock(),
      exercises: Array.from({ length: 31 }, () => exercise),
    });
    expect(firstMessage(tooMany)).toBe("30 exercices au maximum par bloc.");

    const noSet = draftBlockSchema.safeParse({
      ...validBlock(),
      exercises: [{ ...exercise, sets: [] }],
    });
    expect(firstMessage(noSet)).toBe("Au moins une série.");

    const tooManySets = draftBlockSchema.safeParse({
      ...validBlock(),
      exercises: [{ ...exercise, sets: Array.from({ length: 21 }, validSet) }],
    });
    expect(firstMessage(tooManySets)).toBe("20 séries au maximum.");
  });
});

describe("plannedSetSchema", () => {
  it("accepts empty objectives and values within their limits", () => {
    expect(plannedSetSchema.safeParse(createEmptySet()).success).toBe(true);
    expect(
      plannedSetSchema.safeParse({
        ...createEmptySet(),
        reps: 1000,
        weight_kg: 62.5,
        weight_left_kg: null,
        weight_right_kg: null,
        duration_seconds: 86_400,
        speed_kmh: 60,
        incline_percent: 40,
        rest_after_seconds: 600,
      }).success,
    ).toBe(true);
  });

  it("refuses values out of range with the French range message", () => {
    const reps = plannedSetSchema.safeParse({
      ...createEmptySet(),
      reps: 1001,
    });
    expect(firstMessage(reps)).toBe(formatRangeMessage(SET_LIMITS.reps));
    // "1 000" with the French narrow no-break space between the digits
    expect(firstMessage(reps)).toMatch(/1\s000/);

    const negative = plannedSetSchema.safeParse({
      ...createEmptySet(),
      speed_kmh: -1,
    });
    expect(negative.success).toBe(false);
  });

  it("refuses a weight that is not a multiple of 0.25 and non integer reps", () => {
    const weight = plannedSetSchema.safeParse({
      ...createEmptySet(),
      weight_kg: 40.3,
      weight_left_kg: null,
      weight_right_kg: null,
    });
    expect(firstMessage(weight)).toBe("Entre une valeur par pas de 0,25.");

    expect(
      plannedSetSchema.safeParse({ ...createEmptySet(), weight_kg: 40.25 })
        .success,
    ).toBe(true);
    expect(
      plannedSetSchema.safeParse({ ...createEmptySet(), reps: 8.5 }).success,
    ).toBe(false);
  });
});

describe("helpers", () => {
  it("counts the exercises of a draft", () => {
    const draft = {
      ...createEmptyDraft("2026-11-26"),
      blocks: [validBlock(), validBlock()],
    };
    expect(countDraftExercises(draft)).toBe(2);
    expect(countDraftExercises(createEmptyDraft("2026-11-26"))).toBe(0);
  });

  it("labels a block with its title or its position", () => {
    expect(getBlockLabel(validBlock(), 0)).toBe("Classique · Force");
    expect(getBlockLabel({ ...validBlock(), name: null }, 1)).toBe(
      "Classique · Bloc 2",
    );
    expect(
      getBlockLabel({ ...validBlock(), name: "  ", block_type: "warm_up" }, 0),
    ).toBe("Échauffement · Bloc 1");
  });

  it("agrees the block count in number", () => {
    expect(formatBlockCount(0)).toBe("0 bloc");
    expect(formatBlockCount(1)).toBe("1 bloc");
    expect(formatBlockCount(3)).toBe("3 blocs");
  });
});

describe("BLOCK_TYPES", () => {
  it("lists the 8 types of the base, in its order", () => {
    expect(BLOCK_TYPES.map((info) => info.code)).toEqual([...BLOCK_TYPE_CODES]);
    expect(BLOCK_TYPE_LABELS.for_time).toBe("For Time");
  });

  it("offers 7 types at creation: the Note is not one of them (RM-020)", () => {
    expect(CREATABLE_BLOCK_TYPES.map((info) => info.code)).toEqual([
      "classic",
      "circuit",
      "amrap",
      "for_time",
      "warm_up",
      "stretching",
      "challenge",
    ]);
    expect(CREATABLE_BLOCK_TYPES[0]?.description).toBe(
      "Exercices avec séries et temps de repos",
    );
  });

  it("still accepts a note from a session already saved", () => {
    expect([...AVAILABLE_BLOCK_TYPES]).toContain("note");
  });
});

describe("exercise profiles and default sets (US-14)", () => {
  it("finds the profile from the measures", () => {
    expect(getMeasureProfile(["reps", "weight"])).toBe("weighted");
    expect(getMeasureProfile(["reps"])).toBe("bodyweight");
    expect(getMeasureProfile(["duration"])).toBe("duration");
    expect(getMeasureProfile(["duration", "distance", "calories"])).toBe(
      "cardio",
    );
    expect(getMeasureProfile([])).toBe("none");
  });

  it("pre-fills the first set: 10 reps, 1 min, or a 10 min stage", () => {
    expect(createDefaultSet(["reps", "weight"])).toMatchObject({
      reps: 10,
      weight_kg: null,
      weight_left_kg: null,
      weight_right_kg: null,
    });
    expect(createDefaultSet(["duration"]).duration_seconds).toBe(60);
    expect(createDefaultSet(["duration", "speed"]).duration_seconds).toBe(600);
    expect(createDefaultSet([])).toEqual(createEmptySet());
  });
});

describe("formatSetSummary", () => {
  it("sums up the sets with their shared values", () => {
    const set = { ...createEmptySet(), reps: 10, weight_kg: 40 };
    expect(
      formatSetSummary({ measure_codes: ["reps", "weight"], sets: [set] }),
    ).toBe("1 série · 10 rép. · 40 kg");
    expect(
      formatSetSummary({
        measure_codes: ["reps"],
        sets: [
          { ...createEmptySet(), reps: 8, weight_kg: 10 },
          { ...createEmptySet(), reps: 8, weight_kg: 10 },
          { ...createEmptySet(), reps: 8, weight_kg: 10 },
        ],
      }),
    ).toBe("3 séries · 8 rép. · 10 kg lest");
    expect(
      formatSetSummary({
        measure_codes: ["duration"],
        sets: [{ ...createEmptySet(), duration_seconds: 60 }],
      }),
    ).toBe("1 série · 1 min");
  });

  it("counts stages for cardio and hides values that differ", () => {
    expect(
      formatSetSummary({
        measure_codes: ["duration", "distance"],
        sets: [{ ...createEmptySet(), duration_seconds: 600 }],
      }),
    ).toBe("1 étape · 10 min");
    expect(
      formatSetSummary({
        measure_codes: ["duration", "distance"],
        sets: [
          { ...createEmptySet(), duration_seconds: 600 },
          { ...createEmptySet(), duration_seconds: 300, distance_meters: 1500 },
          { ...createEmptySet(), duration_seconds: 600 },
        ],
      }),
    ).toBe("3 étapes");
    expect(
      formatSetSummary({
        measure_codes: ["reps", "weight"],
        sets: [
          { ...createEmptySet(), reps: 10, weight_kg: 40 },
          { ...createEmptySet(), reps: 8, weight_kg: 45 },
        ],
      }),
    ).toBe("2 séries");
  });

  it("writes durations and selected counts in French", () => {
    expect(formatDuration(90)).toBe("1 min 30");
    expect(formatDuration(45)).toBe("45 s");
    expect(formatDuration(120)).toBe("2 min");
    expect(formatDuration(3900)).toBe("1 h 05");
    expect(formatSelectedCount(1)).toBe("1 sélectionné");
    expect(formatSelectedCount(3)).toBe("3 sélectionnés");
  });
});

describe("formatBlockCardLine (handoff 3.1)", () => {
  const base: DraftBlock = {
    key: "b1",
    block_type: "classic",
    name: null,
    instructions: null,
    planned_rounds: null,
    time_limit_seconds: null,
    exercises: [],
  };
  const exercise = {
    key: "e1",
    exercise_id: 1,
    name: "Squat",
    meta: null,
    measure_codes: [],
    default_rest_seconds: 90,
    sets: [],
  };

  it("names the block and counts its exercises", () => {
    expect(
      formatBlockCardLine(
        { ...base, exercises: [exercise, exercise, exercise, exercise] },
        0,
      ),
    ).toBe("Bloc 1 · 4 exercices");
    expect(formatBlockCardLine(base, 1)).toBe("Bloc 2 · 0 exercice");
  });

  it("adds the title and the settings of a timed block", () => {
    expect(formatBlockCardLine({ ...base, name: "Force" }, 1)).toBe(
      "Bloc 2 · Force · 0 exercice",
    );
    expect(
      formatBlockCardLine(
        {
          ...base,
          block_type: "circuit",
          planned_rounds: 3,
          exercises: [exercise],
        },
        0,
      ),
    ).toBe("Bloc 1 · 3 tours · 1 exercice");
  });

  it("counts nothing on a note (RM-020)", () => {
    expect(
      formatBlockCardLine(
        { ...base, block_type: "note", name: "Consignes" },
        0,
      ),
    ).toBe("Bloc 1 · Consignes");
  });
});

describe("formatExerciseSummary (handoff des blocs)", () => {
  // The six examples of the handoff, in its own order.
  it("writes the six examples of the handoff", () => {
    const five = (values: Partial<ReturnType<typeof createEmptySet>>) =>
      Array.from({ length: 5 }, () => ({ ...createEmptySet(), ...values }));
    expect(
      formatExerciseSummary(five({ duration_seconds: 600, resistance: 6 }), [
        "duration",
        "distance",
      ]),
    ).toBe("5 × 10 min · résistance 6");
    expect(
      formatExerciseSummary(
        [{ ...createEmptySet(), duration_seconds: 300 }],
        ["duration"],
      ),
    ).toBe("5 min");
    expect(
      formatExerciseSummary(
        [{ ...createEmptySet(), duration_seconds: 600 }],
        ["duration"],
      ),
    ).toBe("10 min");
    expect(
      formatExerciseSummary(
        [{ ...createEmptySet(), weight_kg: 24, duration_seconds: 40 }],
        ["weight", "duration"],
      ),
    ).toBe("24 kg · 40 s");
    expect(
      formatExerciseSummary(
        [
          { ...createEmptySet(), reps: 10, weight_kg: 50 },
          { ...createEmptySet(), reps: 10, weight_kg: 50 },
          { ...createEmptySet(), reps: 10, weight_kg: 50 },
        ],
        ["reps", "weight"],
      ),
    ).toBe("3 × 10 rép. · 50 kg");
    expect(
      formatExerciseSummary(
        [
          { ...createEmptySet(), duration_seconds: 45 },
          { ...createEmptySet(), duration_seconds: 45 },
        ],
        ["duration"],
      ),
    ).toBe("2 × 45 s");
  });

  it("never writes « 1 × » and always writes the unit", () => {
    expect(
      formatExerciseSummary(
        [{ ...createEmptySet(), reps: 10, weight_kg: 62.5 }],
        ["reps", "weight"],
      ),
    ).toBe("10 rép. · 62,5 kg");
  });

  it("says nothing of values that differ from one set to the next", () => {
    expect(
      formatExerciseSummary(
        [
          { ...createEmptySet(), reps: 10 },
          { ...createEmptySet(), reps: 8 },
        ],
        ["reps"],
      ),
    ).toBe("2 × …");
  });

  it("says « Aucun objectif » for an empty set and for no set at all", () => {
    expect(formatExerciseSummary([], ["reps"])).toBe(NO_GOAL);
    expect(formatExerciseSummary([createEmptySet()], ["reps"])).toBe(NO_GOAL);
  });

  it("writes the lest of a body weight exercise and the per side goals", () => {
    expect(
      formatExerciseSummary(
        [{ ...createEmptySet(), reps: 8, weight_kg: 10 }],
        ["reps"],
        false,
      ),
    ).toBe("8 rép. · 10 kg lest");
    expect(
      formatExerciseSummary(
        [{ ...createEmptySet(), reps: 15 }],
        ["reps", "weight"],
        false,
        true,
      ),
    ).toBe("15 rép. / côté");
  });
});

describe("set fields (US-15)", () => {
  it("lists the fields of each profile, with the added weight for bodyweight", () => {
    expect(getSetFields(["reps", "weight"])).toEqual(["reps", "weight_kg"]);
    expect(getSetFields(["reps"])).toEqual(["reps", "weight_kg"]);
    expect(getSetFields(["duration"])).toEqual(["duration_seconds"]);
    expect(
      getSetFields(["duration", "distance", "speed", "incline", "calories"]),
    ).toEqual([
      "duration_seconds",
      "distance_meters",
      "speed_kmh",
      "incline_percent",
      "calories",
    ]);
    expect(getSetFields([])).toEqual([]);
  });

  it("finds a value that the exercise does not measure", () => {
    const set = { ...createEmptySet(), reps: 10, duration_seconds: 60 };
    expect(getDisallowedSetFields(set, ["reps", "weight"])).toEqual([
      "duration_seconds",
    ]);
    expect(getDisallowedSetFields(set, ["reps", "duration"])).toEqual([]);
  });

  it("labels the fields, the measures and the sets", () => {
    expect(getSetFieldLabel("weight_kg", "weighted")).toBe("Charge (kg)");
    expect(getSetFieldLabel("weight_kg", "bodyweight")).toBe("Lest (kg)");
    expect(getSetFieldLabel("distance_meters", "cardio")).toBe("Distance (km)");
    expect(formatTrackedMeasures(["reps", "weight"])).toBe(
      "Répétitions · Charge",
    );
    expect(formatTrackedMeasures(["reps"])).toBe("Répétitions · Lest");
    expect(getSetLabel("cardio", 0)).toBe("Étape 1");
    expect(getSetLabel("weighted", 2)).toBe("Série 3");
    expect(
      formatSetValues({ ...createEmptySet(), reps: 10, weight_kg: 40 }, [
        "reps",
        "weight",
      ]),
    ).toBe("10 rép. · 40 kg");
    expect(formatSetValues(createEmptySet(), ["reps"])).toBe("Aucun objectif");
  });

  it("validates one value against its limits", () => {
    expect(validateSetValue("reps", 10)).toBeNull();
    expect(validateSetValue("reps", null)).toBeNull();
    expect(validateSetValue("reps", 1001)).toBe(
      formatRangeMessage(SET_LIMITS.reps),
    );
    expect(validateSetValue("weight_kg", 40.3)).toBe(
      "Entre une valeur par pas de 0,25.",
    );
    expect(validateSetValue("rest_after_seconds", 601)).toBe(
      formatRangeMessage(SET_LIMITS.rest_after_seconds),
    );
  });

  it("reads and writes min:s", () => {
    expect(parseMinSec("1:30")).toBe(90);
    expect(parseMinSec("01:30")).toBe(90);
    expect(parseMinSec("10:00")).toBe(600);
    expect(parseMinSec("1:02:05")).toBe(3725);
    expect(parseMinSec("90")).toBe(90);
    expect(parseMinSec("1:75")).toBeNull();
    expect(parseMinSec("abc")).toBeNull();
    expect(formatMinSec(90)).toBe("1:30");
    expect(formatMinSec(600)).toBe("10:00");
    expect(formatMinSec(5)).toBe("0:05");
    expect(formatMinSec(3725)).toBe("1:02:05");
  });
});

describe("freeSessionSchema (US-23)", () => {
  const today = todayInParis();

  it("accepts a date within one year back and two years ahead", () => {
    const base = { ...createEmptyDraft(today), name: "Jambes" };
    expect(freeSessionSchema.safeParse(base).success).toBe(true);
    expect(
      freeSessionSchema.safeParse({
        ...base,
        planned_date: addDays(today, -300),
      }).success,
    ).toBe(true);
    expect(
      freeSessionSchema.safeParse({
        ...base,
        planned_date: addDays(today, 700),
      }).success,
    ).toBe(true);
    expect(isPlannedDateInRange(today, today)).toBe(true);
  });

  it("refuses a date too far back or too far ahead", () => {
    const base = { ...createEmptyDraft(today), name: "Jambes" };
    const past = freeSessionSchema.safeParse({
      ...base,
      planned_date: addDays(today, -400),
    });
    expect(firstMessage(past)).toBe(
      "La date ne peut pas remonter à plus d'un an.",
    );
    const future = freeSessionSchema.safeParse({
      ...base,
      planned_date: addDays(today, 800),
    });
    expect(firstMessage(future)).toBe("La date ne peut pas dépasser deux ans.");
    expect(isPlannedDateInRange(addDays(today, 800), today)).toBe(false);
  });
});

// US-05: the load of someone who reads pounds is stored in kilograms.
describe("a load typed in pounds", () => {
  it("accepts the converted value and names the step in pounds", () => {
    setDisplayUnits({ weight: "lb", distance: "km" });
    try {
      expect(
        plannedSetSchema.safeParse({
          ...createEmptySet(),
          weight_kg: 61.235,
        }).success,
      ).toBe(true);
      expect(validateSetValue("weight_kg", 40.3)).toBe(
        "Entre une valeur par pas de 0,5 lb.",
      );
      expect(getSetFieldLabel("weight_kg", "weighted")).toBe("Charge (lb)");
      expect(getSetFieldStepper("weight_kg").step).toBe(5);
    } finally {
      setDisplayUnits({ weight: "kg", distance: "km" });
    }
  });
});

// US-43: a timed block carries its own settings (RM-042).
describe("les blocs chronométrés", () => {
  function timedBlock(
    type: "circuit" | "amrap" | "for_time",
    extra: Partial<{
      planned_rounds: number | null;
      time_limit_seconds: number | null;
      sets: number;
      rest: number | null;
    }> = {},
  ) {
    const count = extra.sets ?? 1;
    return {
      block_type: type,
      name: null,
      instructions: null,
      planned_rounds: extra.planned_rounds ?? null,
      time_limit_seconds: extra.time_limit_seconds ?? null,
      exercises: [
        {
          exercise_id: 1,
          default_rest_seconds: null,
          sets: Array.from({ length: count }, () => ({
            ...createEmptySet(),
            reps: 10,
            rest_after_seconds: extra.rest ?? null,
          })),
        },
      ],
    };
  }

  it("accepts a circuit with its rounds", () => {
    const result = draftBlockSchema.safeParse(
      timedBlock("circuit", { planned_rounds: 3 }),
    );
    expect(result.success).toBe(true);
  });

  it("refuses a circuit without rounds", () => {
    const result = draftBlockSchema.safeParse(timedBlock("circuit"));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["planned_rounds"]);
  });

  it("refuses an AMRAP without a duration, accepts it with one", () => {
    expect(draftBlockSchema.safeParse(timedBlock("amrap")).success).toBe(false);
    expect(
      draftBlockSchema.safeParse(
        timedBlock("amrap", { time_limit_seconds: 12 * 60 }),
      ).success,
    ).toBe(true);
  });

  it("accepts a For Time with or without a time limit", () => {
    expect(draftBlockSchema.safeParse(timedBlock("for_time")).success).toBe(
      true,
    );
    expect(
      draftBlockSchema.safeParse(
        timedBlock("for_time", { time_limit_seconds: 20 * 60 }),
      ).success,
    ).toBe(true);
  });

  it("refuses a duration out of its limits", () => {
    expect(
      draftBlockSchema.safeParse(
        timedBlock("amrap", { time_limit_seconds: 30 }),
      ).success,
    ).toBe(false);
    expect(
      draftBlockSchema.safeParse(timedBlock("circuit", { planned_rounds: 51 }))
        .success,
    ).toBe(false);
  });

  it("refuses several objectives and a rest per set", () => {
    expect(
      draftBlockSchema.safeParse(
        timedBlock("circuit", { planned_rounds: 3, sets: 2 }),
      ).success,
    ).toBe(false);
    expect(
      draftBlockSchema.safeParse(
        timedBlock("circuit", { planned_rounds: 3, rest: 60 }),
      ).success,
    ).toBe(false);
  });

  it("refuses settings on a block that is not timed", () => {
    const classic = {
      ...timedBlock("circuit", { planned_rounds: 3 }),
      block_type: "classic" as const,
    };
    expect(draftBlockSchema.safeParse(classic).success).toBe(false);
  });

  it("writes the summary of each type", () => {
    expect(
      formatBlockSummary(timedBlock("circuit", { planned_rounds: 3 })),
    ).toBe("Circuit · 3 tours · 1 exercice");
    expect(
      formatBlockSummary({
        ...timedBlock("amrap", { time_limit_seconds: 12 * 60 }),
        exercises: [],
      }),
    ).toBe("AMRAP · 12 min");
    expect(
      formatBlockSummary({ ...timedBlock("for_time"), exercises: [] }),
    ).toBe("For Time");
  });

  it("says what a timed block still needs", () => {
    expect(findTimedBlockProblem(timedBlock("circuit"))).toBe(
      "Règle le nombre de tours.",
    );
    expect(findTimedBlockProblem(timedBlock("amrap"))).toBe(
      "Règle la durée de l'AMRAP.",
    );
    const empty = {
      ...timedBlock("circuit", { planned_rounds: 3 }),
      exercises: [
        {
          exercise_id: 1,
          default_rest_seconds: null,
          sets: [createEmptySet()],
        },
      ],
    };
    expect(findTimedBlockProblem(empty)).toBe("Un objectif est à régler.");
    expect(
      findTimedBlockProblem(timedBlock("circuit", { planned_rounds: 3 })),
    ).toBeNull();
  });
});
