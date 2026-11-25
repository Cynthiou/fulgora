import type { PlannedSetValues, SessionDraftInput } from "shared";
import client, {
  type Queryable,
  type Result,
  type Rows,
} from "../../database/client.js";

// One function, one query. All of them take the connection of the running
// transaction (db), so that a session is saved whole or not at all (US-23).

type BlockInput = SessionDraftInput["blocks"][number];

// The session itself: a name owned by a user.
export async function createSessionTemplate(
  userId: number,
  name: string,
  db: Queryable = client,
): Promise<number> {
  const [result] = await db.execute<Result>(
    "INSERT INTO session_template (owner_user_id, name) VALUES (?, ?)",
    [userId, name],
  );
  return result.insertId;
}

// Version 1 of a new session (RM-016: a session is never edited in place).
export async function createSessionVersion(
  sessionTemplateId: number,
  db: Queryable = client,
): Promise<number> {
  const [result] = await db.execute<Result>(
    "INSERT INTO session_version (session_template_id, version_number) VALUES (?, 1)",
    [sessionTemplateId],
  );
  return result.insertId;
}

// One block of a version, at its position (1, 2, 3...), RM-024.
export async function createTemplateBlock(
  sessionVersionId: number,
  block: BlockInput,
  position: number,
  db: Queryable = client,
): Promise<number> {
  const [result] = await db.execute<Result>(
    `INSERT INTO template_block (session_version_id, block_type, name, position, instructions)
     VALUES (?, ?, ?, ?, ?)`,
    [
      sessionVersionId,
      block.block_type,
      block.name,
      position,
      block.instructions,
    ],
  );
  return result.insertId;
}

// One exercise of a block, with its default rest (RM-023).
export async function createTemplateBlockExercise(
  templateBlockId: number,
  exerciseId: number,
  position: number,
  defaultRestSeconds: number | null,
  db: Queryable = client,
): Promise<number> {
  const [result] = await db.execute<Result>(
    `INSERT INTO template_block_exercise (template_block_id, exercise_id, position, default_rest_seconds)
     VALUES (?, ?, ?, ?)`,
    [templateBlockId, exerciseId, position, defaultRestSeconds],
  );
  return result.insertId;
}

// One planned set, in the stored units (DT-11): kg, meters, seconds, km/h.
export async function createPlannedSet(
  templateBlockExerciseId: number,
  position: number,
  set: PlannedSetValues,
  db: Queryable = client,
): Promise<number> {
  const [result] = await db.execute<Result>(
    `INSERT INTO planned_set (template_block_exercise_id, position, reps, weight_kg,
        duration_seconds, distance_meters, speed_kmh, resistance, incline_percent,
        calories, rest_after_seconds)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      templateBlockExerciseId,
      position,
      set.reps,
      set.weight_kg,
      set.duration_seconds,
      set.distance_meters,
      set.speed_kmh,
      set.resistance,
      set.incline_percent,
      set.calories,
      set.rest_after_seconds,
    ],
  );
  return result.insertId;
}

// How many exercises a version holds: zero means it cannot start (RM-018).
export async function countVersionExercises(
  sessionVersionId: number,
  db: Queryable = client,
): Promise<number> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT COUNT(*) AS total
       FROM template_block_exercise tbe
       JOIN template_block tb ON tb.id = tbe.template_block_id
      WHERE tb.session_version_id = ?`,
    [sessionVersionId],
  );
  return Number(rows[0]?.total ?? 0);
}
