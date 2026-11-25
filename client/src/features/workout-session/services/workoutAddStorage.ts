import type { SelectedExercise } from "shared";

// The exercises chosen in the catalog for the session in progress (US-32).
// They wait in the tab while the catalog gives the hand back to the session,
// exactly like the ones chosen for a block of the editor.
// Every access is wrapped in try/catch: private mode or a full storage must
// never break the session.

const KEY = "workout-session:pending-exercises";

export type PendingWorkoutExercises = {
  workoutSessionId: number;
  exercises: SelectedExercise[];
};

export function savePendingWorkoutExercises(
  pending: PendingWorkoutExercises,
): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(pending));
  } catch {
    // Not kept: the user picks again.
  }
}

export function readPendingWorkoutExercises(): PendingWorkoutExercises | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw === null ? null : (JSON.parse(raw) as PendingWorkoutExercises);
  } catch {
    return null;
  }
}

export function clearPendingWorkoutExercises(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to do.
  }
}
