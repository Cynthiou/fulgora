import type { RequestHandler } from "express";
import {
  type AppointmentStatus,
  createEmptySet,
  type DraftExercise,
  type EditableSession,
  type MeasureCode,
  type PlannedSetValues,
  type SessionDraft,
  type SessionEdited,
  type SessionEditInput,
  toHourMinute,
} from "shared";
import { withTransaction } from "../../database/withTransaction.js";
import { HttpError } from "../../utils/httpError.js";
import { readUserId } from "../../utils/requestUser.js";
import {
  assertSessionContentValid,
  writeSessionTree,
} from "../session-template/sessionContent.js";
import {
  createSessionVersion,
  readNextVersionNumber,
  readVersionTemplateId,
  updateSessionTemplateName,
} from "../session-template/sessionTemplateRepository.js";
import {
  readAppointment,
  readAppointmentForUpdate,
  readVersionBlocks,
  readVersionExercises,
  readVersionSets,
  updateAppointmentsVersion,
  type VersionExerciseRow,
  type VersionSetRow,
} from "./appointmentRepository.js";

// Modifying a planned session (US-17). The saved version is never touched:
// every change writes a new one (RM-017).

// A session that was started, done or cancelled is out of this road: its
// results and its plan stay as they are (RM-058, US-37 corrects results).
const EDITABLE_STATUSES: AppointmentStatus[] = [
  "planned",
  "to_confirm",
  "missed",
];

function isEditable(status: AppointmentStatus): boolean {
  return EDITABLE_STATUSES.includes(status);
}

function notEditable(): HttpError {
  return new HttpError(
    409,
    "APPOINTMENT_NOT_EDITABLE",
    "Cette séance a déjà été commencée ou annulée : sa préparation ne se modifie plus.",
  );
}

// MySQL gives decimals back as text (DT-11).
function toNumber(value: string | number | null): number | null {
  return value === null ? null : Number(value);
}

function toPlannedSet(row: VersionSetRow): PlannedSetValues {
  return {
    ...createEmptySet(),
    reps: row.reps,
    weight_kg: toNumber(row.weight_kg),
    weight_left_kg: toNumber(row.weight_left_kg),
    weight_right_kg: toNumber(row.weight_right_kg),
    duration_seconds: row.duration_seconds,
    distance_meters: toNumber(row.distance_meters),
    speed_kmh: toNumber(row.speed_kmh),
    resistance: toNumber(row.resistance),
    incline_percent: toNumber(row.incline_percent),
    calories: toNumber(row.calories),
    rest_after_seconds: row.rest_after_seconds,
  };
}

// "Pectoraux · Barre", shown under the name in the editor.
function toMeta(row: VersionExerciseRow): string | null {
  const parts = [row.category_name, row.equipment_names].filter(
    (part): part is string => part !== null && part !== "",
  );
  return parts.length === 0 ? null : parts.join(" · ");
}

function toDraftExercise(
  row: VersionExerciseRow,
  sets: VersionSetRow[],
): DraftExercise {
  return {
    // The key stays the same from one end of the editor to the other: the
    // list of changes (CAL-06b) matches blocks and exercises on it.
    key: `ex-${row.id}`,
    exercise_id: row.exercise_id,
    name: row.name,
    meta: toMeta(row),
    measure_codes:
      row.measure_codes === null
        ? []
        : (row.measure_codes.split(",") as MeasureCode[]),
    is_bodyweight: row.is_bodyweight === 1,
    is_per_side: Number(row.is_per_side) === 1,
    default_rest_seconds: row.default_rest_seconds,
    sets: sets.map(toPlannedSet),
  };
}

// One session version turned back into a draft for the editor: blocks,
// exercises and sets, with the keys the list of changes matches on.
// Shared by the appointment (US-17) and the program day (US-18).
export async function buildSessionDraft(
  versionId: number,
  name: string,
  plannedDate: string,
  plannedTime: string | null,
): Promise<SessionDraft> {
  const [blocks, exercises, sets] = await Promise.all([
    readVersionBlocks(versionId),
    readVersionExercises(versionId),
    readVersionSets(versionId),
  ]);

  return {
    name,
    planned_date: plannedDate,
    planned_time: plannedTime,
    blocks: blocks.map((block) => ({
      key: `bloc-${block.id}`,
      block_type: block.block_type,
      name: block.name,
      instructions: block.instructions,
      exercises: exercises
        .filter((exercise) => exercise.template_block_id === block.id)
        .map((exercise) =>
          toDraftExercise(
            exercise,
            sets.filter(
              (set) => set.template_block_exercise_id === exercise.id,
            ),
          ),
        ),
    })),
  };
}

// GET /api/appointments/:id/session: the current version turned back into a
// draft, so the editor opens on exactly what is planned.
export const readSession: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { id } = req.params as unknown as { id: number };

  const appointment = await readAppointment(id, userId);
  if (appointment === null) {
    throw new HttpError(
      404,
      "APPOINTMENT_NOT_FOUND",
      "Cette séance n'existe pas.",
    );
  }
  if (!isEditable(appointment.status)) {
    throw notEditable();
  }

  const editable: EditableSession = {
    appointment_id: appointment.id,
    session_version_id: appointment.session_version_id,
    program_name: appointment.program_name,
    // The scope screen (CAL-06) arrives with the programs (US-18).
    can_apply_to_following: false,
    session: await buildSessionDraft(
      appointment.session_version_id,
      appointment.session_name,
      appointment.planned_date,
      toHourMinute(appointment.planned_time),
    ),
  };
  res.json(editable);
};

// PUT /api/appointments/:id/session: saves the edited session as a new
// version and points the appointment at it, all in one transaction.
// The date and the time of the body are ignored: moving is US-25.
export const editSession: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { id } = req.params as unknown as { id: number };
  const { scope, session } = req.body as SessionEditInput;

  const edited = await withTransaction(async (connection) => {
    const appointment = await readAppointmentForUpdate(id, userId, connection);
    if (appointment === null) {
      throw new HttpError(
        404,
        "APPOINTMENT_NOT_FOUND",
        "Cette séance n'existe pas.",
      );
    }
    if (!isEditable(appointment.status)) {
      throw notEditable();
    }
    if (scope === "following") {
      throw new HttpError(
        400,
        "SCOPE_NOT_ALLOWED",
        appointment.program_id === null
          ? "Cette séance ne fait partie d'aucun programme : elle change seule."
          : "La portée « cette séance et les suivantes » arrive avec les programmes.",
        "scope",
      );
    }

    await assertSessionContentValid(session.blocks, userId, connection);

    const templateId = await readVersionTemplateId(
      appointment.session_version_id,
      connection,
    );
    if (templateId === null) {
      throw new HttpError(
        404,
        "APPOINTMENT_NOT_FOUND",
        "Cette séance n'existe pas.",
      );
    }

    const versionNumber = await readNextVersionNumber(templateId, connection);
    const versionId = await createSessionVersion(
      templateId,
      versionNumber,
      connection,
    );
    await writeSessionTree(versionId, session.blocks, connection);
    // The name belongs to the session itself, not to one of its versions.
    await updateSessionTemplateName(templateId, session.name, connection);

    const updatedIds = [appointment.id];
    await updateAppointmentsVersion(updatedIds, versionId, connection);

    const answer: SessionEdited = {
      version_id: versionId,
      updated_appointment_ids: updatedIds,
    };
    return answer;
  });

  res.json(edited);
};
