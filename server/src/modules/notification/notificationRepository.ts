import type { NotificationType } from "shared";
import client, {
  type Queryable,
  type Result,
  type Rows,
} from "../../database/client.js";

// One function, one query. The notifications of a user, and the two writes
// that mark them read (US-46).

export type NotificationRow = {
  id: number;
  type: NotificationType;
  title: string;
  message: string | null;
  created_at: Date;
  read_at: Date | null;
  appointment_id: number | null;
  program_id: number | null;
  exercise_id: number | null;
};

// The notifications of a user, newest first (RM-055). LIMIT and OFFSET
// travel as text through execute, like the history (common rule 8).
export async function readNotifications(
  userId: number,
  limit: number,
  offset: number,
  db: Queryable = client,
): Promise<NotificationRow[]> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT id, \`type\`, title, message, created_at, read_at,
            appointment_id, program_id, exercise_id
       FROM notification
      WHERE user_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?`,
    [userId, String(limit), String(offset)],
  );
  return rows as NotificationRow[];
}

// How many are still unread, for the badge of the bell (NOT-01).
export async function countUnreadNotifications(
  userId: number,
  db: Queryable = client,
): Promise<number> {
  const [rows] = await db.execute<Rows[]>(
    "SELECT COUNT(*) AS total FROM notification WHERE user_id = ? AND read_at IS NULL",
    [userId],
  );
  return Number(rows[0]?.total ?? 0);
}

// Marks one notification read; false when it is not the user's (404).
export async function markNotificationRead(
  id: number,
  userId: number,
  db: Queryable = client,
): Promise<boolean> {
  const [result] = await db.execute<Result>(
    `UPDATE notification SET read_at = COALESCE(read_at, NOW(3))
      WHERE id = ? AND user_id = ?`,
    [id, userId],
  );
  return result.affectedRows === 1;
}

// "Tout marquer lu" (D-05).
export async function markAllNotificationsRead(
  userId: number,
  db: Queryable = client,
): Promise<number> {
  const [result] = await db.execute<Result>(
    `UPDATE notification SET read_at = NOW(3)
      WHERE user_id = ? AND read_at IS NULL`,
    [userId],
  );
  return result.affectedRows;
}

// Marks read the notifications of one appointment, of the given types: an
// answer closes the question (RM-057, RM-067). Uses query for IN (?).
export async function markAppointmentNotificationsRead(
  appointmentId: number,
  types: NotificationType[],
  db: Queryable = client,
): Promise<void> {
  if (types.length === 0) {
    return;
  }
  await db.query(
    `UPDATE notification SET read_at = COALESCE(read_at, NOW(3))
      WHERE appointment_id = ? AND \`type\` IN (?)`,
    [appointmentId, types],
  );
}

// One notification per appointment and per type (RM-056, DT-16): the unique
// index refuses the second one, and "ON DUPLICATE KEY UPDATE id = id" turns
// that refusal into "nothing to do".
export async function createAppointmentNotifications(
  type: Extract<NotificationType, "session_to_confirm" | "session_missed">,
  title: string,
  appointmentIds: number[],
  db: Queryable = client,
): Promise<number> {
  if (appointmentIds.length === 0) {
    return 0;
  }
  const [result] = await db.query<Result>(
    `INSERT INTO notification (user_id, \`type\`, title, message, appointment_id)
     SELECT a.owner_user_id, ?, ?,
            CONCAT(st.name, ' · ', DATE_FORMAT(a.planned_date, '%d/%m/%Y')),
            a.id
       FROM appointment a
       JOIN session_version sv ON sv.id = a.session_version_id
       JOIN session_template st ON st.id = sv.session_template_id
      WHERE a.id IN (?)
     ON DUPLICATE KEY UPDATE notification.id = notification.id`,
    [type, title, appointmentIds],
  );
  return result.affectedRows;
}

// The appointments which just took a status, to notify about them.
export async function listAppointmentsWithStatus(
  timezone: string,
  status: "to_confirm" | "missed",
  db: Queryable = client,
): Promise<number[]> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT a.id
       FROM appointment a
       JOIN \`user\` u ON u.id = a.owner_user_id
      WHERE u.timezone = ? AND a.status = ?`,
    [timezone, status],
  );
  return rows.map((row) => Number(row.id));
}
