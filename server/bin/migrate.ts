// Creates the database from schema.sql.
// Warning: the database is deleted first, so every row is lost.
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

const schemaPath = path.join(import.meta.dirname, "../database/schema.sql");

async function migrate() {
  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

  // No "database" option here: the database does not exist yet.
  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true, // schema.sql holds many CREATE TABLE
  });

  try {
    await connection.query(`DROP DATABASE IF EXISTS \`${DB_NAME}\``);
    await connection.query(
      `CREATE DATABASE \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
    );
    await connection.query(`USE \`${DB_NAME}\``);

    const schema = fs.readFileSync(schemaPath, "utf8");
    await connection.query(schema);

    console.info(`Database "${DB_NAME}" created from schema.sql`);
  } finally {
    await connection.end();
  }
}

migrate().catch((error) => {
  console.error("Migration failed:", error.message);
  process.exitCode = 1;
});
