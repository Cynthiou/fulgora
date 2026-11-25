import type {
  ExerciseDetail,
  ExerciseListResponse,
  ExerciseQuery,
  ReferenceItem,
} from "shared";
import { apiFetch } from "../../../services/api";

// Builds "?offset=20&search=squat&category_ids=5,2" from the query. Empty
// filters are left out of the address.
export function toSearchParams(query: ExerciseQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.offset !== undefined && query.offset > 0) {
    params.set("offset", String(query.offset));
  }
  if (query.search !== undefined && query.search !== "") {
    params.set("search", query.search);
  }
  if (query.category_ids !== undefined && query.category_ids.length > 0) {
    params.set("category_ids", query.category_ids.join(","));
  }
  if (query.equipment_ids !== undefined && query.equipment_ids.length > 0) {
    params.set("equipment_ids", query.equipment_ids.join(","));
  }
  if (query.difficulties !== undefined && query.difficulties.length > 0) {
    params.set("difficulties", query.difficulties.join(","));
  }
  return params;
}

// GET /api/exercises: one page of 20 exercises matching the query.
export function readExercises(
  query: ExerciseQuery,
  signal?: AbortSignal,
): Promise<ExerciseListResponse> {
  return apiFetch<ExerciseListResponse>(`/exercises?${toSearchParams(query)}`, {
    signal,
  });
}

// GET /api/categories: the 8 groups, for the filter grid.
export function readCategories(signal?: AbortSignal): Promise<ReferenceItem[]> {
  return apiFetch<ReferenceItem[]>("/categories", { signal });
}

// GET /api/equipments: the equipment list, for the filter grid.
export function readEquipments(signal?: AbortSignal): Promise<ReferenceItem[]> {
  return apiFetch<ReferenceItem[]>("/equipments", { signal });
}

// GET /api/exercises/:id: the whole detail of one exercise (404 when it does
// not exist for this user).
export function readExercise(
  id: number,
  signal?: AbortSignal,
): Promise<ExerciseDetail> {
  return apiFetch<ExerciseDetail>(`/exercises/${id}`, { signal });
}
