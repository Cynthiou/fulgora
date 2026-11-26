import type { ActualSetValues, BlockType, WorkoutStatus } from "shared";
import client, {
  type Queryable,
  type Result,
  type Rows,
} from "../../database/client.js";

// One function, one query. No business rule here: the action decides.

// The realized session itself, in progress from this very moment (RM-039).
// started_at and last_activity_at are set by the database clock, once.
export async function createWorkoutSession(
  appointmentId: number,
  userId: number,
  db: Queryable = client,
): Promise<number> {
  const [result] = await db.execute<Result>(
    `INSERT INTO workout_session (appointment_id, owner_user_id, status, started_at, last_activity_at)
     VALUES (?, ?, 'in_progress', NOW(3), NOW(3))`,
    [appointmentId, userId],
  );
  return result.insertId;
}

// The three copies of the plan (RM-041): blocks, then exercises, then sets.
// INSERT ... SELECT copies in one statement; the _planned columns are filled,
// the _actual ones stay empty until a set is validated.
export async function copyTemplateBlocks(
  workoutSessionId: number,
  sessionVersionId: number,
  db: Queryable = client,
): Promise<void> {
  await db.execute(
    `INSERT INTO workout_block (workout_session_id, source_template_block_id, block_type, name,
        position, planned_rounds, time_limit_seconds, instructions)
     SELECT ?, tb.id, tb.block_type, tb.name, tb.position, tb.planned_rounds,
            tb.time_limit_seconds, tb.instructions
       FROM template_block tb
      WHERE tb.session_version_id = ?`,
    [workoutSessionId, sessionVersionId],
  );
}

export async function copyTemplateExercises(
  workoutSessionId: number,
  db: Queryable = client,
): Promise<void> {
  await db.execute(
    `INSERT INTO workout_exercise (workout_block_id, exercise_id, source_template_block_exercise_id,
        position, instructions, default_rest_seconds, is_per_side)
     SELECT wb.id, tbe.exercise_id, tbe.id, tbe.position, tbe.instructions,
            tbe.default_rest_seconds, tbe.is_per_side
       FROM workout_block wb
       JOIN template_block_exercise tbe ON tbe.template_block_id = wb.source_template_block_id
      WHERE wb.workout_session_id = ?`,
    [workoutSessionId],
  );
}

export async function copyPlannedSets(
  workoutSessionId: number,
  db: Queryable = client,
): Promise<void> {
  await db.execute(
    `INSERT INTO workout_set (workout_exercise_id, source_planned_set_id, position,
        reps_planned, weight_planned_kg, weight_left_planned_kg, weight_right_planned_kg,
        duration_planned_seconds, distance_planned_meters,
        speed_planned_kmh, resistance_planned, incline_planned_percent, calories_planned,
        planned_rest_seconds)
     SELECT we.id, ps.id, ps.position, ps.reps, ps.weight_kg,
            ps.weight_left_kg, ps.weight_right_kg, ps.duration_seconds,
            ps.distance_meters, ps.speed_kmh, ps.resistance, ps.incline_percent, ps.calories,
            ps.rest_after_seconds
       FROM workout_exercise we
       JOIN workout_block wb ON wb.id = we.workout_block_id
       JOIN planned_set ps ON ps.template_block_exercise_id = we.source_template_block_exercise_id
      WHERE wb.workout_session_id = ?`,
    [workoutSessionId],
  );
}

export type InProgressWorkoutRow = {
  id: number;
  appointment_id: number;
  started_at: Date;
  session_name: string;
};

// The one session in progress of a user (RM-040), or null.
export async function readInProgressWorkout(
  userId: number,
  db: Queryable = client,
): Promise<InProgressWorkoutRow | null> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT ws.id, ws.appointment_id, ws.started_at, st.name AS session_name
       FROM workout_session ws
       JOIN appointment a ON a.id = ws.appointment_id
       JOIN session_version sv ON sv.id = a.session_version_id
       JOIN session_template st ON st.id = sv.session_template_id
      WHERE ws.owner_user_id = ? AND ws.status = 'in_progress'
      LIMIT 1`,
    [userId],
  );
  return (rows[0] as InProgressWorkoutRow | undefined) ?? null;
}

export type WorkoutSetCounts = { planned: number; validated: number };

// "6 / 11 séries": every set counts, a cardio stage too (D-08).
export async function countWorkoutSets(
  workoutSessionId: number,
  db: Queryable = client,
): Promise<WorkoutSetCounts> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT COUNT(*) AS planned, COUNT(wset.validated_at) AS validated
       FROM workout_set wset
       JOIN workout_exercise we ON we.id = wset.workout_exercise_id
       JOIN workout_block wb ON wb.id = we.workout_block_id
      WHERE wb.workout_session_id = ?`,
    [workoutSessionId],
  );
  return {
    planned: Number(rows[0]?.planned ?? 0),
    validated: Number(rows[0]?.validated ?? 0),
  };
}

