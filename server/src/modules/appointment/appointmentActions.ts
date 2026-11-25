import type { RequestHandler } from "express";
import {
  type AppointmentDetail,
  type AppointmentListItem,
  type DateRange,
  type FreeSessionCreated,
  type FreeSessionInput,
  getDisallowedSetFields,
  getSetFieldLabel,
  type MeasureCode,
  toHourMinute,
} from "shared";
import { withTransaction } from "../../database/withTransaction.js";
import { HttpError } from "../../utils/httpError.js";
import { readUserId } from "../../utils/requestUser.js";
import {
  readAvailableExerciseIds,
  readExerciseMeasureCodes,
} from "../exercise/exerciseRepository.js";
import {
  createPlannedSet,
  createSessionTemplate,
  createSessionVersion,
  createTemplateBlock,
  createTemplateBlockExercise,
} from "../session-template/sessionTemplateRepository.js";
import {
  type AppointmentRow,
  countVersionContent,
  countWorkoutSetsBySession,
  createAppointment,
  readAppointment,
  readAppointmentsBetween,
  readVersionBlocks,
  readVersionExercises,
  type VersionContentRow,
  type WorkoutSetCountRow,
} from "./appointmentRepository.js";

// Turns a database row into what the client receives.
function toListItem(
  row: AppointmentRow,
  content: VersionContentRow | undefined,
  sets: WorkoutSetCountRow | undefined,
): AppointmentListItem {
  return {
    id: row.id,
    planned_date: row.planned_date,
    planned_time: toHourMinute(row.planned_time),
    status: row.status,
    moved_manually: row.moved_manually === 1,
    initial_date: row.initial_date,
    session_version_id: row.session_version_id,
    session_name: row.session_name,
    program:
      row.program_id === null || row.program_name === null
        ? null
        : { id: row.program_id, name: row.program_name },
    block_count: content?.block_count ?? 0,
    exercise_count: content?.exercise_count ?? 0,
    workout_session:
      row.workout_session_id === null ||
      row.workout_status === null ||
      row.started_at === null
        ? null
        : {
            id: row.workout_session_id,
            status: row.workout_status,
            started_at: row.started_at.toISOString(),
            validated_sets: sets?.validated ?? 0,
            planned_sets: sets?.planned ?? 0,
          },
  };
}

// GET /api/appointments?from=&to=: the user's appointments in the period.
// The query was validated by dateRangeSchema (62 days at most).
export const browse: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { from, to } = req.query as unknown as DateRange;

  const rows = await readAppointmentsBetween(userId, from, to);
  const versionIds = [...new Set(rows.map((row) => row.session_version_id))];
  const contents = await countVersionContent(versionIds);
  const contentByVersion = new Map(
    contents.map((content) => [content.session_version_id, content]),
  );

  const workoutIds = rows
    .map((row) => row.workout_session_id)
    .filter((id): id is number => id !== null);
  const setCounts = await countWorkoutSetsBySession(workoutIds);
  const setsByWorkout = new Map(
    setCounts.map((count) => [count.workout_session_id, count]),
  );

  const items = rows.map((row) =>
    toListItem(
      row,
      contentByVersion.get(row.session_version_id),
      row.workout_session_id === null
        ? undefined
        : setsByWorkout.get(row.workout_session_id),
    ),
  );
  res.json(items);
};

// POST /api/appointments: a free session saved in one go, in a transaction
// (RM-015, RM-018, RM-024). The body was validated by freeSessionSchema. The
// positions are computed here from the order of the lists: 1, 2, 3...
export const createFree: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const payload = req.body as FreeSessionInput;

  const appointmentId = await withTransaction(async (connection) => {
    const exerciseIds = [
      ...new Set(
        payload.blocks.flatMap((block) =>
          block.exercises.map((exercise) => exercise.exercise_id),
        ),
      ),
    ];

    // 1) Every exercise must be visible to this user and not archived (RM-007).
    //    The server never names an exercise it does not own: the client finds
    //    the name in its draft through the field path.
    const available = new Set(
      await readAvailableExerciseIds(userId, exerciseIds, connection),
    );
    payload.blocks.forEach((block, blockIndex) => {
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

    // 2) A set may only hold the measures of its exercise (RM-010).
    const codesByExercise = new Map<number, MeasureCode[]>();
    for (const row of await readExerciseMeasureCodes(exerciseIds, connection)) {
      const codes = codesByExercise.get(row.exercise_id) ?? [];
      codes.push(row.code);
      codesByExercise.set(row.exercise_id, codes);
    }
    payload.blocks.forEach((block, blockIndex) => {
      block.exercises.forEach((exercise, exerciseIndex) => {
        const codes = codesByExercise.get(exercise.exercise_id) ?? [];
        exercise.sets.forEach((set, setIndex) => {
          const [field] = getDisallowedSetFields(set, codes);
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

    // 3) The session and its first version
    const templateId = await createSessionTemplate(
      userId,
      payload.name,
      connection,
    );
    const versionId = await createSessionVersion(templateId, connection);

    // 4) Blocks, exercises and sets, in order
    for (const [blockIndex, block] of payload.blocks.entries()) {
      const blockId = await createTemplateBlock(
        versionId,
        block,
        blockIndex + 1,
        connection,
      );
      for (const [exerciseIndex, exercise] of block.exercises.entries()) {
        const blockExerciseId = await createTemplateBlockExercise(
          blockId,
          exercise.exercise_id,
          exerciseIndex + 1,
          exercise.default_rest_seconds,
          connection,
        );
        for (const [setIndex, set] of exercise.sets.entries()) {
          await createPlannedSet(
            blockExerciseId,
            setIndex + 1,
            set,
            connection,
          );
        }
      }
    }

    // 5) The appointment itself
    return createAppointment(
      userId,
      versionId,
      payload.planned_date,
      payload.planned_time,
      connection,
    );
  });

  const created: FreeSessionCreated = { appointment_id: appointmentId };
  res.status(201).json(created);
};

// GET /api/appointments/:id: one planned session with its blocks and the
// names of its exercises (B1). Another user's appointment answers 404.
export const read: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { id } = req.params as unknown as { id: number };

  const row = await readAppointment(id, userId);
  if (row === null) {
    throw new HttpError(
      404,
      "APPOINTMENT_NOT_FOUND",
      "Cette séance n'existe pas.",
    );
  }
  const blocks = await readVersionBlocks(row.session_version_id);
  const exercises = await readVersionExercises(row.session_version_id);

  const detail: AppointmentDetail = {
    id: row.id,
    planned_date: row.planned_date,
    planned_time: toHourMinute(row.planned_time),
    status: row.status,
    session_name: row.session_name,
    program_name: row.program_name,
    workout_session:
      row.workout_session_id === null || row.workout_status === null
        ? null
        : { id: row.workout_session_id, status: row.workout_status },
    blocks: blocks.map((block) => ({
      id: block.id,
      block_type: block.block_type,
      name: block.name,
      position: block.position,
      exercises: exercises
        .filter((exercise) => exercise.template_block_id === block.id)
        .map((exercise) => ({
          id: exercise.id,
          exercise_id: exercise.exercise_id,
          name: exercise.name,
        })),
    })),
  };
  res.json(detail);
};
