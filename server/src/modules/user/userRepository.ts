import type { PublicUser } from "shared";
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

// The user without the hash, for GET /api/auth/me. Null when unknown.
export async function readUser(
  id: number,
  db: Queryable = client,
): Promise<PublicUser | null> {
  const [rows] = await db.execute<Rows[]>(
    "SELECT id, username, email, sex FROM `user` WHERE id = ?",
    [id],
  );
  return (rows[0] as PublicUser | undefined) ?? null;
}

// The user WITH the hash, only for the login check. The identifier is a
// username or an e-mail: both columns are tried (the e-mail in lowercase).
export type UserWithHash = PublicUser & { password_hash: string };

export async function readUserByIdentifier(
  identifier: string,
  db: Queryable = client,
): Promise<UserWithHash | null> {
  const [rows] = await db.execute<Rows[]>(
    "SELECT id, username, email, sex, password_hash FROM `user` WHERE email = ? OR username = ? LIMIT 1",
    [identifier.toLowerCase(), identifier],
  );
  return (rows[0] as UserWithHash | undefined) ?? null;
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
