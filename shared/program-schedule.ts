import { z } from "zod";
import { toHourMinute } from "./appointment.js";
import { addDays, formatShortDayMonth } from "./dates.js";
import { getWeekday, getWeekdayLabel, listProgramDates } from "./program.js";
import { REQUIRED_MESSAGE } from "./user.js";
import { dateSchema, timeSchema } from "./validation.js";

// US-20: changing the day, the hour or the end of a running program. The
// whole plan is computed here, by one pure function, so the preview shown
// before validating and what the server writes can never differ.

// One line of the typical week, as the screen sends it back (PRO-08).
export type ScheduleWish = {
  schedule_id: number;
  weekday: number;
  planned_time: string | null;
};

// One line of the typical week as it stands today.
export type ScheduleNow = ScheduleWish & { name: string };

// One appointment the program already put in the Planning.
export type ProgramAppointment = {
  id: number;
  schedule_id: number | null;
  planned_date: string;
  planned_time: string | null;
  moved_manually: boolean;
  status: string;
  // True once the session has been started (it never moves, RM-032)
  is_started: boolean;
};

export type MovedAppointment = {
  appointment_id: number;
  schedule_id: number;
  from_date: string;
  to_date: string;
  to_time: string | null;
};

export type CreatedAppointment = {
  schedule_id: number;
  planned_date: string;
  planned_time: string | null;
};

export type CancelledAppointment = {
  appointment_id: number;
  planned_date: string;
};

export type SchedulePlan = {
  moved: MovedAppointment[];
  created: CreatedAppointment[];
  cancelled: CancelledAppointment[];
  // What stays as it is, said in French (PRO-08)
  notes: string[];
};

// "5 → 21 nov." when both days share a month, "28 nov. → 3 déc." if not:
// the range of the past sessions (PRO-08).
function formatDayRange(first: string, last: string): string {
  const month = (date: string) =>
    new Intl.DateTimeFormat("fr-FR", {
      timeZone: "UTC",
      month: "short",
    }).format(new Date(`${date}T00:00:00Z`));
  const day = (date: string) => Number(date.slice(8, 10));
  return month(first) === month(last)
    ? `${day(first)} → ${day(last)} ${month(last)}`
    : `${day(first)} ${month(first)} → ${day(last)} ${month(last)}`;
}

// The Monday of the week holding a day: appointments are paired week by
// week, so a session never jumps from one week to another.
function mondayOf(date: string): string {
  return addDays(date, 1 - getWeekday(date));
}

// "10:00", or nothing when the session has no hour.
function timeSuffix(time: string | null): string {
  return time === null ? "" : ` · ${toHourMinute(time)}`;
}

// "Sam 28 nov. → Dim 29 nov. · 10:00" (PRO-08).
export function formatMovedAppointment(moved: MovedAppointment): string {
  return `${formatShortDayMonth(moved.from_date)} → ${formatShortDayMonth(
    moved.to_date,
  )}${timeSuffix(moved.to_time)}`;
}

// "Dim 6 déc. · 10:00", the date of an appointment that did not exist.
export function formatPlannedAppointment(
  appointment: CreatedAppointment,
): string {
  return `${formatShortDayMonth(appointment.planned_date)}${timeSuffix(
    appointment.planned_time,
  )}`;
}

// How many appointments the change touches, the number of PRO-08.
export function countPlanChanges(plan: SchedulePlan): number {
  return plan.moved.length + plan.created.length + plan.cancelled.length;
}

type PlanInput = {
  // The period after the change; the start never moves (US-20)
  start_date: string;
  end_date: string;
  schedules: ScheduleNow[];
  wishes: ScheduleWish[];
  appointments: ProgramAppointment[];
  today: string;
};

