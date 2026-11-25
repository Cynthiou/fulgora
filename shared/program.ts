import * as z from "zod";
import { addDays, formatLongDate, todayInParis } from "./dates.js";
import { REQUIRED_MESSAGE } from "./user.js";
import { dateSchema, timeSchema } from "./validation.js";

// Programs (US-18, US-48): a period, the days of a typical week, and one
// session per day. The same week repeats over the whole period (RM-075).

export const PROGRAM_STATUSES = [
  "draft",
  "programmed",
  "in_progress",
  "finished",
  "abandoned",
] as const;

export type ProgramStatus = (typeof PROGRAM_STATUSES)[number];

export const PROGRAM_STATUS_LABELS: Record<ProgramStatus, string> = {
  draft: "Brouillon",
  programmed: "À venir",
  in_progress: "En cours",
  finished: "Terminé",
  abandoned: "Abandonné",
};

// ISO weekdays: 1 = Monday ... 7 = Sunday.
export const WEEKDAYS = [
  { value: 1, label: "Lundi", short: "Lun" },
  { value: 2, label: "Mardi", short: "Mar" },
  { value: 3, label: "Mercredi", short: "Mer" },
  { value: 4, label: "Jeudi", short: "Jeu" },
  { value: 5, label: "Vendredi", short: "Ven" },
  { value: 6, label: "Samedi", short: "Sam" },
  { value: 7, label: "Dimanche", short: "Dim" },
] as const;

export const MAX_PROGRAM_WEEKS = 52;

