import { closeInactiveWorkoutSessions } from "./workoutSessionRepository.js";

const EVERY_FIVE_MINUTES = 5 * 60 * 1000;

// Every 5 minutes, closes the sessions without any action for 4 hours
// (RM-065, DT-18). A failure is logged and the next run tries again: the
// server never stops because of it.
export function startInactivityWatch(
  intervalMs: number = EVERY_FIVE_MINUTES,
): NodeJS.Timeout {
  const run = async () => {
    try {
      const closed = await closeInactiveWorkoutSessions();
      if (closed > 0) {
        console.info(`Closed ${closed} inactive workout session(s)`);
      }
    } catch (error) {
      console.error("Inactivity watch failed", error);
    }
  };
  const timer = setInterval(run, intervalMs);
  // Does not keep the process alive on its own (useful for scripts and tests).
  timer.unref();
  return timer;
}
