import type { RequestHandler } from "express";
import {
  type ActualSetValues,
  getDisallowedSetFields,
  getSetFieldLabel,
  isEmptySet,
  type MeasureCode,
  type SideCode,
  type SideSetValues,
} from "shared";
import { withTransaction } from "../../database/withTransaction.js";
import { HttpError } from "../../utils/httpError.js";
import { readUserId } from "../../utils/requestUser.js";
import { readExerciseMeasureCodes } from "../exercise/exerciseRepository.js";
import { toSetRow } from "./workoutSessionActions.js";
import {
  correctWorkoutSetActual,
  countWorkoutSetSides,
  readWorkoutSet,
  readWorkoutSetContext,
  readWorkoutSetSidesOfSet,
  setWorkoutSetValidated,
  touchWorkoutSession,
  updateWorkoutSetActual,
  upsertWorkoutSetSide,
} from "./workoutSessionRepository.js";

// PUT /api/workout-sets/:id: records what was really done on one set (US-29).
// The body was validated by actualSetSchema. Only a set of a session in
// progress, with the measures of its exercise, and with something in it.
export const validateSet: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { id } = req.params as unknown as { id: number };
  const values = req.body as ActualSetValues;

  const updated = await withTransaction(async (connection) => {
    const context = await readWorkoutSetContext(id, userId, connection);
    if (context === null) {
      throw new HttpError(
        404,
        "WORKOUT_SET_NOT_FOUND",
        "Cette série n'existe pas.",
      );
    }
    if (context.status !== "in_progress") {
      throw new HttpError(
        409,
        "WORKOUT_NOT_IN_PROGRESS",
        "Cette séance n'est plus en cours.",
      );
    }

    const codes: MeasureCode[] = (
      await readExerciseMeasureCodes([context.exercise_id], connection)
    ).map((row) => row.code);
    const [field] = getDisallowedSetFields(
      { ...values, rest_after_seconds: null },
      codes,
    );
    if (field !== undefined) {
      throw new HttpError(
        422,
        "MEASURE_NOT_ALLOWED",
        `La mesure « ${getSetFieldLabel(field, "weighted")} » n'est pas prévue pour cet exercice.`,
        field,
      );
    }
    if (isEmptySet(values)) {
      throw new HttpError(
        422,
        "EMPTY_SET",
        "Indique au moins une valeur pour valider la série.",
      );
    }

    await updateWorkoutSetActual(id, values, connection);
    await touchWorkoutSession(context.workout_session_id, connection);
    return readWorkoutSet(id, connection);
  });

  if (updated === null) {
    throw new HttpError(
      404,
      "WORKOUT_SET_NOT_FOUND",
      "Cette série n'existe pas.",
    );
  }
  res.json(toSetRow(updated));
};

// PUT /api/workout-sets/:id/correction: fixes what was recorded on a past
// session (US-37). The planned values never move (RM-041), the first
// validation date is kept and the correction date is written (RM-049).
export const correctSet: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { id } = req.params as unknown as { id: number };
  const values = req.body as ActualSetValues;

  const updated = await withTransaction(async (connection) => {
    const context = await readWorkoutSetContext(id, userId, connection);
    if (context === null) {
      throw new HttpError(
        404,
        "WORKOUT_SET_NOT_FOUND",
        "Cette série n'existe pas.",
      );
    }
    // A session still running is filled in, not corrected (RM-047).
    if (context.status === "in_progress") {
      throw new HttpError(
        409,
        "WORKOUT_IN_PROGRESS",
        "Cette séance est en cours : remplis-la depuis la séance.",
      );
    }

    const codes: MeasureCode[] = (
      await readExerciseMeasureCodes([context.exercise_id], connection)
    ).map((row) => row.code);
    const [field] = getDisallowedSetFields(
      { ...values, rest_after_seconds: null },
      codes,
    );
    if (field !== undefined) {
      throw new HttpError(
        422,
        "MEASURE_NOT_ALLOWED",
        `La mesure « ${getSetFieldLabel(field, "weighted")} » n'est pas prévue pour cet exercice.`,
        field,
      );
    }
    if (isEmptySet(values)) {
      throw new HttpError(
        422,
        "EMPTY_SET",
        "Indique au moins une valeur pour corriger la série.",
      );
    }

    await correctWorkoutSetActual(id, values, connection);
    return readWorkoutSet(id, connection);
  });

  if (updated === null) {
    throw new HttpError(
      404,
      "WORKOUT_SET_NOT_FOUND",
      "Cette série n'existe pas.",
    );
  }
  res.json(toSetRow(updated));
};

// PUT /api/workout-sets/:id/sides/:side: what was done on one side of a
// per-side set (US-51). The set is validated only once both sides are
// there (RM-044); the side that is done stays if the session stops.
export const validateSide: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { id, side } = req.params as unknown as {
    id: number;
    side: SideCode;
  };
  const values = req.body as SideSetValues;

  const updated = await withTransaction(async (connection) => {
    const context = await readWorkoutSetContext(id, userId, connection);
    if (context === null) {
      throw new HttpError(
        404,
        "WORKOUT_SET_NOT_FOUND",
        "Cette série n'existe pas.",
      );
    }
    if (context.status !== "in_progress") {
      throw new HttpError(
        409,
        "WORKOUT_NOT_IN_PROGRESS",
        "Cette séance n'est plus en cours.",
      );
    }
    if (Number(context.is_per_side) !== 1) {
      throw new HttpError(
        422,
        "EXERCISE_NOT_PER_SIDE",
        "Cet exercice ne se fait pas côté par côté.",
      );
    }
    if (
      values.reps === null &&
      values.weight_kg === null &&
      values.duration_seconds === null
    ) {
      throw new HttpError(
        422,
        "EMPTY_SET",
        "Indique au moins une valeur pour valider ce côté.",
      );
    }

    await upsertWorkoutSetSide(id, side, values, connection);
    // Both sides done: the set counts as done (RM-044).
    const sides = await countWorkoutSetSides(id, connection);
    await setWorkoutSetValidated(id, sides >= 2, connection);
    await touchWorkoutSession(context.workout_session_id, connection);

    const row = await readWorkoutSet(id, connection);
    const rows = await readWorkoutSetSidesOfSet(id, connection);
    return row === null ? null : toSetRow(row, rows);
  });

  if (updated === null) {
    throw new HttpError(
      404,
      "WORKOUT_SET_NOT_FOUND",
      "Cette série n'existe pas.",
    );
  }
  res.json(updated);
};
