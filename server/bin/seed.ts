// Fills the catalog tables with database/seed/catalog.json.
// Run "npm run db:migrate" first: the tables must be empty.
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import mysql, { type RowDataPacket } from "mysql2/promise";
import type { CatalogFile } from "shared";

const catalogPath = path.join(
  import.meta.dirname,
  "../database/seed/catalog.json",
);

async function seed() {
  const catalog: CatalogFile = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  // Difficulty is an ENUM in the database: we store its code, not its id.
  const difficultyCodes = new Map(
    catalog.difficulties.map((d) => [d.id, d.code]),
  );

  try {
    // Safety: never insert the catalog twice.
    const [rows] = await connection.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS exerciseCount FROM exercise",
    );
    if (Number(rows[0].exerciseCount) > 0) {
      console.warn(
        "The catalog is already in the database: nothing was inserted.",
      );
      return;
    }

    // All or nothing: if one insert fails, nothing is kept.
    await connection.beginTransaction();

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
    console.info(`Seed done: ${catalog.exercises.length} exercises inserted`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

seed().catch((error) => {
  console.error("Seed failed:", error.message);
  process.exitCode = 1;
});
