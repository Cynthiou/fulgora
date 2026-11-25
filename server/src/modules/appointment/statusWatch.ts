import { addDays, CONFIRM_DAYS_AFTER, todayIn } from "shared";
import {
  createAppointmentNotifications,
  listAppointmentsWithStatus,
} from "../notification/notificationRepository.js";
import {
  listUserTimezones,
  markPastAppointmentsToConfirm,
  markUnansweredAppointmentsMissed,
} from "./appointmentRepository.js";

const EVERY_FIVE_MINUTES = 5 * 60 * 1000;

// Walks every time zone once: a planned session whose day is past waits for
// an answer, and one left without an answer for 72 hours is missed (RM-052).
// Returns how many rows changed, for the logs and the tests.
export async function updateAppointmentStatuses(
  now: Date = new Date(),
): Promise<{ toConfirm: number; missed: number }> {
  let toConfirm = 0;
  let missed = 0;
  for (const timezone of await listUserTimezones()) {
    const today = todayIn(timezone, now);
    toConfirm += await markPastAppointmentsToConfirm(timezone, today);
    missed += await markUnansweredAppointmentsMissed(
      timezone,
      addDays(today, -CONFIRM_DAYS_AFTER),
    );

    // One notification per appointment and per type; the second run adds
    // nothing (RM-056, DT-16).
    await createAppointmentNotifications(
      "session_to_confirm",
      "Séance à confirmer",
      await listAppointmentsWithStatus(timezone, "to_confirm"),
    );
    await createAppointmentNotifications(
      "session_missed",
      "Séance manquée",
      await listAppointmentsWithStatus(timezone, "missed"),
    );
  }
  return { toConfirm, missed };
}

// Every 5 minutes, like the inactivity watch. A failure is logged and the
// next run tries again: the server never stops because of it.
export function startAppointmentStatusWatch(
  intervalMs: number = EVERY_FIVE_MINUTES,
): NodeJS.Timeout {
  const run = async () => {
    try {
      const { toConfirm, missed } = await updateAppointmentStatuses();
      if (toConfirm > 0 || missed > 0) {
        console.info(`Appointments: ${toConfirm} to confirm, ${missed} missed`);
      }
    } catch (error) {
      console.error("Appointment status watch failed", error);
    }
  };
  const timer = setInterval(run, intervalMs);
  // Does not keep the process alive on its own (useful for scripts and tests).
  timer.unref();
  return timer;
}
