import * as z from "zod";
import { type AppointmentListItem, isWorkoutOver } from "./appointment.js";
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
  // The row of the typical week this session comes from
  schedule_id: number;
  weekday: number;
  // "07:00", or null when the session has no hour
  planned_time: string | null;
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

// --- Several sessions on the same day (US-19) ------------------------------

// How many appointments a program would hold: one per session of the
// typical week, for every matching day of the period (RM-075).
export function countProgramAppointments(
  startDate: string,
  endDate: string,
  sessions: { weekday: number }[],
): number {
  const perWeekday = new Map<number, number>();
  for (const session of sessions) {
    perWeekday.set(session.weekday, (perWeekday.get(session.weekday) ?? 0) + 1);
  }
  return listProgramDates(startDate, endDate, [...perWeekday.keys()]).reduce(
    (total, date) => total + (perWeekday.get(getWeekday(date)) ?? 0),
    0,
  );
}

// "Ajoute 6 rendez-vous de plus (1 par semaine) : le total passe de 24 à
// 30." (PRO-03a). Returns null when nothing would change.
export function describeAddedSessions(
  startDate: string,
  endDate: string,
  sessions: { weekday: number }[],
  weekday: number,
): string | null {
  const before = countProgramAppointments(startDate, endDate, sessions);
  const after = countProgramAppointments(startDate, endDate, [
    ...sessions,
    { weekday },
  ]);
  const added = after - before;
  if (added <= 0) {
    return null;
  }
  return `Ajoute ${added} rendez-vous de plus (1 par semaine) : le total passe de ${before} à ${after}.`;
}

// "« Cardio » et « Mobilité », avec leurs blocs et exercices. Le programme
// passe de 24 à 12 rendez-vous." (PRO-03b)
export function describeRemovedDay(
  startDate: string,
  endDate: string,
  sessions: { weekday: number; name: string }[],
  weekday: number,
): { title: string; detail: string } | null {
  const removed = sessions.filter((session) => session.weekday === weekday);
  if (removed.length === 0) {
    return null;
  }
  const kept = sessions.filter((session) => session.weekday !== weekday);
  const before = countProgramAppointments(startDate, endDate, sessions);
  const after = countProgramAppointments(startDate, endDate, kept);
  const names = removed.map((session) => `« ${session.name} »`);
  const list =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(", ")} et ${names[names.length - 1]}`;
  return {
    title: `${getWeekdayLabel(weekday)} décoché : ${removed.length} séance${
      removed.length > 1 ? "s" : ""
    } ${removed.length > 1 ? "seront retirées" : "sera retirée"}`,
    detail: `${list}, avec leurs blocs et exercices. Le programme passe de ${before} à ${after} rendez-vous.`,
  };
}

// "Le lundi aura 2 séances : « Haut du corps » à 18:30 et celle-ci."
export function describeDayAfterAdding(
  sessions: { weekday: number; name: string; planned_time: string | null }[],
  weekday: number,
): string | null {
  const sameDay = sessions.filter((session) => session.weekday === weekday);
  if (sameDay.length === 0) {
    return null;
  }
  const names = sameDay.map(
    (session) =>
      `« ${session.name} »${
        session.planned_time === null ? "" : ` à ${session.planned_time}`
      }`,
  );
  const list =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(", ")} et ${names[names.length - 1]}`;
  return `Le ${getWeekdayLabel(weekday).toLocaleLowerCase(
    "fr-FR",
  )} aura ${sameDay.length + 1} séances : ${list} et celle-ci.`;
}

// The name of a session of a program, asked when it is added (PRO-03a).
export const programSessionSchema = z.object({
  weekday: z.number().int().min(1).max(7),
  name: z
    .string()
    .trim()
    .min(1, REQUIRED_MESSAGE)
    .max(160, "160 caractères au maximum."),
  planned_time: timeSchema.nullable(),
});

export type ProgramSessionInput = z.output<typeof programSessionSchema>;

// The address of one session of a program: /api/programs/:id/sessions/:sid
export const programSessionParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  scheduleId: z.coerce.number().int().positive(),
});

// --- Seeing a program (US-48) ----------------------------------------------

// A program and its appointments, as the detail screen reads them.
export type ProgramDetailFull = ProgramDetail & {
  appointments: AppointmentListItem[];
};

export type ProgramProgress = {
  // How many appointments the program holds
  total: number;
  // Those whose day is over (or which were done)
  past: number;
  // Those really done
  done: number;
  // 0 to 100, on the whole program
  percent: number;
};