export type WorkoutSessionRow = {
  id: number;
  appointment_id: number;
  status: WorkoutStatus;
  started_at: Date;
  ended_at: Date | null;
  // 0 or 1 in MySQL
  auto_closed: number;
  // Written after the fact, never lived in the app (US-38)
  declared_afterwards: number;
  session_name: string;
  program_name: string | null;
};

// The header of a realized session; null when it is not the user's (404).
export async function readWorkoutSession(
  id: number,
  userId: number,
  db: Queryable = client,
): Promise<WorkoutSessionRow | null> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT ws.id, ws.appointment_id, ws.status, ws.started_at, ws.ended_at,
            ws.auto_closed, ws.declared_afterwards,
            st.name AS session_name, p.name AS program_name
       FROM workout_session ws
       JOIN appointment a ON a.id = ws.appointment_id
       JOIN session_version sv ON sv.id = a.session_version_id
       JOIN session_template st ON st.id = sv.session_template_id
       LEFT JOIN program p ON p.id = a.program_id
      WHERE ws.id = ? AND ws.owner_user_id = ?`,
    [id, userId],
  );
  return (rows[0] as WorkoutSessionRow | undefined) ?? null;
}

export type WorkoutBlockRow = {
  id: number;
  block_type: BlockType;
  name: string | null;
  position: number;
  instructions: string | null;
  // null when the block was added during the session (D-18, RM-043)
  source_template_block_id: number | null;
};

export async function readWorkoutBlocks(
  workoutSessionId: number,
  db: Queryable = client,
): Promise<WorkoutBlockRow[]> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT id, block_type, name, position, instructions,
            source_template_block_id
       FROM workout_block
      WHERE workout_session_id = ?
      ORDER BY position`,
    [workoutSessionId],
  );
  return rows as WorkoutBlockRow[];
}

export type WorkoutExerciseRow = {
  id: number;
  workout_block_id: number;
  exercise_id: number;
  position: number;
  default_rest_seconds: number | null;
  name: string;
  category_name: string | null;
  equipment_names: string | null;
  // "reps,weight" or null
  measure_codes: string | null;
  is_bodyweight: number;
  // Done side by side (US-51)
  is_per_side: number;
  // null when the exercise was added during the session (D-18, RM-043)
  source_template_block_exercise_id: number | null;
};

