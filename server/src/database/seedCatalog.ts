// Fills the catalog tables (categories, muscles, equipment, measures,
// exercises and their texts) from database/seed/catalog.json.
// Used by bin/seed.ts and by the tests.
import fs from "node:fs";
import path from "node:path";
import type { Connection, RowDataPacket } from "mysql2/promise";
import type { CatalogFile } from "shared";

export const CATALOG_PATH = path.join(
  import.meta.dirname,
  "../../database/seed/catalog.json",
);

export function readCatalogFile(filePath = CATALOG_PATH): CatalogFile {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as CatalogFile;
}

// Inserts the whole catalog in one transaction. Returns the number of
// exercises inserted: 0 when the catalog is already there (never twice).
export async function seedCatalog(
  connection: Connection,
  catalog: CatalogFile,
  log: (message: string) => void = console.info,
): Promise<number> {
  // Difficulty is an ENUM in the database: we store its code, not its id.
  const difficultyCodes = new Map(
    catalog.difficulties.map((d) => [d.id, d.code]),
  );

  // Safety: never insert the shared catalog twice. Personal exercises
  // (owner_user_id filled) do not count: they are not the catalog.
  const [rows] = await connection.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS exerciseCount FROM exercise WHERE owner_user_id IS NULL",
  );
  if (Number(rows[0]?.exerciseCount) > 0) {
    log("The catalog is already in the database: nothing was inserted.");
    return 0;
  }

  // All or nothing: if one insert fails, nothing is kept.
  await connection.beginTransaction();
  try {
    // 1. Reference lists
    for (const category of catalog.categories) {
      await connection.query(
        "INSERT INTO category (id, code, name) VALUES (?, ?, ?)",
        [category.id, category.code, category.name],
      );
    }
    for (const muscle of catalog.muscles) {
      await connection.query(
        "INSERT INTO muscle (id, code, name) VALUES (?, ?, ?)",
        [muscle.id, muscle.code, muscle.name],
      );
    }
    for (const item of catalog.equipment) {
      await connection.query(
        "INSERT INTO equipment (id, code, name) VALUES (?, ?, ?)",
        [item.id, item.code, item.name],
      );
    }
    for (const measure of catalog.measures) {
      await connection.query(
        "INSERT INTO measure (id, code, label, unit) VALUES (?, ?, ?, ?)",
        [measure.id, measure.code, measure.name, measure.unit],
      );
    }

    // 2. Exercises and everything attached to them
    for (const exercise of catalog.exercises) {
      await connection.query(
        `INSERT INTO exercise
          (id, slug, name, difficulty, image_male_url, image_female_url,
           muscle_map_male_url, muscle_map_female_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          exercise.id,
          exercise.slug,
          exercise.name,
          difficultyCodes.get(exercise.difficulty_id),
          exercise.image_male_url,
          exercise.image_female_url,
          exercise.muscle_map_male_url,
          exercise.muscle_map_female_url,
        ],
      );

      await connection.query(
        "INSERT INTO exercise_category (exercise_id, category_id) VALUES (?, ?)",
        [exercise.id, exercise.category_id],
      );

      for (const equipmentId of exercise.equipment_ids) {
        await connection.query(
          "INSERT INTO exercise_equipment (exercise_id, equipment_id) VALUES (?, ?)",
          [exercise.id, equipmentId],
        );
      }

      for (const muscle of exercise.muscles) {
        await connection.query(
          "INSERT INTO exercise_muscle (exercise_id, muscle_id, role) VALUES (?, ?, ?)",
          [exercise.id, muscle.muscle_id, muscle.role],
        );
      }

      for (const measureId of exercise.measure_ids) {
        await connection.query(
          "INSERT INTO exercise_measure (exercise_id, measure_id) VALUES (?, ?)",
          [exercise.id, measureId],
        );
      }

      // Texts: the position starts at 1 and follows the order of the list.
      const texts = [
        { type: "instruction", lines: exercise.instructions },
        { type: "mistake", lines: exercise.mistakes },
        { type: "alternative", lines: exercise.alternatives },
      ];
      for (const { type, lines } of texts) {
        for (const [index, content] of lines.entries()) {
          await connection.query(
            "INSERT INTO exercise_text (exercise_id, type, position, content) VALUES (?, ?, ?, ?)",
            [exercise.id, type, index + 1, content],
          );
        }
      }
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }

  log(`Seed done: ${catalog.exercises.length} exercises inserted`);
  return catalog.exercises.length;
}
