import type { RequestHandler } from "express";
import {
  EXERCISE_PAGE_SIZE,
  type ExerciseListItem,
  type ExerciseListResponse,
  type ExerciseQuery,
} from "shared";
import { readUserId } from "../../utils/requestUser.js";
import {
  countExercises,
  type ExerciseRow,
  readExercises,
} from "./exerciseRepository.js";

function toListItem(row: ExerciseRow): ExerciseListItem {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    difficulty: row.difficulty,
    category_name: row.category_name,
    equipment_names: row.equipment_names,
    image_female_url: row.image_female_url,
    image_male_url: row.image_male_url,
    is_personal: row.is_personal === 1,
  };
}

// GET /api/exercises?offset=: one page of 20 exercises, with the total and
// the offset of the next page (null when this one was the last).
export const browse: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { offset = 0 } = req.query as unknown as ExerciseQuery;

  const rows = await readExercises(userId, EXERCISE_PAGE_SIZE, offset);
  const total = await countExercises(userId);

  const nextOffset = offset + EXERCISE_PAGE_SIZE;
  const response: ExerciseListResponse = {
    items: rows.map(toListItem),
    total,
    next_offset: nextOffset < total ? nextOffset : null,
  };
  res.json(response);
};
