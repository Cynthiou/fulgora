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
