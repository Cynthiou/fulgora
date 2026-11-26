import type { RequestHandler } from "express";
import {
  type ExerciseProgress,
  formatBestResult,
  type MeasureCode,
  type ProgressExerciseItem,
  type ProgressSet,
} from "shared";
import { HttpError } from "../../utils/httpError.js";
import { readUserId } from "../../utils/requestUser.js";
import { readAvailableExerciseIds } from "../exercise/exerciseRepository.js";
import {
  type DoneExerciseRow,
  type ExerciseHeaderRow,
  type ProgressSetRow,
  readAllDoneSets,
  readDoneExercises,
  readExerciseHeader,
  readExerciseSets,
} from "./progressRepository.js";

// US-39: the progress of an exercise, computed from the sets really done.

// Decimals arrive as text from MySQL.
function toNumber(value: string | null): number | null {
  return value === null ? null : Number(value);
}

function toMeta(row: DoneExerciseRow | ExerciseHeaderRow): string | null {
  const parts = [row.category_name, row.equipment_names].filter(
    (part): part is string => part !== null && part !== "",
  );
  return parts.length === 0 ? null : parts.join(" · ");
}

function toCodes(codes: string | null): MeasureCode[] {
  return codes === null ? [] : (codes.split(",") as MeasureCode[]);
}

function toProgressSet(row: ProgressSetRow): ProgressSet {
  return {
    date: row.date,
    // A session given up gives a dotted point (RM-081)
    is_partial: row.workout_status === "unfinished",
    reps: row.reps_actual,
    weight_kg: toNumber(row.weight_actual_kg),
    duration_seconds: row.duration_actual_seconds,
    distance_meters: toNumber(row.distance_actual_meters),
    speed_kmh: toNumber(row.speed_actual_kmh),
  };
}

// GET /api/progress/exercises?search=: the exercises already done, the
// most recent first, with their best result (SUI-08).
export const browse: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { search } = req.query as { search?: string };
  const needle =
    search === undefined || search.trim() === "" ? null : search.trim();

  const rows = await readDoneExercises(userId, needle);
  const allSets = await readAllDoneSets(userId);
  const items: ProgressExerciseItem[] = [];
  for (const row of rows) {
    const sets = allSets
      .filter((one) => one.exercise_id === row.exercise_id)
      .map(toProgressSet);
    const codes = toCodes(row.measure_codes);
    items.push({
      exercise_id: row.exercise_id,
      name: row.name,
      meta: toMeta(row),
      measure_codes: codes,
      is_bodyweight: Number(row.is_bodyweight) === 1,
      last_date: row.last_date,
      session_count: Number(row.session_count),
      best: formatBestResult(sets, codes, Number(row.is_bodyweight) === 1),
    });
  }
  res.json(items);
};

// GET /api/progress/exercises/:id: every validated set of one exercise
// (SUI-09 to SUI-11). An exercise nobody can see is a 404.
export const read: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { id } = req.params as unknown as { id: number };

  const [available] = await readAvailableExerciseIds(userId, [id]);
  if (available === undefined) {
    throw new HttpError(
      404,
      "EXERCISE_NOT_FOUND",
      "Cet exercice n'existe pas.",
    );
  }

  const header = await readExerciseHeader(id);
  if (header === null) {
    throw new HttpError(
      404,
      "EXERCISE_NOT_FOUND",
      "Cet exercice n'existe pas.",
    );
  }
  const sets = (await readExerciseSets(userId, id)).map(toProgressSet);

  const answer: ExerciseProgress = {
    exercise_id: id,
    name: header.name,
    meta: toMeta(header),
    measure_codes: toCodes(header.measure_codes),
    is_bodyweight: Number(header.is_bodyweight) === 1,
    sets,
  };
  res.json(answer);
};
