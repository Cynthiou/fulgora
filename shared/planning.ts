import {
  type AppointmentListItem,
  getAppointmentStatus,
  isWorkoutOver,
  sortDayAppointments,
} from "./appointment.js";
import { DEFAULT_TIMEZONE, formatDayMonth, todayIn } from "./dates.js";
import type { StatusCode } from "./status.js";

// The Planning (US-24): which day a session belongs to, what a day holds,
// and what a month cell shows.

// A session done another day belongs to the day it was really done (RM-070).
export function getAppointmentDisplayDate(
  item: Pick<AppointmentListItem, "planned_date" | "workout_session">,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  if (item.workout_session === null) {
    return item.planned_date;
  }
  return todayIn(timeZone, new Date(item.workout_session.started_at));
}

// True when the session was done on a day it was not planned for.
export function isDoneAnotherDay(
  item: Pick<AppointmentListItem, "planned_date" | "workout_session">,
  timeZone: string = DEFAULT_TIMEZONE,
): boolean {
  return getAppointmentDisplayDate(item, timeZone) !== item.planned_date;
}

export type DayEntry = {
  item: AppointmentListItem;
  // The greyed line left on the planned day of a session done elsewhere.
  // It opens the same session, and never counts in the day (RM-070).
  isReminder: boolean;
};

// Everything shown on one day: the sessions that belong to it, by time, the
// ones without a time last, then the reminders.
export function buildDayEntries(
  items: AppointmentListItem[],
  day: string,
  timeZone: string = DEFAULT_TIMEZONE,
): DayEntry[] {
  const own = items.filter(
    (item) => getAppointmentDisplayDate(item, timeZone) === day,
  );
  const reminders = items.filter(
    (item) =>
      item.planned_date === day &&
      getAppointmentDisplayDate(item, timeZone) !== day,
  );
  return [
    ...sortDayAppointments(own).map((item) => ({ item, isReminder: false })),
    ...sortDayAppointments(reminders).map((item) => ({
      item,
      isReminder: true,
    })),
  ];
}

// The sessions of the day, reminders left out (RM-070).
export function countDaySessions(entries: DayEntry[]): number {
  return entries.filter((entry) => !entry.isReminder).length;
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count > 1 ? "s" : ""}`;
}

// "4 séances · 1 effectuée", "2 séances à confirmer", "aucune séance".
export function formatDayCount(entries: DayEntry[]): string {
  const sessions = entries
    .filter((entry) => !entry.isReminder)
    .map((entry) => getAppointmentStatus(entry.item));
  if (sessions.length === 0) {
    return "aucune séance";
  }
  const done = sessions.filter((status) => status === "completed").length;
  if (done > 0) {
    return `${plural(sessions.length, "séance")} · ${plural(done, "effectuée")}`;
  }
  if (sessions.every((status) => status === "to_confirm")) {
    return `${plural(sessions.length, "séance")} à confirmer`;
  }
  return plural(sessions.length, "séance");
}

// One square of a day cell: which session it stands for, and its status.
export type DayIndicator = { appointment_id: number; status: StatusCode };

export type MonthCell = {
  // Three indicators at most, in the order of the day
  indicators: DayIndicator[];
  // How many more the cell could not show ("+1")
  extra: number;
  // At least one session was moved by hand (RM-032)
  hasMoved: boolean;
};

export const MAX_DAY_INDICATORS = 3;

// What one cell of the month grid shows (CAL-01). Reminders are left out.
export function buildMonthCell(
  items: AppointmentListItem[],
  day: string,
  timeZone: string = DEFAULT_TIMEZONE,
): MonthCell {
  const sessions = buildDayEntries(items, day, timeZone).filter(
    (entry) => !entry.isReminder,
  );
  return {
    indicators: sessions.slice(0, MAX_DAY_INDICATORS).map((entry) => ({
      appointment_id: entry.item.id,
      status: getAppointmentStatus(entry.item),
    })),
    extra: Math.max(0, sessions.length - MAX_DAY_INDICATORS),
    hasMoved: sessions.some((entry) => entry.item.moved_manually),
  };
}

// The time of a line: the real start for a session done, the planned time
// otherwise, and null when there is none ("—").
export function getEntryTime(
  entry: DayEntry,
  timeZone: string = DEFAULT_TIMEZONE,
): string | null {
  if (entry.isReminder) {
    return null;
  }
  const workout = entry.item.workout_session;
  if (workout === null) {
    return entry.item.planned_time;
  }
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(workout.started_at));
}

// "déplacée du 21", or null when the session kept its date (RM-032).
export function formatMovedFrom(item: AppointmentListItem): string | null {
  if (!item.moved_manually || item.initial_date === null) {
    return null;
  }
  return `déplacée du ${Number(item.initial_date.slice(8, 10))}`;
}

// The line under the name: "Séance libre · prévue le 19 novembre",
// "Effectuée le 17 novembre" for a reminder (CAL-10a, CAL-10c).
export function describeEntry(
  entry: DayEntry,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  const { item } = entry;
  const origin = item.program === null ? "Séance libre" : item.program.name;
  if (entry.isReminder) {
    const realDay = formatDayMonth(getAppointmentDisplayDate(item, timeZone));
    return isWorkoutOver(item)
      ? `Effectuée le ${realDay}`
      : `Commencée le ${realDay}`;
  }
  const parts = [origin];
  if (isDoneAnotherDay(item, timeZone)) {
    parts.push(`prévue le ${formatDayMonth(item.planned_date)}`);
  }
  const moved = formatMovedFrom(item);
  if (moved !== null) {
    parts.push(`↷ ${moved}`);
  }
  return parts.join(" · ");
}
