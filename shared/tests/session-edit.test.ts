import { describe, expect, it } from "vitest";
import {
  diffSessionDrafts,
  formatChangeCount,
  sessionEditSchema,
} from "../session-edit.js";
import {
  createEmptySet,
  type DraftBlock,
  type DraftExercise,
  type PlannedSetValues,
  type SessionDraft,
} from "../session-template.js";

function set(values: Partial<PlannedSetValues>): PlannedSetValues {
  return { ...createEmptySet(), ...values };
}

function exercise(
  key: string,
  name: string,
  sets: PlannedSetValues[],
  defaultRestSeconds: number | null = 90,
): DraftExercise {
  return {
    key,
    exercise_id: Number(key.replace(/\D/g, "")) || 1,
    name,
    measure_codes: ["reps", "weight"],
    default_rest_seconds: defaultRestSeconds,
    sets,
  };
}

function block(key: string, exercises: DraftExercise[]): DraftBlock {
  return {
    key,
    block_type: "classic",
    name: "Force",
    instructions: null,
    exercises,
  };
}

function draft(blocks: DraftBlock[], name = "Jambes"): SessionDraft {
  return {
    name,
    planned_date: "2026-11-26",
    planned_time: "07:00",
    blocks,
  };
}

const squat = exercise("e1", "Squat à la barre", [
  set({ reps: 8, weight_kg: 60 }),
  set({ reps: 8, weight_kg: 60 }),
  set({ reps: 8, weight_kg: 60 }),
  set({ reps: 8, weight_kg: 60 }),
]);

describe("diffSessionDrafts", () => {
  it("sees nothing when the session did not change", () => {
    const before = draft([block("b1", [squat])]);
    expect(diffSessionDrafts(before, structuredClone(before))).toEqual([]);
  });

  it("names the new session name", () => {
    const before = draft([block("b1", [squat])]);
    const after = draft([block("b1", [squat])], "Bas du corps");
    expect(diffSessionDrafts(before, after)).toEqual([
      { kind: "changed", text: "Nom : « Jambes » → « Bas du corps »" },
    ]);
  });

  it("lists an added exercise with its sets", () => {
    const lunges = exercise("e2", "Fentes bulgares", [
      set({ reps: 8 }),
      set({ reps: 8 }),
      set({ reps: 8 }),
    ]);
    const before = draft([block("b1", [squat])]);
    const after = draft([block("b1", [squat, lunges])]);
    expect(diffSessionDrafts(before, after)).toEqual([
      { kind: "added", text: "Fentes bulgares · 3 séries · 8 rép." },
    ]);
  });

  it("lists a removed exercise", () => {
    const lunges = exercise("e2", "Fentes", [set({ reps: 10 })]);
    const before = draft([block("b1", [squat, lunges])]);
    const after = draft([block("b1", [squat])]);
    expect(diffSessionDrafts(before, after)).toEqual([
      { kind: "removed", text: "Fentes · 1 série · 10 rép." },
    ]);
  });

  it("writes the sets before and after", () => {
    const before = draft([block("b1", [squat])]);
    const heavier = exercise("e1", "Squat à la barre", [
      set({ reps: 5, weight_kg: 70 }),
      set({ reps: 5, weight_kg: 70 }),
      set({ reps: 5, weight_kg: 70 }),
      set({ reps: 5, weight_kg: 70 }),
      set({ reps: 5, weight_kg: 70 }),
    ]);
    const after = draft([block("b1", [heavier])]);
    expect(diffSessionDrafts(before, after)).toEqual([
      {
        kind: "changed",
        text: "Squat à la barre : 4 séries · 8 rép. · 60 kg → 5 séries · 5 rép. · 70 kg",
      },
    ]);
  });

  it("says the sets changed when the summary stays the same", () => {
    const before = draft([
      block("b1", [
        exercise("e1", "Squat à la barre", [
          set({ reps: 8 }),
          set({ reps: 10 }),
        ]),
      ]),
    ]);
    const after = draft([
      block("b1", [
        exercise("e1", "Squat à la barre", [
          set({ reps: 10 }),
          set({ reps: 8 }),
        ]),
      ]),
    ]);
    expect(diffSessionDrafts(before, after)).toEqual([
      { kind: "changed", text: "Squat à la barre : séries modifiées" },
    ]);
  });

  it("names the new rest", () => {
    const before = draft([block("b1", [squat])]);
    const after = draft([
      block("b1", [exercise("e1", "Squat à la barre", squat.sets, 120)]),
    ]);
    expect(diffSessionDrafts(before, after)).toEqual([
      { kind: "changed", text: "Squat à la barre : repos 1 min 30 → 2 min" },
    ]);
  });

  it("lists an added block and what it holds", () => {
    const warmUp: DraftBlock = {
      key: "b2",
      block_type: "warm_up",
      name: null,
      instructions: null,
      exercises: [exercise("e3", "Rameur", [set({ duration_seconds: 300 })])],
    };
    const before = draft([block("b1", [squat])]);
    const after = draft([block("b1", [squat]), warmUp]);
    expect(diffSessionDrafts(before, after)).toEqual([
      { kind: "added", text: "Échauffement · Bloc 2" },
      { kind: "added", text: "Rameur · 1 série · 5 min" },
    ]);
  });

  it("lists a removed block and what it held", () => {
    const extra = block("b2", [exercise("e4", "Gainage", [set({ reps: 1 })])]);
    const before = draft([block("b1", [squat]), extra]);
    const after = draft([block("b1", [squat])]);
    expect(diffSessionDrafts(before, after)).toEqual([
      { kind: "removed", text: "Classique · Force" },
      { kind: "removed", text: "Gainage · 1 série · 1 rép." },
    ]);
  });

  it("names a new block type and a new block title", () => {
    const before = draft([block("b1", [])]);
    const after = draft([
      {
        key: "b1",
        block_type: "circuit",
        name: "Jambes",
        instructions: null,
        exercises: [],
      },
    ]);
    expect(diffSessionDrafts(before, after)).toEqual([
      { kind: "changed", text: "Jambes : Classique → Circuit" },
      { kind: "changed", text: "Bloc 1 : « Force » → « Jambes »" },
    ]);
  });

  it("says the instructions changed", () => {
    const before = draft([block("b1", [])]);
    const after = draft([
      { ...block("b1", []), instructions: "3 tours, 1 min de pause" },
    ]);
    expect(diffSessionDrafts(before, after)).toEqual([
      { kind: "changed", text: "Force : consignes modifiées" },
    ]);
  });
});

describe("sessionEditSchema", () => {
  const session = draft([block("b1", [squat])]);

  it("accepts the two scopes", () => {
    expect(
      sessionEditSchema.safeParse({ scope: "this", session }).success,
    ).toBe(true);
    expect(
      sessionEditSchema.safeParse({ scope: "following", session }).success,
    ).toBe(true);
  });

  it("refuses an unknown scope", () => {
    expect(sessionEditSchema.safeParse({ scope: "all", session }).success).toBe(
      false,
    );
  });

  it("refuses a session without a name", () => {
    expect(
      sessionEditSchema.safeParse({
        scope: "this",
        session: { ...session, name: "" },
      }).success,
    ).toBe(false);
  });
});

describe("formatChangeCount", () => {
  it("agrees in number", () => {
    expect(formatChangeCount(1)).toBe("1 changement");
    expect(formatChangeCount(3)).toBe("3 changements");
  });
});
