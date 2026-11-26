import client, { type Queryable, type Rows } from "../../database/client.js";

// US-39: what an exercise has really done, session after session. One
// function, one query; everything else is computed in shared (RM-051).

export type DoneExerciseRow = {
  exercise_id: number;
  name: string;
  category_name: string | null;
  equipment_names: string | null;
  measure_codes: string | null;
  is_bodyweight: number;
  last_date: string;
  session_count: number;
};

// The exercises the user has already done, the most recent first. The
// search looks at the name only (SUI-08).
export async function readDoneExercises(
  userId: number,
  search: string | null,
  db: Queryable = client,
): Promise<DoneExerciseRow[]> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT e.id AS exercise_id, e.name,
            (SELECT c.name FROM exercise_category ec JOIN category c ON c.id = ec.category_id
              WHERE ec.exercise_id = e.id ORDER BY c.id LIMIT 1) AS category_name,
            (SELECT GROUP_CONCAT(eq.name ORDER BY eq.name SEPARATOR ' · ')
               FROM exercise_equipment ee JOIN equipment eq ON eq.id = ee.equipment_id
              WHERE ee.exercise_id = e.id) AS equipment_names,
            (SELECT GROUP_CONCAT(m.code ORDER BY m.id SEPARATOR ',')
               FROM exercise_measure em JOIN measure m ON m.id = em.measure_id
              WHERE em.exercise_id = e.id) AS measure_codes,
            EXISTS (SELECT 1 FROM exercise_equipment ee2
                      JOIN equipment eq2 ON eq2.id = ee2.equipment_id
                     WHERE ee2.exercise_id = e.id AND eq2.code = 'bodyweight') AS is_bodyweight,
            MAX(DATE(ws.started_at)) AS last_date,
            COUNT(DISTINCT DATE(ws.started_at)) AS session_count
       FROM workout_set wset
       JOIN workout_exercise we ON we.id = wset.workout_exercise_id
       JOIN workout_block wb ON wb.id = we.workout_block_id
       JOIN workout_session ws ON ws.id = wb.workout_session_id
       JOIN exercise e ON e.id = we.exercise_id
      WHERE ws.owner_user_id = ?
        AND ws.status IN ('completed', 'unfinished')
        AND wset.validated_at IS NOT NULL
        AND (? IS NULL OR e.name LIKE CONCAT('%', ?, '%'))
      GROUP BY e.id, e.name
      ORDER BY last_date DESC, e.name`,
    [userId, search, search],
  );
  return rows as DoneExerciseRow[];
}

export type ProgressSetRow = {
  date: string;
  workout_status: string;
  reps_actual: number | null;
  weight_actual_kg: string | null;
  duration_actual_seconds: number | null;
  distance_actual_meters: string | null;
  speed_actual_kmh: string | null;
};

// Every validated set of one exercise, oldest first, with the day of the
// session and whether it was given up (RM-081).
export async function readExerciseSets(
  userId: number,
  exerciseId: number,
  db: Queryable = client,
): Promise<ProgressSetRow[]> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT DATE(ws.started_at) AS date, ws.status AS workout_status,
            wset.reps_actual, wset.weight_actual_kg, wset.duration_actual_seconds,
            wset.distance_actual_meters, wset.speed_actual_kmh
       FROM workout_set wset
       JOIN workout_exercise we ON we.id = wset.workout_exercise_id
       JOIN workout_block wb ON wb.id = we.workout_block_id
       JOIN workout_session ws ON ws.id = wb.workout_session_id
      WHERE ws.owner_user_id = ? AND we.exercise_id = ?
        AND ws.status IN ('completed', 'unfinished')
        AND wset.validated_at IS NOT NULL
      ORDER BY ws.started_at, wset.id`,
    [userId, exerciseId],
  );
  return rows as ProgressSetRow[];
}

