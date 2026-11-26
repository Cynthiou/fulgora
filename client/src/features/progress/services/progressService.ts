import type { ExerciseProgress, ProgressExerciseItem } from "shared";
import { apiFetch } from "../../../services/api";

// GET /api/progress/exercises?search=: the exercises already done (US-39).
export function readProgressExercises(
  search: string,
  signal?: AbortSignal,
): Promise<ProgressExerciseItem[]> {
  const query =
    search.trim() === "" ? "" : `?search=${encodeURIComponent(search.trim())}`;
  return apiFetch<ProgressExerciseItem[]>(`/progress/exercises${query}`, {
    signal,
  });
}

// GET /api/progress/exercises/:id: every validated set of one exercise.
export function readExerciseProgress(
  exerciseId: number,
  signal?: AbortSignal,
): Promise<ExerciseProgress> {
  return apiFetch<ExerciseProgress>(`/progress/exercises/${exerciseId}`, {
    signal,
  });
}
