import * as z from "zod";
import type { AppointmentStatus, WorkoutStatus } from "./appointment.js";
import {
  addDays,
  formatDayMonth,
  formatMonthTitle,
  shiftMonth,
} from "./dates.js";
import type { StatusCode } from "./status.js";
import { dateSchema } from "./validation.js";

// The history (US-35): past sessions, done or not, newest first.

export const HISTORY_PAGE_SIZE = 20;

// --- Filters (US-52) -------------------------------------------------------

// The statuses a line can carry, as the filter panel lists them (SUI-05f).
export const HISTORY_STATUSES = [
  "completed",
  "unfinished",
  "to_confirm",
  "missed",
  "cancelled",
] as const;

export type HistoryStatusFilter = (typeof HISTORY_STATUSES)[number];

export const HISTORY_STATUS_LABELS: Record<HistoryStatusFilter, string> = {
  completed: "Faites",
  unfinished: "Inachevées",
  to_confirm: "À confirmer",
  missed: "Manquées",
  cancelled: "Annulées",
};

export const HISTORY_PERIODS = ["all", "week", "month"] as const;
export type HistoryPeriod = (typeof HISTORY_PERIODS)[number];

export const HISTORY_PERIOD_LABELS: Record<HistoryPeriod, string> = {
  all: "Tout",
  week: "Semaine",
  month: "Mois",
};

// GET /api/history?offset=&period=&date=&program=&statuses=
export const historyQuerySchema = z.object({
  offset: z.coerce
    .number()
    .int()
    .min(0, { error: "Décalage invalide." })
    .default(0),
  period: z.enum(HISTORY_PERIODS).default("all"),
  // The day the period turns around; today when it is missing
  date: dateSchema.optional(),
  // A program id, or "free" for the sessions outside any program
  program: z
    .union([z.literal("free"), z.coerce.number().int().positive()])
    .optional(),
  // "missed,cancelled"
  statuses: z
    .string()
    .optional()
    .transform((value) =>
      value === undefined || value === ""
        ? []
        : value.split(",").map((part) => part.trim()),
    )
    .pipe(z.array(z.enum(HISTORY_STATUSES)).max(HISTORY_STATUSES.length)),
});
export type HistoryQuery = z.output<typeof historyQuerySchema>;

// The first and the last day of the chosen period; null for "Tout"
// (US-41 reuses it for the summary).
export function getPeriodRange(
  period: HistoryPeriod,
  date: string,
): { from: string; to: string } | null {
  if (period === "all") {
    return null;
  }
  if (period === "week") {
    const monday = startOfWeek(date);
    return { from: monday, to: addDays(monday, 6) };
  }
  const month = date.slice(0, 7);
  const last = new Date(
    Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0),
  )
    .toISOString()
    .slice(0, 10);
  return { from: `${month}-01`, to: last };
}

// The day the arrows ‹ › land on, one period before or after.
export function shiftPeriod(
  period: HistoryPeriod,
  date: string,
  direction: -1 | 1,
): string {
  if (period === "week") {
    return addDays(date, direction * 7);
  }
  if (period === "month") {
    return `${shiftMonth(date.slice(0, 7), direction)}-01`;
  }
  return date;
}

// "Semaine du 23 nov.", "Novembre 2026": the title between the arrows.
export function formatPeriodLabel(period: HistoryPeriod, date: string): string {
  if (period === "week") {
    return `Semaine du ${formatDayMonth(startOfWeek(date))}`;
  }
  if (period === "month") {
    return formatMonthTitle(date.slice(0, 7));
  }
  return "Tout";
}

export type HistoryFilters = {
  period: HistoryPeriod;
  date: string;
  program: "free" | number | null;
  statuses: HistoryStatusFilter[];
};

// One chip per active filter, with what removing it gives back (SUI-05g).
export type FilterChip = { key: string; label: string };

export function describeHistoryFilters(
  filters: HistoryFilters,
  programName: string | null,
): FilterChip[] {
  const chips: FilterChip[] = [];
  if (filters.period !== "all") {
    chips.push({
      key: "period",
      label: formatPeriodLabel(filters.period, filters.date),
    });
  }
  if (filters.program === "free") {
    chips.push({ key: "program", label: "Séance libre" });
  } else if (filters.program !== null) {
    chips.push({ key: "program", label: programName ?? "Programme" });
  }
  for (const status of filters.statuses) {
    chips.push({
      key: `status:${status}`,
      label: HISTORY_STATUS_LABELS[status],
    });
  }
  return chips;
}

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
