import { createEmptyDraft, createEmptySet, type SessionDraft } from "shared";
import { describe, expect, it } from "vitest";
import {
  type SessionDraftAction,
  sessionDraftReducer,
} from "../../../../src/features/session-template/hooks/sessionDraftReducer";

const base = createEmptyDraft("2026-11-26");

function apply(draft: SessionDraft, ...actions: SessionDraftAction[]) {
  return actions.reduce(sessionDraftReducer, draft);
}

// A draft with one classic block holding two exercises.
function draftWithExercises() {
  const withBlock = apply(base, { type: "addBlock", blockType: "classic" });
  const blockKey = withBlock.blocks[0]?.key ?? "";
  const draft = apply(withBlock, {
    type: "addExercises",
    blockKey,
    exercises: [
      {
        exercise_id: 31,
        name: "Développé couché",
        measure_codes: ["reps", "weight"],
      },
      { exercise_id: 45, name: "Tractions", measure_codes: ["reps", "weight"] },
    ],
  });
  const exerciseKey = draft.blocks[0]?.exercises[0]?.key ?? "";
  return { draft, blockKey, exerciseKey };
}

describe("sessionDraftReducer", () => {
  it("sets the name, the date and the time without touching the rest", () => {
    const draft = apply(
      base,
      { type: "setName", name: "Haut du corps" },
      { type: "setDate", date: "2026-11-28" },
      { type: "setTime", time: "18:30" },
    );

    expect(draft).toEqual({
      name: "Haut du corps",
      planned_date: "2026-11-28",
      planned_time: "18:30",
      blocks: [],
    });
    expect(base.name).toBe("");
  });

  it("returns the very same draft when nothing changes", () => {
    expect(sessionDraftReducer(base, { type: "setName", name: "" })).toBe(base);
    expect(
      sessionDraftReducer(base, { type: "removeBlock", key: "nope" }),
    ).toBe(base);
    expect(
      sessionDraftReducer(base, { type: "moveBlock", from: 0, to: 1 }),
    ).toBe(base);
  });

  it("adds, removes and restores blocks, keeping the order", () => {
    const two = apply(
      base,
      { type: "addBlock", blockType: "warm_up" },
      { type: "addBlock", blockType: "classic" },
    );
    expect(two.blocks.map((block) => block.block_type)).toEqual([
      "warm_up",
      "classic",
    ]);
    expect(two.blocks[0]?.key).not.toBe(two.blocks[1]?.key);

    const removed = sessionDraftReducer(two, {
      type: "removeBlock",
      key: two.blocks[0]?.key ?? "",
    });
    expect(removed.blocks.map((block) => block.block_type)).toEqual([
      "classic",
    ]);

    const restored = sessionDraftReducer(removed, {
      type: "restoreBlock",
      block: two.blocks[0] as NonNullable<(typeof two.blocks)[0]>,
      index: 0,
    });
    expect(restored.blocks.map((block) => block.block_type)).toEqual([
      "warm_up",
      "classic",
    ]);
  });

  it("moves a block and ignores an impossible move", () => {
    const three = apply(
      base,
      { type: "addBlock", blockType: "warm_up" },
      { type: "addBlock", blockType: "classic" },
      { type: "addBlock", blockType: "stretching" },
    );

    const moved = sessionDraftReducer(three, {
      type: "moveBlock",
      from: 2,
      to: 0,
    });
    expect(moved.blocks.map((block) => block.block_type)).toEqual([
      "stretching",
      "warm_up",
      "classic",
    ]);
    expect(
      sessionDraftReducer(three, { type: "moveBlock", from: 0, to: 3 }),
    ).toBe(three);
  });

  it("adds exercises with one empty set and the default rest, in order", () => {
    const { draft } = draftWithExercises();
    const exercises = draft.blocks[0]?.exercises ?? [];

    expect(exercises.map((exercise) => exercise.name)).toEqual([
      "Développé couché",
      "Tractions",
    ]);
    expect(exercises[0]).toMatchObject({
      exercise_id: 31,
      default_rest_seconds: 90,
      sets: [{ ...createEmptySet(), reps: 10 }],
    });
    expect(exercises[0]?.key).not.toBe(exercises[1]?.key);
  });

  it("accepts pre-filled sets and a rest when the exercises are added", () => {
    const withBlock = apply(base, { type: "addBlock", blockType: "classic" });
    const draft = sessionDraftReducer(withBlock, {
      type: "addExercises",
      blockKey: withBlock.blocks[0]?.key ?? "",
      exercises: [
        {
          exercise_id: 24,
          name: "Gainage",
          measure_codes: ["duration"],
          sets: [{ ...createEmptySet(), duration_seconds: 60 }],
          default_rest_seconds: 60,
        },
      ],
    });

    expect(draft.blocks[0]?.exercises[0]).toMatchObject({
      default_rest_seconds: 60,
      sets: [{ ...createEmptySet(), duration_seconds: 60 }],
    });
  });

  it("removes an exercise and changes its rest", () => {
    const { draft, blockKey, exerciseKey } = draftWithExercises();

    const rested = sessionDraftReducer(draft, {
      type: "updateExerciseRest",
      blockKey,
      exerciseKey,
      seconds: 120,
    });
    expect(rested.blocks[0]?.exercises[0]?.default_rest_seconds).toBe(120);

    const removed = sessionDraftReducer(rested, {
      type: "removeExercise",
      blockKey,
      exerciseKey,
    });
    expect(
      removed.blocks[0]?.exercises.map((exercise) => exercise.name),
    ).toEqual(["Tractions"]);
  });

  it("adds, duplicates, updates and removes sets, keeping at least one", () => {
    const { draft, blockKey, exerciseKey } = draftWithExercises();
    const target = { blockKey, exerciseKey };

    const filled = sessionDraftReducer(draft, {
      type: "updateSet",
      ...target,
      index: 0,
      values: { reps: 10, weight_kg: 40 },
    });
    expect(filled.blocks[0]?.exercises[0]?.sets[0]).toMatchObject({
      reps: 10,
      weight_kg: 40,
      weight_left_kg: null,
      weight_right_kg: null,
    });

    const duplicated = sessionDraftReducer(filled, {
      type: "duplicateLastSet",
      ...target,
    });
    expect(duplicated.blocks[0]?.exercises[0]?.sets).toHaveLength(2);
    expect(duplicated.blocks[0]?.exercises[0]?.sets[1]).toMatchObject({
      reps: 10,
      weight_kg: 40,
      weight_left_kg: null,
      weight_right_kg: null,
    });

    const added = sessionDraftReducer(duplicated, {
      type: "addSet",
      ...target,
    });
    expect(added.blocks[0]?.exercises[0]?.sets[2]).toEqual(createEmptySet());

    const removed = sessionDraftReducer(added, {
      type: "removeSet",
      ...target,
      index: 1,
    });
    expect(removed.blocks[0]?.exercises[0]?.sets).toHaveLength(2);

    const one = apply(
      removed,
      { type: "removeSet", ...target, index: 0 },
      { type: "removeSet", ...target, index: 0 },
    );
    expect(one.blocks[0]?.exercises[0]?.sets).toHaveLength(1);
    expect(
      sessionDraftReducer(one, { type: "removeSet", ...target, index: 0 }),
    ).toBe(one);
  });

  it("never adds more than 20 sets", () => {
    const { draft, blockKey, exerciseKey } = draftWithExercises();
    let current = draft;
    for (let count = 0; count < 25; count += 1) {
      current = sessionDraftReducer(current, {
        type: "addSet",
        blockKey,
        exerciseKey,
      });
    }

    expect(current.blocks[0]?.exercises[0]?.sets).toHaveLength(20);
  });
});

