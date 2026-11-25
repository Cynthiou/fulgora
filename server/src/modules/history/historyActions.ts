import type { RequestHandler } from "express";
import {
  HISTORY_PAGE_SIZE,
  type HistoryItem,
  type HistoryPage,
  type HistoryQuery,
  todayInParis,
  toHourMinute,
} from "shared";
import { readUserId } from "../../utils/requestUser.js";
import { type HistoryRow, readHistory } from "./historyRepository.js";

function toItem(row: HistoryRow): HistoryItem {
  return {
    appointment_id: row.appointment_id,
    history_date: row.history_date,
    planned_date: row.planned_date,
    planned_time: toHourMinute(row.planned_time),
    initial_date: row.initial_date,
    moved_manually: row.moved_manually === 1,
    appointment_status: row.appointment_status,
    session_name: row.session_name,
    program_name: row.program_name,
    workout:
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

// GET /api/history?offset=: 20 past sessions, newest first. One extra row is
// asked for, to know whether more remain (has_more) without a second query.
export const browse: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { offset } = req.query as unknown as HistoryQuery;

  const rows = await readHistory(
    userId,
    todayInParis(),
    HISTORY_PAGE_SIZE + 1,
    offset,
  );
  const page: HistoryPage = {
    items: rows.slice(0, HISTORY_PAGE_SIZE).map(toItem),
    has_more: rows.length > HISTORY_PAGE_SIZE,
  };
  res.json(page);
};
