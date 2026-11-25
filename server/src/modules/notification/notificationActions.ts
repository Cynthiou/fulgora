import type { RequestHandler } from "express";
import type { NotificationItem, NotificationList } from "shared";
import { HttpError } from "../../utils/httpError.js";
import { readUserId } from "../../utils/requestUser.js";
import {
  countUnreadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRow,
  readNotifications,
} from "./notificationRepository.js";

// How many notifications one page holds.
const PAGE_SIZE = 50;

function toItem(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    created_at: row.created_at.toISOString(),
    read_at: row.read_at === null ? null : row.read_at.toISOString(),
    appointment_id: row.appointment_id,
    program_id: row.program_id,
    exercise_id: row.exercise_id,
  };
}

// GET /api/notifications: the list, newest first, with the unread count.
export const browse: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const rows = await readNotifications(userId, PAGE_SIZE, 0);
  const answer: NotificationList = {
    items: rows.map(toItem),
    unread_count: await countUnreadNotifications(userId),
  };
  res.json(answer);
};

// GET /api/notifications/unread-count: just the badge of the bell.
export const readUnreadCount: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  res.json({ unread_count: await countUnreadNotifications(userId) });
};

// PATCH /api/notifications/:id/read: touching a notification reads it.
export const markRead: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { id } = req.params as unknown as { id: number };

  const done = await markNotificationRead(id, userId);
  if (!done) {
    throw new HttpError(
      404,
      "NOTIFICATION_NOT_FOUND",
      "Cette notification n'existe pas.",
    );
  }
  res.json({ unread_count: await countUnreadNotifications(userId) });
};

// PATCH /api/notifications/read-all: "Tout marquer lu" (D-05).
export const markAllRead: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  await markAllNotificationsRead(userId);
  res.status(204).end();
};
