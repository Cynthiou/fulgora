import type { PlannedSetValues } from "shared";
import { apiFetch } from "../../../services/api";

// GET /api/progress/exercises/:id/last: what the last finished session
// holds for this exercise ("Dernière fois" of the handoff des séries).
// An empty list means the exercise was never done.
export async function readLastSets(
  exerciseId: number,
  signal?: AbortSignal,
): Promise<PlannedSetValues[]> {
  const answer = await apiFetch<{ sets: PlannedSetValues[] }>(
    `/progress/exercises/${exerciseId}/last`,
    { signal },
  );
  return answer.sets;
}
