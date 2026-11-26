import type { AppointmentStatus, BlockType, WorkoutStatus } from "shared";
import client, {
  type Queryable,
  type Result,
  type Rows,
} from "../../database/client.js";

// One function, one query. No business rule here: the action decides.

export type AppointmentRow = {
  id: number;
  planned_date: string;
  planned_time: string | null;
  status: AppointmentStatus;
  moved_manually: number;
  initial_date: string | null;
  session_version_id: number;
  session_name: string;
  program_id: number | null;
  program_name: string | null;
  workout_session_id: number | null;
  workout_status: WorkoutStatus | null;
  started_at: Date | null;
};

// The appointments of a user planned between two dates (both included), with
// the session name, the program and the realized session when it exists.
// A session done inside the period comes along even when it was planned
// outside: the Planning shows it on the day it was really done (RM-070).
// The realized day is compared in UTC with one day of margin on each side,
// then the client decides the exact day in the user's time zone.
// Sorted by date, then time, the ones without a time last (RM-066).
export async function readAppointmentsBetween(
  userId: number,
  from: string,
  to: string,
  db: Queryable = client,
): Promise<AppointmentRow[]> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT a.id, a.planned_date, a.planned_time, a.status, a.moved_manually,
            a.initial_date, a.session_version_id,
            st.name AS session_name,
            p.id AS program_id, p.name AS program_name,
            ws.id AS workout_session_id, ws.status AS workout_status, ws.started_at
       FROM appointment a
       JOIN session_version sv ON sv.id = a.session_version_id
       JOIN session_template st ON st.id = sv.session_template_id
       LEFT JOIN program p ON p.id = a.program_id
       LEFT JOIN workout_session ws ON ws.appointment_id = a.id
      WHERE a.owner_user_id = ?
        AND (a.planned_date BETWEEN ? AND ?
             OR DATE(ws.started_at) BETWEEN DATE_SUB(?, INTERVAL 1 DAY)
                                        AND DATE_ADD(?, INTERVAL 1 DAY))
      ORDER BY a.planned_date, a.planned_time IS NULL, a.planned_time, a.id`,
    [userId, from, to, from, to],
  );
  return rows as AppointmentRow[];
}

export type VersionContentRow = {
  session_version_id: number;
  block_count: number;
  exercise_count: number;
};

// How many blocks and exercises each session version holds ("1 bloc · 3
// exercices"). A version without any block gives no row. Uses query, not
// execute, because of the list in IN (?) (common rule 8).
export async function countVersionContent(
  versionIds: number[],
  db: Queryable = client,
): Promise<VersionContentRow[]> {
  if (versionIds.length === 0) {
    return [];
  }
  const [rows] = await db.query<Rows[]>(
    `SELECT tb.session_version_id,
            COUNT(DISTINCT tb.id) AS block_count,
            COUNT(tbe.id) AS exercise_count
       FROM template_block tb
       LEFT JOIN template_block_exercise tbe ON tbe.template_block_id = tb.id
      WHERE tb.session_version_id IN (?)
      GROUP BY tb.session_version_id`,
    [versionIds],
  );
  return rows.map((row) => ({
    session_version_id: Number(row.session_version_id),
    block_count: Number(row.block_count),
    exercise_count: Number(row.exercise_count),
  }));
}

// A planned appointment for a session version: a free session has no program
// nor weekly schedule (RM-015).
export async function createAppointment(
  userId: number,
  sessionVersionId: number,
  plannedDate: string,
  plannedTime: string | null,
  db: Queryable = client,
): Promise<number> {
  const [result] = await db.execute<Result>(
    `INSERT INTO appointment (owner_user_id, session_version_id, planned_date, planned_time, status)
     VALUES (?, ?, ?, ?, 'planned')`,
    [userId, sessionVersionId, plannedDate, plannedTime],
  );
  return result.insertId;
}

export type AppointmentLockRow = {
  id: number;
  status: AppointmentStatus;
  session_version_id: number;
  // The hour the session was planned at, or null (US-38)
  planned_time: string | null;
  // null for a free session (RM-015)
  program_id: number | null;
};

// The appointment to start, locked until the transaction ends (FOR UPDATE):
// two starts of the same appointment wait for each other (RM-038).
export async function readAppointmentForUpdate(
  id: number,
  userId: number,
  db: Queryable = client,
): Promise<AppointmentLockRow | null> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT id, status, session_version_id, program_id, planned_time
       FROM appointment
      WHERE id = ? AND owner_user_id = ?
      FOR UPDATE`,
    [id, userId],
  );
  return (rows[0] as AppointmentLockRow | undefined) ?? null;
}

export async function updateAppointmentStatus(
  id: number,
  status: AppointmentStatus,
  db: Queryable = client,
): Promise<void> {
  await db.execute("UPDATE appointment SET status = ? WHERE id = ?", [
    status,
    id,
  ]);
}

