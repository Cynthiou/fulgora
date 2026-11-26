import type { RequestHandler } from "express";
import {
  computeProgramProgress,
  countProgramWeeks,
  dateSchema,
  type ExerciseProgress,
  formatBestResult,
  getComparisonRange,
  getPeriodRange,
  getProgramWeekIndex,
  type MeasureCode,
  type ProgramSummary,
  type ProgressExerciseItem,
  type ProgressSet,
  SUMMARY_PERIODS,
  type SummaryPeriod,
  type TrackingSummary,
  todayInParis,
} from "shared";
import { HttpError } from "../../utils/httpError.js";
import { readUserId } from "../../utils/requestUser.js";
import { buildAppointmentItems } from "../appointment/appointmentActions.js";
import { readAvailableExerciseIds } from "../exercise/exerciseRepository.js";
import {
  readProgram,
  readProgramAppointments,
} from "../program/programRepository.js";
import {
  countAppointmentsByStatus,
  type DoneExerciseRow,
  type ExerciseHeaderRow,
  type ProgressSetRow,
  readAllDoneSets,
  readDoneExercises,
  readExerciseHeader,
  readExerciseSets,
  readMuscleSets,
  readRecentRecords,
  readWorkSessions,
  readWorkTonnage,
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

// GET /api/progress/summary?period=&date=&program_id=: the summary of the
// week, of the month or of a program (US-41).
export const summary: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const query = req.query as {
    period?: string;
    date?: string;
    program_id?: string;
  };
  const period = (query.period ?? "week") as SummaryPeriod;
  if (!SUMMARY_PERIODS.includes(period)) {
    throw new HttpError(400, "PERIOD_INVALID", "Période inconnue.");
  }
  const today = todayInParis();
  const date = query.date ?? today;
  if (!dateSchema.safeParse(date).success) {
    throw new HttpError(400, "DATE_INVALID", "Date invalide.");
  }

  let from = date;
  let to = date;
  let programId: number | null = null;
  let program: ProgramSummary | null = null;

  if (period === "program") {
    programId = Number(query.program_id);
    if (!Number.isInteger(programId) || programId <= 0) {
      throw new HttpError(400, "PROGRAM_INVALID", "Programme inconnu.");
    }
    const row = await readProgram(programId, userId);
    if (row === null) {
      throw new HttpError(
        404,
        "PROGRAM_NOT_FOUND",
        "Ce programme n'existe pas.",
      );
    }
    from = row.start_date;
    to = row.end_date;
    const appointments = await buildAppointmentItems(
      await readProgramAppointments(programId),
    );
    const progress = computeProgramProgress(appointments, today);
    program = {
      id: row.id,
      name: row.name,
      week_index: getProgramWeekIndex(row, today),
      week_count: countProgramWeeks(row.start_date, row.end_date),
      start_date: row.start_date,
      end_date: row.end_date,
      past_count: progress.past,
      done_count: progress.done,
      percent: progress.percent,
    };
  } else {
    const range = getPeriodRange(period, date);
    from = range?.from ?? date;
    to = range?.to ?? date;
  }

  const regularity = await countAppointmentsByStatus(
    userId,
    from,
    to,
    today,
    programId,
  );
  const work = await readWorkSessions(userId, from, to, programId);
  const tonnage = await readWorkTonnage(userId, from, to, programId);

  // A month is compared with the same number of days before (RM-077).
  let comparison: TrackingSummary["comparison"] = null;
  if (period === "month") {
    // A month still running stops at the day looked at (RM-077). Dates
    // are strings: they are compared as text, never as numbers.
    const [until] = [date, to].sort();
    const range = getComparisonRange(from, until ?? to);
    const before = await readWorkSessions(
      userId,
      range.from,
      range.to,
      programId,
    );
    comparison = {
      from: range.from,
      to: range.to,
      work: {
        sessions: before.sessions,
        duration_seconds: before.duration_seconds ?? 0,
        tonnage_kg: await readWorkTonnage(
          userId,
          range.from,
          range.to,
          programId,
        ),
      },
    };
  }

  const records = (await readRecentRecords(userId, from, to)).map((row) => ({
    exercise_id: row.exercise_id,
    name: row.name,
    message: row.message,
    date: row.created_at.toISOString().slice(0, 10),
  }));

  const muscles = (await readMuscleSets(userId, from, to, programId)).map(
    (row) => ({ code: row.code, name: row.name, sets: Number(row.sets) }),
  );

  const answer: TrackingSummary = {
    period,
    from,
    to,
    regularity,
    work: {
      sessions: work.sessions,
      duration_seconds: work.duration_seconds ?? 0,
      tonnage_kg: tonnage,
    },
    comparison,
    records,
    program,
    muscles,
  };
  res.json(answer);
};
