import { useEffect, useState } from "react";
import type { HistoryDetail } from "shared";
import { isAbortError } from "../../../services/api";
import { ApiError } from "../../../services/apiError";
import { readHistoryDetail } from "../services/historyService";

// Loads the detail of a past session (SUI-06). notFound: 404.
export function useHistoryDetail(appointmentId: number) {
  const [detail, setDetail] = useState<HistoryDetail | null>(null);
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

    readHistoryDetail(appointmentId, controller.signal)
      .then((data) => {
        setDetail(data);
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
  }, [appointmentId, attempt]);

  return {
    detail,
    isLoading,
    notFound,
    error,
    reload: () => setAttempt((count) => count + 1),
  };
}
