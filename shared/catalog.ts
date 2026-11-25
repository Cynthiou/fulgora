import * as z from "zod";
import type { Sex } from "./user.js";

// Catalog types: they follow the database (snake_case) and catalog.json.

export type Difficulty = "beginner" | "intermediate" | "advanced";

export type MeasureCode =
  | "reps"
  | "weight"
  | "duration"
  | "distance"
  | "speed"
  | "resistance"
  | "incline"
  | "calories";

export type MuscleRole = "primary" | "secondary";

export type ExerciseTextType = "instruction" | "mistake" | "alternative";

// A row of a reference list: category, muscle or equipment.
export type ReferenceItem = {
  id: number;
  code: string;
  name: string;
};

export type Measure = {
  id: number;
  code: MeasureCode;
  label: string;
  unit: string | null;
};

// The shape of server/database/seed/catalog.json, read by bin/seed.ts.
export type CatalogFile = {
  difficulties: { id: number; code: Difficulty; name: string }[];
  categories: ReferenceItem[];
  muscles: ReferenceItem[];
  equipment: ReferenceItem[];
  measures: {
    id: number;
    code: MeasureCode;
    name: string;
    unit: string | null;
  }[];
  exercises: CatalogExercise[];
};

export type CatalogExercise = {
  id: number;
  slug: string;
  name: string;
  category_id: number;
  difficulty_id: number;
  equipment_ids: number[];
  muscles: { muscle_id: number; role: MuscleRole }[];
  measure_profile: string;
  measure_ids: number[];
  instructions: string[];
  mistakes: string[];
  alternatives: string[];
  image_male_url: string | null;
  image_female_url: string | null;
  muscle_map_male_url: string | null;
  muscle_map_female_url: string | null;
};

// --- Catalog list (US-07) -------------------------------------------------

// 20 exercises per page; the server fixes it, the client never sends it.
export const EXERCISE_PAGE_SIZE = 20;

// GET /api/exercises?offset=40 (the offset arrives as text in the address).
export const exerciseQuerySchema = z.object({
  offset: z
    .string()
    .regex(/^\d+$/, { error: "Décalage invalide." })
    .transform(Number)
    .optional(),
});

export type ExerciseQuery = z.output<typeof exerciseQuerySchema>;

// One card of the catalog list.
export type ExerciseListItem = {
  id: number;
  slug: string;
  name: string;
  difficulty: Difficulty;
  // The first group of the exercise ("Jambes"), null when it has none
  category_name: string | null;
  // "Barre · Haltères", null when the exercise needs nothing
  equipment_names: string | null;
  image_female_url: string | null;
  image_male_url: string | null;
  is_personal: boolean;
};

export type ExerciseListResponse = {
  items: ExerciseListItem[];
  total: number;
  // The offset of the next page, null after the last one
  next_offset: number | null;
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: "Débutant",
  intermediate: "Intermédiaire",
  advanced: "Avancé",
};

// "Jambes · Intermédiaire"; just the difficulty when the group is unknown.
export function formatExerciseMeta(
  categoryName: string | null,
  difficulty: Difficulty,
): string {
  const label = DIFFICULTY_LABELS[difficulty];
  return categoryName === null ? label : `${categoryName} · ${label}`;
}

// "151 exercices", "1 exercice".
export function formatExerciseCount(total: number): string {
  return `${total} ${total === 1 ? "exercice" : "exercices"}`;
}

// The illustration to show (RM-014): the one of the profile's choice, the
// other one when it is missing, null when there is none at all. Without a
// choice yet, the female illustration comes first (the default of PRF-05).
export function getExerciseImage(
  exercise: Pick<ExerciseListItem, "image_female_url" | "image_male_url">,
  sex: Sex | null,
): string | null {
  const preferred =
    sex === "male" ? exercise.image_male_url : exercise.image_female_url;
  const other =
    sex === "male" ? exercise.image_female_url : exercise.image_male_url;
  return preferred ?? other ?? null;
}
