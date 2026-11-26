import {
  type Difficulty,
  type ExerciseFilters,
  escapeLike,
  type MeasureCode,
} from "shared";
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
  // "reps,weight", built by GROUP_CONCAT; null without any measure
  measure_codes: string | null;
  // 0 or 1: the exercise uses the body weight ("Poids du corps")
  is_bodyweight: number;
  // 0 or 1: the exercise can be done left then right (RM-084)
  allows_per_side: number;
};

// The WHERE of the catalog: who can see what (RM-007), then the filters.
// Every piece of SQL is a constant; only the values travel as parameters.
// The filters combine with AND; inside a filter, the choices are an OR (IN).
function buildWhere(
  userId: number,
  filters: ExerciseFilters,
): { sql: string; params: unknown[] } {
  const conditions = [
    "(e.owner_user_id IS NULL OR e.owner_user_id = ?)",
    "e.is_archived = FALSE",
  ];
  const params: unknown[] = [userId];

  if (filters.search !== undefined && filters.search !== "") {
    // "\" escapes the LIKE wildcards: a typed "%" is searched as a percent sign.
    conditions.push("e.name LIKE ? ESCAPE '\\\\'");
    params.push(`%${escapeLike(filters.search)}%`);
  }
  if (filters.category_ids !== undefined && filters.category_ids.length > 0) {
    conditions.push(
      "EXISTS (SELECT 1 FROM exercise_category ec WHERE ec.exercise_id = e.id AND ec.category_id IN (?))",
    );
    params.push(filters.category_ids);
  }
  if (filters.equipment_ids !== undefined && filters.equipment_ids.length > 0) {
    conditions.push(
      "EXISTS (SELECT 1 FROM exercise_equipment ee WHERE ee.exercise_id = e.id AND ee.equipment_id IN (?))",
    );
    params.push(filters.equipment_ids);
  }
  if (filters.difficulties !== undefined && filters.difficulties.length > 0) {
    conditions.push("e.difficulty IN (?)");
    params.push(filters.difficulties);
  }

  return { sql: conditions.join(" AND "), params };
}

// A page of the catalog, sorted by name. Uses query, not execute, because of
// the lists in IN (?) (common rule 8).
export async function readExercises(
  userId: number,
  filters: ExerciseFilters,
  limit: number,
  offset: number,
  db: Queryable = client,
): Promise<ExerciseRow[]> {
  const where = buildWhere(userId, filters);
  const [rows] = await db.query<Rows[]>(
    `SELECT e.id, e.slug, e.name, e.difficulty, e.image_female_url, e.image_male_url,
            (e.owner_user_id IS NOT NULL) AS is_personal, e.allows_per_side,
            (SELECT c.name
               FROM exercise_category ec
               JOIN category c ON c.id = ec.category_id
              WHERE ec.exercise_id = e.id
              ORDER BY c.id
              LIMIT 1) AS category_name,
            (SELECT GROUP_CONCAT(eq.name ORDER BY eq.name SEPARATOR ' · ')
               FROM exercise_equipment ee
               JOIN equipment eq ON eq.id = ee.equipment_id
              WHERE ee.exercise_id = e.id) AS equipment_names,
            (SELECT GROUP_CONCAT(m.code ORDER BY m.id SEPARATOR ',')
               FROM exercise_measure em
               JOIN measure m ON m.id = em.measure_id
              WHERE em.exercise_id = e.id) AS measure_codes,
            EXISTS (SELECT 1 FROM exercise_equipment ee2
                      JOIN equipment eq2 ON eq2.id = ee2.equipment_id
                     WHERE ee2.exercise_id = e.id AND eq2.code = 'bodyweight') AS is_bodyweight
       FROM exercise e
      WHERE ${where.sql}
      ORDER BY e.name, e.id
      LIMIT ? OFFSET ?`,
    [...where.params, limit, offset],
  );
  return rows as ExerciseRow[];
}

// How many exercises match: same WHERE as the list.
export async function countExercises(
  userId: number,
  filters: ExerciseFilters,
  db: Queryable = client,
): Promise<number> {
  const where = buildWhere(userId, filters);
  const [rows] = await db.query<Rows[]>(
    `SELECT COUNT(*) AS total FROM exercise e WHERE ${where.sql}`,
    where.params,
  );
  return Number(rows[0]?.total ?? 0);
}

export type ReferenceRow = { id: number; code: string; name: string };

// The 8 groups, for the filter grid.
export async function readCategories(
  db: Queryable = client,
): Promise<ReferenceRow[]> {
  const [rows] = await db.query<Rows[]>(
    "SELECT id, code, name FROM category ORDER BY name",
  );
  return rows as ReferenceRow[];
}

// The equipment list, for the filter grid.
export async function readEquipments(
  db: Queryable = client,
): Promise<ReferenceRow[]> {
  const [rows] = await db.query<Rows[]>(
    "SELECT id, code, name FROM equipment ORDER BY name",
  );
  return rows as ReferenceRow[];
}

// Among the given ids, the ones this user may put in a session: visible
// (RM-007) and not archived. Uses query because of IN (?). Empty in, empty out.
export async function readAvailableExerciseIds(
  userId: number,
  ids: number[],
  db: Queryable = client,
): Promise<number[]> {
  if (ids.length === 0) {
    return [];
  }
  const [rows] = await db.query<Rows[]>(
    `SELECT id FROM exercise
      WHERE id IN (?) AND is_archived = FALSE
        AND (owner_user_id IS NULL OR owner_user_id = ?)`,
    [ids, userId],
  );
  return rows.map((row) => Number(row.id));
}

export type ExerciseMeasureCodeRow = { exercise_id: number; code: MeasureCode };

// The measure codes of several exercises at once, to check the planned sets
// of a whole session (US-15, US-23). Uses query because of IN (?).
export async function readExerciseMeasureCodes(
  ids: number[],
  db: Queryable = client,
): Promise<ExerciseMeasureCodeRow[]> {
  if (ids.length === 0) {
    return [];
  }
  const [rows] = await db.query<Rows[]>(
    `SELECT em.exercise_id, m.code
       FROM exercise_measure em
       JOIN measure m ON m.id = em.measure_id
      WHERE em.exercise_id IN (?)
      ORDER BY em.exercise_id, m.id`,
    [ids],
  );
  return rows.map((row) => ({
    exercise_id: Number(row.exercise_id),
    code: row.code as MeasureCode,
  }));
}
