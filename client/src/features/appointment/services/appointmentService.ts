import type { AppointmentListItem } from "shared";
import { apiFetch } from "../../../services/api";

// GET /api/appointments?from=&to= : the appointments of a period (62 days max).
export function readAppointments(
  from: string,
  to: string,
  signal?: AbortSignal,
): Promise<AppointmentListItem[]> {
  const query = new URLSearchParams({ from, to });
  return apiFetch<AppointmentListItem[]>(`/appointments?${query}`, { signal });
}
