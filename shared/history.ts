import * as z from "zod";
import type { AppointmentStatus, WorkoutStatus } from "./appointment.js";
import type { StatusCode } from "./status.js";

// The history (US-35): past sessions, done or not, newest first.

export const HISTORY_PAGE_SIZE = 20;

// GET /api/history?offset=
export const historyQuerySchema = z.object({
  offset: z.coerce
    .number()
    .int()
    .min(0, { error: "Décalage invalide." })
    .default(0),
});
export type HistoryQuery = z.output<typeof historyQuerySchema>;

export type HistoryItem = {
  appointment_id: number;
  // The day the line is filed under: the real day for a session done or
  // unfinished, the planned day otherwise (RM-050, RM-082)
  history_date: string;
  planned_date: string;
  planned_time: string | null;
  initial_date: string | null;
  moved_manually: boolean;
  appointment_status: AppointmentStatus;
  session_name: string;
  program_name: string | null;
  workout: { id: number; status: WorkoutStatus; started_at: string } | null;
};

export type HistoryPage = { items: HistoryItem[]; has_more: boolean };

// The status shown on a line: the realized session's when there is one,
// the appointment's otherwise (RM-059).
export function getHistoryStatus(item: HistoryItem): StatusCode {
  if (item.workout !== null && item.workout.status === "completed") {
    return "completed";
  }
  if (item.workout !== null && item.workout.status === "unfinished") {
    return "unfinished";
  }
  switch (item.appointment_status) {
    case "to_confirm":
      return "to_confirm";
    case "missed":
      return "missed";
    case "cancelled":
      return "cancelled";
    default:
      return "planned";
  }
}

// The Monday of the week of a day ("2026-11-26" -> "2026-11-23").
export function startOfWeek(date: string): string {
  const day = new Date(`${date}T00:00:00Z`);
  // getUTCDay: 0 = Sunday; a Sunday belongs to the week of the Monday before
  const shift = (day.getUTCDay() + 6) % 7;
  day.setUTCDate(day.getUTCDate() - shift);
  return day.toISOString().slice(0, 10);
}

export type HistoryWeek = { monday: string; items: HistoryItem[] };

// Groups the lines by week, Monday to Sunday, keeping their order.
export function groupByWeek(items: HistoryItem[]): HistoryWeek[] {
  const weeks: HistoryWeek[] = [];
  for (const item of items) {
    const monday = startOfWeek(item.history_date);
    const last = weeks[weeks.length - 1];
    if (last !== undefined && last.monday === monday) {
      last.items.push(item);
    } else {
      weeks.push({ monday, items: [item] });
    }
  }
  return weeks;
}

// "Semaine du 23 nov." (written in capitals by the style).
export function formatWeekLabel(monday: string): string {
  const text = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  }).format(new Date(`${monday}T00:00:00Z`));
  return `Semaine du ${text}`;
}

// "Jeu 26" for the day badge of a line.
export function formatDayBadge(date: string): { weekday: string; day: number } {
  const weekday = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "UTC",
    weekday: "short",
  })
    .format(new Date(`${date}T00:00:00Z`))
    .replace(".", "");
  return {
    weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1),
    day: Number(date.slice(8, 10)),
  };
}

// "Prévue le 19" when the session was done another day than planned, and
// "↷ déplacée du 21" when it was moved (RM-082).
export function describeHistoryDates(item: HistoryItem): string[] {
  const notes: string[] = [];
  if (item.workout !== null && item.history_date !== item.planned_date) {
    notes.push(`Prévue le ${Number(item.planned_date.slice(8, 10))}`);
  }
  if (item.moved_manually && item.initial_date !== null) {
    notes.push(`↷ déplacée du ${Number(item.initial_date.slice(8, 10))}`);
  }
  return notes;
}
