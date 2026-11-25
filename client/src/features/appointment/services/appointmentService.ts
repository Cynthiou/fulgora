import type {
  AppointmentDetail,
  AppointmentListItem,
  FreeSessionCreated,
  SessionDraft,
} from "shared";
import { apiFetch } from "../../../services/api";

// POST /api/appointments: saves the whole draft as a free session and plans it
// (US-23). The local keys travel along; the server ignores them.
export function createFreeSession(
  draft: SessionDraft,
): Promise<FreeSessionCreated> {
  return apiFetch<FreeSessionCreated>("/appointments", {
    method: "POST",
    body: JSON.stringify(draft),
  });
}

// GET /api/appointments?from=&to= : the appointments of a period (62 days max).
export function readAppointments(
  from: string,
  to: string,
  signal?: AbortSignal,
): Promise<AppointmentListItem[]> {
  const query = new URLSearchParams({ from, to });
  return apiFetch<AppointmentListItem[]>(`/appointments?${query}`, { signal });
}

// GET /api/appointments/:id: one planned session with its blocks (B1).
export function readAppointment(
  id: number,
  signal?: AbortSignal,
): Promise<AppointmentDetail> {
  return apiFetch<AppointmentDetail>(`/appointments/${id}`, { signal });
}
