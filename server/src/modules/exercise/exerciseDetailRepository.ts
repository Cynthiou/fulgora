import type { Difficulty, MeasureCode, MuscleRole } from "shared";
import client, { type Queryable, type Rows } from "../../database/client.js";

// The detail of one exercise (US-09): one function, one query, and the
// action calls them one after the other.

export type ExerciseDetailRow = {
  id: number;
  slug: string;
  name: string;
  difficulty: Difficulty;
  image_female_url: string | null;
  image_male_url: string | null;
  muscle_map_female_url: string | null;
  muscle_map_male_url: string | null;
  // 0 or 1 in MySQL
  is_personal: number;
};

// The exercise itself, with the same visibility as the list (RM-007):
// the shared catalog or the user's own, never archived. Null otherwise.
export async function readExercise(
  id: number,
  userId: number,
  db: Queryable = client,
): Promise<ExerciseDetailRow | null> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT e.id, e.slug, e.name, e.difficulty, e.image_female_url, e.image_male_url,
            e.muscle_map_female_url, e.muscle_map_male_url,
            (e.owner_user_id IS NOT NULL) AS is_personal
       FROM exercise e
      WHERE e.id = ?
        AND (e.owner_user_id IS NULL OR e.owner_user_id = ?)
        AND e.is_archived = FALSE`,
    [id, userId],
  );
  return (rows[0] as ExerciseDetailRow | undefined) ?? null;
}

export async function readExerciseCategories(
  exerciseId: number,
  db: Queryable = client,
): Promise<string[]> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT c.name
       FROM exercise_category ec
       JOIN category c ON c.id = ec.category_id
      WHERE ec.exercise_id = ?
      ORDER BY c.id`,
    [exerciseId],
  );
  return rows.map((row) => String(row.name));
}

export async function readExerciseEquipments(
  exerciseId: number,
  db: Queryable = client,
): Promise<string[]> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT eq.name
       FROM exercise_equipment ee
       JOIN equipment eq ON eq.id = ee.equipment_id
      WHERE ee.exercise_id = ?
      ORDER BY eq.name`,
    [exerciseId],
  );
  return rows.map((row) => String(row.name));
}

export type ExerciseMuscleRow = { name: string; role: MuscleRole };

// Primary muscles first, then secondary ones (RM-009).
export async function readExerciseMuscles(
  exerciseId: number,
  db: Queryable = client,
): Promise<ExerciseMuscleRow[]> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT m.name, em.role
       FROM exercise_muscle em
       JOIN muscle m ON m.id = em.muscle_id
      WHERE em.exercise_id = ?
      ORDER BY (em.role = 'primary') DESC, m.name`,
    [exerciseId],
  );
  return rows as ExerciseMuscleRow[];
}

export type ExerciseMeasureRow = { code: MeasureCode; label: string };

// Only the measures planned for this exercise (RM-010).
export async function readExerciseMeasures(
  exerciseId: number,
  db: Queryable = client,
): Promise<ExerciseMeasureRow[]> {
  const [rows] = await db.execute<Rows[]>(
    `SELECT m.code, m.label
       FROM exercise_measure em
       JOIN measure m ON m.id = em.measure_id
      WHERE em.exercise_id = ?
      ORDER BY m.id`,
    [exerciseId],
  );
  return rows as ExerciseMeasureRow[];
}

export type ExerciseTextRow = {
  type: "instruction" | "mistake" | "alternative";
  position: number;
  content: string;
};

// Instructions, mistakes and alternatives, in reading order.
export async function readExerciseTexts(
  exerciseId: number,
  db: Queryable = client,
): Promise<ExerciseTextRow[]> {
  const [rows] = await db.execute<Rows[]>(
    "SELECT `type`, position, content FROM exercise_text WHERE exercise_id = ? ORDER BY `type`, position",
    [exerciseId],
  );
  return rows as ExerciseTextRow[];
}
