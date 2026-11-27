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

export type LastSetRow = {
  position: number;
  reps_actual: number | null;
  weight_actual_kg: string | null;
  duration_actual_seconds: number | null;
  distance_actual_meters: string | null;
  speed_actual_kmh: string | null;
  resistance_actual: string | null;
  incline_actual_percent: string | null;
  calories_actual: string | null;
};

// The validated sets of the last session this exercise was really done
// in, in their order ("Dernière fois" of the handoff des séries). The
// subquery names that session; everything else reads its rows.
export async function readLastDoneSets(
  userId: number,
  exerciseId: number,
  db: Queryable = client,
): Promise<LastSetRow[]> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT wset.position, wset.reps_actual, wset.weight_actual_kg,
            wset.duration_actual_seconds, wset.distance_actual_meters,
            wset.speed_actual_kmh, wset.resistance_actual,
            wset.incline_actual_percent, wset.calories_actual
       FROM workout_set wset
       JOIN workout_exercise we ON we.id = wset.workout_exercise_id
       JOIN workout_block wb ON wb.id = we.workout_block_id
      WHERE we.exercise_id = ? AND wset.validated_at IS NOT NULL
        AND wb.workout_session_id = (
          SELECT wb2.workout_session_id
            FROM workout_set wset2
            JOIN workout_exercise we2 ON we2.id = wset2.workout_exercise_id
            JOIN workout_block wb2 ON wb2.id = we2.workout_block_id
            JOIN workout_session ws2 ON ws2.id = wb2.workout_session_id
           WHERE ws2.owner_user_id = ? AND we2.exercise_id = ?
             AND ws2.status = 'completed'
             AND wset2.validated_at IS NOT NULL
           ORDER BY ws2.started_at DESC
           LIMIT 1
        )
      ORDER BY wset.position`,
    [exerciseId, userId, exerciseId],
  );
  return rows as LastSetRow[];
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

// --- Summary of the tracking (US-41) ---------------------------------------

export type RegularityRow = {
  planned: number;
  done: number;
  unfinished: number;
  to_confirm: number;
  missed: number;
  cancelled: number;
  upcoming: number;
  moved: number;
};

// Every appointment of the period, counted once (RM-076). One query, one
// line per category, so the sum always matches the total.
export async function countAppointmentsByStatus(
  userId: number,
  from: string,
  to: string,
  today: string,
  programId: number | null,
  db: Queryable = client,
): Promise<RegularityRow> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT COUNT(*) AS planned,
            SUM(ws.status = 'completed') AS done,
            SUM(ws.status = 'unfinished') AS unfinished,
            SUM(ws.id IS NULL AND a.status = 'to_confirm') AS to_confirm,
            SUM(ws.id IS NULL AND a.status = 'missed') AS missed,
            SUM(ws.id IS NULL AND a.status = 'cancelled') AS cancelled,
            SUM(ws.id IS NULL AND a.status IN ('planned', 'attended')
                AND a.planned_date >= ?) AS upcoming,
            SUM(a.moved_manually) AS moved
       FROM appointment a
       LEFT JOIN workout_session ws ON ws.appointment_id = a.id
      WHERE a.owner_user_id = ?
        AND COALESCE(DATE(ws.started_at), a.planned_date) BETWEEN ? AND ?
        AND (? IS NULL OR a.program_id = ?)`,
    [today, userId, from, to, programId, programId],
  );
  const row = rows[0] as Record<string, number | null> | undefined;
  const read = (key: string) => Number(row?.[key] ?? 0);
  return {
    planned: read("planned"),
    done: read("done"),
    unfinished: read("unfinished"),
    to_confirm: read("to_confirm"),
    missed: read("missed"),
    cancelled: read("cancelled"),
    upcoming: read("upcoming"),
    moved: read("moved"),
  };
}

export type WorkRow = {
  sessions: number;
  duration_seconds: number | null;
};

