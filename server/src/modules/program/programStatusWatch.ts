import { todayIn } from "shared";
import { listUserTimezones } from "../appointment/appointmentRepository.js";
import { createProgramFinishedNotifications } from "../notification/notificationRepository.js";
import {
  listProgramsToFinish,
  listProgramsToStart,
  logProgramStatusChanges,
  markProgramsStatus,
} from "./programRepository.js";

const EVERY_FIVE_MINUTES = 5 * 60 * 1000;

// Walks every time zone once: a program whose start date has come goes
// "En cours", and one whose last day is over goes "Terminé" with its
// notification (RM-074). A program only changes once, so the next run
// leaves it alone: no notification is ever sent twice.
export async function updateProgramStatuses(
  now: Date = new Date(),
): Promise<{ started: number; finished: number }> {
  let started = 0;
  let finished = 0;
  for (const timezone of await listUserTimezones()) {
    const today = todayIn(timezone, now);

    const toStart = await listProgramsToStart(timezone, today);
    started += await markProgramsStatus(toStart, "in_progress");
    await logProgramStatusChanges(toStart, "programmed", "in_progress");

    const toFinish = await listProgramsToFinish(timezone, today);
    finished += await markProgramsStatus(toFinish, "finished");
    await logProgramStatusChanges(toFinish, "in_progress", "finished");
    await createProgramFinishedNotifications(toFinish);
  }
  return { started, finished };
}

// Every 5 minutes, like the watch of the appointments. A failure is logged
// and the next run tries again: the server never stops because of it.
export function startProgramStatusWatch(
  intervalMs: number = EVERY_FIVE_MINUTES,
): NodeJS.Timeout {
  const run = async () => {
    try {
      const { started, finished } = await updateProgramStatuses();
      if (started > 0 || finished > 0) {
        console.info(`Programs: ${started} started, ${finished} finished`);
      }
    } catch (error) {
      console.error("Program status watch failed", error);
    }
  };
  const timer = setInterval(run, intervalMs);
  // Does not keep the process alive on its own (useful for scripts and tests).
  timer.unref();
  return timer;
}
