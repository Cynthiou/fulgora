import {
  type BlockType,
  createEmptySet,
  DEFAULT_REST_SECONDS,
  type DraftBlock,
  type DraftExercise,
  MAX_SETS_PER_EXERCISE,
  type MeasureCode,
  type PlannedSetValues,
  type SessionDraft,
} from "shared";

// Every change of the draft is an action; the reducer is a pure function:
// same draft + same action = same result, and it never changes its input.
// When an action changes nothing, the same draft object is returned, so the
// hook knows the draft is not dirtier than before.

export type NewDraftExercise = {
  exercise_id: number;
  name: string;
  measure_codes: MeasureCode[];
  // Pre-filled sets (US-15); one empty set when not given.
  sets?: PlannedSetValues[];
  default_rest_seconds?: number | null;
};

export type SessionDraftAction =
  | { type: "setName"; name: string }
  | { type: "setDate"; date: string }
  | { type: "setTime"; time: string | null }
  | { type: "addBlock"; blockType: BlockType }
  | { type: "removeBlock"; key: string }
  | { type: "restoreBlock"; block: DraftBlock; index: number }
  | { type: "moveBlock"; from: number; to: number }
  | { type: "addExercises"; blockKey: string; exercises: NewDraftExercise[] }
  | { type: "removeExercise"; blockKey: string; exerciseKey: string }
  | {
      type: "updateExerciseRest";
      blockKey: string;
      exerciseKey: string;
      seconds: number | null;
    }
  | { type: "addSet"; blockKey: string; exerciseKey: string }
  | { type: "duplicateLastSet"; blockKey: string; exerciseKey: string }
  | {
      type: "updateSet";
      blockKey: string;
      exerciseKey: string;
      index: number;
      values: Partial<PlannedSetValues>;
    }
  | { type: "removeSet"; blockKey: string; exerciseKey: string; index: number };

// Local keys for the lists: unique within a page, never stored.
let keyCounter = 0;
export function nextKey(): string {
  keyCounter += 1;
  return `k${keyCounter}`;
}

function updateBlock(
  draft: SessionDraft,
  blockKey: string,
  change: (block: DraftBlock) => DraftBlock,
): SessionDraft {
  const index = draft.blocks.findIndex((block) => block.key === blockKey);
  if (index === -1) {
    return draft;
  }
  const current = draft.blocks[index] as DraftBlock;
  const changed = change(current);
  if (changed === current) {
    return draft;
  }
  const blocks = [...draft.blocks];
  blocks[index] = changed;
  return { ...draft, blocks };
}

function updateExercise(
  draft: SessionDraft,
  blockKey: string,
  exerciseKey: string,
  change: (exercise: DraftExercise) => DraftExercise,
): SessionDraft {
  return updateBlock(draft, blockKey, (block) => {
    const index = block.exercises.findIndex(
      (exercise) => exercise.key === exerciseKey,
    );
    if (index === -1) {
      return block;
    }
    const current = block.exercises[index] as DraftExercise;
    const changed = change(current);
    if (changed === current) {
      return block;
    }
    const exercises = [...block.exercises];
    exercises[index] = changed;
    return { ...block, exercises };
  });
}

export function sessionDraftReducer(
  draft: SessionDraft,
  action: SessionDraftAction,
): SessionDraft {
  switch (action.type) {
    case "setName":
      return action.name === draft.name
        ? draft
        : { ...draft, name: action.name };

    case "setDate":
      return action.date === draft.planned_date
        ? draft
        : { ...draft, planned_date: action.date };

    case "setTime":
      return action.time === draft.planned_time
        ? draft
        : { ...draft, planned_time: action.time };

    case "addBlock": {
      const block: DraftBlock = {
        key: nextKey(),
        block_type: action.blockType,
        name: null,
        instructions: null,
        exercises: [],
      };
      return { ...draft, blocks: [...draft.blocks, block] };
    }

    case "removeBlock": {
      const blocks = draft.blocks.filter((block) => block.key !== action.key);
      return blocks.length === draft.blocks.length
        ? draft
        : { ...draft, blocks };
    }

    case "restoreBlock": {
      // Back where it was (undo), within the current bounds.
      const blocks = [...draft.blocks];
      const index = Math.max(0, Math.min(action.index, blocks.length));
      blocks.splice(index, 0, action.block);
      return { ...draft, blocks };
    }

    case "moveBlock": {
      const { from, to } = action;
      const last = draft.blocks.length - 1;
      if (from === to || from < 0 || to < 0 || from > last || to > last) {
        return draft;
      }
      const blocks = [...draft.blocks];
      const [moved] = blocks.splice(from, 1);
      blocks.splice(to, 0, moved as DraftBlock);
      return { ...draft, blocks };
    }

    case "addExercises":
      return updateBlock(draft, action.blockKey, (block) => ({
        ...block,
        exercises: [
          ...block.exercises,
          ...action.exercises.map(
            (added): DraftExercise => ({
              key: nextKey(),
              exercise_id: added.exercise_id,
              name: added.name,
              measure_codes: added.measure_codes,
              default_rest_seconds:
                added.default_rest_seconds ?? DEFAULT_REST_SECONDS,
              sets:
                added.sets !== undefined && added.sets.length > 0
                  ? added.sets
                  : [createEmptySet()],
            }),
          ),
        ],
      }));

    case "removeExercise":
      return updateBlock(draft, action.blockKey, (block) => {
        const exercises = block.exercises.filter(
          (exercise) => exercise.key !== action.exerciseKey,
        );
        return exercises.length === block.exercises.length
          ? block
          : { ...block, exercises };
      });

    case "updateExerciseRest":
      return updateExercise(
        draft,
        action.blockKey,
        action.exerciseKey,
        (exercise) =>
          exercise.default_rest_seconds === action.seconds
            ? exercise
            : { ...exercise, default_rest_seconds: action.seconds },
      );

    case "addSet":
      return updateExercise(
        draft,
        action.blockKey,
        action.exerciseKey,
        (exercise) =>
          exercise.sets.length >= MAX_SETS_PER_EXERCISE
            ? exercise
            : { ...exercise, sets: [...exercise.sets, createEmptySet()] },
      );

    case "duplicateLastSet":
      return updateExercise(
        draft,
        action.blockKey,
        action.exerciseKey,
        (exercise) => {
          const last = exercise.sets[exercise.sets.length - 1];
          if (
            last === undefined ||
            exercise.sets.length >= MAX_SETS_PER_EXERCISE
          ) {
            return exercise;
          }
          return { ...exercise, sets: [...exercise.sets, { ...last }] };
        },
      );

    case "updateSet":
      return updateExercise(
        draft,
        action.blockKey,
        action.exerciseKey,
        (exercise) => {
          const current = exercise.sets[action.index];
          if (current === undefined) {
            return exercise;
          }
          const sets = [...exercise.sets];
          sets[action.index] = { ...current, ...action.values };
          return { ...exercise, sets };
        },
      );

    case "removeSet":
      return updateExercise(
        draft,
        action.blockKey,
        action.exerciseKey,
        (exercise) => {
          // At least one set per exercise (US-15).
          if (
            exercise.sets.length <= 1 ||
            exercise.sets[action.index] === undefined
          ) {
            return exercise;
          }
          return {
            ...exercise,
            sets: exercise.sets.filter((_, index) => index !== action.index),
          };
        },
      );

    default:
      return draft;
  }
}
