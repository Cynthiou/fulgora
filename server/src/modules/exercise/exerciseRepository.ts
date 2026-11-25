import type { Difficulty } from "shared";
import client, { type Queryable, type Rows } from "../../database/client.js";

// One function, one query. No business rule here: the action decides.

export type ExerciseRow = {
  id: number;
  slug: string;
  name: string;
  difficulty: Difficulty;
  image_female_url: string | null;
  image_male_url: string | null;
  // 0 or 1 in MySQL
  is_personal: number;
  category_name: string | null;
  // "Barre · Haltères", built by GROUP_CONCAT
  equipment_names: string | null;
};

// Who can see what (RM-007): the shared catalog and the user's own exercises,
// never the personal exercises of others; an archived exercise is hidden.
const VISIBLE_WHERE =
  "(e.owner_user_id IS NULL OR e.owner_user_id = ?) AND e.is_archived = FALSE";

// A page of the catalog, sorted by name. LIMIT and OFFSET are passed as
// strings: a known quirk of mysql2 with execute (common rule 8).
export async function readExercises(
  userId: number,
  limit: number,
  offset: number,
  db: Queryable = client,
): Promise<ExerciseRow[]> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT e.id, e.slug, e.name, e.difficulty, e.image_female_url, e.image_male_url,
            (e.owner_user_id IS NOT NULL) AS is_personal,
            (SELECT c.name
               FROM exercise_category ec
               JOIN category c ON c.id = ec.category_id
              WHERE ec.exercise_id = e.id
              ORDER BY c.id
              LIMIT 1) AS category_name,
            (SELECT GROUP_CONCAT(eq.name ORDER BY eq.name SEPARATOR ' · ')
               FROM exercise_equipment ee
               JOIN equipment eq ON eq.id = ee.equipment_id
              WHERE ee.exercise_id = e.id) AS equipment_names
       FROM exercise e
      WHERE ${VISIBLE_WHERE}
      ORDER BY e.name, e.id
      LIMIT ? OFFSET ?`,
    [userId, String(limit), String(offset)],
  );
  return rows as ExerciseRow[];
}

// How many exercises the user can see: same WHERE as the list.
export async function countExercises(
  userId: number,
  db: Queryable = client,
): Promise<number> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT COUNT(*) AS total FROM exercise e WHERE ${VISIBLE_WHERE}`,
    [userId],
  );
  return Number(rows[0]?.total ?? 0);
}
