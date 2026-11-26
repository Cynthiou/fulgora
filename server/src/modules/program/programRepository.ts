import type { ProgramStatus } from "shared";
import client, {
  type Queryable,
  type Result,
  type Rows,
} from "../../database/client.js";
import type { AppointmentRow } from "../appointment/appointmentRepository.js";

// One function, one query (US-18). A program holds its period, the days of
// its typical week (weekly_schedule) and one session per day.

export type ProgramRow = {
  id: number;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: ProgramStatus;
};

export async function createProgram(
  userId: number,
  name: string,
  description: string | null,
  startDate: string,
  endDate: string,
  db: Queryable = client,
): Promise<number> {
  const [result] = await db.execute<Result>(
    `INSERT INTO program (owner_user_id, name, description, start_date, end_date, status)
     VALUES (?, ?, ?, ?, ?, 'draft')`,
    [userId, name, description, startDate, endDate],
  );
  return result.insertId;
}

// The program of a user; null for somebody else's (404).
export async function readProgram(
  id: number,
  userId: number,
  db: Queryable = client,
): Promise<ProgramRow | null> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT id, name, description, start_date, end_date, status
       FROM program
      WHERE id = ? AND owner_user_id = ?`,
    [id, userId],
  );
  return (rows[0] as ProgramRow | undefined) ?? null;
}

// The same, locked until the end of the transaction (two creations at once).
export async function readProgramForUpdate(
  id: number,
  userId: number,
  db: Queryable = client,
): Promise<ProgramRow | null> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT id, name, description, start_date, end_date, status
       FROM program
      WHERE id = ? AND owner_user_id = ?
      FOR UPDATE`,
    [id, userId],
  );
  return (rows[0] as ProgramRow | undefined) ?? null;
}

export async function updateProgramInfo(
  id: number,
  name: string,
  description: string | null,
  startDate: string,
  endDate: string,
  db: Queryable = client,
): Promise<void> {
  await db.execute(
    `UPDATE program
        SET name = ?, description = ?, start_date = ?, end_date = ?
      WHERE id = ?`,
    [name, description, startDate, endDate, id],
  );
}

export async function updateProgramStatus(
  id: number,
  status: ProgramStatus,
  db: Queryable = client,
): Promise<void> {
  await db.execute("UPDATE program SET status = ? WHERE id = ?", [status, id]);
}

export type ScheduleRow = {
  id: number;
  weekday: number;
  planned_time: string | null;
  session_template_id: number;
  session_version_id: number;
  name: string;
  exercise_count: number;
  exercise_names: string | null;
};

// The days of the typical week, with the session of each day and what it
// holds. The last version of a session is the one being written (RM-016).
export async function readProgramSchedules(
  programId: number,
  db: Queryable = client,
): Promise<ScheduleRow[]> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT ws.id, ws.weekday, ws.planned_time, ws.session_template_id,
            sv.id AS session_version_id, st.name,
            (SELECT COUNT(*)
               FROM template_block_exercise tbe
               JOIN template_block tb ON tb.id = tbe.template_block_id
              WHERE tb.session_version_id = sv.id) AS exercise_count,
            (SELECT GROUP_CONCAT(e.name ORDER BY tb2.position, tbe2.position SEPARATOR ' · ')
               FROM template_block_exercise tbe2
               JOIN template_block tb2 ON tb2.id = tbe2.template_block_id
               JOIN exercise e ON e.id = tbe2.exercise_id
              WHERE tb2.session_version_id = sv.id) AS exercise_names
       FROM weekly_schedule ws
       JOIN session_template st ON st.id = ws.session_template_id
       JOIN session_version sv ON sv.session_template_id = st.id
       WHERE ws.program_id = ? AND ws.deactivated_at IS NULL
         AND sv.version_number = (SELECT MAX(sv2.version_number)
                                    FROM session_version sv2
                                   WHERE sv2.session_template_id = st.id)
       ORDER BY ws.weekday, ws.planned_time IS NULL, ws.planned_time, ws.id`,
    [programId],
  );
  return rows as ScheduleRow[];
}

export async function createSchedule(
  programId: number,
  sessionTemplateId: number,
  weekday: number,
  plannedTime: string | null,
  db: Queryable = client,
): Promise<number> {
  const [result] = await db.execute<Result>(
    `INSERT INTO weekly_schedule (program_id, session_template_id, weekday, planned_time)
     VALUES (?, ?, ?, ?)`,
    [programId, sessionTemplateId, weekday, plannedTime],
  );
  return result.insertId;
}

// A day dropped from the typical week keeps its history (RM-032): the line
// is deactivated, never deleted.
// One row of the typical week, whatever its program, for the actions
// that work on a single session (US-19).
export async function readSchedule(
  scheduleId: number,
  programId: number,
  db: Queryable = client,
): Promise<ScheduleRow | null> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT ws.id, ws.weekday, ws.planned_time, ws.session_template_id,
            sv.id AS session_version_id, st.name,
            0 AS exercise_count, NULL AS exercise_names
       FROM weekly_schedule ws
       JOIN session_template st ON st.id = ws.session_template_id
       JOIN session_version sv ON sv.session_template_id = st.id
      WHERE ws.id = ? AND ws.program_id = ?
        AND sv.version_number = (SELECT MAX(sv2.version_number)
                                   FROM session_version sv2
                                  WHERE sv2.session_template_id = st.id)`,
    [scheduleId, programId],
  );
  return (rows[0] as ScheduleRow | undefined) ?? null;
}

