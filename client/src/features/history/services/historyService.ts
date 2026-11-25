import type { HistoryDetail, HistoryPage } from "shared";
import { apiFetch } from "../../../services/api";

// GET /api/history?offset=: 20 past sessions, newest first (US-35).
export function readHistory(
  offset: number,
  signal?: AbortSignal,
): Promise<HistoryPage> {
  const query = offset > 0 ? `?offset=${offset}` : "";
  return apiFetch<HistoryPage>(`/history${query}`, { signal });
}

// GET /api/history/:id: the detail of a past session (US-36).
export function readHistoryDetail(
  appointmentId: number,
  signal?: AbortSignal,
): Promise<HistoryDetail> {
  return apiFetch<HistoryDetail>(`/history/${appointmentId}`, { signal });
}
