import * as z from "zod";
import { dateSchema } from "./validation.js";

// An appointment is a planned session on a date (see data-model.md).
export type AppointmentStatus =
  | "planned"
  | "to_confirm"
  | "missed"
  | "cancelled"
  | "attended";

export type WorkoutStatus = "in_progress" | "completed" | "unfinished";

// One line of GET /api/appointments, as the home page and the planning use it.
export type AppointmentListItem = {
  id: number;
  // "2026-11-26"
  planned_date: string;
  // "07:00", or null when the session has no time ("Sans heure")
  planned_time: string | null;
  status: AppointmentStatus;
  moved_manually: boolean;
  initial_date: string | null;
  session_version_id: number;
  session_name: string;
  // null for a free session (RM-015)
  program: { id: number; name: string } | null;
  block_count: number;
  exercise_count: number;
  // The realized session linked to the appointment, if it was started
  workout_session: {
    id: number;
    status: WorkoutStatus;
    started_at: string;
  } | null;
};

// A planning query covers 62 days at most (two months of calendar).
export const MAX_RANGE_DAYS = 62;

// Number of days from one "YYYY-MM-DD" to another (negative when reversed).
export function countDaysBetween(from: string, to: string): number {
  const fromMs = Date.parse(`${from}T00:00:00Z`);
  const toMs = Date.parse(`${to}T00:00:00Z`);
  return Math.round((toMs - fromMs) / 86_400_000);
}

export const dateRangeSchema = z
  .object({ from: dateSchema, to: dateSchema })
  .refine((range) => countDaysBetween(range.from, range.to) >= 0, {
    error: "La date de fin doit suivre la date de début.",
    path: ["to"],
  })
  .refine((range) => countDaysBetween(range.from, range.to) < MAX_RANGE_DAYS, {
    error: `La période ne peut pas dépasser ${MAX_RANGE_DAYS} jours.`,
    path: ["to"],
  });

export type DateRange = z.output<typeof dateRangeSchema>;

// The sessions of one day: by time, the ones without a time last, then by id.
export function sortDayAppointments<
  T extends { planned_time: string | null; id: number },
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.planned_time === null && b.planned_time !== null) {
      return 1;
    }
    if (a.planned_time !== null && b.planned_time === null) {
      return -1;
    }
    if (a.planned_time !== b.planned_time) {
      return (a.planned_time ?? "") < (b.planned_time ?? "") ? -1 : 1;
    }
    return a.id - b.id;
  });
}

// "18:30:00" (the database TIME) -> "18:30"; null stays null.
export function toHourMinute(time: string | null): string | null {
  return time === null ? null : time.slice(0, 5);
}

// "1 bloc · 3 exercices", "2 blocs · 1 exercice", "0 bloc · 0 exercice".
export function formatSessionContent(
  blockCount: number,
  exerciseCount: number,
): string {
  const blocks = blockCount > 1 ? "blocs" : "bloc";
  const exercises = exerciseCount > 1 ? "exercices" : "exercice";
  return `${blockCount} ${blocks} · ${exerciseCount} ${exercises}`;
}

// "4 aujourd'hui", "1 aujourd'hui" (the selector of the home page).
export function formatTodayCount(count: number): string {
  return `${count} aujourd'hui`;
}
