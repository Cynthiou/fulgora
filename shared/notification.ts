import { DEFAULT_TIMEZONE } from "./dates.js";

// The four kinds of notification the app sends (RM-055).
export const NOTIFICATION_TYPES = [
  "session_to_confirm",
  "session_missed",
  "program_finished",
  "personal_record",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// The symbol and the title of each kind. A symbol and a word, never a colour
// alone (RM-064).
export const NOTIFICATION_LABELS: Record<
  NotificationType,
  { title: string; symbol: string }
> = {
  session_to_confirm: { title: "Séance à confirmer", symbol: "□" },
  session_missed: { title: "Séance manquée", symbol: "×" },
  program_finished: { title: "Programme terminé", symbol: "⚑" },
  personal_record: { title: "Record personnel", symbol: "★" },
};

export type NotificationItem = {
  id: number;
  type: NotificationType;
  title: string;
  message: string | null;
  // ISO date-time
  created_at: string;
  read_at: string | null;
  appointment_id: number | null;
  program_id: number | null;
  exercise_id: number | null;
};

export type NotificationList = {
  items: NotificationItem[];
  unread_count: number;
};

// "9+" beyond nine, so the badge of the bell stays small (NOT-01).
export function formatUnreadCount(count: number): string {
  return count > 9 ? "9+" : String(count);
}

// "Notifications, 3 non lues", for the screen reader.
export function describeBell(count: number): string {
  if (count === 0) {
    return "Notifications";
  }
  return `Notifications, ${count} non lue${count > 1 ? "s" : ""}`;
}

// "25 nov." next to a notification, read in the user's time zone.
export function formatNotificationDate(
  moment: string,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone,
    day: "numeric",
    month: "short",
  }).format(new Date(moment));
}

export type NotificationGroup = "week" | "older";

// "Cette semaine" holds the last seven days, the rest is "Plus anciennes".
export function getNotificationGroup(
  createdAt: string,
  now: Date = new Date(),
): NotificationGroup {
  const age = now.getTime() - new Date(createdAt).getTime();
  return age < 7 * 24 * 60 * 60 * 1000 ? "week" : "older";
}

export const NOTIFICATION_GROUP_LABELS: Record<NotificationGroup, string> = {
  week: "Cette semaine",
  older: "Plus anciennes",
};

// Where a notification leads when it is touched; null when nothing can be
// opened yet (the program and record screens arrive later).
export function getNotificationLink(item: NotificationItem): string | null {
  // A record opens the progress of its exercise (US-40, NOT-06).
  if (item.type === "personal_record" && item.exercise_id !== null) {
    return `/suivi/exercices/${item.exercise_id}?record=1`;
  }
  if (item.appointment_id !== null) {
    return `/seances/${item.appointment_id}`;
  }
  if (item.program_id !== null) {
    return `/programmes/${item.program_id}`;
  }
  return null;
}
