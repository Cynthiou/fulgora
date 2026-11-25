// A transaction groups several writes into one all-or-nothing step.
//
// Saving a session writes into 6 tables. If the 4th write fails, the 3 first
// ones must disappear too: the database must never hold half of a session.
// MySQL does this with BEGIN ... COMMIT (everything is kept) or ROLLBACK
// (everything is undone). All the writes must go through the SAME connection,
// so withTransaction borrows one from the pool and hands it to the work.
//
// Usage in an action:
//   const id = await withTransaction(async (connection) => {
//     const templateId = await createSessionTemplate(name, connection);
//     await createSessionVersion(templateId, connection);
//     return templateId;
//   });
//
// Every repository function accepts "db: Queryable = client": the pool by
// default, or the connection of the transaction when one is running.
import type { PoolConnection } from "mysql2/promise";
import client from "./client.js";

export async function withTransaction<T>(
  work: (connection: PoolConnection) => Promise<T>,
): Promise<T> {
  const connection = await client.getConnection();

  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    // Undo everything written since beginTransaction, then let the caller
    // decide what to answer.
    await connection.rollback();
    throw error;
  } finally {
    // Always give the connection back, even after an error: otherwise the
    // pool runs dry and the server freezes.
    connection.release();
  }
}
