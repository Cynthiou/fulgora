import { useEffect, useState } from "react";
import type { WorkoutSessionTree, WorkoutSetRow } from "shared";
import { isAbortError } from "../../../services/api";
import { ApiError } from "../../../services/apiError";
import { readWorkoutSession } from "../services/workoutSessionService";

// Loads the whole tree of a realized session (B2). notFound is true when the
// server answers 404: the session does not exist or is not the user's.
export function useWorkoutSession(id: number) {
  const [session, setSession] = useState<WorkoutSessionTree | null>(null);
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

    readWorkoutSession(id, controller.signal)
      .then((data) => {
        setSession(data);
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

  // One set changed (validated, corrected): the tree on screen follows.
  function replaceSet(updated: WorkoutSetRow) {
    setSession((current) =>
      current === null
        ? current
        : {
            ...current,
            blocks: current.blocks.map((block) => ({
              ...block,
              exercises: block.exercises.map((exercise) => ({
                ...exercise,
                sets: exercise.sets.map((set) =>
                  set.id === updated.id ? updated : set,
                ),
              })),
            })),
          },
    );
  }

  return {
    session,
    isLoading,
    notFound,
    error,
    reload: () => setAttempt((count) => count + 1),
    replaceSet,
    // The server answered with the whole tree (abandon, finish)
    replaceSession: setSession,
  };
}
