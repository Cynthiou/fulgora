import type { AppointmentStatus, WorkoutStatus } from "shared";
import client, { type Queryable, type Rows } from "../../database/client.js";

// One function, one query. No business rule here: the action decides.

export type HistoryRow = {
  appointment_id: number;
  history_date: string;
  planned_date: string;
  planned_time: string | null;
  initial_date: string | null;
  moved_manually: number;
  appointment_status: AppointmentStatus;
  session_name: string;
  program_name: string | null;
  workout_session_id: number | null;
  workout_status: WorkoutStatus | null;
  started_at: Date | null;
};

// The past sessions of a user (RM-059): done or unfinished (filed under the
// real day), or to confirm, missed, cancelled before today (filed under the
// planned day). Newest first (RM-050, RM-082). LIMIT and OFFSET travel as
// text (common rule 8).
// What the filter panel asks for (US-52). Every piece of SQL below is a
// constant: only the values travel as parameters.
export type HistoryFilterSql = {
  from: string | null;
  to: string | null;
  program: "free" | number | null;
  statuses: string[];
};

// One line per chosen status, as the list shows it (RM-059).
const STATUS_SQL: Record<string, string> = {
  completed: "ws.status = 'completed'",
  unfinished: "ws.status = 'unfinished'",
  to_confirm: "(ws.id IS NULL AND a.status = 'to_confirm')",
  missed: "(ws.id IS NULL AND a.status = 'missed')",
  cancelled: "(ws.id IS NULL AND a.status = 'cancelled')",
};

export async function readHistory(
  userId: number,
  today: string,
  limit: number,
  offset: number,
  filters: HistoryFilterSql = {
    from: null,
    to: null,
    program: null,
    statuses: [],
  },
  db: Queryable = client,
): Promise<HistoryRow[]> {
  const where: string[] = [];
  const params: unknown[] = [userId, today];

  if (filters.from !== null && filters.to !== null) {
    where.push(
      "AND COALESCE(DATE(ws.started_at), a.planned_date) BETWEEN ? AND ?",
    );
    params.push(filters.from, filters.to);
  }
  if (filters.program === "free") {
    where.push("AND a.program_id IS NULL");
  } else if (typeof filters.program === "number") {
    where.push("AND a.program_id = ?");
    params.push(filters.program);
  }
  const chosen = filters.statuses
    .map((status) => STATUS_SQL[status])
    .filter((piece) => piece !== undefined);
  if (chosen.length > 0) {
    where.push(`AND (${chosen.join(" OR ")})`);
  }
  // query, not execute (the pieces above change): LIMIT takes numbers.
  params.push(limit, offset);

  const [rows] = await db.query<Rows[]>(
    `SELECT a.id AS appointment_id,
            COALESCE(DATE(ws.started_at), a.planned_date) AS history_date,
            a.planned_date, a.planned_time, a.initial_date, a.moved_manually,
            a.status AS appointment_status,
            st.name AS session_name, p.name AS program_name,
            ws.id AS workout_session_id, ws.status AS workout_status, ws.started_at
       FROM appointment a
       JOIN session_version sv ON sv.id = a.session_version_id
       JOIN session_template st ON st.id = sv.session_template_id
       LEFT JOIN program p ON p.id = a.program_id
       LEFT JOIN workout_session ws ON ws.appointment_id = a.id
      WHERE a.owner_user_id = ?
        AND (ws.status IN ('completed', 'unfinished')
             OR (ws.id IS NULL
                 AND a.status IN ('to_confirm', 'missed', 'cancelled')
                 AND a.planned_date < ?))
        ${where.join(" ")}
      ORDER BY history_date DESC, a.id DESC
      LIMIT ? OFFSET ?`,
    params,
  );
  return rows as HistoryRow[];
}