// The exercises of a realized session with what the screen needs to show
// them: name, group, equipment and measures (RM-010).
export async function readWorkoutExercises(
  workoutSessionId: number,
  db: Queryable = client,
): Promise<WorkoutExerciseRow[]> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT we.id, we.workout_block_id, we.exercise_id, we.position, we.default_rest_seconds,
            we.source_template_block_exercise_id, e.name,
            (SELECT c.name FROM exercise_category ec JOIN category c ON c.id = ec.category_id
              WHERE ec.exercise_id = e.id ORDER BY c.id LIMIT 1) AS category_name,
            (SELECT GROUP_CONCAT(eq.name ORDER BY eq.name SEPARATOR ' · ')
               FROM exercise_equipment ee JOIN equipment eq ON eq.id = ee.equipment_id
              WHERE ee.exercise_id = e.id) AS equipment_names,
            (SELECT GROUP_CONCAT(m.code ORDER BY m.id SEPARATOR ',')
               FROM exercise_measure em JOIN measure m ON m.id = em.measure_id
              WHERE em.exercise_id = e.id) AS measure_codes,
            EXISTS (SELECT 1 FROM exercise_equipment ee2
                      JOIN equipment eq2 ON eq2.id = ee2.equipment_id
                     WHERE ee2.exercise_id = e.id AND eq2.code = 'bodyweight') AS is_bodyweight,
            we.is_per_side
       FROM workout_exercise we
       JOIN workout_block wb ON wb.id = we.workout_block_id
       JOIN exercise e ON e.id = we.exercise_id
      WHERE wb.workout_session_id = ?
      ORDER BY wb.position, we.position`,
    [workoutSessionId],
  );
  return rows as WorkoutExerciseRow[];
}

// Every set of the session; decimals arrive as text from MySQL.
export type WorkoutSetDbRow = {
  id: number;
  workout_exercise_id: number;
  position: number;
  reps_planned: number | null;
  reps_actual: number | null;
  weight_planned_kg: string | null;
  weight_actual_kg: string | null;
  // The two planned loads of a per-side set (US-51)
  weight_left_planned_kg: string | null;
  weight_right_planned_kg: string | null;
  duration_planned_seconds: number | null;
  duration_actual_seconds: number | null;
  distance_planned_meters: string | null;
  distance_actual_meters: string | null;
  speed_planned_kmh: string | null;
  speed_actual_kmh: string | null;
  resistance_planned: string | null;
  resistance_actual: string | null;
  incline_planned_percent: string | null;
  incline_actual_percent: string | null;
  calories_planned: string | null;
  calories_actual: string | null;
  planned_rest_seconds: number | null;
  validated_at: Date | null;
  // Filled by a correction made after the session (US-37, RM-049)
  updated_at: Date | null;
  // null when the set was added during the session (D-18, RM-043)
  source_planned_set_id: number | null;
};

export async function readWorkoutSets(
  workoutSessionId: number,
  db: Queryable = client,
): Promise<WorkoutSetDbRow[]> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT wset.*
       FROM workout_set wset
       JOIN workout_exercise we ON we.id = wset.workout_exercise_id
       JOIN workout_block wb ON wb.id = we.workout_block_id
      WHERE wb.workout_session_id = ?
      ORDER BY we.id, wset.position`,
    [workoutSessionId],
  );
  return rows as WorkoutSetDbRow[];
}

export type WorkoutSetContextRow = {
  id: number;
  workout_session_id: number;
  exercise_id: number;
  status: WorkoutStatus;
  // The exercise is done side by side (US-51)
  is_per_side: number;
};

