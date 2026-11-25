import type { RequestHandler } from "express";
import type { ExerciseDetail } from "shared";
import { HttpError } from "../../utils/httpError.js";
import { readUserId } from "../../utils/requestUser.js";
import {
  readExercise,
  readExerciseCategories,
  readExerciseEquipments,
  readExerciseMeasures,
  readExerciseMuscles,
  readExerciseTexts,
} from "./exerciseDetailRepository.js";

// GET /api/exercises/:id: the whole detail, built from six queries.
// An exercise the user may not see (another user's, archived) is "not found":
// the answer never tells whether it exists (DT-06).
export const read: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { id } = req.params as unknown as { id: number };

  const exercise = await readExercise(id, userId);
  if (exercise === null) {
    throw new HttpError(404, "NOT_FOUND", "Exercice introuvable.");
  }

  const categories = await readExerciseCategories(id);
  const equipments = await readExerciseEquipments(id);
  const muscles = await readExerciseMuscles(id);
  const measures = await readExerciseMeasures(id);
  const texts = await readExerciseTexts(id);

  const detail: ExerciseDetail = {
    id: exercise.id,
    slug: exercise.slug,
    name: exercise.name,
    difficulty: exercise.difficulty,
    is_personal: exercise.is_personal === 1,
    is_bodyweight: exercise.is_bodyweight === 1,
    image_female_url: exercise.image_female_url,
    image_male_url: exercise.image_male_url,
    muscle_map_female_url: exercise.muscle_map_female_url,
    muscle_map_male_url: exercise.muscle_map_male_url,
    categories,
    equipments,
    muscles,
    measures,
    instructions: texts
      .filter((text) => text.type === "instruction")
      .map((text) => text.content),
    mistakes: texts
      .filter((text) => text.type === "mistake")
      .map((text) => text.content),
    alternatives: texts
      .filter((text) => text.type === "alternative")
      .map((text) => text.content),
  };
  res.json(detail);
};
