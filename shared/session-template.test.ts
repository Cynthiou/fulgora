import { describe, expect, it } from "vitest";
import {
  countDraftExercises,
  createEmptyDraft,
  createEmptySet,
  type DraftBlock,
  draftBlockSchema,
  formatBlockCount,
  formatRangeMessage,
  getBlockLabel,
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