export type AppointmentDetailRow = {
  id: number;
  planned_date: string;
  planned_time: string | null;
  status: AppointmentStatus;
  cancelled_at: Date | null;
  initial_date: string | null;
  moved_manually: number;
  session_version_id: number;
  session_name: string;
  program_name: string | null;
  workout_session_id: number | null;
  workout_status: WorkoutStatus | null;
};

// One appointment of the user with its session name; null for another's (404).
export async function readAppointment(
  id: number,
  userId: number,
  db: Queryable = client,
): Promise<AppointmentDetailRow | null> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT a.id, a.planned_date, a.planned_time, a.status, a.cancelled_at,
            a.initial_date, a.moved_manually, a.session_version_id,
            st.name AS session_name, p.name AS program_name,
            ws.id AS workout_session_id, ws.status AS workout_status
       FROM appointment a
       JOIN session_version sv ON sv.id = a.session_version_id
       JOIN session_template st ON st.id = sv.session_template_id
       LEFT JOIN program p ON p.id = a.program_id
       LEFT JOIN workout_session ws ON ws.appointment_id = a.id
      WHERE a.id = ? AND a.owner_user_id = ?`,
    [id, userId],
  );
  return (rows[0] as AppointmentDetailRow | undefined) ?? null;
}

export type VersionBlockRow = {
  id: number;
  block_type: BlockType;
  name: string | null;
  position: number;
  instructions: string | null;
};

// The blocks of a session version, in order (B1, and the editor of US-17).
export async function readVersionBlocks(
  versionId: number,
  db: Queryable = client,
): Promise<VersionBlockRow[]> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT id, block_type, name, position, instructions
       FROM template_block
      WHERE session_version_id = ?
      ORDER BY position`,
    [versionId],
  );
  return rows as VersionBlockRow[];
}

export type VersionExerciseRow = {
  id: number;
  template_block_id: number;
  exercise_id: number;
  position: number;
  default_rest_seconds: number | null;
  name: string;
  category_name: string | null;
  equipment_names: string | null;
  // "reps,weight" or null
  measure_codes: string | null;
  is_bodyweight: number;
};

// The exercises of a session version with their names, group, equipment and
// measures, in order (B1, SUI-06b).
export async function readVersionExercises(
  versionId: number,
  db: Queryable = client,
): Promise<VersionExerciseRow[]> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT tbe.id, tbe.template_block_id, tbe.exercise_id, tbe.position,
            tbe.default_rest_seconds, e.name,
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
       FROM template_block_exercise tbe
       JOIN template_block tb ON tb.id = tbe.template_block_id
       JOIN exercise e ON e.id = tbe.exercise_id
      WHERE tb.session_version_id = ?
      ORDER BY tb.position, tbe.position`,
    [versionId],
  );
  return rows as VersionExerciseRow[];
}

export type VersionSetRow = {
  // The planned set itself: the declaration points at it (US-38)
  id: number;
  template_block_exercise_id: number;
  position: number;
  reps: number | null;
  weight_kg: string | null;
  duration_seconds: number | null;
  distance_meters: string | null;
  speed_kmh: string | null;
  resistance: string | null;
  incline_percent: string | null;
  calories: string | null;
  rest_after_seconds: number | null;
};

// The planned sets of a session version, in order (history of a session
// never started, RM-058). Decimals arrive as text from MySQL.
export async function readVersionSets(
  versionId: number,
  db: Queryable = client,
): Promise<VersionSetRow[]> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT ps.id, ps.template_block_exercise_id, ps.position, ps.reps, ps.weight_kg,
            ps.duration_seconds, ps.distance_meters, ps.speed_kmh, ps.resistance,
            ps.incline_percent, ps.calories, ps.rest_after_seconds
       FROM planned_set ps
       JOIN template_block_exercise tbe ON tbe.id = ps.template_block_exercise_id
       JOIN template_block tb ON tb.id = tbe.template_block_id
      WHERE tb.session_version_id = ?
      ORDER BY tb.position, tbe.position, ps.position`,
    [versionId],
  );
  return rows as VersionSetRow[];
}

export type WorkoutSetCountRow = {
  workout_session_id: number;
  planned: number;
  validated: number;
};

// "17 / 18 séries" for several realized sessions at once. Uses query, not
// execute, because of the list in IN (?) (common rule 8).
export async function countWorkoutSetsBySession(
  workoutSessionIds: number[],
  db: Queryable = client,
): Promise<WorkoutSetCountRow[]> {
  if (workoutSessionIds.length === 0) {
    return [];
  }
  const [rows] = await db.query<Rows[]>(
    `SELECT wb.workout_session_id,
            COUNT(*) AS planned,
            COUNT(wset.validated_at) AS validated
       FROM workout_set wset
       JOIN workout_exercise we ON we.id = wset.workout_exercise_id
       JOIN workout_block wb ON wb.id = we.workout_block_id
      WHERE wb.workout_session_id IN (?)
      GROUP BY wb.workout_session_id`,
    [workoutSessionIds],
  );
  return rows.map((row) => ({
    workout_session_id: Number(row.workout_session_id),
    planned: Number(row.planned),
    validated: Number(row.validated),
  }));
}

