import type { RequestHandler } from "express";
import type {
  AddWorkoutBlockInput,
  AddWorkoutExercisesInput,
  BlockResultInput,
} from "shared";
import { withTransaction } from "../../database/withTransaction.js";
import { HttpError } from "../../utils/httpError.js";
import { readUserId } from "../../utils/requestUser.js";
import { readAvailableExerciseIds } from "../exercise/exerciseRepository.js";
import {
  createWorkoutBlock,
  createWorkoutExercise,
  createWorkoutSet,
  deleteAddedWorkoutSet,
  readNextBlockPosition,
  readNextExercisePosition,
  readNextSetPosition,
  readWorkoutBlockContext,
  readWorkoutExerciseContext,
  readWorkoutSession,
  readWorkoutSetOwner,
  touchWorkoutSession,
  updateWorkoutBlockResult,
} from "./workoutSessionRepository.js";

// Adding to a session while it runs (US-32), or while correcting it
// afterwards (US-37). What is added has no planned values and no
// provenance: the plan itself never changes (RM-043, D-18). The three
// states of a session all accept it, so no state is refused here.

// Every exercise must be visible to this user and not archived (RM-007).
async function assertExercisesAvailable(
  ids: number[],
  userId: number,
  db: Parameters<typeof readAvailableExerciseIds>[2],
): Promise<void> {
  const available = new Set(await readAvailableExerciseIds(userId, ids, db));
  const missing = ids.find((id) => !available.has(id));
  if (missing !== undefined) {
    throw new HttpError(
      422,
      "EXERCISE_NOT_AVAILABLE",
      "Cet exercice n'est plus disponible.",
    );
  }
}

// An exercise added during the session starts with one empty set, so there
// is something to fill right away.
async function addExercises(
  blockId: number,
  exerciseIds: number[],
  db: Parameters<typeof createWorkoutExercise>[3],
): Promise<number[]> {
  const created: number[] = [];
  let position = await readNextExercisePosition(blockId, db);
  for (const exerciseId of exerciseIds) {
    const id = await createWorkoutExercise(blockId, exerciseId, position, db);
    await createWorkoutSet(id, 1, db);
    created.push(id);
    position += 1;
  }
  return created;
}

// POST /api/workout-exercises/:id/sets: one more set on the exercise (B3a).
export const addSet: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { id } = req.params as unknown as { id: number };

  const setId = await withTransaction(async (connection) => {
    const context = await readWorkoutExerciseContext(id, userId, connection);
    if (context === null) {
      throw new HttpError(
        404,
        "WORKOUT_EXERCISE_NOT_FOUND",
        "Cet exercice n'existe pas.",
      );
    }
    const position = await readNextSetPosition(id, connection);
    const created = await createWorkoutSet(id, position, connection);
    await touchWorkoutSession(context.workout_session_id, connection);
    return created;
  });

  res.status(201).json({ id: setId });
};

// DELETE /api/workout-sets/:id: removes a set added during the session.
// A planned set is never removed (RM-048).
export const removeSet: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { id } = req.params as unknown as { id: number };

  await withTransaction(async (connection) => {
    const set = await readWorkoutSetOwner(id, userId, connection);
    if (set === null) {
      throw new HttpError(
        404,
        "WORKOUT_SET_NOT_FOUND",
        "Cette série n'existe pas.",
      );
    }
    if (set.source_planned_set_id !== null) {
      throw new HttpError(
        422,
        "PLANNED_ITEM_NOT_REMOVABLE",
        "Cette série était prévue : elle ne se retire pas.",
      );
    }
    await deleteAddedWorkoutSet(id, connection);
    await touchWorkoutSession(set.workout_session_id, connection);
  });

  res.status(204).end();
};

// POST /api/workout-blocks/:id/exercises: the chosen exercises land at the
// end of an existing block (B2).
export const addExercisesToBlock: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { id } = req.params as unknown as { id: number };
  const { exercise_ids } = req.body as AddWorkoutExercisesInput;

  const ids = await withTransaction(async (connection) => {
    const context = await readWorkoutBlockContext(id, userId, connection);
    if (context === null) {
      throw new HttpError(
        404,
        "WORKOUT_BLOCK_NOT_FOUND",
        "Ce bloc n'existe pas.",
      );
    }
    await assertExercisesAvailable(exercise_ids, userId, connection);
    const created = await addExercises(id, exercise_ids, connection);
    await touchWorkoutSession(context.workout_session_id, connection);
    return created;
  });

  res.status(201).json({ ids });
};

// POST /api/workout-sessions/:id/blocks: a new block at the end of the
// session, with the exercises chosen in the catalog (B2).
export const addBlock: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { id } = req.params as unknown as { id: number };
  const { name, exercise_ids } = req.body as AddWorkoutBlockInput;

  const blockId = await withTransaction(async (connection) => {
    const session = await readWorkoutSession(id, userId, connection);
    if (session === null) {
      throw new HttpError(
        404,
        "WORKOUT_SESSION_NOT_FOUND",
        "Cette séance n'existe pas.",
      );
    }
    await assertExercisesAvailable(exercise_ids, userId, connection);
    const position = await readNextBlockPosition(id, connection);
    const created = await createWorkoutBlock(id, name, position, connection);
    await addExercises(created, exercise_ids, connection);
    await touchWorkoutSession(id, connection);
    return created;
  });

  res.status(201).json({ id: blockId });
};

// PUT /api/workout-blocks/:id: the total of a timed block once it is over
// (US-31, D-06). Only a session in progress accepts it: a finished session
// is corrected set by set (US-37).
export const saveBlockResult: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { id } = req.params as unknown as { id: number };
  const { completed_rounds, extra_reps, actual_duration_seconds } =
    req.body as BlockResultInput;

  await withTransaction(async (connection) => {
    const context = await readWorkoutBlockContext(id, userId, connection);
    if (context === null) {
      throw new HttpError(
        404,
        "WORKOUT_BLOCK_NOT_FOUND",
        "Ce bloc n'existe pas.",
      );
    }
    if (context.status !== "in_progress") {
      throw new HttpError(
        409,
        "SESSION_NOT_IN_PROGRESS",
        "Cette séance n'est pas en cours.",
      );
    }
    await updateWorkoutBlockResult(
      id,
      completed_rounds,
      extra_reps,
      actual_duration_seconds,
      connection,
    );
    await touchWorkoutSession(context.workout_session_id, connection);
  });

  res.status(200).json({ id });
};
