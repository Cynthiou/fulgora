import type { RequestHandler } from "express";
import {
  buildProgramSessionName,
  canActivateProgram,
  getWeekday,
  listProgramDates,
  type ProgramCreated,
  type ProgramDetail,
  type ProgramInfoInput,
  type ProgramSessionSummary,
  type SessionEditInput,
  statusAfterCreation,
  todayInParis,
  toHourMinute,
} from "shared";
import { withTransaction } from "../../database/withTransaction.js";
import { HttpError } from "../../utils/httpError.js";
import { readUserId } from "../../utils/requestUser.js";
import { buildSessionDraft } from "../appointment/sessionEditActions.js";
import {
  assertSessionContentValid,
  writeSessionTree,
} from "../session-template/sessionContent.js";
import {
  createSessionTemplate,
  createSessionVersion,
  readNextVersionNumber,
  updateSessionTemplateName,
} from "../session-template/sessionTemplateRepository.js";
import {
  createProgram,
  createProgramAppointment,
  createSchedule,
  deactivateSchedule,
  deleteDraftProgram,
  deleteProgramSchedules,
  readProgram,
  readProgramForUpdate,
  readProgramSchedules,
  readPrograms,
  type ScheduleRow,
  updateProgramInfo,
  updateProgramStatus,
} from "./programRepository.js";

// Programs (US-18): a draft first, then the appointments of the whole
// period when every session is ready (RM-071, RM-072, RM-075).

function toSession(row: ScheduleRow): ProgramSessionSummary {
  return {
    weekday: row.weekday,
    session_template_id: row.session_template_id,
    session_version_id: row.session_version_id,
    name: row.name,
    exercise_count: Number(row.exercise_count),
    exercise_names: row.exercise_names,
  };
}

async function buildDetail(
  id: number,
  userId: number,
): Promise<ProgramDetail | null> {
  const program = await readProgram(id, userId);
  if (program === null) {
    return null;
  }
  const schedules = await readProgramSchedules(id);
  return {
    id: program.id,
    name: program.name,
    description: program.description,
    start_date: program.start_date,
    end_date: program.end_date,
    status: program.status,
    planned_time: toHourMinute(schedules[0]?.planned_time ?? null),
    sessions: schedules.map(toSession),
  };
}

function notFound(): HttpError {
  return new HttpError(404, "PROGRAM_NOT_FOUND", "Ce programme n'existe pas.");
}

// Creates one empty session per chosen day: "Séance du lundi"...
async function createMissingSessions(
  programId: number,
  userId: number,
  weekdays: number[],
  plannedTime: string | null,
  existing: ScheduleRow[],
  db: Parameters<typeof createSchedule>[4],
): Promise<void> {
  const known = new Map(existing.map((row) => [row.weekday, row]));
  for (const weekday of [...weekdays].sort((a, b) => a - b)) {
    if (known.has(weekday)) {
      continue;
    }
    const templateId = await createSessionTemplate(
      userId,
      buildProgramSessionName(weekday),
      db,
    );
    await createSessionVersion(templateId, 1, db);
    await createSchedule(programId, templateId, weekday, plannedTime, db);
  }
  // A day dropped from the week leaves the typical week (RM-032).
  for (const row of existing) {
    if (!weekdays.includes(row.weekday)) {
      await deactivateSchedule(row.id, db);
    }
  }
}

// POST /api/programs: step 1 saved as a draft (PRO-02 then PRO-03v).
export const createDraft: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const info = req.body as ProgramInfoInput;

  const id = await withTransaction(async (connection) => {
    const programId = await createProgram(
      userId,
      info.name,
      info.description,
      info.start_date,
      info.end_date,
      connection,
    );
    await createMissingSessions(
      programId,
      userId,
      info.weekdays,
      info.planned_time,
      [],
      connection,
    );
    return programId;
  });

  res.status(201).json(await buildDetail(id, userId));
};

// GET /api/programs: every program of the user (US-48).
export const browse: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const rows = await readPrograms(userId);
  res.json(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      start_date: row.start_date,
      end_date: row.end_date,
      status: row.status,
      session_count: Number(row.session_count),
      ready_count: Number(row.ready_count),
      appointment_count: Number(row.appointment_count),
    })),
  );
};

// GET /api/programs/:id: the program, its days and its sessions.
export const read: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { id } = req.params as unknown as { id: number };
  const detail = await buildDetail(id, userId);
  if (detail === null) {
    throw notFound();
  }
  res.json(detail);
};

// PUT /api/programs/:id: step 1 again, on a draft only.
export const updateDraft: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { id } = req.params as unknown as { id: number };
  const info = req.body as ProgramInfoInput;

  await withTransaction(async (connection) => {
    const program = await readProgramForUpdate(id, userId, connection);
    if (program === null) {
      throw notFound();
    }
    if (program.status !== "draft") {
      throw new HttpError(
        409,
        "PROGRAM_NOT_EDITABLE",
        "Ce programme est déjà créé : ses jours se changent depuis le programme.",
      );
    }
    await updateProgramInfo(
      id,
      info.name,
      info.description,
      info.start_date,
      info.end_date,
      connection,
    );
    await createMissingSessions(
      id,
      userId,
      info.weekdays,
      info.planned_time,
      await readProgramSchedules(id, connection),
      connection,
    );
  });

  res.json(await buildDetail(id, userId));
};

