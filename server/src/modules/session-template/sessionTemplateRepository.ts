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

// One version of a session: number 1 at the creation, the next one at every
// change (RM-016, RM-017: a version is never edited in place).
export async function createSessionVersion(
  sessionTemplateId: number,
  versionNumber: number,
  db: Queryable = client,
): Promise<number> {
  const [result] = await db.execute<Result>(
    "INSERT INTO session_version (session_template_id, version_number) VALUES (?, ?)",
    [sessionTemplateId, versionNumber],
  );
  return result.insertId;
}

// The number the next version will take. FOR UPDATE: two changes at the same
// time wait for each other instead of fighting over the unique index.
export async function readNextVersionNumber(
  sessionTemplateId: number,
  db: Queryable = client,
): Promise<number> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT COALESCE(MAX(version_number), 0) + 1 AS next_number
       FROM session_version
      WHERE session_template_id = ?
      FOR UPDATE`,
    [sessionTemplateId],
  );
  return Number(rows[0]?.next_number ?? 1);
}

// Which session a version belongs to.
export async function readVersionTemplateId(
  sessionVersionId: number,
  db: Queryable = client,
): Promise<number | null> {
  const [rows] = await db.execute<Rows[]>(
    "SELECT session_template_id FROM session_version WHERE id = ?",
    [sessionVersionId],
  );
  const id = rows[0]?.session_template_id;
  return id === undefined ? null : Number(id);
}

// The name belongs to the session, not to one of its versions (US-17).
export async function updateSessionTemplateName(
  sessionTemplateId: number,
  name: string,
  db: Queryable = client,
): Promise<void> {
  await db.execute("UPDATE session_template SET name = ? WHERE id = ?", [
    name,
    sessionTemplateId,
  ]);
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
