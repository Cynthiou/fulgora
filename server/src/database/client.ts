import mysql, { type Pool, type PoolConnection } from "mysql2/promise";

// A pool keeps a few connections open and lends them to each query.
const client = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // A DATE column is a calendar day, not a moment: keep it as "YYYY-MM-DD"
  // instead of a JavaScript Date that would shift with the time zone.
  dateStrings: ["DATE"],
});

export default client;

// What a repository function queries: the pool itself, or the single
// connection of a running transaction (see withTransaction.ts).
export type Queryable = Pool | PoolConnection;

// Rows = result of a SELECT, Result = result of an INSERT / UPDATE / DELETE.
export type { ResultSetHeader as Result, RowDataPacket as Rows } from "mysql2";
