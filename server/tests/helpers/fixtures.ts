// Rows written into fulgora_test by the integration tests, and removed after.
// Every test file uses its own prefix: files run in parallel and must never
// clean each other's rows.
import client, { type Result, type Rows } from "../../src/database/client.js";
import { signToken } from "../../src/utils/token.js";

export type TestUser = { id: number; username: string; cookie: string };

// A user that can only be used through its cookie (the hash is not a real one).
export async function createTestUser(prefix: string): Promise<TestUser> {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 100_000)}`;
  const username = `${prefix}${stamp}`;
  const [result] = await client.execute<Result>(
    "INSERT INTO `user` (username, email, password_hash, terms_accepted_at) VALUES (?, ?, 'not-a-hash', NOW(3))",
    [username, `${username}@exemple.fr`],
  );
  return {
    id: result.insertId,
    username,
    cookie: `fulgora_token=${signToken(result.insertId)}`,
  };
}

export type TestAppointmentOptions = {
  name: string;
  date: string;
  time?: string | null;
  // Number of exercises in each block, for example [3, 2] = 2 blocks, 5 exercises.
  blocks?: number[];
};

// A session (template, version 1, blocks, exercises) and its appointment,
// owned by the user. Exercises are created on the fly for the test.
export async function createTestAppointment(
  user: TestUser,
  options: TestAppointmentOptions,
): Promise<{ appointmentId: number; versionId: number }> {
  const { name, date, time = null, blocks = [1] } = options;

  const [template] = await client.execute<Result>(
    "INSERT INTO session_template (owner_user_id, name) VALUES (?, ?)",
    [user.id, name],
  );
  const [version] = await client.execute<Result>(
    "INSERT INTO session_version (session_template_id, version_number) VALUES (?, 1)",
    [template.insertId],
  );

  for (const [blockIndex, exerciseCount] of blocks.entries()) {
    const [block] = await client.execute<Result>(
      "INSERT INTO template_block (session_version_id, block_type, position) VALUES (?, 'classic', ?)",
      [version.insertId, blockIndex + 1],
    );
    for (let position = 1; position <= exerciseCount; position += 1) {
      const slug = `${user.username}-${template.insertId}-${blockIndex}-${position}`;
      const [exercise] = await client.execute<Result>(
        "INSERT INTO exercise (owner_user_id, slug, name, difficulty) VALUES (?, ?, ?, 'beginner')",
        [user.id, slug, `Exercice ${slug}`],
      );
      await client.execute(
        "INSERT INTO template_block_exercise (template_block_id, exercise_id, position) VALUES (?, ?, ?)",
        [block.insertId, exercise.insertId, position],
      );
    }
  }

  const [appointment] = await client.execute<Result>(
    "INSERT INTO appointment (owner_user_id, session_version_id, planned_date, planned_time, status) VALUES (?, ?, ?, ?, 'planned')",
    [user.id, version.insertId, date, time],
  );
  return { appointmentId: appointment.insertId, versionId: version.insertId };
}

// Removes everything created for the users whose name starts with the prefix,
// children before parents (foreign keys are RESTRICT, DT-17).
export async function deleteTestUsers(prefix: string): Promise<void> {
  const [users] = await client.execute<Rows[]>(
    "SELECT id FROM `user` WHERE username LIKE ?",
    [`${prefix}%`],
  );
  const ids = users.map((row) => Number(row.id));
  if (ids.length === 0) {
    return;
  }

  const statements = [
    // The notifications point at the appointments (DT-17): they go first.
    "DELETE FROM notification WHERE user_id IN (?)",
    "DELETE FROM workout_set WHERE workout_exercise_id IN (SELECT we.id FROM workout_exercise we JOIN workout_block wb ON wb.id = we.workout_block_id JOIN workout_session ws ON ws.id = wb.workout_session_id WHERE ws.owner_user_id IN (?))",
    "DELETE FROM workout_exercise WHERE workout_block_id IN (SELECT wb.id FROM workout_block wb JOIN workout_session ws ON ws.id = wb.workout_session_id WHERE ws.owner_user_id IN (?))",
    "DELETE FROM workout_block WHERE workout_session_id IN (SELECT id FROM workout_session WHERE owner_user_id IN (?))",
    "DELETE FROM workout_session WHERE owner_user_id IN (?)",
    "DELETE FROM appointment WHERE owner_user_id IN (?)",
    "DELETE FROM weekly_schedule WHERE program_id IN (SELECT id FROM program WHERE owner_user_id IN (?))",
    "DELETE FROM program WHERE owner_user_id IN (?)",
    "DELETE FROM planned_set WHERE template_block_exercise_id IN (SELECT tbe.id FROM template_block_exercise tbe JOIN template_block tb ON tb.id = tbe.template_block_id JOIN session_version sv ON sv.id = tb.session_version_id JOIN session_template st ON st.id = sv.session_template_id WHERE st.owner_user_id IN (?))",
    "DELETE FROM template_block_exercise WHERE template_block_id IN (SELECT tb.id FROM template_block tb JOIN session_version sv ON sv.id = tb.session_version_id JOIN session_template st ON st.id = sv.session_template_id WHERE st.owner_user_id IN (?))",
    "DELETE FROM template_block WHERE session_version_id IN (SELECT sv.id FROM session_version sv JOIN session_template st ON st.id = sv.session_template_id WHERE st.owner_user_id IN (?))",
    "DELETE FROM session_version WHERE session_template_id IN (SELECT id FROM session_template WHERE owner_user_id IN (?))",
    "DELETE FROM session_template WHERE owner_user_id IN (?)",
    "DELETE FROM exercise WHERE owner_user_id IN (?)",
    "DELETE FROM `user` WHERE id IN (?)",
  ];
  for (const statement of statements) {
    await client.query(statement, [ids]);
  }
}