describe("sessionDraftReducer · block details (US-13)", () => {
  it("uses the key given with addBlock and changes the title and the note", () => {
    const draft = apply(
      base,
      { type: "addBlock", blockType: "note", key: "my-block" },
      { type: "setBlockName", key: "my-block", name: "Rappels" },
      {
        type: "setBlockInstructions",
        key: "my-block",
        instructions: "Respirer.",
      },
    );

    expect(draft.blocks[0]).toMatchObject({
      key: "my-block",
      block_type: "note",
      name: "Rappels",
      instructions: "Respirer.",
    });
  });

  it("changes the type of an empty block only", () => {
    const empty = apply(base, {
      type: "addBlock",
      blockType: "classic",
      key: "b",
    });
    expect(
      sessionDraftReducer(empty, {
        type: "setBlockType",
        key: "b",
        blockType: "warm_up",
      }).blocks[0]?.block_type,
    ).toBe("warm_up");

    const { draft, blockKey } = draftWithExercises();
    expect(
      sessionDraftReducer(draft, {
        type: "setBlockType",
        key: blockKey,
        blockType: "note",
      }),
    ).toBe(draft);
  });
});

// "Dupliquer" of the "⋯" menu of a block card (handoff 3.1).
describe("sessionDraftReducer · duplicating a block", () => {
  it("inserts the copy right after, with keys of its own", () => {
    const { draft, blockKey } = draftWithExercises();
    const second = apply(draft, { type: "addBlock", blockType: "warm_up" });

    const copied = apply(second, { type: "duplicateBlock", key: blockKey });

    expect(copied.blocks.map((block) => block.block_type)).toEqual([
      "classic",
      "classic",
      "warm_up",
    ]);
    const [first, copy] = copied.blocks;
    expect(copy?.key).not.toBe(first?.key);
    expect(copy?.exercises.map((exercise) => exercise.name)).toEqual([
      "Développé couché",
      "Tractions",
    ]);
    expect(copy?.exercises[0]?.key).not.toBe(first?.exercises[0]?.key);
    // Nothing is shared: the sets of the copy are their own objects.
    expect(copy?.exercises[0]?.sets[0]).not.toBe(first?.exercises[0]?.sets[0]);
    expect(copy?.exercises[0]?.sets[0]).toEqual(first?.exercises[0]?.sets[0]);
  });

  it("leaves the draft alone for an unknown block", () => {
    const { draft } = draftWithExercises();

    expect(apply(draft, { type: "duplicateBlock", key: "nope" })).toBe(draft);
  });
});