// POST /api/programs/:id/activate: the draft becomes a real program and
// fills the Planning (RM-072, RM-075).
export const activate: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { id } = req.params as unknown as { id: number };

  const created = await withTransaction(async (connection) => {
    const program = await readProgramForUpdate(id, userId, connection);
    if (program === null) {
      throw notFound();
    }
    if (program.status !== "draft") {
      throw new HttpError(
        409,
        "PROGRAM_ALREADY_CREATED",
        "Ce programme est déjà créé.",
      );
    }
    const schedules = await readProgramSchedules(id, connection);
    if (!canActivateProgram(schedules.map(toSession))) {
      throw new HttpError(
        422,
        "PROGRAM_SESSION_EMPTY",
        "Chaque séance doit contenir au moins un exercice.",
      );
    }

    // One appointment per day of the period falling on a chosen weekday.
    const byWeekday = new Map(schedules.map((row) => [row.weekday, row]));
    const dates = listProgramDates(
      program.start_date,
      program.end_date,
      schedules.map((row) => row.weekday),
    );
    for (const date of dates) {
      const schedule = byWeekday.get(getWeekday(date));
      if (schedule === undefined) {
        continue;
      }
      await createProgramAppointment(
        userId,
        id,
        schedule.id,
        schedule.session_version_id,
        date,
        toHourMinute(schedule.planned_time),
        connection,
      );
    }

    const status = statusAfterCreation(program.start_date, todayInParis());
    await updateProgramStatus(id, status, connection);

    const answer: ProgramCreated = {
      appointment_count: dates.length,
      first_date: dates[0] ?? null,
      last_date: dates[dates.length - 1] ?? null,
      status,
    };
    return answer;
  });

  res.json(created);
};

// DELETE /api/programs/:id: "Supprimer et quitter", on a draft only.
export const removeDraft: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { id } = req.params as unknown as { id: number };

  const program = await readProgram(id, userId);
  if (program === null) {
    throw notFound();
  }
  if (program.status !== "draft") {
    throw new HttpError(
      409,
      "PROGRAM_NOT_DELETABLE",
      "Ce programme est déjà créé : il s'abandonne depuis le programme.",
    );
  }
  await withTransaction(async (connection) => {
    // The days of the week go first: they point at the program (DT-17).
    // The sessions themselves stay, they belong to the user and cost
    // nothing; cleaning them up is the job of US-21.
    await deleteProgramSchedules(id, connection);
    await deleteDraftProgram(id, userId, connection);
  });
  res.status(204).end();
};

// --- The session of one day of the program (US-18, step 2) ------------------

// Finds the day in the typical week, or answers 404.
async function readSchedule(
  programId: number,
  weekday: number,
  userId: number,
): Promise<{
  program: Awaited<ReturnType<typeof readProgram>>;
  schedule: ScheduleRow;
}> {
  const program = await readProgram(programId, userId);
  if (program === null) {
    throw notFound();
  }
  const schedules = await readProgramSchedules(programId);
  const schedule = schedules.find((row) => row.weekday === weekday);
  if (schedule === undefined) {
    throw new HttpError(
      404,
      "PROGRAM_DAY_NOT_FOUND",
      "Ce jour ne fait pas partie du programme.",
    );
  }
  return { program, schedule };
}

// GET /api/programs/:id/sessions/:weekday: the session of that day, as a
// draft for the editor.
export const readDaySession: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { id, weekday } = req.params as unknown as {
    id: number;
    weekday: number;
  };
  const { program, schedule } = await readSchedule(id, weekday, userId);

  res.json({
    program_id: id,
    program_name: program?.name ?? "",
    weekday,
    session: await buildSessionDraft(
      schedule.session_version_id,
      schedule.name,
      program?.start_date ?? "",
      toHourMinute(schedule.planned_time),
    ),
  });
};

// PUT /api/programs/:id/sessions/:weekday: what was built in the editor
// becomes the next version of that day's session (RM-017).
export const writeDaySession: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { id, weekday } = req.params as unknown as {
    id: number;
    weekday: number;
  };
  const { session } = req.body as SessionEditInput;
  const { schedule } = await readSchedule(id, weekday, userId);

  const versionId = await withTransaction(async (connection) => {
    await assertSessionContentValid(session.blocks, userId, connection);
    const versionNumber = await readNextVersionNumber(
      schedule.session_template_id,
      connection,
    );
    const created = await createSessionVersion(
      schedule.session_template_id,
      versionNumber,
      connection,
    );
    await writeSessionTree(created, session.blocks, connection);
    await updateSessionTemplateName(
      schedule.session_template_id,
      session.name,
      connection,
    );
    return created;
  });

  res.json({ version_id: versionId });
};
