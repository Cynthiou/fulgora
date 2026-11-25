import { useEffect, useState } from "react";
import type { ExerciseDetail } from "shared";
import { isAbortError } from "../../../services/api";
import { ApiError } from "../../../services/apiError";
import { readExercise } from "../services/exerciseService";

// Loads the detail of one exercise. A 404 is not an error to retry: the
// exercise does not exist for this user (notFound).
export function useExercise(id: number) {
  const [exercise, setExercise] = useState<ExerciseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt is listed on purpose, it re-runs the load when reload() is called
  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    setNotFound(false);

    readExercise(id, controller.signal)
      .then((data) => {
        setExercise(data);
        setIsLoading(false);
      })
      .catch((caught: unknown) => {
        if (isAbortError(caught)) {
          return;
        }
        if (caught instanceof ApiError && caught.status === 404) {
          setNotFound(true);
        } else {
          setError(
            caught instanceof ApiError
              ? caught.message
              : "Une erreur est survenue. Réessaie plus tard.",
          );
        }
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [id, attempt]);

  return {
    exercise,
    isLoading,
    notFound,
    error,
    reload: () => setAttempt((count) => count + 1),
  };
}
