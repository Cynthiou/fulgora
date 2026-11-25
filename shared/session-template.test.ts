import { describe, expect, it } from "vitest";
import {
  AVAILABLE_BLOCK_TYPES,
  BLOCK_TYPE_CODES,
  BLOCK_TYPE_LABELS,
  BLOCK_TYPES,
  countDraftExercises,
  createDefaultSet,
  createEmptyDraft,
  createEmptySet,
  type DraftBlock,
  draftBlockSchema,
  formatBlockCount,
  formatDuration,
  formatRangeMessage,
  formatSelectedCount,
  formatSetSummary,
  getBlockLabel,
  getExerciseProfile,
  plannedSetSchema,
  SET_LIMITS,
  sessionDraftSchema,
} from "./session-template.js";

function validSet() {
  return { ...createEmptySet(), reps: 10, weight_kg: 40 };
}

function validBlock(): DraftBlock {
  return {
    key: "b1",
    block_type: "classic",
    name: "Force",
    instructions: null,
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
  it("lists the 8 types, 5 of them available in the MVP", () => {
    expect(BLOCK_TYPES.map((info) => info.code)).toEqual([...BLOCK_TYPE_CODES]);
    expect(
      BLOCK_TYPES.filter((info) => info.isAvailable).map((info) => info.code),
    ).toEqual([...AVAILABLE_BLOCK_TYPES]);
    expect(BLOCK_TYPE_LABELS.for_time).toBe("For Time");
  });
});

describe("exercise profiles and default sets (US-14)", () => {
  it("finds the profile from the measures", () => {
    expect(getExerciseProfile(["reps", "weight"])).toBe("reps_weight");
    expect(getExerciseProfile(["reps"])).toBe("bodyweight");
    expect(getExerciseProfile(["duration"])).toBe("duration");
    expect(getExerciseProfile(["duration", "distance", "calories"])).toBe(
      "cardio",
    );
    expect(getExerciseProfile([])).toBe("none");
  });

  it("pre-fills the first set: 10 reps, 1 min, or a 10 min stage", () => {
    expect(createDefaultSet(["reps", "weight"])).toMatchObject({
      reps: 10,
      weight_kg: null,
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