// What the change does, appointment by appointment. Only the appointments
// still to come, planned, never moved by hand and never started are moved
// (RM-031, RM-032); the past never moves (RM-033 cancels what falls after
// a shorter end).
export function planScheduleChange(input: PlanInput): SchedulePlan {
  const { start_date, end_date, schedules, wishes, appointments, today } =
    input;
  const plan: SchedulePlan = {
    moved: [],
    created: [],
    cancelled: [],
    notes: [],
  };
  const wishOf = new Map(wishes.map((wish) => [wish.schedule_id, wish]));
  const keptByHand: string[] = [];

  for (const schedule of schedules) {
    const wish = wishOf.get(schedule.schedule_id) ?? schedule;
    // A cancelled appointment is out of the picture: its week is free.
    const mine = appointments.filter(
      (appointment) =>
        appointment.schedule_id === schedule.schedule_id &&
        appointment.status !== "cancelled",
    );
    // Appointments that the change is allowed to move (RM-031).
    const canMove = (appointment: ProgramAppointment) =>
      appointment.planned_date > today &&
      appointment.status === "planned" &&
      !appointment.moved_manually &&
      !appointment.is_started;
    // Appointments week by week: a session stays in its own week.
    const byWeek = new Map<string, ProgramAppointment[]>();
    for (const appointment of mine) {
      const week = mondayOf(appointment.planned_date);
      byWeek.set(week, [...(byWeek.get(week) ?? []), appointment]);
    }
    // The last week the program already fills: beyond it, a longer period
    // adds appointments; before it, a hole stays a hole.
    const lastWeek = mine
      .map((appointment) => mondayOf(appointment.planned_date))
      .sort()
      .at(-1);

    const paired = new Set<number>();
    for (const date of listProgramDates(start_date, end_date, [wish.weekday])) {
      const week = mondayOf(date);
      const here = byWeek.get(week) ?? [];
      const follower = here.find(
        (appointment) => canMove(appointment) && !paired.has(appointment.id),
      );
      if (follower !== undefined) {
        paired.add(follower.id);
        if (date <= today) {
          // The day it would land on is already gone: it stays where it is.
          plan.notes.push(
            `${formatShortDayMonth(follower.planned_date)} : la nouvelle date est déjà passée, la séance ne bouge pas.`,
          );
        } else if (
          follower.planned_date !== date ||
          follower.planned_time !== wish.planned_time
        ) {
          plan.moved.push({
            appointment_id: follower.id,
            schedule_id: schedule.schedule_id,
            from_date: follower.planned_date,
            to_date: date,
            to_time: wish.planned_time,
          });
        }
        continue;
      }
      if (
        here.length === 0 &&
        date > today &&
        (lastWeek === undefined || week > lastWeek)
      ) {
        plan.created.push({
          schedule_id: schedule.schedule_id,
          planned_date: date,
          planned_time: wish.planned_time,
        });
      }
    }
    for (const appointment of mine) {
      if (!canMove(appointment) || paired.has(appointment.id)) {
        continue;
      }
      plan.cancelled.push({
        appointment_id: appointment.id,
        planned_date: appointment.planned_date,
      });
    }
    const hasChange =
      wish.weekday !== schedule.weekday ||
      wish.planned_time !== schedule.planned_time;
    if (hasChange) {
      for (const appointment of mine) {
        if (
          appointment.moved_manually &&
          appointment.planned_date > today &&
          appointment.status === "planned"
        ) {
          keptByHand.push(
            formatShortDayMonth(appointment.planned_date).toLocaleLowerCase(
              "fr-FR",
            ),
          );
        }
      }
    } else {
      plan.notes.push(
        `${schedule.name} du ${getWeekdayLabel(schedule.weekday).toLocaleLowerCase("fr-FR")} : inchangé.`,
      );
    }
  }

  if (keptByHand.length > 0) {
    plan.notes.unshift(
      `Non modifié : ${keptByHand.join(", ")}, déplacé manuellement.`,
    );
  }

  const past = appointments
    .filter((appointment) => appointment.planned_date <= today)
    .map((appointment) => appointment.planned_date)
    .sort();
  if (past.length > 0) {
    const first = past[0] as string;
    const last = past[past.length - 1] as string;
    plan.notes.push(
      `Séances passées (${formatDayRange(first, last)}) : inchangées.`,
    );
  }
  if (appointments.some((appointment) => appointment.is_started)) {
    plan.notes.push("Une séance commencée n'est jamais déplacée.");
  }

  return plan;
}

// --- What the API receives (PRO-08) ----------------------------------------

export const programScheduleSchema = z.object({
  name: z
    .string({ error: REQUIRED_MESSAGE })
    .min(1, { error: REQUIRED_MESSAGE })
    .max(160, { error: "160 caractères au maximum." }),
  end_date: dateSchema,
  sessions: z
    .array(
      z.object({
        schedule_id: z.number().int().positive(),
        weekday: z.number().int().min(1).max(7),
        planned_time: timeSchema.nullable(),
      }),
    )
    .min(1, { error: "Un programme garde au moins une séance." })
    .max(70),
});

export type ProgramScheduleInput = z.output<typeof programScheduleSchema>;
