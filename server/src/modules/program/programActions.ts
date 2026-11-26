import type { RequestHandler } from "express";
import {
  buildProgramSessionName,
  canActivateProgram,
  countProgramWeeks,
  getWeekday,
  listProgramDates,
  MAX_PROGRAM_WEEKS,
  type ProgramCreated,
  type ProgramDetailFull,
  type ProgramInfoInput,
  type ProgramScheduleInput,
  type ProgramSessionInput,
  type ProgramSessionSummary,
  planScheduleChange,
  type SchedulePlan,
  type SessionEditInput,
  statusAfterCreation,
  todayInParis,
  toHourMinute,
} from "shared";
import { withTransaction } from "../../database/withTransaction.js";
import { HttpError } from "../../utils/httpError.js";
import { readUserId } from "../../utils/requestUser.js";
import { buildAppointmentItems } from "../appointment/appointmentActions.js";
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
  cancelProgramAppointment,
  createProgram,
  createProgramAppointment,
  createProgramChange,
  createSchedule,
  deactivateSchedule,
  deleteDraftProgram,
  deleteProgramSchedules,
  readProgram,
  readProgramAppointments,
  readProgramAppointmentsForUpdate,
  readProgramForUpdate,
  readProgramSchedules,
  readPrograms,
  rescheduleAppointment,
  type ScheduleRow,
  setScheduleRemoved,
  updateProgramInfo,
  updateProgramStatus,
} from "./programRepository.js";

// Programs (US-18): a draft first, then the appointments of the whole
// period when every session is ready (RM-071, RM-072, RM-075).

