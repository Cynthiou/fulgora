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
      WHERE a.owner_user_id = ? AND a.planned_date BETWEEN ? AND ?
      ORDER BY a.planned_date, a.planned_time IS NULL, a.planned_time, a.id`,
    [userId, from, to],
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
};

// The appointment to start, locked until the transaction ends (FOR UPDATE):
// two starts of the same appointment wait for each other (RM-038).
export async function readAppointmentForUpdate(
  id: number,
  userId: number,
  db: Queryable = client,
): Promise<AppointmentLockRow | null> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT id, status, session_version_id
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
    `SELECT a.id, a.planned_date, a.planned_time, a.status, a.session_version_id,
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
};

// The blocks of a session version, in order (B1).
export async function readVersionBlocks(
  versionId: number,
  db: Queryable = client,
): Promise<VersionBlockRow[]> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT id, block_type, name, position
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
  name: string;
};

// The exercises of a session version with their names, in order (B1).
export async function readVersionExercises(
  versionId: number,
  db: Queryable = client,
): Promise<VersionExerciseRow[]> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT tbe.id, tbe.template_block_id, tbe.exercise_id, tbe.position, e.name
       FROM template_block_exercise tbe
       JOIN template_block tb ON tb.id = tbe.template_block_id
       JOIN exercise e ON e.id = tbe.exercise_id
      WHERE tb.session_version_id = ?
      ORDER BY tb.position, tbe.position`,
    [versionId],
  );
  return rows as VersionExerciseRow[];
}
