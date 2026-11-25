import { useRef, useState } from "react";
import type { ActualSetValues, WorkoutSetRow } from "shared";
import { ApiError } from "../../../services/apiError";
import { validateSet } from "../services/workoutSessionService";

type Options = {
  // Replaces one set in the tree shown on screen
  onReplace: (set: WorkoutSetRow) => void;
};

// Validates a set with an optimistic display: the set shows as done at once,
// the server confirms, and on failure the previous values come back with a
// message (US-29, RM-044).
export function useValidateSet({ onReplace }: Options) {
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The last failed attempt, for "Réessayer"
  const retryRef = useRef<{
    set: WorkoutSetRow;
    values: ActualSetValues;
  } | null>(null);
  const inFlight = useRef(false);

  async function validate(set: WorkoutSetRow, values: ActualSetValues) {
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    setPendingId(set.id);
    setError(null);
    retryRef.current = null;

    // Shown as done right away (first validation date kept, RM-049)
    onReplace({
      ...set,
      reps_actual: values.reps,
      weight_actual_kg: values.weight_kg,
      duration_actual_seconds: values.duration_seconds,
      distance_actual_meters: values.distance_meters,
      speed_actual_kmh: values.speed_kmh,
      resistance_actual: values.resistance,
      incline_actual_percent: values.incline_percent,
      calories_actual: values.calories,
      validated_at: set.validated_at ?? new Date().toISOString(),
    });

    try {
      const saved = await validateSet(set.id, values);
      onReplace(saved);
    } catch (caught) {
      onReplace(set);
      retryRef.current = { set, values };
      setError(
        caught instanceof ApiError && caught.status === 409
          ? caught.message
          : "La série n'a pas été enregistrée. Réessaie.",
      );
    } finally {
      inFlight.current = false;
      setPendingId(null);
    }
  }

  function retry() {
    const last = retryRef.current;
    if (last !== null) {
      validate(last.set, last.values);
    }
  }

  return {
    validate,
    retry,
    pendingId,
    error,
    clearError: () => setError(null),
  };
}