// "6 / 12 séances passées · 3 faites" (PRO-07). A session done in advance
// counts as past, whatever its planned day (RM-070).
export function computeProgramProgress(
  appointments: AppointmentListItem[],
  today: string = todayInParis(),
): ProgramProgress {
  const total = appointments.length;
  const done = appointments.filter((item) => isWorkoutOver(item)).length;
  const past = appointments.filter(
    (item) => isWorkoutOver(item) || item.planned_date < today,
  ).length;
  return {
    total,
    past,
    done,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

export function formatProgramProgress(progress: ProgramProgress): string {
  return `${progress.past} / ${progress.total} séances passées · ${progress.done} faite${
    progress.done > 1 ? "s" : ""
  }`;
}

export type ProgramWeek = {
  // 1 for the first week of the program
  index: number;
  // The first and the last day of the week, inside the period
  from: string;
  to: string;
  items: AppointmentListItem[];
  // "done": every session of the week is done; "missed": none is, and the
  // week is over; "current": today falls in it; "coming": still ahead.
  state: "done" | "missed" | "partial" | "current" | "coming";
};

// The weeks of a program, from its start date, with their sessions (PRO-07).
export function groupProgramWeeks(
  program: { start_date: string; end_date: string },
  appointments: AppointmentListItem[],
  today: string = todayInParis(),
): ProgramWeek[] {
  const weeks: ProgramWeek[] = [];
  const count = countProgramWeeks(program.start_date, program.end_date);
  for (let index = 0; index < count; index += 1) {
    const from = addDays(program.start_date, index * 7);
    const to = addDays(from, 6);
    const items = appointments.filter(
      (item) => item.planned_date >= from && item.planned_date <= to,
    );
    const done = items.filter((item) => isWorkoutOver(item)).length;
    const isOver = to < today;
    const isCurrent = from <= today && today <= to;
    const state: ProgramWeek["state"] =
      items.length > 0 && done === items.length
        ? "done"
        : isCurrent
          ? "current"
          : isOver
            ? done === 0
              ? "missed"
              : "partial"
            : "coming";
    weeks.push({ index: index + 1, from, to, items, state });
  }
  return weeks;
}

// Which week of the program a day belongs to (1 for the first one), or null
// when the day is outside the period.
export function getProgramWeekIndex(
  program: { start_date: string; end_date: string },
  day: string,
): number | null {
  if (day < program.start_date || day > program.end_date) {
    return null;
  }
  const start = Date.parse(`${program.start_date}T00:00:00Z`);
  const date = Date.parse(`${day}T00:00:00Z`);
  return Math.floor((date - start) / 86_400_000 / 7) + 1;
}

export type ProgramActions = {
  // Change the period, the days or a session (US-19, US-20)
  canEdit: boolean;
  // Give up the rest of the program (US-21)
  canAbandon: boolean;
  // Throw the program away, with everything it holds (US-21)
  canDelete: boolean;
  // Build a new program from this one (US-22)
  canReuse: boolean;
};

// What the "⋯" menu offers, state by state (PRO-07b). The menu shows
// "Abandonner" or "Supprimer", never both: a program nobody has started
// disappears whole, one already lived is given up and kept (US-21). A
// session in progress holds the program until it ends (RM-034).
export function getAvailableProgramActions(
  program: { status: ProgramStatus },
  hasInProgressSession = false,
  startedCount = 0,
): ProgramActions {
  const { status } = program;
  const isRunning = status === "programmed" || status === "in_progress";
  return {
    canEdit: status === "draft" || isRunning,
    canAbandon: isRunning && startedCount > 0 && !hasInProgressSession,
    canDelete: status === "draft" || (isRunning && startedCount === 0),
    canReuse: status === "finished" || status === "abandoned",
  };
}

// --- Stopping a program (US-21) --------------------------------------------

// "26 nov., 3, 10, 17 et 25 déc.": the month is written only when it
// changes, and the last date comes after "et" (PRO-11).
export function formatDateList(dates: string[]): string {
  const month = (date: string) =>
    new Intl.DateTimeFormat("fr-FR", {
      timeZone: "UTC",
      month: "short",
    }).format(new Date(`${date}T00:00:00Z`));
  const written = dates.map((date, index) => {
    const next = dates[index + 1];
    const day = Number(date.slice(8, 10));
    return next !== undefined && month(next) === month(date)
      ? `${day}`
      : `${day} ${month(date)}`;
  });
  if (written.length <= 1) {
    return written.join("");
  }
  return `${written.slice(0, -1).join(", ")} et ${written.at(-1)}`;
}

// "Les 5 séances à venir (26 nov., 3, 10, 17 et 25 déc.) seront annulées.
// Tes 3 séances passées et leurs résultats sont conservés." (PRO-11)
export function describeAbandon(
  futureDates: string[],
  pastCount: number,
): string {
  const future =
    futureDates.length === 0
      ? "Aucune séance à venir ne sera annulée."
      : futureDates.length === 1
        ? `La séance à venir (${formatDateList(futureDates)}) sera annulée.`
        : `Les ${futureDates.length} séances à venir (${formatDateList(
            futureDates,
          )}) seront annulées.`;
  const past =
    pastCount === 0
      ? "Rien de ce qui est passé ne change."
      : pastCount === 1
        ? "Ta séance passée et ses résultats sont conservés."
        : `Tes ${pastCount} séances passées et leurs résultats sont conservés.`;
  return `${future} ${past}`;
}

// "Aucune séance n'a été démarrée. Les 24 séances prévues seront retirées
// du Planning." (PRO-11c)
export function describeProgramDeletion(count: number): string {
  if (count === 0) {
    return "Aucune séance n'a été démarrée. Ce programme n'a rien mis dans le Planning.";
  }
  return count === 1
    ? "Aucune séance n'a été démarrée. La séance prévue sera retirée du Planning."
    : `Aucune séance n'a été démarrée. Les ${count} séances prévues seront retirées du Planning.`;
}

// "16 séances prévues · 88 % réalisées" (PRO-13).
export function formatProgramReview(progress: ProgramProgress): string {
  return `${progress.total} séances prévues · ${progress.percent} % réalisées`;
}
