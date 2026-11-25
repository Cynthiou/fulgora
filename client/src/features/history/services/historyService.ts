import type { HistoryPage } from "shared";
import { apiFetch } from "../../../services/api";

// GET /api/history?offset=: 20 past sessions, newest first (US-35).
export function readHistory(
  offset: number,
  signal?: AbortSignal,
): Promise<HistoryPage> {
  const query = offset > 0 ? `?offset=${offset}` : "";
  return apiFetch<HistoryPage>(`/history${query}`, { signal });
}
