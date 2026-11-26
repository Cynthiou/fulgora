import client, { type Queryable } from "../../database/client.js";

// US-06: everything a user owns, deleted table by table, children before
// parents (DT-17: the foreign keys are RESTRICT on purpose, so nothing
// disappears by accident). One function, one query; the action calls them
// in order inside a single transaction.

// --- The realized sessions --------------------------------------------------

// The join goes up to the owner of the session: never delete by id alone.
const WORKOUT_CHAIN =
  "JOIN workout_exercise we ON we.id = ws2.workout_exercise_id JOIN workout_block wb ON wb.id = we.workout_block_id JOIN workout_session s ON s.id = wb.workout_session_id";

export async function deleteUserNotifications(
  userId: number,
  db: Queryable = client,
): Promise<void> {
  await db.execute("DELETE FROM notification WHERE user_id = ?", [userId]);
}

export async function deleteUserWorkoutSetSides(
  userId: number,
  db: Queryable = client,
): Promise<void> {
  await db.execute(
    `DELETE wss FROM workout_set_side wss JOIN workout_set ws2 ON ws2.id = wss.workout_set_id ${WORKOUT_CHAIN} WHERE s.owner_user_id = ?`,
    [userId],
  );
}

export async function deleteUserWorkoutSets(
  userId: number,
  db: Queryable = client,
): Promise<void> {
  await db.execute(
    `DELETE ws2 FROM workout_set ws2 ${WORKOUT_CHAIN} WHERE s.owner_user_id = ?`,
    [userId],
  );
}

export async function deleteUserWorkoutExercises(
  userId: number,
  db: Queryable = client,
): Promise<void> {
  await db.execute(
    "DELETE we FROM workout_exercise we JOIN workout_block wb ON wb.id = we.workout_block_id JOIN workout_session s ON s.id = wb.workout_session_id WHERE s.owner_user_id = ?",
    [userId],
  );
}

export async function deleteUserWorkoutBlocks(
  userId: number,
  db: Queryable = client,
): Promise<void> {
  await db.execute(
    "DELETE wb FROM workout_block wb JOIN workout_session s ON s.id = wb.workout_session_id WHERE s.owner_user_id = ?",
    [userId],
  );
}

export async function deleteUserWorkoutSessions(
  userId: number,
  db: Queryable = client,
): Promise<void> {
  await db.execute("DELETE FROM workout_session WHERE owner_user_id = ?", [
    userId,
  ]);
}

export async function deleteUserAppointments(
  userId: number,
  db: Queryable = client,
): Promise<void> {
  await db.execute("DELETE FROM appointment WHERE owner_user_id = ?", [userId]);
}

// --- The programs -----------------------------------------------------------

export async function deleteUserWeeklySchedules(
  userId: number,
  db: Queryable = client,
): Promise<void> {
  await db.execute(
    "DELETE wsch FROM weekly_schedule wsch JOIN program p ON p.id = wsch.program_id WHERE p.owner_user_id = ?",
    [userId],
  );
}

export async function deleteUserProgramChanges(
  userId: number,
  db: Queryable = client,
): Promise<void> {
  await db.execute(
    "DELETE pc FROM program_change pc JOIN program p ON p.id = pc.program_id WHERE p.owner_user_id = ?",
    [userId],
  );
}

// A program copied from another one keeps a link to it. The link is cut
// first, otherwise the parent cannot be deleted.
export async function clearProgramSources(
  userId: number,
  db: Queryable = client,
): Promise<void> {
  await db.execute(
    "UPDATE program copy JOIN program source ON source.id = copy.source_program_id SET copy.source_program_id = NULL WHERE source.owner_user_id = ?",
    [userId],
  );
}

export async function deleteUserPrograms(
  userId: number,
  db: Queryable = client,
): Promise<void> {
  await db.execute("DELETE FROM program WHERE owner_user_id = ?", [userId]);
}

// --- The session templates --------------------------------------------------

const TEMPLATE_CHAIN =
  "JOIN session_version sv ON sv.id = tb.session_version_id JOIN session_template st ON st.id = sv.session_template_id";