// One set with what the action must know: whose session, its status and the
// exercise (for the allowed measures). Null when it is not the user's (404).
export async function readWorkoutSetContext(
  setId: number,
  userId: number,
  db: Queryable = client,
): Promise<WorkoutSetContextRow | null> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT wset.id, ws.id AS workout_session_id, we.exercise_id, ws.status,
            we.is_per_side
       FROM workout_set wset
       JOIN workout_exercise we ON we.id = wset.workout_exercise_id
       JOIN workout_block wb ON wb.id = we.workout_block_id
       JOIN workout_session ws ON ws.id = wb.workout_session_id
      WHERE wset.id = ? AND ws.owner_user_id = ?`,
    [setId, userId],
  );
  return (rows[0] as WorkoutSetContextRow | undefined) ?? null;
}

// Writes what was really done. The _planned columns are never touched
// (RM-041); the first validation date is kept (RM-049).
export async function updateWorkoutSetActual(
  setId: number,
  values: ActualSetValues,
  db: Queryable = client,
): Promise<void> {
  await db.execute(
    `UPDATE workout_set
        SET reps_actual = ?, weight_actual_kg = ?, duration_actual_seconds = ?,
            distance_actual_meters = ?, speed_actual_kmh = ?, resistance_actual = ?,
            incline_actual_percent = ?, calories_actual = ?,
            validated_at = COALESCE(validated_at, NOW(3))
      WHERE id = ?`,
    [
      values.reps,
      values.weight_kg,
      values.duration_seconds,
      values.distance_meters,
      values.speed_kmh,
      values.resistance,
      values.incline_percent,
      values.calories,
      setId,
    ],
  );
}

// Correcting a past session (US-37): the same values, plus the date of
// the correction. The first validation date never moves, and a set that
// was never done is validated now (RM-049).
export async function correctWorkoutSetActual(
  setId: number,
  values: ActualSetValues,
  db: Queryable = client,
): Promise<void> {
  await db.execute(
    `UPDATE workout_set
        SET reps_actual = ?, weight_actual_kg = ?, duration_actual_seconds = ?,
            distance_actual_meters = ?, speed_actual_kmh = ?, resistance_actual = ?,
            incline_actual_percent = ?, calories_actual = ?,
            validated_at = COALESCE(validated_at, NOW(3)),
            updated_at = NOW(3)
      WHERE id = ?`,
    [
      values.reps,
      values.weight_kg,
      values.duration_seconds,
      values.distance_meters,
      values.speed_kmh,
      values.resistance,
      values.incline_percent,
      values.calories,
      setId,
    ],
  );
}

// Every recorded action pushes the inactivity clock back (RM-065, DT-18).
export async function touchWorkoutSession(
  workoutSessionId: number,
  db: Queryable = client,
): Promise<void> {
  await db.execute(
    "UPDATE workout_session SET last_activity_at = NOW(3) WHERE id = ?",
    [workoutSessionId],
  );
}

export async function readWorkoutSet(
  setId: number,
  db: Queryable = client,
): Promise<WorkoutSetDbRow | null> {
  const [rows] = await db.execute<Rows[]>(
    "SELECT * FROM workout_set WHERE id = ?",
    [setId],
  );
  return (rows[0] as WorkoutSetDbRow | undefined) ?? null;
}

// "Abandonner": over for good, partial results kept (RM-045). The condition
// on the status makes the update harmless when the session is already over;
// the action reads the number of changed rows.
export async function abandonWorkoutSession(
  id: number,
  userId: number,
  db: Queryable = client,
): Promise<number> {
  const [result] = await db.execute<Result>(
    `UPDATE workout_session
        SET status = 'unfinished', ended_at = NOW(3)
      WHERE id = ? AND owner_user_id = ? AND status = 'in_progress'`,
    [id, userId],
  );
  return result.affectedRows;
}

// Sessions left without any action for 4 hours are closed as unfinished,
// ended at their last action and marked auto_closed (RM-065, DT-18).
export async function closeInactiveWorkoutSessions(
  db: Queryable = client,
): Promise<number> {
  const [result] = await db.execute<Result>(
    `UPDATE workout_session
        SET status = 'unfinished', ended_at = last_activity_at, auto_closed = TRUE
      WHERE status = 'in_progress' AND last_activity_at < NOW(3) - INTERVAL 4 HOUR`,
  );
  return result.affectedRows;
}

// "Terminer": over as completed, the sets not done stay without a validation
// date (RM-046). Same shape as the abandon: conditional on the status.
export async function completeWorkoutSession(
  id: number,
  userId: number,
  db: Queryable = client,
): Promise<number> {
  const [result] = await db.execute<Result>(
    `UPDATE workout_session
        SET status = 'completed', ended_at = NOW(3)
      WHERE id = ? AND owner_user_id = ? AND status = 'in_progress'`,
    [id, userId],
  );
  return result.affectedRows;
}

// --- Adding during the session (US-32) --------------------------------------

export type WorkoutExerciseContextRow = {
  id: number;
  workout_session_id: number;
  status: WorkoutStatus;
};

// One exercise of a realized session, with the session it belongs to and the
// state of that session. Null when it is not the user's (404).
export async function readWorkoutExerciseContext(
  workoutExerciseId: number,
  userId: number,
  db: Queryable = client,
): Promise<WorkoutExerciseContextRow | null> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT we.id, ws.id AS workout_session_id, ws.status
       FROM workout_exercise we
       JOIN workout_block wb ON wb.id = we.workout_block_id
       JOIN workout_session ws ON ws.id = wb.workout_session_id
      WHERE we.id = ? AND ws.owner_user_id = ?`,
    [workoutExerciseId, userId],
  );
  return (rows[0] as WorkoutExerciseContextRow | undefined) ?? null;
}

// The place a new set takes at the end of its exercise.
export async function readNextSetPosition(
  workoutExerciseId: number,
  db: Queryable = client,
): Promise<number> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT COALESCE(MAX(position), 0) + 1 AS next_position
       FROM workout_set
      WHERE workout_exercise_id = ?
      FOR UPDATE`,
    [workoutExerciseId],
  );
  return Number(rows[0]?.next_position ?? 1);
}

// A set added during the session: no planned values, no provenance (RM-043).
export async function createWorkoutSet(
  workoutExerciseId: number,
  position: number,
  db: Queryable = client,
): Promise<number> {
  const [result] = await db.execute<Result>(
    `INSERT INTO workout_set (workout_exercise_id, source_planned_set_id, position)
     VALUES (?, NULL, ?)`,
    [workoutExerciseId, position],
  );
  return result.insertId;
}

// Removes a set only if it was added during the session (RM-048): a planned
// set is never deleted, and the caller answers 422.
export async function deleteAddedWorkoutSet(
  setId: number,
  db: Queryable = client,
): Promise<boolean> {
  const [result] = await db.execute<Result>(
    "DELETE FROM workout_set WHERE id = ? AND source_planned_set_id IS NULL",
    [setId],
  );
  return result.affectedRows === 1;
}

export type WorkoutBlockContextRow = {
  id: number;
  workout_session_id: number;
  status: WorkoutStatus;
};

// One block of a realized session, with the state of its session.
export async function readWorkoutBlockContext(
  workoutBlockId: number,
  userId: number,
  db: Queryable = client,
): Promise<WorkoutBlockContextRow | null> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT wb.id, ws.id AS workout_session_id, ws.status
       FROM workout_block wb
       JOIN workout_session ws ON ws.id = wb.workout_session_id
      WHERE wb.id = ? AND ws.owner_user_id = ?`,
    [workoutBlockId, userId],
  );
  return (rows[0] as WorkoutBlockContextRow | undefined) ?? null;
}

