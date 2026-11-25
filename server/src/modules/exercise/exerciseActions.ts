import type { RequestHandler } from "express";
import {
  EXERCISE_PAGE_SIZE,
  type ExerciseListItem,
  type ExerciseListResponse,
  type ExerciseQuery,
  type MeasureCode,
} from "shared";
import { readUserId } from "../../utils/requestUser.js";
import {
  countExercises,
  type ExerciseRow,
  readCategories,
  readEquipments,
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
    measure_codes:
      row.measure_codes === null
        ? []
        : (row.measure_codes.split(",") as MeasureCode[]),
  };
}

// GET /api/exercises?offset=&search=&category_ids=&equipment_ids=&difficulties=
// One page of 20 exercises matching the filters, with the total and the
// offset of the next page (null when this one was the last).
export const browse: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { offset = 0, ...filters } = req.query as unknown as ExerciseQuery;

  const rows = await readExercises(userId, filters, EXERCISE_PAGE_SIZE, offset);
  const total = await countExercises(userId, filters);

  const nextOffset = offset + EXERCISE_PAGE_SIZE;
  const response: ExerciseListResponse = {
    items: rows.map(toListItem),
    total,
    next_offset: nextOffset < total ? nextOffset : null,
  };
  res.json(response);
};

// GET /api/categories: the 8 groups.
export const browseCategories: RequestHandler = async (_req, res) => {
  res.json(await readCategories());
};

// GET /api/equipments: the equipment list.
export const browseEquipments: RequestHandler = async (_req, res) => {
  res.json(await readEquipments());
};
