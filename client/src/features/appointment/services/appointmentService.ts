import type {
  AppointmentDetail,
  AppointmentListItem,
  EditableSession,
  EditScope,
  FreeSessionCreated,
  SessionDraft,
  SessionEdited,
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

// GET /api/appointments/:id/session: the planned session as a draft, to open
// the editor on it (US-17).
export function readEditableSession(
  id: number,
  signal?: AbortSignal,
): Promise<EditableSession> {
  return apiFetch<EditableSession>(`/appointments/${id}/session`, { signal });
}

// PUT /api/appointments/:id/session: the change, saved as a new version.
export function updateSession(
  id: number,
  scope: EditScope,
  session: SessionDraft,
): Promise<SessionEdited> {
  return apiFetch<SessionEdited>(`/appointments/${id}/session`, {
    method: "PUT",
    body: JSON.stringify({ scope, session }),
  });
}

// PATCH /api/appointments/:id/cancel: give up a session before it starts
// (US-26). It stays visible, as cancelled.
export function cancelAppointment(id: number): Promise<{ status: string }> {
  return apiFetch<{ status: string }>(`/appointments/${id}/cancel`, {
    method: "PATCH",
  });
}

// PATCH /api/appointments/:id/move: the session changes day (US-25).
export function moveAppointment(
  id: number,
  plannedDate: string,
  plannedTime: string | null,
): Promise<{ id: number; planned_date: string; status: string }> {
  return apiFetch(`/appointments/${id}/move`, {
    method: "PATCH",
    body: JSON.stringify({
      planned_date: plannedDate,
      planned_time: plannedTime,
    }),
  });
}

// POST /api/appointments/:id/not-done: "Pas faite" (US-27). The session
// becomes missed, and can still be declared done later.
export function markAppointmentNotDone(
  id: number,
): Promise<{ status: string }> {
  return apiFetch(`/appointments/${id}/not-done`, { method: "POST" });
}
