import mysql from "mysql2/promise";

// A pool keeps a few connections open and lends them to each query.
const client = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

export default client;

// Rows = result of a SELECT, Result = result of an INSERT / UPDATE / DELETE.
export type { ResultSetHeader as Result, RowDataPacket as Rows } from "mysql2";
