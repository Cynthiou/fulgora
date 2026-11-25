// Creates the demonstration account and its first free session, so that the
// app can be tried and tested on realistic data. Development only.
import type {
  Connection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import { todayInParis } from "shared";
import { hashPassword } from "../utils/password.js";

export const DEMO_USERNAME = "demo";
export const DEMO_EMAIL = "demo@fulgora.local";

// Thrown in production: the demo account must never exist there.
export class SeedRefusedError extends Error {
  constructor() {
    super("Seed refused: NODE_ENV is production, no demo account is created.");
    this.name = "SeedRefusedError";
  }
}

type DemoSet = {
  reps?: number;
  weight_kg?: number;
  duration_seconds?: number;
  speed_kmh?: number;
  incline_percent?: number;
};

type DemoExercise = {
  slug: string;
  rest_seconds: number;
  sets: DemoSet[];
};

// "Haut du corps", the free session of the wireframes (screen B1):
// one classic block "Force" with 6 exercises.
const DEMO_SESSION_NAME = "Haut du corps";
const DEMO_BLOCK_NAME = "Force";
const DEMO_PLANNED_TIME = "18:30:00";
const DEMO_EXERCISES: DemoExercise[] = [
  {
    slug: "barbell-bench-press",
    rest_seconds: 90,
    sets: [
      { reps: 10, weight_kg: 40 },
      { reps: 10, weight_kg: 40 },
      { reps: 10, weight_kg: 40 },
    ],
  },
  {
    slug: "pull-ups",
    rest_seconds: 90,
    sets: [{ reps: 8 }, { reps: 8 }, { reps: 8 }],
  },
  {
    slug: "plank",
    rest_seconds: 60,
    sets: [
      { duration_seconds: 60 },
      { duration_seconds: 60 },
      { duration_seconds: 60 },
    ],
  },
  {
    slug: "treadmill",
    rest_seconds: 0,
    sets: [{ duration_seconds: 600, speed_kmh: 9, incline_percent: 1 }],
  },
  {
    slug: "barbell-biceps-curl",
    rest_seconds: 90,
    sets: [
      { reps: 12, weight_kg: 10 },
      { reps: 12, weight_kg: 10 },
      { reps: 12, weight_kg: 10 },
    ],
  },
  {
    slug: "side-plank",
    rest_seconds: 60,
    sets: [
      { duration_seconds: 30 },
      { duration_seconds: 30 },
      { duration_seconds: 30 },
    ],
  },
];

export type SeedDemoOptions = {
  // The demo password, read from DEMO_PASSWORD by the script.
  password: string;
  // Defaults to process.env.NODE_ENV; a parameter so tests can simulate production.
  nodeEnv?: string;
  // The planned date of the session; today in Paris by default.
  today?: string;
  log?: (message: string) => void;
};

async function readExerciseId(connection: Connection, slug: string) {
  const [rows] = await connection.execute<RowDataPacket[]>(
    "SELECT id FROM exercise WHERE slug = ?",
    [slug],
  );
  const id = rows[0]?.id;
  if (id === undefined) {
    throw new Error(`Exercise "${slug}" is missing: run npm run db:seed first`);
  }
  return Number(id);
}

// Returns "created", or "skipped" when the demo account already exists.
export async function seedDemo(
  connection: Connection,
  options: SeedDemoOptions,
): Promise<"created" | "skipped"> {
  const {
    password,
    nodeEnv = process.env.NODE_ENV,
    today = todayInParis(),
    log = console.info,
  } = options;

  if (nodeEnv === "production") {
    throw new SeedRefusedError();
  }

  const [existing] = await connection.execute<RowDataPacket[]>(
    "SELECT id FROM `user` WHERE username = ?",
    [DEMO_USERNAME],
  );
  if (existing.length > 0) {
    log(`The "${DEMO_USERNAME}" account already exists: nothing was inserted.`);
    return "skipped";
  }

  // Hash first: it takes a moment and needs no transaction.
  const passwordHash = await hashPassword(password);

  // All or nothing: the account, its session and its appointment together.
  await connection.beginTransaction();
  try {
    const [user] = await connection.execute<ResultSetHeader>(
      "INSERT INTO `user` (username, email, password_hash, terms_accepted_at) VALUES (?, ?, ?, NOW(3))",
      [DEMO_USERNAME, DEMO_EMAIL, passwordHash],
    );
    const userId = user.insertId;

    const [template] = await connection.execute<ResultSetHeader>(
      "INSERT INTO session_template (owner_user_id, name) VALUES (?, ?)",
      [userId, DEMO_SESSION_NAME],
    );
    const [version] = await connection.execute<ResultSetHeader>(
      "INSERT INTO session_version (session_template_id, version_number) VALUES (?, 1)",
      [template.insertId],
    );
    const [block] = await connection.execute<ResultSetHeader>(
      "INSERT INTO template_block (session_version_id, block_type, name, position) VALUES (?, 'classic', ?, 1)",
      [version.insertId, DEMO_BLOCK_NAME],
    );

    // Positions start at 1 and follow the order of the lists (RM-024).
    for (const [exerciseIndex, exercise] of DEMO_EXERCISES.entries()) {
      const exerciseId = await readExerciseId(connection, exercise.slug);
      const [blockExercise] = await connection.execute<ResultSetHeader>(
        "INSERT INTO template_block_exercise (template_block_id, exercise_id, position, default_rest_seconds) VALUES (?, ?, ?, ?)",
        [block.insertId, exerciseId, exerciseIndex + 1, exercise.rest_seconds],
      );

      for (const [setIndex, set] of exercise.sets.entries()) {
        await connection.execute(
          `INSERT INTO planned_set
            (template_block_exercise_id, position, reps, weight_kg, duration_seconds, speed_kmh, incline_percent)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            blockExercise.insertId,
            setIndex + 1,
            set.reps ?? null,
            set.weight_kg ?? null,
            set.duration_seconds ?? null,
            set.speed_kmh ?? null,
            set.incline_percent ?? null,
          ],
        );
      }
    }

    // A free session: no program, no weekly schedule (RM-015).
    await connection.execute(
      "INSERT INTO appointment (owner_user_id, session_version_id, planned_date, planned_time, status) VALUES (?, ?, ?, ?, 'planned')",
      [userId, version.insertId, today, DEMO_PLANNED_TIME],
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }

  log(
    `Demo account "${DEMO_USERNAME}" created with the session "${DEMO_SESSION_NAME}" on ${today}`,
  );
  return "created";
}
