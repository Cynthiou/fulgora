import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import type { CurrentWorkoutSession } from "shared";
import { ApiError } from "../../../services/apiError";
import {
  readCurrentWorkoutSession,
  startWorkoutSession,
} from "../services/workoutSessionService";

// Starting a session, from the session detail (B1) or from the Planning
// (CAL-03). One start at a time, and the truth of the server always wins:
// if the session started anyway, the page follows it.
export function useStartWorkout() {
  const navigate = useNavigate();
  const [startingId, setStartingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inProgress, setInProgress] = useState<CurrentWorkoutSession | null>(
    null,
  );
  // Read at the very instant of a second tap: one start, never two.
  const inFlight = useRef(false);

  async function start(appointmentId: number) {
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    setStartingId(appointmentId);
    setError(null);
    try {
      const started = await startWorkoutSession(appointmentId);
      navigate(`/entrainement/${started.id}`, { replace: true });
    } catch (caught) {
      // The true state first: the session may have started anyway, or
      // another one may be running (RM-040).
      const current = await readCurrentWorkoutSession().catch(() => null);
      if (current !== null && current.appointment_id === appointmentId) {
        navigate(`/entrainement/${current.id}`, { replace: true });
        return;
      }
      if (
        caught instanceof ApiError &&
        caught.code === "WORKOUT_ALREADY_IN_PROGRESS" &&
        current !== null
      ) {
        setInProgress(current);
      } else {
        setError(
          caught instanceof ApiError && caught.status === 422
            ? caught.message
            : "Impossible de démarrer la séance.",
        );
      }
    } finally {
      inFlight.current = false;
      setStartingId(null);
    }
  }

  return {
    start,
    startingId,
    isStarting: startingId !== null,
    error,
    inProgress,
    closeInProgress: () => setInProgress(null),
  };
}
