import type {
  ProgramCreated,
  ProgramDetail,
  ProgramInfoInput,
  SessionDraft,
} from "shared";
import { apiFetch } from "../../../services/api";

// One line of the program list (US-48).
export type ProgramListItem = {
  id: number;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: ProgramDetail["status"];
  session_count: number;
  ready_count: number;
  appointment_count: number;
};

// GET /api/programs: every program of the user.
export function readPrograms(signal?: AbortSignal): Promise<ProgramListItem[]> {
  return apiFetch<ProgramListItem[]>("/programs", { signal });
}

// POST /api/programs: step 1 of the creation, saved as a draft (US-18).
export function createProgramDraft(
  info: ProgramInfoInput,
): Promise<ProgramDetail> {
  return apiFetch<ProgramDetail>("/programs", {
    method: "POST",
    body: JSON.stringify(info),
  });
}

// GET /api/programs/:id: the program, its days and its sessions.
export function readProgram(
  id: number,
  signal?: AbortSignal,
): Promise<ProgramDetail> {
  return apiFetch<ProgramDetail>(`/programs/${id}`, { signal });
}

// PUT /api/programs/:id: the period and the days of a draft.
export function updateProgramDraft(
  id: number,
  info: ProgramInfoInput,
): Promise<ProgramDetail> {
  return apiFetch<ProgramDetail>(`/programs/${id}`, {
    method: "PUT",
    body: JSON.stringify(info),
  });
}

// POST /api/programs/:id/activate: the draft fills the Planning.
export function activateProgram(id: number): Promise<ProgramCreated> {
  return apiFetch<ProgramCreated>(`/programs/${id}/activate`, {
    method: "POST",
  });
}

// DELETE /api/programs/:id: a draft thrown away.
export function deleteProgramDraft(id: number): Promise<void> {
  return apiFetch(`/programs/${id}`, { method: "DELETE" });
}

export type ProgramDaySession = {
  program_id: number;
  program_name: string;
  weekday: number;
  session: SessionDraft;
};

// GET /api/programs/:id/sessions/:weekday: the session of one day.
export function readProgramDaySession(
  id: number,
  weekday: number,
  signal?: AbortSignal,
): Promise<ProgramDaySession> {
  return apiFetch<ProgramDaySession>(`/programs/${id}/sessions/${weekday}`, {
    signal,
  });
}

// PUT /api/programs/:id/sessions/:weekday: what the editor built.
export function writeProgramDaySession(
  id: number,
  weekday: number,
  session: SessionDraft,
): Promise<{ version_id: number }> {
  return apiFetch(`/programs/${id}/sessions/${weekday}`, {
    method: "PUT",
    body: JSON.stringify({ scope: "this", session }),
  });
}
