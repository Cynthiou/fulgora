import {
  detectNewRecords,
  formatRecordMessage,
  getMeasureProfile,
  type MeasureCode,
  type ProgressSet,
} from "shared";
import type { Queryable } from "../../database/client.js";
import { readExerciseMeasureCodes } from "../exercise/exerciseRepository.js";
import {
  createRecordNotification,
  deleteRecordNotification,
} from "../notification/notificationRepository.js";
import {
  type ProgressSetRow,
  readExerciseNames,
  readPreviousBestSets,
  readSessionSets,
} from "./progressRepository.js";

// US-40: a record is read from the results, never stored (RM-051). At the
// end of a session, and after a correction, every exercise of the session
// is compared with everything done before (RM-080).

function toNumber(value: string | null): number | null {
  return value === null ? null : Number(value);
}

function toProgressSet(row: ProgressSetRow): ProgressSet {
  return {
    date: row.date,
    is_partial: row.workout_status === "unfinished",
    reps: row.reps_actual,
    weight_kg: toNumber(row.weight_actual_kg),
    duration_seconds: row.duration_actual_seconds,
    distance_meters: toNumber(row.distance_actual_meters),
    speed_kmh: toNumber(row.speed_actual_kmh),
  };
}

// Looks at one finished session and writes, or takes back, its record
// notifications. Called at the end of a session (US-34) and after a
// correction (US-37).
export async function updateRecordsForSession(
  userId: number,
  workoutSessionId: number,
  appointmentId: number,
  db?: Queryable,
): Promise<void> {
  const sessionRows = await readSessionSets(workoutSessionId, db);
  const exerciseIds = [...new Set(sessionRows.map((row) => row.exercise_id))];
  if (exerciseIds.length === 0) {
    return;
  }

  const previousRows = await readPreviousBestSets(
    userId,
    exerciseIds,
    workoutSessionId,
    db,
  );
  const exerciseNames = new Map(
    (await readExerciseNames(exerciseIds, db)).map((row) => [row.id, row.name]),
  );
  const codes = new Map<number, MeasureCode[]>();
  for (const row of await readExerciseMeasureCodes(exerciseIds, db)) {
    codes.set(row.exercise_id, [
      ...(codes.get(row.exercise_id) ?? []),
      row.code,
    ]);
  }

  for (const exerciseId of exerciseIds) {
    const sessionSets = sessionRows
      .filter((row) => row.exercise_id === exerciseId)
      .map(toProgressSet);
    const previousSets = previousRows
      .filter((row) => row.exercise_id === exerciseId)
      .map(toProgressSet);
    const profile = getMeasureProfile(codes.get(exerciseId) ?? []);
    const [record] = detectNewRecords(previousSets, sessionSets, profile);

    if (record === undefined) {
      // Corrected downwards, or never a record: no notification (RM-080).
      await deleteRecordNotification(userId, exerciseId, appointmentId, db);
      continue;
    }
    const name = exerciseNames.get(exerciseId) ?? "Exercice";
    await createRecordNotification(
      userId,
      exerciseId,
      appointmentId,
      "Record personnel",
      `${name} · ${formatRecordMessage(record).toLocaleLowerCase("fr-FR")}`,
      db,
    );
  }
}
