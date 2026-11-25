import type { RequestHandler } from "express";
import {
  HISTORY_PAGE_SIZE,
  type HistoryAppointment,
  type HistoryDetail,
  type HistoryItem,
  type HistoryPage,
  type HistoryQuery,
  type MeasureCode,
  type PlannedBlock,
  todayInParis,
  toHourMinute,
} from "shared";
import { HttpError } from "../../utils/httpError.js";
import { readUserId } from "../../utils/requestUser.js";
import {
  readAppointment,
  readVersionBlocks,
  readVersionExercises,
  readVersionSets,
} from "../appointment/appointmentRepository.js";
import { buildTree } from "../workout-session/workoutSessionActions.js";
import { type HistoryRow, readHistory } from "./historyRepository.js";

function toItem(row: HistoryRow): HistoryItem {
  return {
    appointment_id: row.appointment_id,
    history_date: row.history_date,
    planned_date: row.planned_date,
    planned_time: toHourMinute(row.planned_time),
    initial_date: row.initial_date,
    moved_manually: row.moved_manually === 1,
    appointment_status: row.appointment_status,
    session_name: row.session_name,
    program_name: row.program_name,
    workout:
      row.workout_session_id === null ||
      row.workout_status === null ||
      row.started_at === null
        ? null
        : {
            id: row.workout_session_id,
            status: row.workout_status,
            started_at: row.started_at.toISOString(),
          },
  };
}

// GET /api/history?offset=: 20 past sessions, newest first. One extra row is
// asked for, to know whether more remain (has_more) without a second query.
export const browse: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { offset } = req.query as unknown as HistoryQuery;

  const rows = await readHistory(
    userId,
    todayInParis(),
    HISTORY_PAGE_SIZE + 1,
    offset,
  );
  const page: HistoryPage = {
    items: rows.slice(0, HISTORY_PAGE_SIZE).map(toItem),
    has_more: rows.length > HISTORY_PAGE_SIZE,
  };
  res.json(page);
};

function toNumber(value: string | number | null): number | null {
  return value === null ? null : Number(value);
}

// GET /api/history/:appointmentId: a past session. Started: the realized
// tree (plan copied at the start and results, RM-047). Never started: the
// plan of its original version (RM-058). Another user's: 404.
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
  const appointment: HistoryAppointment = {
    id: row.id,
    planned_date: row.planned_date,
    planned_time: toHourMinute(row.planned_time),
    status: row.status,
    session_name: row.session_name,
    program_name: row.program_name,
  };

  if (row.workout_session_id !== null) {
    const workout = await buildTree(row.workout_session_id, userId);
    if (workout === null) {
      throw new HttpError(
        404,
        "APPOINTMENT_NOT_FOUND",
        "Cette séance n'existe pas.",
      );
    }
    const detail: HistoryDetail = { kind: "done", appointment, workout };
    res.json(detail);
    return;
  }

  const blocks = await readVersionBlocks(row.session_version_id);
  const exercises = await readVersionExercises(row.session_version_id);
  const sets = await readVersionSets(row.session_version_id);
  const plannedBlocks: PlannedBlock[] = blocks.map((block) => ({
    id: block.id,
    block_type: block.block_type,
    name: block.name,
    position: block.position,
    exercises: exercises
      .filter((exercise) => exercise.template_block_id === block.id)
      .map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        meta:
          [exercise.category_name, exercise.equipment_names]
            .filter((part) => part !== null)
            .join(" · ") || null,
        measure_codes:
          exercise.measure_codes === null
            ? []
            : (exercise.measure_codes.split(",") as MeasureCode[]),
        default_rest_seconds: exercise.default_rest_seconds,
        sets: sets
          .filter((set) => set.template_block_exercise_id === exercise.id)
          .map((set) => ({
            reps: set.reps,
            weight_kg: toNumber(set.weight_kg),
            duration_seconds: set.duration_seconds,
            distance_meters: toNumber(set.distance_meters),
            speed_kmh: toNumber(set.speed_kmh),
            resistance: toNumber(set.resistance),
            incline_percent: toNumber(set.incline_percent),
            calories: toNumber(set.calories),
            rest_after_seconds: set.rest_after_seconds,
          })),
      })),
  }));
  const detail: HistoryDetail = {
    kind: "planned_only",
    appointment,
    blocks: plannedBlocks,
  };
  res.json(detail);
};
