import type { CurrentWorkoutSession } from "shared";
import { apiFetch } from "../../../services/api";

// GET /api/workout-sessions/current: the session in progress, or null.
export function readCurrentWorkoutSession(
  signal?: AbortSignal,
): Promise<CurrentWorkoutSession | null> {
  return apiFetch<CurrentWorkoutSession | null>("/workout-sessions/current", {
    signal,
  });
}
