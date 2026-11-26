import type { RequestHandler } from "express";
import {
  type CurrentWorkoutSession,
  countValidatedSets,
  type MeasureCode,
  type StartWorkoutInput,
  type WorkoutBlockTree,
  type WorkoutExerciseTree,
  type WorkoutSessionTree,
  type WorkoutSetRow,
  type WorkoutStarted,
} from "shared";
import { readDuplicateKeyName } from "../../database/errors.js";
import { withTransaction } from "../../database/withTransaction.js";
import { HttpError } from "../../utils/httpError.js";
import { readUserId } from "../../utils/requestUser.js";
import {
  readAppointmentForUpdate,
  updateAppointmentStatus,
} from "../appointment/appointmentRepository.js";
import { updateRecordsForSession } from "../progress/recordActions.js";
import { countVersionExercises } from "../session-template/sessionTemplateRepository.js";
import {
  abandonWorkoutSession,
  completeWorkoutSession,
  copyPlannedSets,
  copyTemplateBlocks,
  copyTemplateExercises,
  countWorkoutSets,
  createWorkoutSession,
  type InProgressWorkoutRow,
  readInProgressWorkout,
  readWorkoutBlocks,
  readWorkoutExercises,
  readWorkoutSession,
  readWorkoutSetSides,
  readWorkoutSets,
  type WorkoutSetDbRow,
  type WorkoutSetSideRow,
} from "./workoutSessionRepository.js";

// One session at a time (RM-040): the refusal names the one in progress; the
// client then loads it (GET /current) to offer "Reprendre".
function alreadyInProgress(current: InProgressWorkoutRow): HttpError {
  return new HttpError(
    409,
    "WORKOUT_ALREADY_IN_PROGRESS",
    `Termine ou abandonne « ${current.session_name} » avant d'en démarrer une autre.`,
  );
}

// POST /api/workout-sessions { appointment_id }: starts a planned session.
// Everything happens in one transaction: lock the appointment, check it can
// start, create the realized session, copy the plan (frozen, RM-041), mark
// the appointment attended (RM-039). The unique index of the database stops a
// second start that would slip through two simultaneous requests (DT-15).
export const start: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { appointment_id } = req.body as StartWorkoutInput;

  let id: number;
  try {
    id = await withTransaction(async (connection) => {
      const appointment = await readAppointmentForUpdate(
        appointment_id,
        userId,
        connection,
      );
      if (appointment === null) {
        throw new HttpError(
          404,
          "APPOINTMENT_NOT_FOUND",
          "Cette séance n'existe pas.",
        );
      }
      if (
        appointment.status === "attended" ||
        appointment.status === "cancelled"
      ) {
        throw new HttpError(
          409,
          "APPOINTMENT_NOT_STARTABLE",
          "Cette séance a déjà été faite ou annulée.",
        );
      }
      const current = await readInProgressWorkout(userId, connection);
      if (current !== null) {
        throw alreadyInProgress(current);
      }
      const exerciseCount = await countVersionExercises(
        appointment.session_version_id,
        connection,
      );
      if (exerciseCount === 0) {
        throw new HttpError(
          422,
          "SESSION_WITHOUT_EXERCISE",
          "Cette séance n'a pas d'exercice : ajoute-en avant de la démarrer.",
        );
      }

      const workoutId = await createWorkoutSession(
        appointment_id,
        userId,
        connection,
      );
      await copyTemplateBlocks(
        workoutId,
        appointment.session_version_id,
        connection,
      );
      await copyTemplateExercises(workoutId, connection);
      await copyPlannedSets(workoutId, connection);
      await updateAppointmentStatus(appointment_id, "attended", connection);
      return workoutId;
    });
  } catch (error) {
    // Two starts at the very same time: the second one hits the unique index.
    if (readDuplicateKeyName(error) === "uq_one_active_workout_per_user") {
      const current = await readInProgressWorkout(userId);
      throw current === null ? error : alreadyInProgress(current);
    }
    throw error;
  }

  const started: WorkoutStarted = { id };
  res.status(201).json(started);
};

// GET /api/workout-sessions/current: the session in progress, or null.
export const readCurrent: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const current = await readInProgressWorkout(userId);
  if (current === null) {
    res.json(null);
    return;
  }
  const counts = await countWorkoutSets(current.id);
  const summary: CurrentWorkoutSession = {
    id: current.id,
    appointment_id: current.appointment_id,
    session_name: current.session_name,
    started_at: current.started_at.toISOString(),
    validated_sets: counts.validated,
    planned_sets: counts.planned,
  };
  res.json(summary);
};

// MySQL gives DECIMAL columns as text: back to numbers for the client.
function toNumber(value: string | number | null): number | null {
  return value === null ? null : Number(value);
}

