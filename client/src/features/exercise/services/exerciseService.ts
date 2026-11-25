import type { ExerciseListResponse } from "shared";
import { apiFetch } from "../../../services/api";

// GET /api/exercises?offset=: one page of 20 exercises.
export function readExercises(
  offset: number,
  signal?: AbortSignal,
): Promise<ExerciseListResponse> {
  const query = new URLSearchParams({ offset: String(offset) });
  return apiFetch<ExerciseListResponse>(`/exercises?${query}`, { signal });
}
