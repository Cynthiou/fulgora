import { requireEnv } from "../utils/env.js";

// How to reach MySQL. Used by the scripts (migrate, seed) and the tests.
export type DatabaseConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

// The configuration found in the environment (.env in development).
export function readDatabaseConfig(): DatabaseConfig {
  return {
    host: requireEnv("DB_HOST"),
    port: Number(requireEnv("DB_PORT")),
    user: requireEnv("DB_USER"),
    password: requireEnv("DB_PASSWORD"),
    database: requireEnv("DB_NAME"),
  };
}
