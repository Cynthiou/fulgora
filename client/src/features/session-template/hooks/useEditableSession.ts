import { useEffect, useState } from "react";
import type { EditableSession } from "shared";
import { isAbortError } from "../../../services/api";
import { ApiError } from "../../../services/apiError";
import { readEditableSession } from "../../appointment/services/appointmentService";

// Loads the planned session to be changed (US-17).
// notFound: 404. notEditable: 409, the session was started or cancelled.
export function useEditableSession(id: number) {
  const [session, setSession] = useState<EditableSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [notEditable, setNotEditable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt is listed on purpose, it re-runs the load when reload() is called
  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    setNotFound(false);
    setNotEditable(false);

    readEditableSession(id, controller.signal)
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
        } else if (caught instanceof ApiError && caught.status === 409) {
          setNotEditable(true);
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
    session,
    isLoading,
    notFound,
    notEditable,
    error,
    reload: () => setAttempt((count) => count + 1),
  };
}