export async function deleteUserPlannedSets(
  userId: number,
  db: Queryable = client,
): Promise<void> {
  await db.execute(
    `DELETE ps FROM planned_set ps JOIN template_block_exercise tbe ON tbe.id = ps.template_block_exercise_id JOIN template_block tb ON tb.id = tbe.template_block_id ${TEMPLATE_CHAIN} WHERE st.owner_user_id = ?`,
    [userId],
  );
}

export async function deleteUserTemplateBlockExercises(
  userId: number,
  db: Queryable = client,
): Promise<void> {
  await db.execute(
    `DELETE tbe FROM template_block_exercise tbe JOIN template_block tb ON tb.id = tbe.template_block_id ${TEMPLATE_CHAIN} WHERE st.owner_user_id = ?`,
    [userId],
  );
}

export async function deleteUserTemplateBlocks(
  userId: number,
  db: Queryable = client,
): Promise<void> {
  await db.execute(
    `DELETE tb FROM template_block tb ${TEMPLATE_CHAIN} WHERE st.owner_user_id = ?`,
    [userId],
  );
}

export async function deleteUserSessionVersions(
  userId: number,
  db: Queryable = client,
): Promise<void> {
  await db.execute(
    "DELETE sv FROM session_version sv JOIN session_template st ON st.id = sv.session_template_id WHERE st.owner_user_id = ?",
    [userId],
  );
}

export async function deleteUserSessionTemplates(
  userId: number,
  db: Queryable = client,
): Promise<void> {
  await db.execute("DELETE FROM session_template WHERE owner_user_id = ?", [
    userId,
  ]);
}

// --- The personal exercises -------------------------------------------------
// The catalog (owner_user_id IS NULL) is never touched (RM-006).

export async function clearExerciseSources(
  userId: number,
  db: Queryable = client,
): Promise<void> {
  await db.execute(
    "UPDATE exercise copy JOIN exercise source ON source.id = copy.source_exercise_id SET copy.source_exercise_id = NULL WHERE source.owner_user_id = ?",
    [userId],
  );
}

export async function deleteUserExerciseTexts(
  userId: number,
  db: Queryable = client,
): Promise<void> {
  await db.execute(
    "DELETE et FROM exercise_text et JOIN exercise e ON e.id = et.exercise_id WHERE e.owner_user_id = ?",
    [userId],
  );
}

export async function deleteUserExerciseCategories(
  userId: number,
  db: Queryable = client,
): Promise<void> {
  await db.execute(
    "DELETE ec FROM exercise_category ec JOIN exercise e ON e.id = ec.exercise_id WHERE e.owner_user_id = ?",
    [userId],
  );
}

export async function deleteUserExerciseMuscles(
  userId: number,
  db: Queryable = client,
): Promise<void> {
  await db.execute(
    "DELETE em FROM exercise_muscle em JOIN exercise e ON e.id = em.exercise_id WHERE e.owner_user_id = ?",
    [userId],
  );
}

export async function deleteUserExerciseEquipment(
  userId: number,
  db: Queryable = client,
): Promise<void> {
  await db.execute(
    "DELETE ee FROM exercise_equipment ee JOIN exercise e ON e.id = ee.exercise_id WHERE e.owner_user_id = ?",
    [userId],
  );
}

export async function deleteUserExerciseMeasures(
  userId: number,
  db: Queryable = client,
): Promise<void> {
  await db.execute(
    "DELETE eme FROM exercise_measure eme JOIN exercise e ON e.id = eme.exercise_id WHERE e.owner_user_id = ?",
    [userId],
  );
}

export async function deleteUserExercises(
  userId: number,
  db: Queryable = client,
): Promise<void> {
  await db.execute("DELETE FROM exercise WHERE owner_user_id = ?", [userId]);
}

// --- The account itself -----------------------------------------------------

export async function deleteUserRow(
  userId: number,
  db: Queryable = client,
): Promise<void> {
  await db.execute("DELETE FROM `user` WHERE id = ?", [userId]);
}
