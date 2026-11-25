import { useEffect, useState } from "react";
import type { CurrentWorkoutSession } from "shared";
import { isAbortError } from "../../../services/api";
import { ApiError } from "../../../services/apiError";
import { readCurrentWorkoutSession } from "../services/workoutSessionService";

// Loads the session in progress (null when there is none).
export function useCurrentWorkoutSession() {
  const [session, setSession] = useState<CurrentWorkoutSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt is listed on purpose, it re-runs the load when reload() is called
  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    readCurrentWorkoutSession(controller.signal)
      .then((data) => {
        setSession(data);
        setIsLoading(false);
      })
      .catch((caught: unknown) => {
        if (isAbortError(caught)) {
          return;
        }
        setError(
          caught instanceof ApiError
            ? caught.message
            : "Une erreur est survenue. Réessaie plus tard.",
        );
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [attempt]);

  return {
    session,
    isLoading,
    error,
    reload: () => setAttempt((count) => count + 1),
  };
}
