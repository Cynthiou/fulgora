import type { ProgramStatus } from "shared";
import client, {
  type Queryable,
  type Result,
  type Rows,
} from "../../database/client.js";

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
       ORDER BY ws.weekday`,
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
              AS appointment_count
       FROM program p
      WHERE p.owner_user_id = ?
      ORDER BY p.status = 'draft' DESC, p.start_date DESC, p.id DESC`,
    [userId],
  );
  return rows as ProgramListRow[];
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
