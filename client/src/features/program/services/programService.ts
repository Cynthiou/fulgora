import type {
  ProgramCreated,
  ProgramDetail,
  ProgramDetailFull,
  ProgramInfoInput,
  ProgramScheduleInput,
  ProgramSessionInput,
  SchedulePlan,
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
  // How far it has gone: appointments past, and really done (PRO-01)
  past_count: number;
  done_count: number;
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

// GET /api/programs/:id: the program, its days, its sessions and the
// appointments it put in the Planning (US-48).
export function readProgram(
  id: number,
  signal?: AbortSignal,
): Promise<ProgramDetailFull> {
  return apiFetch<ProgramDetailFull>(`/programs/${id}`, { signal });
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

// DELETE /api/programs/:id: a program nobody has started, thrown away with
// its appointments, its rules and its prepared sessions (US-21, DT-25).
export function deleteProgramDraft(id: number): Promise<void> {
  return apiFetch(`/programs/${id}`, { method: "DELETE" });
}

export type ProgramDaySession = {
  program_id: number;
  program_name: string;
  weekday: number;
  session: SessionDraft;
};

// GET /api/programs/:id/sessions/:scheduleId: one session of the week.
export function readProgramDaySession(
  id: number,
  scheduleId: number,
  signal?: AbortSignal,
): Promise<ProgramDaySession> {
  return apiFetch<ProgramDaySession>(`/programs/${id}/sessions/${scheduleId}`, {
    signal,
  });
}

// PUT /api/programs/:id/sessions/:scheduleId: what the editor built.
export function writeProgramDaySession(
  id: number,
  scheduleId: number,
  session: SessionDraft,
): Promise<{ version_id: number }> {
  return apiFetch(`/programs/${id}/sessions/${scheduleId}`, {
    method: "PUT",
    body: JSON.stringify({ scope: "this", session }),
  });
}

// POST /api/programs/:id/sessions: one more session on a day (US-19).
export function addProgramSession(
  id: number,
  input: ProgramSessionInput,
): Promise<ProgramDetailFull> {
  return apiFetch<ProgramDetailFull>(`/programs/${id}/sessions`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// DELETE /api/programs/:id/sessions/:scheduleId, and the way back.
export function removeProgramSession(
  id: number,
  scheduleId: number,
): Promise<ProgramDetailFull> {
  return apiFetch<ProgramDetailFull>(`/programs/${id}/sessions/${scheduleId}`, {
    method: "DELETE",
  });
}

export function restoreProgramSession(
  id: number,
  scheduleId: number,
): Promise<ProgramDetailFull> {
  return apiFetch<ProgramDetailFull>(
    `/programs/${id}/sessions/${scheduleId}/restore`,
    { method: "POST" },
  );
}

// POST /api/programs/:id/schedule/preview: what a change of days, hours or
// end date would do, before anything is written (US-20).
export function previewProgramSchedule(
  id: number,
  input: ProgramScheduleInput,
  signal?: AbortSignal,
): Promise<SchedulePlan> {
  return apiFetch<SchedulePlan>(`/programs/${id}/schedule/preview`, {
    method: "POST",
    body: JSON.stringify(input),
    signal,
  });
}

// PUT /api/programs/:id/schedule: the same change, applied.
export function updateProgramSchedule(
  id: number,
  input: ProgramScheduleInput,
): Promise<ProgramDetailFull> {
  return apiFetch<ProgramDetailFull>(`/programs/${id}/schedule`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

// POST /api/programs/:id/abandon: the rest of the program is given up,
// the past is kept (US-21, PRO-11).
export function abandonProgram(id: number): Promise<ProgramDetailFull> {
  return apiFetch<ProgramDetailFull>(`/programs/${id}/abandon`, {
    method: "POST",
  });
}