describe("sessionDraftReducer · exercises (US-14)", () => {
  it("removes an exercise and puts it back at its place", () => {
    const { draft, blockKey, exerciseKey } = draftWithExercises();
    const removed = draft.blocks[0]?.exercises[0];
    if (removed === undefined) {
      throw new Error("missing exercise");
    }

    const without = sessionDraftReducer(draft, {
      type: "removeExercise",
      blockKey,
      exerciseKey,
    });
    expect(without.blocks[0]?.exercises.map((e) => e.name)).toEqual([
      "Tractions",
    ]);

    const restored = sessionDraftReducer(without, {
      type: "restoreExercise",
      blockKey,
      exercise: removed,
      index: 0,
    });
    expect(restored.blocks[0]?.exercises.map((e) => e.name)).toEqual([
      "Développé couché",
      "Tractions",
    ]);
  });

  it("pre-fills the first set from the measures of the exercise", () => {
    const withBlock = apply(base, {
      type: "addBlock",
      blockType: "classic",
      key: "b",
    });
    const draft = apply(withBlock, {
      type: "addExercises",
      blockKey: "b",
      exercises: [
        { exercise_id: 1, name: "Gainage", measure_codes: ["duration"] },
        {
          exercise_id: 2,
          name: "Tapis",
          measure_codes: ["duration", "distance", "speed"],
        },
      ],
    });
    expect(draft.blocks[0]?.exercises[0]?.sets[0]?.duration_seconds).toBe(60);
    expect(draft.blocks[0]?.exercises[1]?.sets[0]?.duration_seconds).toBe(600);
  });
});

// US-16: the order of the blocks, the exercises and the sets changes in
// the draft; the server numbers the positions from it (RM-024).
describe("changing the order (US-16)", () => {
  function threeBlocks() {
    return apply(
      base,
      { type: "addBlock", blockType: "warm_up" },
      { type: "addBlock", blockType: "classic" },
      { type: "addBlock", blockType: "note" },
    );
  }

  it("moves a block, and leaves the draft alone at the edges", () => {
    const draft = threeBlocks();

    const moved = sessionDraftReducer(draft, {
      type: "moveBlock",
      from: 2,
      to: 0,
    });
    expect(moved.blocks.map((block) => block.block_type)).toEqual([
      "note",
      "warm_up",
      "classic",
    ]);

    // Outside the list, or in place: the very same draft
    expect(
      sessionDraftReducer(draft, { type: "moveBlock", from: 0, to: 0 }),
    ).toBe(draft);
    expect(
      sessionDraftReducer(draft, { type: "moveBlock", from: 0, to: 3 }),
    ).toBe(draft);
    expect(
      sessionDraftReducer(draft, { type: "moveBlock", from: -1, to: 1 }),
    ).toBe(draft);
  });

  it("moves an exercise inside its block", () => {
    const { draft, blockKey } = draftWithExercises();

    const moved = sessionDraftReducer(draft, {
      type: "moveExercise",
      blockKey,
      from: 1,
      to: 0,
    });
    expect(moved.blocks[0]?.exercises.map((exercise) => exercise.name)).toEqual(
      ["Tractions", "Développé couché"],
    );

    // An unknown block changes nothing
    expect(
      sessionDraftReducer(draft, {
        type: "moveExercise",
        blockKey: "nope",
        from: 0,
        to: 1,
      }),
    ).toBe(draft);
  });

  it("moves a set inside its exercise", () => {
    const { draft, blockKey, exerciseKey } = draftWithExercises();
    const three = apply(
      draft,
      { type: "addSet", blockKey, exerciseKey },
      { type: "addSet", blockKey, exerciseKey },
      {
        type: "updateSet",
        blockKey,
        exerciseKey,
        index: 2,
        values: { reps: 12 },
      },
    );

    const moved = sessionDraftReducer(three, {
      type: "moveSet",
      blockKey,
      exerciseKey,
      from: 2,
      to: 0,
    });
    // The third set (12 reps) becomes the first; the two others follow
    // in their order (the first one was pre-filled with 10 reps).
    expect(moved.blocks[0]?.exercises[0]?.sets.map((set) => set.reps)).toEqual([
      12,
      10,
      null,
    ]);

    expect(
      sessionDraftReducer(three, {
        type: "moveSet",
        blockKey,
        exerciseKey,
        from: 0,
        to: 9,
      }),
    ).toBe(three);
  });
});
