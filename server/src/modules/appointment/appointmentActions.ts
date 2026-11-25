import type { RequestHandler } from "express";
import { type AppointmentListItem, type DateRange, toHourMinute } from "shared";
import { readUserId } from "../../utils/requestUser.js";
import {
  type AppointmentRow,
  countVersionContent,
  readAppointmentsBetween,
  type VersionContentRow,
} from "./appointmentRepository.js";

// Turns a database row into what the client receives.
function toListItem(
  row: AppointmentRow,
  content: VersionContentRow | undefined,
): AppointmentListItem {
  return {
    id: row.id,
    planned_date: row.planned_date,
    planned_time: toHourMinute(row.planned_time),
    status: row.status,
    moved_manually: row.moved_manually === 1,
    initial_date: row.initial_date,
    session_version_id: row.session_version_id,
    session_name: row.session_name,
    program:
      row.program_id === null || row.program_name === null
        ? null
        : { id: row.program_id, name: row.program_name },
    block_count: content?.block_count ?? 0,
    exercise_count: content?.exercise_count ?? 0,
    workout_session:
      row.workout_session_id === null ||
      row.workout_status === null ||
      row.started_at === null
        ? null
        : {
            id: row.workout_session_id,
            status: row.workout_status,
            started_at: row.started_at.toISOString(),
          },
  };
}

// GET /api/appointments?from=&to=: the user's appointments in the period.
// The query was validated by dateRangeSchema (62 days at most).
export const browse: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { from, to } = req.query as unknown as DateRange;

  const rows = await readAppointmentsBetween(userId, from, to);
  const versionIds = [...new Set(rows.map((row) => row.session_version_id))];
  const contents = await countVersionContent(versionIds);
  const contentByVersion = new Map(
    contents.map((content) => [content.session_version_id, content]),
  );

  const items = rows.map((row) =>
    toListItem(row, contentByVersion.get(row.session_version_id)),
  );
  res.json(items);
};
