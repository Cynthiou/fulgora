import type { RequestHandler } from "express";
import {
  type DeclarationPlan,
  type DeclareDoneInput,
  type MeasureCode,
  todayInParis,
  toHourMinute,
  type WorkoutBlockTree,
} from "shared";
import { withTransaction } from "../../database/withTransaction.js";
import { HttpError } from "../../utils/httpError.js";
import { readUserId } from "../../utils/requestUser.js";
import {
  readAppointment,
  readAppointmentForUpdate,
  readVersionBlocks,
  readVersionExercises,
  readVersionSets,
  updateAppointmentStatus,
} from "../appointment/appointmentRepository.js";
import { markAppointmentNotificationsRead } from "../notification/notificationRepository.js";
import {
  copyPlannedSets,
  copyTemplateBlocks,
  copyTemplateExercises,
  countWorkoutSets,
  createDeclaredWorkoutSession,
  fillDeclaredSet,
  setWorkoutSessionStatus,
} from "./workoutSessionRepository.js";

// US-38: a session done without the app. The plan is shown set by set, the
// user confirms what was really done, and the session is written as if it
// had been recorded that day (RM-050, RM-054, RM-058).

function notFound(): HttpError {
  return new HttpError(
    404,
    "APPOINTMENT_NOT_FOUND",
    "Cette séance n'existe pas.",
  );
}

// Only a session whose day is past and which was never started (RM-054).
function assertDeclarable(status: string): void {
  if (status !== "to_confirm" && status !== "missed") {
    throw new HttpError(
      409,
      "APPOINTMENT_NOT_DECLARABLE",
      "Cette séance ne se déclare pas.",
    );
  }
}

// Decimals arrive as text from MySQL.
function toNumber(value: string | null): number | null {
  return value === null ? null : Number(value);
}

// GET /api/appointments/:id/declaration: the plan of the session, in the
// shape of a realized session so the screens of the workout can be reused.
export const readDeclaration: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { id } = req.params as unknown as { id: number };

  const appointment = await readAppointment(id, userId);
  if (appointment === null) {
    throw notFound();
  }
  assertDeclarable(appointment.status);

  const versionId = appointment.session_version_id;
  const blockRows = await readVersionBlocks(versionId);
  const exerciseRows = await readVersionExercises(versionId);
  const setRows = await readVersionSets(versionId);

  const blocks: WorkoutBlockTree[] = blockRows.map((block) => ({
    id: block.id,
    block_type: block.block_type,
    name: block.name,
    position: block.position,
    instructions: block.instructions,
    planned_rounds: block.planned_rounds,
    time_limit_seconds: block.time_limit_seconds,
    // Nothing was done yet: the session is being declared after the fact
    completed_rounds: null,
    extra_reps: null,
    actual_duration_seconds: null,
    is_added: false,
    sides: [],
    exercises: exerciseRows
      .filter((exercise) => exercise.template_block_id === block.id)
      .map((exercise) => ({
        id: exercise.id,
        exercise_id: exercise.exercise_id,
        position: exercise.position,
        name: exercise.name,
        meta:
          exercise.category_name === null && exercise.equipment_names === null
            ? null
            : [exercise.category_name, exercise.equipment_names]
                .filter((part) => part !== null)
                .join(" · "),
        measure_codes:
          exercise.measure_codes === null
            ? []
            : (exercise.measure_codes.split(",") as MeasureCode[]),
        is_bodyweight: exercise.is_bodyweight === 1,
        is_per_side: Number(exercise.is_per_side) === 1,
        default_rest_seconds: exercise.default_rest_seconds,
        is_added: false,
        sides: [],
        sets: setRows
          .filter((set) => set.template_block_exercise_id === exercise.id)
          .map((set) => ({
            // The planned set itself: the declaration points at it
            id: set.id,
            position: set.position,
            reps_planned: set.reps,
            reps_actual: null,
            weight_planned_kg: toNumber(set.weight_kg),
            weight_actual_kg: null,
            weight_left_planned_kg: toNumber(set.weight_left_kg),
            weight_right_planned_kg: toNumber(set.weight_right_kg),
            duration_planned_seconds: set.duration_seconds,
            duration_actual_seconds: null,
            distance_planned_meters: toNumber(set.distance_meters),
            distance_actual_meters: null,
            speed_planned_kmh: toNumber(set.speed_kmh),
            speed_actual_kmh: null,
            resistance_planned: toNumber(set.resistance),
            resistance_actual: null,
            incline_planned_percent: toNumber(set.incline_percent),
            incline_actual_percent: null,
            calories_planned: toNumber(set.calories),
            calories_actual: null,
            planned_rest_seconds: set.rest_after_seconds,
            validated_at: null,
            updated_at: null,
            is_added: false,
            sides: [],
          })),
      })),
  }));

  const plan: DeclarationPlan = {
    appointment: {
      id: appointment.id,
      planned_date: appointment.planned_date,
      planned_time: toHourMinute(appointment.planned_time),
      session_name: appointment.session_name,
      program_name: appointment.program_name,
      status: appointment.status,
    },
    blocks,
  };
  res.json(plan);
};

// POST /api/appointments/:id/declare-done: the session is written as done
// on the declared date; a set nobody confirmed stays undone (RM-046).
export const declareDone: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { id } = req.params as unknown as { id: number };
  const input = req.body as DeclareDoneInput;

  if (input.actual_date > todayInParis()) {
    throw new HttpError(
      400,
      "DATE_IN_THE_FUTURE",
      "La date réelle ne peut pas être dans le futur.",
    );
  }

  const workoutId = await withTransaction(async (connection) => {
    const appointment = await readAppointmentForUpdate(id, userId, connection);
    if (appointment === null) {
      throw notFound();
    }
    assertDeclarable(appointment.status);

    // The session starts on the declared day, at the planned hour.
    const time = toHourMinute(appointment.planned_time) ?? "12:00";
    const startedAt = `${input.actual_date} ${time}:00`;
    const created = await createDeclaredWorkoutSession(
      id,
      userId,
      startedAt,
      "unfinished",
      connection,
    );
    await copyTemplateBlocks(
      created,
      appointment.session_version_id,
      connection,
    );
    await copyTemplateExercises(created, connection);
    await copyPlannedSets(created, connection);

    for (const set of input.sets) {
      const touched = await fillDeclaredSet(
        created,
        set.planned_set_id,
        set.values,
        connection,
      );
      if (touched === 0) {
        throw new HttpError(
          422,
          "SET_NOT_IN_SESSION",
          "Une série confirmée n'appartient pas à cette séance.",
        );
      }
    }

    // Everything confirmed: the session is finished; otherwise unfinished
    // (RM-046).
    const counts = await countWorkoutSets(created, connection);
    if (counts.planned > 0 && counts.validated === counts.planned) {
      await setWorkoutSessionStatus(created, "completed", connection);
    }
    await updateAppointmentStatus(id, "attended", connection);
    // The reminder has done its job (RM-057).
    await markAppointmentNotificationsRead(
      id,
      ["session_to_confirm", "session_missed"],
      connection,
    );
    return created;
  });

  res.status(201).json({ id: workoutId });
};
