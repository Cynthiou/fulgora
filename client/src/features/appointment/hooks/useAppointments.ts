import { useEffect, useState } from "react";
import type { AppointmentListItem } from "shared";
import { isAbortError } from "../../../services/api";
import { ApiError } from "../../../services/apiError";
import { readAppointments } from "../services/appointmentService";

// Loads the appointments of a period. useState + useEffect, no library
// (T-07): the call is cancelled when the page closes, reload() asks again.
export function useAppointments(from: string, to: string) {
  const [items, setItems] = useState<AppointmentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Changing this number re-runs the effect: that is what reload() does.
  const [attempt, setAttempt] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt is listed on purpose, it re-runs the load when reload() is called
  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    readAppointments(from, to, controller.signal)
      .then((data) => {
        setItems(data);
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
  }, [from, to, attempt]);

  return {
    items,
    isLoading,
    error,
    reload: () => setAttempt((count) => count + 1),
  };
}