export function toSetRow(
  row: WorkoutSetDbRow,
  sides: WorkoutSetSideRow[] = [],
): WorkoutSetRow {
  return {
    id: row.id,
    position: row.position,
    reps_planned: row.reps_planned,
    reps_actual: row.reps_actual,
    weight_planned_kg: toNumber(row.weight_planned_kg),
    weight_actual_kg: toNumber(row.weight_actual_kg),
    weight_left_planned_kg: toNumber(row.weight_left_planned_kg),
    weight_right_planned_kg: toNumber(row.weight_right_planned_kg),
    duration_planned_seconds: row.duration_planned_seconds,
    duration_actual_seconds: row.duration_actual_seconds,
    distance_planned_meters: toNumber(row.distance_planned_meters),
    distance_actual_meters: toNumber(row.distance_actual_meters),
    speed_planned_kmh: toNumber(row.speed_planned_kmh),
    speed_actual_kmh: toNumber(row.speed_actual_kmh),
    resistance_planned: toNumber(row.resistance_planned),
    resistance_actual: toNumber(row.resistance_actual),
    incline_planned_percent: toNumber(row.incline_planned_percent),
    incline_actual_percent: toNumber(row.incline_actual_percent),
    calories_planned: toNumber(row.calories_planned),
    calories_actual: toNumber(row.calories_actual),
    planned_rest_seconds: row.planned_rest_seconds,
    validated_at:
      row.validated_at === null ? null : row.validated_at.toISOString(),
    updated_at: row.updated_at === null ? null : row.updated_at.toISOString(),
    // Nothing behind it in the plan: it was added during the session (D-18)
    is_added: row.source_planned_set_id === null,
    // One row per side filled in (US-51)
    sides: sides
      .filter((side) => side.workout_set_id === row.id)
      .map((side) => ({
        side: side.side,
        reps_actual: side.reps_actual,
        weight_actual_kg: toNumber(side.weight_actual_kg),
        duration_actual_seconds: side.duration_actual_seconds,
        validated_at: side.validated_at.toISOString(),
      })),
  };
}

// The whole tree of a realized session, or null when it is not the user's.
export async function buildTree(
  id: number,
  userId: number,
): Promise<WorkoutSessionTree | null> {
  const session = await readWorkoutSession(id, userId);
  if (session === null) {
    return null;
  }
  const blocks = await readWorkoutBlocks(id);
  const exercises = await readWorkoutExercises(id);
  const sets = await readWorkoutSets(id);
  const sides = await readWorkoutSetSides(id);

  const exerciseTrees: WorkoutExerciseTree[] = exercises.map((exercise) => ({
    id: exercise.id,
    exercise_id: exercise.exercise_id,
    position: exercise.position,
    name: exercise.name,
    meta:
      [exercise.category_name, exercise.equipment_names]
        .filter((part) => part !== null)
        .join(" · ") || null,
    measure_codes:
      exercise.measure_codes === null
        ? []
        : (exercise.measure_codes.split(",") as MeasureCode[]),
    is_bodyweight: exercise.is_bodyweight === 1,
    is_per_side: Number(exercise.is_per_side) === 1,
    default_rest_seconds: exercise.default_rest_seconds,
    is_added: exercise.source_template_block_exercise_id === null,
    sets: sets
      .filter((set) => set.workout_exercise_id === exercise.id)
      .map((set) => toSetRow(set, sides)),
  }));

  const blockTrees: WorkoutBlockTree[] = blocks.map((block) => ({
    id: block.id,
    block_type: block.block_type,
    name: block.name,
    position: block.position,
    instructions: block.instructions,
    is_added: block.source_template_block_id === null,
    exercises: exerciseTrees.filter((exercise) =>
      exercises.some(
        (row) => row.id === exercise.id && row.workout_block_id === block.id,
      ),
    ),
  }));

  return {
    id: session.id,
    appointment_id: session.appointment_id,
    session_name: session.session_name,
    program_name: session.program_name,
    status: session.status,
    started_at: session.started_at.toISOString(),
    ended_at: session.ended_at === null ? null : session.ended_at.toISOString(),
    auto_closed: session.auto_closed === 1,
    declared_afterwards: session.declared_afterwards === 1,
    blocks: blockTrees,
  };
}

// GET /api/workout-sessions/:id: the whole tree of a realized session.
// Another user's session answers 404, as if it did not exist (DT-05).
export const read: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { id } = req.params as unknown as { id: number };

  const tree = await buildTree(id, userId);
  if (tree === null) {
    throw new HttpError(404, "WORKOUT_NOT_FOUND", "Cette séance n'existe pas.");
  }
  res.json(tree);
};

// POST /api/workout-sessions/:id/abandon: the session ends now as unfinished,
// its validated sets kept (RM-045). Already over: 409; not the user's: 404.
export const abandon: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { id } = req.params as unknown as { id: number };

  const changed = await abandonWorkoutSession(id, userId);
  const tree = await buildTree(id, userId);
  if (tree === null) {
    throw new HttpError(404, "WORKOUT_NOT_FOUND", "Cette séance n'existe pas.");
  }
  if (changed === 0) {
    throw new HttpError(
      409,
      "WORKOUT_NOT_IN_PROGRESS",
      "Cette séance n'est plus en cours.",
    );
  }
  res.json(tree);
};

// POST /api/workout-sessions/:id/complete: the session ends as completed,
// the sets not done stay empty (RM-046). Without any validated set the end
// is refused (D-10): the way out is to abandon.
export const complete: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { id } = req.params as unknown as { id: number };

  const before = await buildTree(id, userId);
  if (before === null) {
    throw new HttpError(404, "WORKOUT_NOT_FOUND", "Cette séance n'existe pas.");
  }
  if (before.status !== "in_progress") {
    throw new HttpError(
      409,
      "WORKOUT_NOT_IN_PROGRESS",
      "Cette séance n'est plus en cours.",
    );
  }
  if (countValidatedSets(before) === 0) {
    throw new HttpError(
      422,
      "NO_VALIDATED_SET",
      "Aucune série n'est faite. Tu peux abandonner la séance.",
    );
  }

  const changed = await completeWorkoutSession(id, userId);
  if (changed === 0) {
    throw new HttpError(
      409,
      "WORKOUT_NOT_IN_PROGRESS",
      "Cette séance n'est plus en cours.",
    );
  }
  // A new maximum becomes a notification (US-40, RM-055).
  await updateRecordsForSession(userId, id, before.appointment_id);
  res.json(await buildTree(id, userId));
};
