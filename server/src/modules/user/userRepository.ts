import {
  DEFAULT_PREFERENCES,
  HOME_METRICS,
  type HomeMetric,
  type PublicUser,
  type UpdatePreferencesInput,
} from "shared";
import client, {
  type Queryable,
  type Result,
  type Rows,
} from "../../database/client.js";

// One function, one query. No business rule here: the action decides.

// Creates the account and returns its id. The unique keys uq_user_username
// and uq_user_email refuse a duplicate with ER_DUP_ENTRY.
export async function createUser(
  username: string,
  email: string,
  passwordHash: string,
  db: Queryable = client,
): Promise<number> {
  const [result] = await db.execute<Result>(
    "INSERT INTO `user` (username, email, password_hash, terms_accepted_at) VALUES (?, ?, ?, NOW(3))",
    [username, email, passwordHash],
  );
  return result.insertId;
}

// The columns every read of a user needs, preferences included (US-05).
const USER_COLUMNS =
  "id, username, email, sex, weight_unit, distance_unit, home_metric, sound_enabled, vibration_enabled, timer_notification_enabled";

// One row of the table turned into the user the client reads. The booleans
// arrive as 0 or 1, and an empty home_metric means the default one (D-04).
function toPublicUser(row: Rows): PublicUser {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    sex: row.sex,
    preferences: {
      weight_unit: row.weight_unit,
      distance_unit: row.distance_unit,
      home_metric: HOME_METRICS.includes(row.home_metric as HomeMetric)
        ? (row.home_metric as HomeMetric)
        : DEFAULT_PREFERENCES.home_metric,
      sound_enabled: Boolean(row.sound_enabled),
      vibration_enabled: Boolean(row.vibration_enabled),
      timer_notification_enabled: Boolean(row.timer_notification_enabled),
    },
  };
}

// The user without the hash, for GET /api/auth/me. Null when unknown.
export async function readUser(
  id: number,
  db: Queryable = client,
): Promise<PublicUser | null> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT ${USER_COLUMNS} FROM \`user\` WHERE id = ?`,
    [id],
  );
  const row = rows[0];
  return row === undefined ? null : toPublicUser(row);
}

// The user WITH the hash, only for the login check. The identifier is a
// username or an e-mail: both columns are tried (the e-mail in lowercase).
export type UserWithHash = PublicUser & { password_hash: string };

export async function readUserByIdentifier(
  identifier: string,
  db: Queryable = client,
): Promise<UserWithHash | null> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT ${USER_COLUMNS}, password_hash FROM \`user\` WHERE email = ? OR username = ? LIMIT 1`,
    [identifier.toLowerCase(), identifier],
  );
  const row = rows[0];
  return row === undefined
    ? null
    : { ...toPublicUser(row), password_hash: row.password_hash };
}

// US-04: the profile of the user. The e-mail is never touched (RM-003).
export async function updateUserProfile(
  id: number,
  username: string,
  sex: "female" | "male" | null,
  db: Queryable = client,
): Promise<void> {
  await db.execute("UPDATE `user` SET username = ?, sex = ? WHERE id = ?", [
    username,
    sex,
    id,
  ]);
}

// US-05: one preference or several (RM-005). The columns that may be
// written are listed here, in the code: nothing else can be touched, even
// if a field slipped through the schema.
const PREFERENCE_COLUMNS = [
  "weight_unit",
  "distance_unit",
  "home_metric",
  "sound_enabled",
  "vibration_enabled",
  "timer_notification_enabled",
] as const;

export async function updateUserPreferences(
  id: number,
  values: UpdatePreferencesInput,
  db: Queryable = client,
): Promise<void> {
  const columns = PREFERENCE_COLUMNS.filter((column) => column in values);
  if (columns.length === 0) {
    return;
  }
  const assignments = columns.map((column) => `${column} = ?`).join(", ");
  await db.query(`UPDATE \`user\` SET ${assignments} WHERE id = ?`, [
    ...columns.map((column) => values[column]),
    id,
  ]);
}
