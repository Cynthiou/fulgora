import type {
  ExerciseProgress,
  ProgressExerciseItem,
  SummaryPeriod,
  TrackingSummary,
} from "shared";
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

// GET /api/progress/summary: the summary of a week, a month or a program
// (US-41).
export function readTrackingSummary(
  options: {
    period: SummaryPeriod;
    date: string;
    programId: number | null;
  },
  signal?: AbortSignal,
): Promise<TrackingSummary> {
  const query = new URLSearchParams({
    period: options.period,
    date: options.date,
  });
  if (options.programId !== null) {
    query.set("program_id", String(options.programId));
  }
  return apiFetch<TrackingSummary>(`/progress/summary?${query.toString()}`, {
    signal,
  });
}
