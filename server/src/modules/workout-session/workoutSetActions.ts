import type { RequestHandler } from "express";
import {
  type ActualSetValues,
  getDisallowedSetFields,
  getSetFieldLabel,
  isEmptySet,
  type MeasureCode,
} from "shared";
import { withTransaction } from "../../database/withTransaction.js";
import { HttpError } from "../../utils/httpError.js";
import { readUserId } from "../../utils/requestUser.js";
import { readExerciseMeasureCodes } from "../exercise/exerciseRepository.js";
import { toSetRow } from "./workoutSessionActions.js";
import {
  readWorkoutSet,
  readWorkoutSetContext,
  touchWorkoutSession,
  updateWorkoutSetActual,
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
