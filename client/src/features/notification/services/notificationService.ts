import type { NotificationList } from "shared";
import { apiFetch } from "../../../services/api";

// GET /api/notifications: the list and the number of unread ones (US-46).
export function readNotifications(
  signal?: AbortSignal,
): Promise<NotificationList> {
  return apiFetch<NotificationList>("/notifications", { signal });
}

// GET /api/notifications/unread-count: just the badge of the bell.
export function readUnreadCount(
  signal?: AbortSignal,
): Promise<{ unread_count: number }> {
  return apiFetch("/notifications/unread-count", { signal });
}

// PATCH /api/notifications/:id/read: touching a notification reads it.
export function markNotificationRead(
  id: number,
): Promise<{ unread_count: number }> {
  return apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
}

// PATCH /api/notifications/read-all: "Tout marquer lu".
export function markAllNotificationsRead(): Promise<void> {
  return apiFetch("/notifications/read-all", { method: "PATCH" });
}
