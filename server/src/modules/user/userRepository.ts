import client, { type Queryable, type Result } from "../../database/client.js";

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