// Points several appointments at a new version of their session (RM-029).
// Uses query, not execute, because of the list in IN (?) (common rule 8).
export async function updateAppointmentsVersion(
  ids: number[],
  sessionVersionId: number,
  db: Queryable = client,
): Promise<void> {
  if (ids.length === 0) {
    return;
  }
  await db.query(
    "UPDATE appointment SET session_version_id = ? WHERE id IN (?)",
    [sessionVersionId, ids],
  );
}

// Cancels a planned appointment, and says whether it did (RM-035). The
// conditions live in the query itself: a started, done or already cancelled
// appointment changes nothing, and the action then reads the row to know
// whether it must answer 404 or 409.
export async function cancelAppointment(
  id: number,
  userId: number,
  db: Queryable = client,
): Promise<boolean> {
  const [result] = await db.execute<Result>(
    `UPDATE appointment a
        SET a.status = 'cancelled', a.cancelled_at = NOW(3)
      WHERE a.id = ? AND a.owner_user_id = ?
        AND a.status IN ('planned', 'to_confirm', 'missed')
        AND NOT EXISTS (SELECT 1 FROM workout_session ws
                         WHERE ws.appointment_id = a.id)`,
    [id, userId],
  );
  return result.affectedRows === 1;
}

// Moves an appointment to another day (US-25). The first move remembers the
// date it was planned for, the next ones keep that first one (RM-032).
export async function moveAppointment(
  id: number,
  plannedDate: string,
  plannedTime: string | null,
  status: AppointmentStatus,
  db: Queryable = client,
): Promise<void> {
  await db.execute(
    `UPDATE appointment
        SET initial_date = COALESCE(initial_date, planned_date),
            planned_date = ?,
            planned_time = ?,
            moved_manually = TRUE,
            status = ?,
            cancelled_at = NULL
      WHERE id = ?`,
    [plannedDate, plannedTime, status, id],
  );
}

// --- Past sessions: to confirm, then missed (US-27) -------------------------

// The time zones of the users, to compute "today" where they live (D-12).
export async function listUserTimezones(
  db: Queryable = client,
): Promise<string[]> {
  const [rows] = await db.execute<Rows[]>(
    "SELECT DISTINCT timezone FROM `user`",
  );
  return rows.map((row) => String(row.timezone));
}

// A planned session whose day is past waits for an answer (RM-052). A
// session that was started is never touched (RM-053).
export async function markPastAppointmentsToConfirm(
  timezone: string,
  today: string,
  db: Queryable = client,
): Promise<number> {
  const [result] = await db.execute<Result>(
    `UPDATE appointment a
       JOIN \`user\` u ON u.id = a.owner_user_id
        SET a.status = 'to_confirm'
      WHERE u.timezone = ?
        AND a.status = 'planned'
        AND a.planned_date < ?
        AND NOT EXISTS (SELECT 1 FROM workout_session ws
                         WHERE ws.appointment_id = a.id)`,
    [timezone, today],
  );
  return result.affectedRows;
}

// Without an answer for 72 hours, the session is missed (RM-052).
export async function markUnansweredAppointmentsMissed(
  timezone: string,
  lastDay: string,
  db: Queryable = client,
): Promise<number> {
  const [result] = await db.execute<Result>(
    `UPDATE appointment a
       JOIN \`user\` u ON u.id = a.owner_user_id
        SET a.status = 'missed'
      WHERE u.timezone = ?
        AND a.status = 'to_confirm'
        AND a.planned_date <= ?
        AND NOT EXISTS (SELECT 1 FROM workout_session ws
                         WHERE ws.appointment_id = a.id)`,
    [timezone, lastDay],
  );
  return result.affectedRows;
}

// "Pas faite" (RM-067): the session goes to missed right away. Says whether
// it did, so the action can answer 404 or 409.
export async function markAppointmentNotDone(
  id: number,
  userId: number,
  db: Queryable = client,
): Promise<boolean> {
  const [result] = await db.execute<Result>(
    `UPDATE appointment a
        SET a.status = 'missed'
      WHERE a.id = ? AND a.owner_user_id = ?
        AND a.status IN ('to_confirm', 'planned')
        AND NOT EXISTS (SELECT 1 FROM workout_session ws
                         WHERE ws.appointment_id = a.id)`,
    [id, userId],
  );
  return result.affectedRows === 1;
}