// The place a new exercise takes at the end of its block.
export async function readNextExercisePosition(
  workoutBlockId: number,
  db: Queryable = client,
): Promise<number> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT COALESCE(MAX(position), 0) + 1 AS next_position
       FROM workout_exercise
      WHERE workout_block_id = ?
      FOR UPDATE`,
    [workoutBlockId],
  );
  return Number(rows[0]?.next_position ?? 1);
}

// An exercise added during the session, with the rest of the catalog.
export async function createWorkoutExercise(
  workoutBlockId: number,
  exerciseId: number,
  position: number,
  db: Queryable = client,
): Promise<number> {
  const [result] = await db.execute<Result>(
    `INSERT INTO workout_exercise (workout_block_id, exercise_id,
        source_template_block_exercise_id, position)
     VALUES (?, ?, NULL, ?)`,
    [workoutBlockId, exerciseId, position],
  );
  return result.insertId;
}

// The place a new block takes at the end of the session.
export async function readNextBlockPosition(
  workoutSessionId: number,
  db: Queryable = client,
): Promise<number> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT COALESCE(MAX(position), 0) + 1 AS next_position
       FROM workout_block
      WHERE workout_session_id = ?
      FOR UPDATE`,
    [workoutSessionId],
  );
  return Number(rows[0]?.next_position ?? 1);
}

// A block added during the session; always a classic one (RM-043).
export async function createWorkoutBlock(
  workoutSessionId: number,
  name: string | null,
  position: number,
  db: Queryable = client,
): Promise<number> {
  const [result] = await db.execute<Result>(
    `INSERT INTO workout_block (workout_session_id, source_template_block_id,
        block_type, name, position)
     VALUES (?, NULL, 'classic', ?, ?)`,
    [workoutSessionId, name, position],
  );
  return result.insertId;
}

// The session a set belongs to, with the state of that session and whether
// the set was added; null when it is not the user's.
export type AddedSetRow = {
  id: number;
  workout_session_id: number;
  status: WorkoutStatus;
  source_planned_set_id: number | null;
};

