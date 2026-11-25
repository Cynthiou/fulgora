import type {
  CurrentWorkoutSession,
  WorkoutSessionTree,
  WorkoutStarted,
} from "shared";
import { apiFetch } from "../../../services/api";

// GET /api/workout-sessions/current: the session in progress, or null.
export function readCurrentWorkoutSession(
  signal?: AbortSignal,
): Promise<CurrentWorkoutSession | null> {
  return apiFetch<CurrentWorkoutSession | null>("/workout-sessions/current", {
    signal,
  });
}

// POST /api/workout-sessions: starts a planned session (US-28).
export function startWorkoutSession(
  appointmentId: number,
): Promise<WorkoutStarted> {
  return apiFetch<WorkoutStarted>("/workout-sessions", {
    method: "POST",
    body: JSON.stringify({ appointment_id: appointmentId }),
  });
}

// GET /api/workout-sessions/:id: the whole tree of a realized session.
export function readWorkoutSession(
  id: number,
  signal?: AbortSignal,
): Promise<WorkoutSessionTree> {
  return apiFetch<WorkoutSessionTree>(`/workout-sessions/${id}`, { signal });
}
