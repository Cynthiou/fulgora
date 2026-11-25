import { useEffect, useState } from "react";
import type { AppointmentDetail } from "shared";
import { isAbortError } from "../../../services/api";
import { ApiError } from "../../../services/apiError";
import { readAppointment } from "../services/appointmentService";

// Loads one planned session (B1). notFound: 404, not the user's or missing.
export function useAppointment(id: number) {
  const [appointment, setAppointment] = useState<AppointmentDetail | null>(
    null,
  );
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

    readAppointment(id, controller.signal)
      .then((data) => {
        setAppointment(data);
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
    appointment,
    isLoading,
    notFound,
    error,
    reload: () => setAttempt((count) => count + 1),
  };
}
