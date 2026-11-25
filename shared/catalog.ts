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

export const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;

// "2,5" in the address -> [2, 5]. Ten choices at most per filter.
const idListSchema = z
  .string()
  .regex(/^[1-9]\d*(,[1-9]\d*)*$/, { error: "Filtre invalide." })
  .transform((text) => text.split(",").map(Number))
  .pipe(
    z
      .array(z.number().int().positive())
      .max(10, { error: "10 choix au maximum." }),
  );

// "beginner,advanced" in the address -> ["beginner", "advanced"].
const difficultyListSchema = z
  .string()
  .regex(/^[a-z_]+(,[a-z_]+)*$/, { error: "Difficulté inconnue." })
  .transform((text) => text.split(","))
  .pipe(
    z.array(z.enum(DIFFICULTIES, { error: "Difficulté inconnue." })).max(3),
  );

// GET /api/exercises?offset=40&search=squat&category_ids=5&equipment_ids=3,4&difficulties=beginner
// Everything arrives as text in the address. The filters combine with AND;
// the choices inside one filter are an OR (US-08).
export const exerciseQuerySchema = z.object({
  offset: z
    .string()
    .regex(/^\d+$/, { error: "Décalage invalide." })
    .transform(Number)
    .optional(),
  search: z.string().max(60, { error: "60 caractères au maximum." }).optional(),
  category_ids: idListSchema.optional(),
  equipment_ids: idListSchema.optional(),
  difficulties: difficultyListSchema.optional(),
});

export type ExerciseQuery = z.output<typeof exerciseQuerySchema>;
// The filters alone, without the page offset.
export type ExerciseFilters = Omit<ExerciseQuery, "offset">;

// In a LIKE, "%" and "_" are wildcards and "\" the escape character: a typed
// "50%" must be searched as is. The server wraps the result with "%".
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (character) => `\\${character}`);
}

// "3 résultats pour « squat » · Jambes", "18 résultats", "1 résultat".
export function formatResultCount(
  total: number,
  search: string,
  filterLabels: string[],
): string {
  const results = `${total} ${total === 1 ? "résultat" : "résultats"}`;
  const forSearch = search === "" ? "" : ` pour « ${search} »`;
  const labels =
    filterLabels.length === 0 ? "" : ` · ${filterLabels.join(" · ")}`;
  return `${results}${forSearch}${labels}`;
}

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

// --- Exercise detail (US-09) ----------------------------------------------

export type ExerciseMuscle = { name: string; role: MuscleRole };
export type ExerciseMeasure = { code: MeasureCode; label: string };

// The whole detail page of an exercise.
export type ExerciseDetail = {
  id: number;
  slug: string;
  name: string;
  difficulty: Difficulty;
  is_personal: boolean;
  image_female_url: string | null;
  image_male_url: string | null;
  muscle_map_female_url: string | null;
  muscle_map_male_url: string | null;
  categories: string[];
  equipments: string[];
  // Primary muscles first (RM-009)
  muscles: ExerciseMuscle[];
  // Only the measures planned for this exercise (RM-010)
  measures: ExerciseMeasure[];
  instructions: string[];
  mistakes: string[];
  alternatives: string[];
};

// "Principal" / "Principaux", "Secondaire" / "Secondaires" (RM-009).
export function formatMuscleRoleLabel(role: MuscleRole, count: number): string {
  if (role === "primary") {
    return count > 1 ? "Principaux" : "Principal";
  }
  return count > 1 ? "Secondaires" : "Secondaire";
}

// The muscle map to show: same rule as the illustration (RM-004, RM-014).
// Null when none is drawn yet (D-14): the muscles are then written only.
export function getExerciseMuscleMap(
  exercise: Pick<
    ExerciseDetail,
    "muscle_map_female_url" | "muscle_map_male_url"
  >,
  sex: Sex | null,
): string | null {
  const preferred =
    sex === "male"
      ? exercise.muscle_map_male_url
      : exercise.muscle_map_female_url;
  const other =
    sex === "male"
      ? exercise.muscle_map_female_url
      : exercise.muscle_map_male_url;
  return preferred ?? other ?? null;
}
