import {
  getDisallowedSetFields,
  getSetFieldLabel,
  type MeasureCode,
  type SessionDraftInput,
} from "shared";
import type { Queryable } from "../../database/client.js";
import { HttpError } from "../../utils/httpError.js";
import {
  readAvailableExerciseIds,
  readExerciseMeasureCodes,
} from "../exercise/exerciseRepository.js";
import {
  createPlannedSet,
  createTemplateBlock,
  createTemplateBlockExercise,
} from "./sessionTemplateRepository.js";

// The content of a session, checked then written. Shared by the creation
// (US-23) and the change (US-17): both build the same tree.

type Blocks = SessionDraftInput["blocks"];

// Every exercise must be visible to this user and not archived (RM-007), and
// a set may only hold the measures of its exercise (RM-010). The server never
// names an exercise it does not own: the client finds the name in its draft
// through the field path.
export async function assertSessionContentValid(
  blocks: Blocks,
  userId: number,
  db: Queryable,
): Promise<void> {
  const exerciseIds = [
    ...new Set(
      blocks.flatMap((block) =>
        block.exercises.map((exercise) => exercise.exercise_id),
      ),
    ),
  ];

  const available = new Set(
    await readAvailableExerciseIds(userId, exerciseIds, db),
  );
  blocks.forEach((block, blockIndex) => {
    block.exercises.forEach((exercise, exerciseIndex) => {
      if (!available.has(exercise.exercise_id)) {
        throw new HttpError(
          422,
          "EXERCISE_NOT_AVAILABLE",
          "Cet exercice n'est plus disponible. Retire-le pour enregistrer.",
          `blocks.${blockIndex}.exercises.${exerciseIndex}`,
        );
      }
    });
  });

  const codesByExercise = new Map<number, MeasureCode[]>();
  for (const row of await readExerciseMeasureCodes(exerciseIds, db)) {
    const codes = codesByExercise.get(row.exercise_id) ?? [];
    codes.push(row.code);
    codesByExercise.set(row.exercise_id, codes);
  }
  blocks.forEach((block, blockIndex) => {
    block.exercises.forEach((exercise, exerciseIndex) => {
      const codes = codesByExercise.get(exercise.exercise_id) ?? [];
      exercise.sets.forEach((set, setIndex) => {
        // A per-side exercise may carry one load per side (US-51).
        const [field] = getDisallowedSetFields(
          set,
          codes,
          false,
          exercise.is_per_side ?? false,
        );
        if (field !== undefined) {
          throw new HttpError(
            422,
            "MEASURE_NOT_ALLOWED",
            `La mesure « ${getSetFieldLabel(field, "weighted")} » n'est pas prévue pour cet exercice.`,
            `blocks.${blockIndex}.exercises.${exerciseIndex}.sets.${setIndex}.${field}`,
          );
        }
      });
    });
  });
}

// Blocks, exercises and sets of a version, in order. The positions are
// computed from the order of the lists: 1, 2, 3... (RM-024).
export async function writeSessionTree(
  versionId: number,
  blocks: Blocks,
  db: Queryable,
): Promise<void> {
  for (const [blockIndex, block] of blocks.entries()) {
    const blockId = await createTemplateBlock(
      versionId,
      block,
      blockIndex + 1,
      db,
    );
    for (const [exerciseIndex, exercise] of block.exercises.entries()) {
      const blockExerciseId = await createTemplateBlockExercise(
        blockId,
        exercise.exercise_id,
        exerciseIndex + 1,
        exercise.default_rest_seconds,
        exercise.is_per_side ?? false,
        db,
      );
      for (const [setIndex, set] of exercise.sets.entries()) {
        await createPlannedSet(blockExerciseId, setIndex + 1, set, db);
      }
    }
  }
}
