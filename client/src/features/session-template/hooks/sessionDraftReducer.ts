import {
  type BlockType,
  createDefaultSet,
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
  meta?: string | null;
  measure_codes: MeasureCode[];
  is_bodyweight?: boolean;
  // Pre-filled sets (US-15); one empty set when not given.
  sets?: PlannedSetValues[];
  default_rest_seconds?: number | null;
};

export type SessionDraftAction =
  | { type: "setName"; name: string }
  | { type: "setDate"; date: string }
  | { type: "setTime"; time: string | null }
  // The key may be given by the page, to open the new block right away.
  | { type: "addBlock"; blockType: BlockType; key?: string }
  | { type: "setBlockName"; key: string; name: string | null }
  | { type: "setBlockInstructions"; key: string; instructions: string | null }
  | { type: "setBlockType"; key: string; blockType: BlockType }
  | { type: "removeBlock"; key: string }
  | { type: "restoreBlock"; block: DraftBlock; index: number }
  | { type: "moveBlock"; from: number; to: number }
  | { type: "moveExercise"; blockKey: string; from: number; to: number }
  | {
      type: "moveSet";
      blockKey: string;
      exerciseKey: string;
      from: number;
      to: number;
    }
  | { type: "addExercises"; blockKey: string; exercises: NewDraftExercise[] }
  | { type: "removeExercise"; blockKey: string; exerciseKey: string }
  | {
      type: "restoreExercise";
      blockKey: string;
      exercise: DraftExercise;
      index: number;
    }
  | {
      type: "updateExerciseRest";
      blockKey: string;
      exerciseKey: string;
      seconds: number | null;
    }
  | {
      // "Chaque côté" of A7e (US-51)
      type: "setPerSide";
      blockKey: string;
      exerciseKey: string;
      isPerSide: boolean;
    }
  | {
      // "Même charge des deux côtés" of A7e (US-51)
      type: "setSameLoad";
      blockKey: string;
      exerciseKey: string;
      isSame: boolean;
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

// Moves one item of a list and gives a new list back; the same list when
// the move changes nothing or falls outside (US-16).
function moveInList<T>(items: T[], from: number, to: number): T[] {
  const last = items.length - 1;
  if (from === to || from < 0 || to < 0 || from > last || to > last) {
    return items;
  }
  const moved = [...items];
  const [item] = moved.splice(from, 1);
  moved.splice(to, 0, item as T);
  return moved;
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
        key: action.key ?? nextKey(),
        block_type: action.blockType,
        name: null,
        instructions: null,
        exercises: [],
      };
      return { ...draft, blocks: [...draft.blocks, block] };
    }

    case "setBlockName":
      return updateBlock(draft, action.key, (block) =>
        block.name === action.name ? block : { ...block, name: action.name },
      );

    case "setBlockInstructions":
      return updateBlock(draft, action.key, (block) =>
        block.instructions === action.instructions
          ? block
          : { ...block, instructions: action.instructions },
      );

    // Changing the type of a block that holds exercises is US-17 (D-03):
    // here the type only changes on an empty block.
    case "setBlockType":
      return updateBlock(draft, action.key, (block) =>
        block.block_type === action.blockType || block.exercises.length > 0
          ? block
          : { ...block, block_type: action.blockType },
      );

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
      const blocks = moveInList(draft.blocks, action.from, action.to);
      return blocks === draft.blocks ? draft : { ...draft, blocks };
    }

    case "moveExercise":
      return updateBlock(draft, action.blockKey, (block) => {
        const exercises = moveInList(block.exercises, action.from, action.to);
        return exercises === block.exercises ? block : { ...block, exercises };
      });

    case "moveSet":
      return updateExercise(
        draft,
        action.blockKey,
        action.exerciseKey,
        (exercise) => {
          const sets = moveInList(exercise.sets, action.from, action.to);
          return sets === exercise.sets ? exercise : { ...exercise, sets };
        },
      );

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
              meta: added.meta ?? null,
              measure_codes: added.measure_codes,
              is_bodyweight: added.is_bodyweight ?? false,
              default_rest_seconds:
                added.default_rest_seconds ?? DEFAULT_REST_SECONDS,
              // One pre-filled set by default: 10 reps, 1 min... (US-15)
              sets:
                added.sets !== undefined && added.sets.length > 0
                  ? added.sets
                  : [
                      createDefaultSet(
                        added.measure_codes,
                        added.is_bodyweight,
                      ),
                    ],
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

    // "Annuler" after a removal: the exercise goes back to its place.
    case "restoreExercise":
      return updateBlock(draft, action.blockKey, (block) => {
        const exercises = [...block.exercises];
        exercises.splice(action.index, 0, action.exercise);
        return { ...block, exercises };
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

    case "setPerSide":
      return updateExercise(
        draft,
        action.blockKey,
        action.exerciseKey,
        (exercise) =>
          (exercise.is_per_side ?? false) === action.isPerSide
            ? exercise
            : {
                ...exercise,
                is_per_side: action.isPerSide,
                // Leaving the per-side mode drops the two loads (US-51).
                sets: action.isPerSide
                  ? exercise.sets
                  : exercise.sets.map((set) => ({
                      ...set,
                      weight_kg: set.weight_kg ?? set.weight_left_kg,
                      weight_left_kg: null,
                      weight_right_kg: null,
                    })),
              },
      );

    case "setSameLoad":
      return updateExercise(
        draft,
        action.blockKey,
        action.exerciseKey,
        (exercise) => ({
          ...exercise,
          sets: exercise.sets.map((set) =>
            action.isSame
              ? {
                  // One load again: the left one is kept (A7e).
                  ...set,
                  weight_kg: set.weight_kg ?? set.weight_left_kg,
                  weight_left_kg: null,
                  weight_right_kg: null,
                }
              : {
                  // One load per side: both start from the single one.
                  ...set,
                  weight_kg: null,
                  weight_left_kg: set.weight_left_kg ?? set.weight_kg,
                  weight_right_kg: set.weight_right_kg ?? set.weight_kg,
                },
          ),
        }),
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
