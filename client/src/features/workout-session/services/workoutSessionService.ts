import type {
  ActualSetValues,
  CurrentWorkoutSession,
  WorkoutSessionTree,
  WorkoutSetRow,
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

// PUT /api/workout-sets/:id: what was really done on a set (US-29).
export function validateSet(
  setId: number,
  values: ActualSetValues,
): Promise<WorkoutSetRow> {
  return apiFetch<WorkoutSetRow>(`/workout-sets/${setId}`, {
    method: "PUT",
    body: JSON.stringify(values),
  });
}

// POST /api/workout-sessions/:id/abandon: stops the session for good (US-33).
export function abandonWorkoutSession(id: number): Promise<WorkoutSessionTree> {
  return apiFetch<WorkoutSessionTree>(`/workout-sessions/${id}/abandon`, {
    method: "POST",
  });
}

// POST /api/workout-sessions/:id/complete: the end of the session (US-34).
export function completeWorkoutSession(
  id: number,
): Promise<WorkoutSessionTree> {
  return apiFetch<WorkoutSessionTree>(`/workout-sessions/${id}/complete`, {
    method: "POST",
  });
}