// The ISO weekday of a day ("2026-11-30" -> 1 for Monday).
export function getWeekday(date: string): number {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

export function getWeekdayLabel(weekday: number): string {
  return WEEKDAYS.find((day) => day.value === weekday)?.label ?? "";
}

// "Séance du lundi": the name a new session of the program takes.
export function buildProgramSessionName(weekday: number): string {
  return `Séance du ${getWeekdayLabel(weekday).toLocaleLowerCase("fr-FR")}`;
}

// How many whole weeks the period covers, at least one.
export function countProgramWeeks(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  const days = Math.floor((end - start) / 86_400_000) + 1;
  return Math.max(1, Math.ceil(days / 7));
}

// "6 semaines", "1 semaine".
export function formatWeekCount(startDate: string, endDate: string): string {
  const weeks = countProgramWeeks(startDate, endDate);
  return `${weeks} semaine${weeks > 1 ? "s" : ""}`;
}

// "Lundi · Jeudi · Samedi · 3 jours par semaine".
export function formatWeekdays(weekdays: number[]): string {
  if (weekdays.length === 0) {
    return "Aucun jour choisi";
  }
  const sorted = [...weekdays].sort((a, b) => a - b);
  const names = sorted.map((day) => getWeekdayLabel(day));
  return `${names.join(" · ")} · ${sorted.length} jour${
    sorted.length > 1 ? "s" : ""
  } par semaine`;
}

// Every day of the period falling on one of the chosen weekdays, in order.
// This is what fills the Planning when the program is created (RM-075).
export function listProgramDates(
  startDate: string,
  endDate: string,
  weekdays: number[],
): string[] {
  const chosen = new Set(weekdays);
  const dates: string[] = [];
  let day = startDate;
  // A program lasts 52 weeks at most: the walk always ends.
  while (day <= endDate) {
    if (chosen.has(getWeekday(day))) {
      dates.push(day);
    }
    day = addDays(day, 1);
  }
  return dates;
}

// "du lundi 30 novembre au dimanche 10 janvier" (PRO-06).
export function formatPeriod(startDate: string, endDate: string): string {
  const from = formatLongDate(startDate).toLocaleLowerCase("fr-FR");
  const to = formatLongDate(endDate).toLocaleLowerCase("fr-FR");
  return `du ${from} au ${to}`;
}

// "2 nov. → 27 déc. 2026": the period of a program on its card (PRO-01).
// The year is written once, at the end, or twice when they differ.
export function formatPeriodShort(startDate: string, endDate: string): string {
  const short = (date: string) =>
    new Intl.DateTimeFormat("fr-FR", {
      timeZone: "UTC",
      day: "numeric",
      month: "short",
    }).format(new Date(`${date}T00:00:00Z`));
  const startYear = startDate.slice(0, 4);
  const endYear = endDate.slice(0, 4);
  const from =
    startYear === endYear
      ? short(startDate)
      : `${short(startDate)} ${startYear}`;
  return `${from} → ${short(endDate)} ${endYear}`;
}

// The status a program takes on a date (RM-074); a draft stays a draft.
export function computeProgramStatus(
  program: { status: ProgramStatus; start_date: string; end_date: string },
  today: string,
): ProgramStatus {
  if (
    program.status === "draft" ||
    program.status === "abandoned" ||
    program.status === "finished"
  ) {
    return program.status;
  }
  if (today < program.start_date) {
    return "programmed";
  }
  return today > program.end_date ? "finished" : "in_progress";
}

// --- What the API receives ---------------------------------------------------

// Step 1 of the creation (PRO-02): the period and the days.
export const programInfoSchema = z
  .object({
    name: z
      .string({ error: REQUIRED_MESSAGE })
      .min(1, { error: REQUIRED_MESSAGE })
      .max(160, { error: "160 caractères au maximum." }),
    description: z
      .string()
      .max(2000, { error: "2 000 caractères au maximum." })
      .nullable(),
    start_date: dateSchema,
    end_date: dateSchema,
    weekdays: z
      .array(z.number().int().min(1).max(7))
      .min(1, { error: "Choisis au moins un jour." })
      .max(7),
    planned_time: timeSchema.nullable(),
  })
  .refine((program) => program.end_date >= program.start_date, {
    error: "La fin doit suivre le début.",
    path: ["end_date"],
  })
  .refine(
    (program) =>
      countProgramWeeks(program.start_date, program.end_date) <=
      MAX_PROGRAM_WEEKS,
    {
      error: `${MAX_PROGRAM_WEEKS} semaines au maximum.`,
      path: ["end_date"],
    },
  );

export type ProgramInfoInput = z.output<typeof programInfoSchema>;

// A program draft, with the state of each of its sessions.
export type ProgramSessionSummary = {
  weekday: number;
  session_template_id: number;
  session_version_id: number;
  name: string;
  exercise_count: number;
  // "Squat à la barre · Fentes", or null when nothing is planned yet
  exercise_names: string | null;
};

export type ProgramDetail = {
  id: number;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: ProgramStatus;
  planned_time: string | null;
  sessions: ProgramSessionSummary[];
};

// "2 / 4 séances prêtes" (PRO-03).
export function formatReadySessions(sessions: ProgramSessionSummary[]): string {
  const ready = sessions.filter((session) => session.exercise_count > 0).length;
  return `${ready} / ${sessions.length} séance${
    sessions.length > 1 ? "s prêtes" : " prête"
  }`;
}

// A program only leaves the draft state when every session holds at least
// one exercise (RM-072).
export function canActivateProgram(sessions: ProgramSessionSummary[]): boolean {
  return (
    sessions.length > 0 &&
    sessions.every((session) => session.exercise_count > 0)
  );
}

// The status a new program takes: "À venir" when it starts later, "En
// cours" when it starts today or earlier (US-18).
export function statusAfterCreation(
  startDate: string,
  today: string = todayInParis(),
): Extract<ProgramStatus, "programmed" | "in_progress"> {
  return startDate > today ? "programmed" : "in_progress";
}

export type ProgramCreated = {
  appointment_count: number;
  first_date: string | null;
  last_date: string | null;
  status: ProgramStatus;
};

// The address of a program day: /api/programs/:id/sessions/:weekday
export const programDayParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  weekday: z.coerce.number().int().min(1).max(7),
});