// Every validated set of the user, exercise by exercise: the list of
// SUI-08 needs the best result of each one without asking once per row.
export async function readAllDoneSets(
  userId: number,
  db: Queryable = client,
): Promise<(ProgressSetRow & { exercise_id: number })[]> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT we.exercise_id, DATE(ws.started_at) AS date,
            ws.status AS workout_status,
            wset.reps_actual, wset.weight_actual_kg, wset.duration_actual_seconds,
            wset.distance_actual_meters, wset.speed_actual_kmh
       FROM workout_set wset
       JOIN workout_exercise we ON we.id = wset.workout_exercise_id
       JOIN workout_block wb ON wb.id = we.workout_block_id
       JOIN workout_session ws ON ws.id = wb.workout_session_id
      WHERE ws.owner_user_id = ?
        AND ws.status IN ('completed', 'unfinished')
        AND wset.validated_at IS NOT NULL
      ORDER BY ws.started_at, wset.id`,
    [userId],
  );
  return rows as (ProgressSetRow & { exercise_id: number })[];
}

export type ExerciseHeaderRow = {
  id: number;
  name: string;
  category_name: string | null;
  equipment_names: string | null;
  measure_codes: string | null;
  is_bodyweight: number;
};

// The name and the measures of one exercise, whether it was ever done or
// not (SUI-10b).
export async function readExerciseHeader(
  exerciseId: number,
  db: Queryable = client,
): Promise<ExerciseHeaderRow | null> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT e.id, e.name,
            (SELECT c.name FROM exercise_category ec JOIN category c ON c.id = ec.category_id
              WHERE ec.exercise_id = e.id ORDER BY c.id LIMIT 1) AS category_name,
            (SELECT GROUP_CONCAT(eq.name ORDER BY eq.name SEPARATOR ' · ')
               FROM exercise_equipment ee JOIN equipment eq ON eq.id = ee.equipment_id
              WHERE ee.exercise_id = e.id) AS equipment_names,
            (SELECT GROUP_CONCAT(m.code ORDER BY m.id SEPARATOR ',')
               FROM exercise_measure em JOIN measure m ON m.id = em.measure_id
              WHERE em.exercise_id = e.id) AS measure_codes,
            EXISTS (SELECT 1 FROM exercise_equipment ee2
                      JOIN equipment eq2 ON eq2.id = ee2.equipment_id
                     WHERE ee2.exercise_id = e.id AND eq2.code = 'bodyweight') AS is_bodyweight
       FROM exercise e
      WHERE e.id = ?`,
    [exerciseId],
  );
  return (rows[0] as ExerciseHeaderRow | undefined) ?? null;
}

// --- Records (US-40) -------------------------------------------------------

// The validated sets of one session, exercise by exercise.
export async function readSessionSets(
  workoutSessionId: number,
  db: Queryable = client,
): Promise<(ProgressSetRow & { exercise_id: number })[]> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT we.exercise_id, DATE(ws.started_at) AS date,
            ws.status AS workout_status,
            wset.reps_actual, wset.weight_actual_kg, wset.duration_actual_seconds,
            wset.distance_actual_meters, wset.speed_actual_kmh
       FROM workout_set wset
       JOIN workout_exercise we ON we.id = wset.workout_exercise_id
       JOIN workout_block wb ON wb.id = we.workout_block_id
       JOIN workout_session ws ON ws.id = wb.workout_session_id
      WHERE wb.workout_session_id = ? AND wset.validated_at IS NOT NULL
      ORDER BY wset.id`,
    [workoutSessionId],
  );
  return rows as (ProgressSetRow & { exercise_id: number })[];
}

// Everything done on those exercises before, outside the session being
// looked at: what a record has to beat (RM-080).
export async function readPreviousBestSets(
  userId: number,
  exerciseIds: number[],
  excludeSessionId: number,
  db: Queryable = client,
): Promise<(ProgressSetRow & { exercise_id: number })[]> {
  if (exerciseIds.length === 0) {
    return [];
  }
  const [rows] = await db.query<Rows[]>(
    `SELECT we.exercise_id, DATE(ws.started_at) AS date,
            ws.status AS workout_status,
            wset.reps_actual, wset.weight_actual_kg, wset.duration_actual_seconds,
            wset.distance_actual_meters, wset.speed_actual_kmh
       FROM workout_set wset
       JOIN workout_exercise we ON we.id = wset.workout_exercise_id
       JOIN workout_block wb ON wb.id = we.workout_block_id
       JOIN workout_session ws ON ws.id = wb.workout_session_id
      WHERE ws.owner_user_id = ? AND we.exercise_id IN (?)
        AND ws.id <> ? AND ws.status IN ('completed', 'unfinished')
        AND wset.validated_at IS NOT NULL`,
    [userId, exerciseIds, excludeSessionId],
  );
  return rows as (ProgressSetRow & { exercise_id: number })[];
}

// The records of a period, newest first, for the summary (SUI-02).
export type RecentRecordRow = {
  exercise_id: number;
  name: string;
  message: string | null;
  created_at: Date;
};

export async function readRecentRecords(
  userId: number,
  from: string,
  to: string,
  db: Queryable = client,
): Promise<RecentRecordRow[]> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT n.exercise_id, e.name, n.message, n.created_at
       FROM notification n
       JOIN exercise e ON e.id = n.exercise_id
      WHERE n.user_id = ? AND n.type = 'personal_record'
        AND DATE(n.created_at) BETWEEN ? AND ?
      ORDER BY n.created_at DESC`,
    [userId, from, to],
  );
  return rows as RecentRecordRow[];
}

// The names of a few exercises, for the message of a record (NOT-06).
export async function readExerciseNames(
  exerciseIds: number[],
  db: Queryable = client,
): Promise<{ id: number; name: string }[]> {
  if (exerciseIds.length === 0) {
    return [];
  }
  const [rows] = await db.query<Rows[]>(
    "SELECT id, name FROM exercise WHERE id IN (?)",
    [exerciseIds],
  );
  return rows as { id: number; name: string }[];
}