export async function readWorkoutSetOwner(
  setId: number,
  userId: number,
  db: Queryable = client,
): Promise<AddedSetRow | null> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT wset.id, ws.id AS workout_session_id, ws.status,
            wset.source_planned_set_id
       FROM workout_set wset
       JOIN workout_exercise we ON we.id = wset.workout_exercise_id
       JOIN workout_block wb ON wb.id = we.workout_block_id
       JOIN workout_session ws ON ws.id = wb.workout_session_id
      WHERE wset.id = ? AND ws.owner_user_id = ?`,
    [setId, userId],
  );
  return (rows[0] as AddedSetRow | undefined) ?? null;
}

// --- Declaring a session after the fact (US-38) ---------------------------

// The realized session of a day already past: its start is the declared
// date, and it is marked as declared afterwards (RM-050, RM-057).
export async function createDeclaredWorkoutSession(
  appointmentId: number,
  userId: number,
  startedAt: string,
  status: WorkoutStatus,
  db: Queryable = client,
): Promise<number> {
  const [result] = await db.execute<Result>(
    `INSERT INTO workout_session (appointment_id, owner_user_id, status, started_at,
        ended_at, last_activity_at, declared_afterwards)
     VALUES (?, ?, ?, ?, ?, NOW(3), TRUE)`,
    [appointmentId, userId, status, startedAt, startedAt],
  );
  return result.insertId;
}

// One confirmed set of a declaration: the copy made from the plan is
// filled in and validated now (RM-049).
export async function fillDeclaredSet(
  workoutSessionId: number,
  plannedSetId: number,
  values: ActualSetValues,
  db: Queryable = client,
): Promise<number> {
  const [result] = await db.execute<Result>(
    `UPDATE workout_set wset
       JOIN workout_exercise we ON we.id = wset.workout_exercise_id
       JOIN workout_block wb ON wb.id = we.workout_block_id
        SET wset.reps_actual = ?, wset.weight_actual_kg = ?,
            wset.duration_actual_seconds = ?, wset.distance_actual_meters = ?,
            wset.speed_actual_kmh = ?, wset.resistance_actual = ?,
            wset.incline_actual_percent = ?, wset.calories_actual = ?,
            wset.validated_at = NOW(3)
      WHERE wb.workout_session_id = ? AND wset.source_planned_set_id = ?`,
    [
      values.reps,
      values.weight_kg,
      values.duration_seconds,
      values.distance_meters,
      values.speed_kmh,
      values.resistance,
      values.incline_percent,
      values.calories,
      workoutSessionId,
      plannedSetId,
    ],
  );
  return result.affectedRows;
}

export async function setWorkoutSessionStatus(
  id: number,
  status: WorkoutStatus,
  db: Queryable = client,
): Promise<void> {
  await db.execute("UPDATE workout_session SET status = ? WHERE id = ?", [
    status,
    id,
  ]);
}

// --- Per-side exercises (US-51) -------------------------------------------

export type WorkoutSetSideRow = {
  workout_set_id: number;
  side: "left" | "right";
  reps_actual: number | null;
  weight_actual_kg: string | null;
  duration_actual_seconds: number | null;
  validated_at: Date;
};

// What was done on each side, for the whole session (B5g, B6).
export async function readWorkoutSetSides(
  workoutSessionId: number,
  db: Queryable = client,
): Promise<WorkoutSetSideRow[]> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT wss.workout_set_id, wss.side, wss.reps_actual, wss.weight_actual_kg,
            wss.duration_actual_seconds, wss.validated_at
       FROM workout_set_side wss
       JOIN workout_set wset ON wset.id = wss.workout_set_id
       JOIN workout_exercise we ON we.id = wset.workout_exercise_id
       JOIN workout_block wb ON wb.id = we.workout_block_id
      WHERE wb.workout_session_id = ?
      ORDER BY wss.workout_set_id, wss.side`,
    [workoutSessionId],
  );
  return rows as WorkoutSetSideRow[];
}

// One side recorded, or recorded again (RM-044): the row is written once
// and updated afterwards.
export async function upsertWorkoutSetSide(
  setId: number,
  side: "left" | "right",
  values: {
    reps: number | null;
    weight_kg: number | null;
    duration_seconds: number | null;
  },
  db: Queryable = client,
): Promise<void> {
  await db.execute(
    `INSERT INTO workout_set_side (workout_set_id, side, reps_actual,
        weight_actual_kg, duration_actual_seconds)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE reps_actual = VALUES(reps_actual),
        weight_actual_kg = VALUES(weight_actual_kg),
        duration_actual_seconds = VALUES(duration_actual_seconds),
        updated_at = NOW(3)`,
    [setId, side, values.reps, values.weight_kg, values.duration_seconds],
  );
}

// How many sides of a set are filled in: the set is validated at two.
export async function countWorkoutSetSides(
  setId: number,
  db: Queryable = client,
): Promise<number> {
  const [rows] = await db.execute<Rows[]>(
    "SELECT COUNT(*) AS total FROM workout_set_side WHERE workout_set_id = ?",
    [setId],
  );
  return Number((rows[0] as { total: number } | undefined)?.total ?? 0);
}

// A per-side set is validated once both sides are there, and only then
// (RM-044). The actual columns of the set itself stay empty: each side
// keeps its own values.
export async function setWorkoutSetValidated(
  setId: number,
  isValidated: boolean,
  db: Queryable = client,
): Promise<void> {
  await db.execute(
    `UPDATE workout_set
        SET validated_at = ${isValidated ? "COALESCE(validated_at, NOW(3))" : "NULL"}
      WHERE id = ?`,
    [setId],
  );
}

// The sides of one set (after writing one of them).
export async function readWorkoutSetSidesOfSet(
  setId: number,
  db: Queryable = client,
): Promise<WorkoutSetSideRow[]> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT workout_set_id, side, reps_actual, weight_actual_kg,
            duration_actual_seconds, validated_at
       FROM workout_set_side
      WHERE workout_set_id = ?
      ORDER BY side`,
    [setId],
  );
  return rows as WorkoutSetSideRow[];
}
