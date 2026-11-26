import type {
  ActualSetValues,
  CurrentWorkoutSession,
  DeclarationPlan,
  DeclareDoneInput,
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

// PUT /api/workout-sets/:id/correction: fixes a set of a past session
// (US-37). The planned values never move.
export function correctSet(
  setId: number,
  values: ActualSetValues,
): Promise<WorkoutSetRow> {
  return apiFetch<WorkoutSetRow>(`/workout-sets/${setId}/correction`, {
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

// POST /api/workout-exercises/:id/sets: one more set during the session
// (US-32). The set arrives empty, with nothing planned.
export function addWorkoutSet(
  workoutExerciseId: number,
): Promise<{ id: number }> {
  return apiFetch(`/workout-exercises/${workoutExerciseId}/sets`, {
    method: "POST",
  });
}

// DELETE /api/workout-sets/:id: removes a set added during the session.
export function removeWorkoutSet(setId: number): Promise<void> {
  return apiFetch(`/workout-sets/${setId}`, { method: "DELETE" });
}

// POST /api/workout-blocks/:id/exercises: the chosen exercises land at the
// end of the block.
export function addWorkoutExercises(
  blockId: number,
  exerciseIds: number[],
): Promise<{ ids: number[] }> {
  return apiFetch(`/workout-blocks/${blockId}/exercises`, {
    method: "POST",
    body: JSON.stringify({ exercise_ids: exerciseIds }),
  });
}

// POST /api/workout-sessions/:id/blocks: a new block at the end, with its
// exercises.
export function addWorkoutBlock(
  sessionId: number,
  name: string | null,
  exerciseIds: number[],
): Promise<{ id: number }> {
  return apiFetch(`/workout-sessions/${sessionId}/blocks`, {
    method: "POST",
    body: JSON.stringify({ name, exercise_ids: exerciseIds }),
  });
}

// GET /api/appointments/:id/declaration: the plan of a past session, to
// confirm set by set (US-38).
export function readDeclaration(
  appointmentId: number,
  signal?: AbortSignal,
): Promise<DeclarationPlan> {
  return apiFetch<DeclarationPlan>(
    `/appointments/${appointmentId}/declaration`,
    { signal },
  );
}

// POST /api/appointments/:id/declare-done: the session written after coup.
export function declareSessionDone(
  appointmentId: number,
  input: DeclareDoneInput,
): Promise<{ id: number }> {
  return apiFetch(`/appointments/${appointmentId}/declare-done`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
