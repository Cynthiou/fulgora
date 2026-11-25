import type { BlockType, WorkoutStatus } from "shared";
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
        position, instructions, default_rest_seconds)
     SELECT wb.id, tbe.exercise_id, tbe.id, tbe.position, tbe.instructions, tbe.default_rest_seconds
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
        reps_planned, weight_planned_kg, duration_planned_seconds, distance_planned_meters,
        speed_planned_kmh, resistance_planned, incline_planned_percent, calories_planned,
        planned_rest_seconds)
     SELECT we.id, ps.id, ps.position, ps.reps, ps.weight_kg, ps.duration_seconds,
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
};

export async function readWorkoutBlocks(
  workoutSessionId: number,
  db: Queryable = client,
): Promise<WorkoutBlockRow[]> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT id, block_type, name, position, instructions
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
};

// The exercises of a realized session with what the screen needs to show
// them: name, group, equipment and measures (RM-010).
export async function readWorkoutExercises(
  workoutSessionId: number,
  db: Queryable = client,
): Promise<WorkoutExerciseRow[]> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT we.id, we.workout_block_id, we.exercise_id, we.position, we.default_rest_seconds,
            e.name,
            (SELECT c.name FROM exercise_category ec JOIN category c ON c.id = ec.category_id
              WHERE ec.exercise_id = e.id ORDER BY c.id LIMIT 1) AS category_name,
            (SELECT GROUP_CONCAT(eq.name ORDER BY eq.name SEPARATOR ' · ')
               FROM exercise_equipment ee JOIN equipment eq ON eq.id = ee.equipment_id
              WHERE ee.exercise_id = e.id) AS equipment_names,
            (SELECT GROUP_CONCAT(m.code ORDER BY m.id SEPARATOR ',')
               FROM exercise_measure em JOIN measure m ON m.id = em.measure_id
              WHERE em.exercise_id = e.id) AS measure_codes
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
