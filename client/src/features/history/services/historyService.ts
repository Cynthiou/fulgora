import type { HistoryDetail, HistoryFilters, HistoryPage } from "shared";
import { apiFetch } from "../../../services/api";

// The filters of SUI-05f, as the address and the API write them (US-52).
export function toHistoryQuery(
  filters: HistoryFilters,
  offset = 0,
): URLSearchParams {
  const query = new URLSearchParams();
  if (offset > 0) {
    query.set("offset", String(offset));
  }
  if (filters.period !== "all") {
    query.set("period", filters.period);
    query.set("date", filters.date);
  }
  if (filters.program !== null) {
    query.set("program", String(filters.program));
  }
  if (filters.statuses.length > 0) {
    query.set("statuses", filters.statuses.join(","));
  }
  return query;
}

// GET /api/history?offset=&period=&date=&program=&statuses= (US-35, US-52).
export function readHistory(
  offset: number,
  filters: HistoryFilters,
  signal?: AbortSignal,
): Promise<HistoryPage> {
  const query = toHistoryQuery(filters, offset).toString();
  return apiFetch<HistoryPage>(`/history${query === "" ? "" : `?${query}`}`, {
    signal,
  });
}

// GET /api/history/:id: the detail of a past session (US-36).
export function readHistoryDetail(
  appointmentId: number,
  signal?: AbortSignal,
): Promise<HistoryDetail> {
  return apiFetch<HistoryDetail>(`/history/${appointmentId}`, { signal });
}