// Removing a session of the typical week is reversible for a few seconds
// (PRO-03d): the row is only marked, never deleted.
export async function setScheduleRemoved(
  scheduleId: number,
  programId: number,
  isRemoved: boolean,
  db: Queryable = client,
): Promise<boolean> {
  const [result] = await db.execute<Result>(
    `UPDATE weekly_schedule
        SET deactivated_at = ${isRemoved ? "NOW(3)" : "NULL"}
      WHERE id = ? AND program_id = ?`,
    [scheduleId, programId],
  );
  return result.affectedRows === 1;
}

export async function deactivateSchedule(
  id: number,
  db: Queryable = client,
): Promise<void> {
  await db.execute(
    "UPDATE weekly_schedule SET deactivated_at = NOW(3) WHERE id = ?",
    [id],
  );
}

// One appointment of the program, on a day of the period (RM-075).
export async function createProgramAppointment(
  userId: number,
  programId: number,
  scheduleId: number,
  sessionVersionId: number,
  plannedDate: string,
  plannedTime: string | null,
  db: Queryable = client,
): Promise<number> {
  const [result] = await db.execute<Result>(
    `INSERT INTO appointment (owner_user_id, session_version_id, program_id,
        weekly_schedule_id, planned_date, planned_time, status)
     VALUES (?, ?, ?, ?, ?, ?, 'planned')`,
    [userId, sessionVersionId, programId, scheduleId, plannedDate, plannedTime],
  );
  return result.insertId;
}

// Every program of a user, newest first, with what each one holds (US-48).
export type ProgramListRow = ProgramRow & {
  session_count: number;
  ready_count: number;
  appointment_count: number;
  // How many of its appointments are past, and how many were really done
  past_count: number;
  done_count: number;
};

export async function readPrograms(
  userId: number,
  db: Queryable = client,
): Promise<ProgramListRow[]> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT p.id, p.name, p.description, p.start_date, p.end_date, p.status,
            (SELECT COUNT(*) FROM weekly_schedule ws
              WHERE ws.program_id = p.id AND ws.deactivated_at IS NULL)
              AS session_count,
            (SELECT COUNT(*) FROM weekly_schedule ws2
              WHERE ws2.program_id = p.id AND ws2.deactivated_at IS NULL
                AND EXISTS (SELECT 1
                              FROM session_version sv
                              JOIN template_block tb ON tb.session_version_id = sv.id
                              JOIN template_block_exercise tbe
                                ON tbe.template_block_id = tb.id
                             WHERE sv.session_template_id = ws2.session_template_id))
              AS ready_count,
            (SELECT COUNT(*) FROM appointment a WHERE a.program_id = p.id)
              AS appointment_count,
            (SELECT COUNT(*)
               FROM appointment a2
               LEFT JOIN workout_session ws3 ON ws3.appointment_id = a2.id
              WHERE a2.program_id = p.id
                AND (ws3.status IN ('completed','abandoned')
                     OR a2.planned_date < CURDATE()))
              AS past_count,
            (SELECT COUNT(*)
               FROM appointment a3
               JOIN workout_session ws4 ON ws4.appointment_id = a3.id
              WHERE a3.program_id = p.id
                AND ws4.status IN ('completed','abandoned'))
              AS done_count
       FROM program p
      WHERE p.owner_user_id = ?
      ORDER BY p.status = 'draft' DESC, p.start_date DESC, p.id DESC`,
    [userId],
  );
  return rows as ProgramListRow[];
}

// The appointments of a program, oldest first, with the session that was
// really done when there is one (US-48). Same shape as the Planning list.
export async function readProgramAppointments(
  programId: number,
  db: Queryable = client,
): Promise<AppointmentRow[]> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT a.id, a.planned_date, a.planned_time, a.status, a.moved_manually,
            a.initial_date, a.session_version_id,
            st.name AS session_name,
            p.id AS program_id, p.name AS program_name,
            ws.id AS workout_session_id, ws.status AS workout_status,
            ws.started_at
       FROM appointment a
       JOIN session_version sv ON sv.id = a.session_version_id
       JOIN session_template st ON st.id = sv.session_template_id
       JOIN program p ON p.id = a.program_id
       LEFT JOIN workout_session ws ON ws.appointment_id = a.id
      WHERE a.program_id = ?
      ORDER BY a.planned_date, a.planned_time IS NULL, a.planned_time, a.id`,
    [programId],
  );
  return rows as AppointmentRow[];
}