function toSession(row: ScheduleRow): ProgramSessionSummary {
  return {
    schedule_id: row.id,
    weekday: row.weekday,
    planned_time: toHourMinute(row.planned_time),
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
): Promise<ProgramDetailFull | null> {
  const program = await readProgram(id, userId);
  if (program === null) {
    return null;
  }
  const schedules = await readProgramSchedules(id);
  const appointments = await readProgramAppointments(id);
  return {
    id: program.id,
    name: program.name,
    description: program.description,
    start_date: program.start_date,
    end_date: program.end_date,
    status: program.status,
    planned_time: toHourMinute(schedules[0]?.planned_time ?? null),
    sessions: schedules.map(toSession),
    appointments: await buildAppointmentItems(appointments),
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
      past_count: Number(row.past_count),
      done_count: Number(row.done_count),
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

    // One appointment per session of the week and per matching day: a
    // day holding two sessions gives two appointments (US-19).
    const dates = listProgramDates(
      program.start_date,
      program.end_date,
      schedules.map((row) => row.weekday),
    );
    let appointmentCount = 0;
    for (const date of dates) {
      for (const schedule of schedules) {
        if (schedule.weekday !== getWeekday(date)) {
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
        appointmentCount += 1;
      }
    }

    const status = statusAfterCreation(program.start_date, todayInParis());
    await updateProgramStatus(id, status, connection);

    const answer: ProgramCreated = {
      appointment_count: appointmentCount,
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
async function readOwnedSchedule(
  programId: number,
  scheduleId: number,
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
  const schedule = schedules.find((row) => row.id === scheduleId);
  if (schedule === undefined) {
    throw new HttpError(
      404,
      "PROGRAM_SESSION_NOT_FOUND",
      "Cette séance ne fait pas partie du programme.",
    );
  }
  return { program, schedule };
}

// GET /api/programs/:id/sessions/:weekday: the session of that day, as a
// draft for the editor.
export const readDaySession: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { id, scheduleId } = req.params as unknown as {
    id: number;
    scheduleId: number;
  };
  const { program, schedule } = await readOwnedSchedule(id, scheduleId, userId);

  res.json({
    program_id: id,
    program_name: program?.name ?? "",
    weekday: schedule.weekday,
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
  const { id, scheduleId } = req.params as unknown as {
    id: number;
    scheduleId: number;
  };
  const { session } = req.body as SessionEditInput;
  const { schedule } = await readOwnedSchedule(id, scheduleId, userId);

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

// POST /api/programs/:id/sessions: one more session on a day of the week
// (PRO-03a). Only on a draft: once created, the days change with US-20.
export const addSession: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { id } = req.params as unknown as { id: number };
  const input = req.body as ProgramSessionInput;

  await withTransaction(async (connection) => {
    const program = await readProgramForUpdate(id, userId, connection);
    if (program === null) {
      throw notFound();
    }
    if (program.status !== "draft") {
      throw new HttpError(
        409,
        "PROGRAM_NOT_EDITABLE",
        "Ce programme est déjà créé : ses séances se changent depuis le programme.",
      );
    }
    const templateId = await createSessionTemplate(
      userId,
      input.name,
      connection,
    );
    const versionId = await createSessionVersion(templateId, 1, connection);
    await createSchedule(
      id,
      templateId,
      input.weekday,
      input.planned_time,
      connection,
    );
    return versionId;
  });

  res.status(201).json(await buildDetail(id, userId));
};

// DELETE /api/programs/:id/sessions/:scheduleId: the session leaves the
// typical week, and can come back for a few seconds (PRO-03c, PRO-03d).
export const removeSession: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { id, scheduleId } = req.params as unknown as {
    id: number;
    scheduleId: number;
  };
  await assertDraft(id, userId);
  const removed = await setScheduleRemoved(scheduleId, id, true);
  if (!removed) {
    throw new HttpError(
      404,
      "PROGRAM_SESSION_NOT_FOUND",
      "Cette séance ne fait pas partie du programme.",
    );
  }
  res.json(await buildDetail(id, userId));
};

// POST /api/programs/:id/sessions/:scheduleId/restore: "Annuler" of the
// toast puts the session back, with its blocks and its exercises.
export const restoreSession: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { id, scheduleId } = req.params as unknown as {
    id: number;
    scheduleId: number;
  };
  await assertDraft(id, userId);
  const restored = await setScheduleRemoved(scheduleId, id, false);
  if (!restored) {
    throw new HttpError(
      404,
      "PROGRAM_SESSION_NOT_FOUND",
      "Cette séance ne fait pas partie du programme.",
    );
  }
  res.json(await buildDetail(id, userId));
};

// The sessions of the week only change while the program is a draft.
async function assertDraft(id: number, userId: number): Promise<void> {
  const program = await readProgram(id, userId);
  if (program === null) {
    throw notFound();
  }
  if (program.status !== "draft") {
    throw new HttpError(
      409,
      "PROGRAM_NOT_EDITABLE",
      "Ce programme est déjà créé : ses séances se changent depuis le programme.",
    );
  }
}

// --- Changing the days, the hours and the end (US-20) ----------------------

// The same reading for the preview and for the writing: the program, its
// typical week and the plan the pure function draws (RM-031, RM-033).
async function readScheduleChange(
  id: number,
  userId: number,
  input: ProgramScheduleInput,
  connection: Parameters<typeof readProgramForUpdate>[2],
): Promise<{
  program: NonNullable<Awaited<ReturnType<typeof readProgramForUpdate>>>;
  schedules: ScheduleRow[];
  plan: SchedulePlan;
}> {
  const program = await readProgramForUpdate(id, userId, connection);
  if (program === null) {
    throw notFound();
  }
  if (program.status !== "programmed" && program.status !== "in_progress") {
    throw new HttpError(
      409,
      "PROGRAM_NOT_EDITABLE",
      "Ce programme ne se modifie plus.",
    );
  }
  if (input.end_date < program.start_date) {
    throw new HttpError(
      422,
      "PROGRAM_END_BEFORE_START",
      "La fin doit suivre le début.",
    );
  }
  if (
    countProgramWeeks(program.start_date, input.end_date) > MAX_PROGRAM_WEEKS
  ) {
    throw new HttpError(
      422,
      "PROGRAM_TOO_LONG",
      `${MAX_PROGRAM_WEEKS} semaines au maximum.`,
    );
  }

  const schedules = await readProgramSchedules(id, connection);
  const known = new Set(schedules.map((row) => row.id));
  for (const wish of input.sessions) {
    if (!known.has(wish.schedule_id)) {
      throw notFound();
    }
  }

  const appointments = await readProgramAppointmentsForUpdate(id, connection);
  const plan = planScheduleChange({
    start_date: program.start_date,
    end_date: input.end_date,
    schedules: schedules.map((row) => ({
      schedule_id: row.id,
      weekday: row.weekday,
      planned_time: toHourMinute(row.planned_time),
      name: row.name,
    })),
    wishes: input.sessions,
    appointments: appointments.map((row) => ({
      id: row.id,
      schedule_id: row.weekly_schedule_id,
      planned_date: row.planned_date,
      planned_time: toHourMinute(row.planned_time),
      moved_manually: row.moved_manually === 1,
      status: row.status,
      is_started: Number(row.is_started) === 1,
    })),
    today: todayInParis(),
  });
  return { program, schedules, plan };
}

// POST /api/programs/:id/schedule/preview: what the change would do.
export const previewSchedule: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { id } = req.params as unknown as { id: number };
  const input = req.body as ProgramScheduleInput;

  const plan = await withTransaction(async (connection) => {
    const change = await readScheduleChange(id, userId, input, connection);
    return change.plan;
  });

  res.json(plan);
};

// PUT /api/programs/:id/schedule: the change itself, exactly as announced.
export const updateSchedule: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { id } = req.params as unknown as { id: number };
  const input = req.body as ProgramScheduleInput;

  await withTransaction(async (connection) => {
    const { program, schedules, plan } = await readScheduleChange(
      id,
      userId,
      input,
      connection,
    );

    if (program.name !== input.name || program.end_date !== input.end_date) {
      await updateProgramInfo(
        id,
        input.name,
        program.description,
        program.start_date,
        input.end_date,
        connection,
      );
      await createProgramChange(
        id,
        "info",
        { name: program.name, end_date: program.end_date },
        { name: input.name, end_date: input.end_date },
        connection,
      );
    }

    // A rule that changes is replaced: the old row keeps its date, the new
    // one takes the appointments still to come (RM-031).
    const newScheduleId = new Map<number, number>();
    for (const row of schedules) {
      const wish = input.sessions.find(
        (session) => session.schedule_id === row.id,
      );
      const before = toHourMinute(row.planned_time);
      if (
        wish === undefined ||
        (wish.weekday === row.weekday && wish.planned_time === before)
      ) {
        newScheduleId.set(row.id, row.id);
        continue;
      }
      await deactivateSchedule(row.id, connection);
      const created = await createSchedule(
        id,
        row.session_template_id,
        wish.weekday,
        wish.planned_time,
        connection,
      );
      newScheduleId.set(row.id, created);
      await createProgramChange(
        id,
        "schedule",
        { weekday: row.weekday, planned_time: before },
        { weekday: wish.weekday, planned_time: wish.planned_time },
        connection,
      );
    }

    for (const moved of plan.moved) {
      await rescheduleAppointment(
        moved.appointment_id,
        newScheduleId.get(moved.schedule_id) ?? moved.schedule_id,
        moved.to_date,
        moved.to_time,
        connection,
      );
    }
    for (const created of plan.created) {
      const row = schedules.find(
        (schedule) => schedule.id === created.schedule_id,
      );
      if (row === undefined) {
        continue;
      }
      await createProgramAppointment(
        userId,
        id,
        newScheduleId.get(created.schedule_id) ?? created.schedule_id,
        row.session_version_id,
        created.planned_date,
        created.planned_time,
        connection,
      );
    }
    for (const cancelled of plan.cancelled) {
      await cancelProgramAppointment(cancelled.appointment_id, connection);
    }
  });

  const answer = await buildDetail(id, userId);
  if (answer === null) {
    throw notFound();
  }
  res.json(answer);
};