// The sessions really done over the period, and the time they took.
export async function readWorkSessions(
  userId: number,
  from: string,
  to: string,
  programId: number | null,
  db: Queryable = client,
): Promise<WorkRow> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT COUNT(*) AS sessions,
            SUM(TIMESTAMPDIFF(SECOND, ws.started_at,
                COALESCE(ws.ended_at, ws.last_activity_at))) AS duration_seconds
       FROM workout_session ws
       JOIN appointment a ON a.id = ws.appointment_id
      WHERE ws.owner_user_id = ?
        AND ws.status IN ('completed', 'unfinished')
        AND DATE(ws.started_at) BETWEEN ? AND ?
        AND (? IS NULL OR a.program_id = ?)`,
    [userId, from, to, programId, programId],
  );
  const row = rows[0] as { sessions: number; duration_seconds: string | null };
  return {
    sessions: Number(row?.sessions ?? 0),
    duration_seconds:
      row?.duration_seconds === null || row?.duration_seconds === undefined
        ? null
        : Number(row.duration_seconds),
  };
}

// The kilograms moved over the period (RM-051): computed, never stored.
export async function readWorkTonnage(
  userId: number,
  from: string,
  to: string,
  programId: number | null,
  db: Queryable = client,
): Promise<number | null> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT SUM(wset.reps_actual * wset.weight_actual_kg) AS tonnage
       FROM workout_set wset
       JOIN workout_exercise we ON we.id = wset.workout_exercise_id
       JOIN workout_block wb ON wb.id = we.workout_block_id
       JOIN workout_session ws ON ws.id = wb.workout_session_id
       JOIN appointment a ON a.id = ws.appointment_id
      WHERE ws.owner_user_id = ?
        AND ws.status IN ('completed', 'unfinished')
        AND wset.validated_at IS NOT NULL
        AND DATE(ws.started_at) BETWEEN ? AND ?
        AND (? IS NULL OR a.program_id = ?)`,
    [userId, from, to, programId, programId],
  );
  const tonnage = (rows[0] as { tonnage: string | null } | undefined)?.tonnage;
  return tonnage === null || tonnage === undefined ? null : Number(tonnage);
}

// --- Worked muscles (US-50) ------------------------------------------------

export type MuscleSetsRow = {
  code: string;
  name: string;
  sets: string;
};

// Sets per muscle over a period: a main muscle counts one set, a
// secondary one counts a half (RM-078). Cardio and stretching exercises
// are left out (D-19).
export async function readMuscleSets(
  userId: number,
  from: string,
  to: string,
  programId: number | null,
  db: Queryable = client,
): Promise<MuscleSetsRow[]> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT m.code, m.name,
            SUM(CASE em.role WHEN 'primary' THEN 1 ELSE 0.5 END) AS sets
       FROM workout_set wset
       JOIN workout_exercise we ON we.id = wset.workout_exercise_id
       JOIN workout_block wb ON wb.id = we.workout_block_id
       JOIN workout_session ws ON ws.id = wb.workout_session_id
       JOIN appointment a ON a.id = ws.appointment_id
       JOIN exercise_muscle em ON em.exercise_id = we.exercise_id
       JOIN muscle m ON m.id = em.muscle_id
      WHERE ws.owner_user_id = ?
        AND ws.status IN ('completed', 'unfinished')
        AND wset.validated_at IS NOT NULL
        AND DATE(ws.started_at) BETWEEN ? AND ?
        AND (? IS NULL OR a.program_id = ?)
        AND NOT EXISTS (SELECT 1 FROM exercise_category ec
                          JOIN category c ON c.id = ec.category_id
                         WHERE ec.exercise_id = we.exercise_id
                           AND c.code IN ('cardio', 'stretching'))
      GROUP BY m.id, m.code, m.name
      ORDER BY sets DESC, m.name`,
    [userId, from, to, programId, programId],
  );
  return rows as MuscleSetsRow[];
}