// The programs of a time zone whose start date has come (RM-074).
export async function listProgramsToStart(
  timezone: string,
  today: string,
  db: Queryable = client,
): Promise<number[]> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT p.id
       FROM program p
       JOIN \`user\` u ON u.id = p.owner_user_id
      WHERE u.timezone = ? AND p.status = 'programmed' AND p.start_date <= ?`,
    [timezone, today],
  );
  return rows.map((row) => Number(row.id));
}

// Those whose last day is over (RM-074).
export async function listProgramsToFinish(
  timezone: string,
  today: string,
  db: Queryable = client,
): Promise<number[]> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT p.id
       FROM program p
       JOIN \`user\` u ON u.id = p.owner_user_id
      WHERE u.timezone = ? AND p.status = 'in_progress' AND p.end_date < ?`,
    [timezone, today],
  );
  return rows.map((row) => Number(row.id));
}

// One UPDATE for the whole batch; uses query, not execute, for IN (?).
export async function markProgramsStatus(
  ids: number[],
  status: ProgramStatus,
  db: Queryable = client,
): Promise<number> {
  if (ids.length === 0) {
    return 0;
  }
  const [result] = await db.query<Result>(
    "UPDATE program SET status = ? WHERE id IN (?)",
    [status, ids],
  );
  return result.affectedRows;
}

// The trace of what the watch changed, program by program (US-20).
export async function logProgramStatusChanges(
  ids: number[],
  oldStatus: ProgramStatus,
  newStatus: ProgramStatus,
  db: Queryable = client,
): Promise<void> {
  if (ids.length === 0) {
    return;
  }
  await db.query(
    `INSERT INTO program_change (program_id, change_type, old_value, new_value)
     SELECT p.id, 'status', JSON_OBJECT('status', ?), JSON_OBJECT('status', ?)
       FROM program p
      WHERE p.id IN (?)`,
    [oldStatus, newStatus, ids],
  );
}

// A draft that was never planned can be deleted whole (RM-071).
export async function deleteDraftProgram(
  id: number,
  userId: number,
  db: Queryable = client,
): Promise<boolean> {
  const [result] = await db.execute<Result>(
    "DELETE FROM program WHERE id = ? AND owner_user_id = ? AND status = 'draft'",
    [id, userId],
  );
  return result.affectedRows === 1;
}

export async function deleteProgramSchedules(
  programId: number,
  db: Queryable = client,
): Promise<void> {
  await db.execute("DELETE FROM weekly_schedule WHERE program_id = ?", [
    programId,
  ]);
}

// --- Changing the days, the hours and the end of a program (US-20) ---------

export type ProgramAppointmentRow = {
  id: number;
  weekly_schedule_id: number | null;
  planned_date: string;
  planned_time: string | null;
  moved_manually: number;
  status: string;
  is_started: number;
};

// Every appointment of a program, locked until the end of the transaction:
// the preview and the writing must see the same Planning (RM-031).
export async function readProgramAppointmentsForUpdate(
  programId: number,
  db: Queryable = client,
): Promise<ProgramAppointmentRow[]> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT a.id, a.weekly_schedule_id, a.planned_date, a.planned_time,
            a.moved_manually, a.status,
            EXISTS (SELECT 1 FROM workout_session ws
                     WHERE ws.appointment_id = a.id) AS is_started
       FROM appointment a
      WHERE a.program_id = ?
      ORDER BY a.planned_date, a.id
      FOR UPDATE`,
    [programId],
  );
  return rows as ProgramAppointmentRow[];
}

// An appointment that follows its rule to its new day (US-20). It is not a
// move made by hand: moved_manually stays false (RM-032).
export async function rescheduleAppointment(
  id: number,
  scheduleId: number,
  plannedDate: string,
  plannedTime: string | null,
  db: Queryable = client,
): Promise<void> {
  await db.execute(
    `UPDATE appointment
        SET weekly_schedule_id = ?, planned_date = ?, planned_time = ?
      WHERE id = ?`,
    [scheduleId, plannedDate, plannedTime, id],
  );
}

// An appointment dropped by a shorter program (RM-033). A started session
// is never touched.
export async function cancelProgramAppointment(
  id: number,
  db: Queryable = client,
): Promise<void> {
  await db.execute(
    `UPDATE appointment a
        SET a.status = 'cancelled', a.cancelled_at = NOW(3)
      WHERE a.id = ? AND a.status IN ('planned', 'to_confirm', 'missed')
        AND NOT EXISTS (SELECT 1 FROM workout_session ws
                         WHERE ws.appointment_id = a.id)`,
    [id],
  );
}

// The trace of one change (RM-037): what it was, what it became.
export async function createProgramChange(
  programId: number,
  changeType: string,
  oldValue: unknown,
  newValue: unknown,
  db: Queryable = client,
): Promise<void> {
  await db.execute(
    `INSERT INTO program_change (program_id, change_type, old_value, new_value)
     VALUES (?, ?, ?, ?)`,
    [programId, changeType, JSON.stringify(oldValue), JSON.stringify(newValue)],
  );
}
