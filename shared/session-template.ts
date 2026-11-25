import * as z from "zod";
import type { MeasureCode } from "./catalog.js";
import { REQUIRED_MESSAGE } from "./user.js";
import { dateSchema, timeSchema } from "./validation.js";

// A session draft is what the editor builds before saving (US-12 to US-15):
// a name, a date, blocks, exercises and their planned sets. Everything the
// server needs is validated by sessionDraftSchema; the client adds a few
// display fields (key, name, measure_codes) that the schema leaves out.

// --- Block types ------------------------------------------------------------

export const BLOCK_TYPE_CODES = [
  "classic",
  "circuit",
  "amrap",
  "for_time",
  "warm_up",
  "stretching",
  "challenge",
  "note",
] as const;

export type BlockType = (typeof BLOCK_TYPE_CODES)[number];

// The MVP types (RM-019). Circuit, AMRAP and For Time arrive with US-43.
export const AVAILABLE_BLOCK_TYPES = [
  "classic",
  "warm_up",
  "stretching",
  "challenge",
  "note",
] as const satisfies readonly BlockType[];

export type BlockTypeInfo = {
  code: BlockType;
  label: string;
  description: string;
  // False for the timed blocks until US-43: shown as "Bientôt".
  isAvailable: boolean;
};

// The 8 types, in the order of the "Type de bloc" panel (A3).
export const BLOCK_TYPES: BlockTypeInfo[] = [
  {
    code: "classic",
    label: "Classique",
    description: "Exercices et séries, avec objectifs et repos",
    isAvailable: true,
  },
  {
    code: "circuit",
    label: "Circuit",
    description: "Exercices enchaînés, nombre de tours",
    isAvailable: false,
  },
  {
    code: "amrap",
    label: "AMRAP",
    description: "Maximum de tours dans une durée fixe",
    isAvailable: false,
  },
  {
    code: "for_time",
    label: "For Time",
    description: "Travail fixe, le plus vite possible",
    isAvailable: false,
  },
  {
    code: "warm_up",
    label: "Échauffement",
    description: "Mise en route",
    isAvailable: true,
  },
  {
    code: "stretching",
    label: "Étirements",
    description: "Retour au calme",
    isAvailable: true,
  },
  {
    code: "challenge",
    label: "Défi",
    description: "Objectif ponctuel",
    isAvailable: true,
  },
  {
    code: "note",
    label: "Note",
    description: "Texte libre",
    isAvailable: true,
  },
];

export const BLOCK_TYPE_LABELS = Object.fromEntries(
  BLOCK_TYPES.map((info) => [info.code, info.label]),
) as Record<BlockType, string>;

// --- Limits (US-13, US-14, US-15) ------------------------------------------

export const MAX_BLOCKS = 20;
export const MAX_EXERCISES_PER_BLOCK = 30;
export const MAX_SETS_PER_EXERCISE = 20;
export const DEFAULT_REST_SECONDS = 90;

export type SetLimit = { min: number; max: number; step?: number };

// Stored units (DT-11): kg, meters, seconds, km/h.
export const SET_LIMITS: Record<keyof PlannedSetValues, SetLimit> = {
  reps: { min: 0, max: 1000, step: 1 },
  weight_kg: { min: 0, max: 1000, step: 0.25 },
  duration_seconds: { min: 0, max: 24 * 60 * 60, step: 1 },
  distance_meters: { min: 0, max: 1_000_000 },
  speed_kmh: { min: 0, max: 60 },
  resistance: { min: 0, max: 100 },
  incline_percent: { min: 0, max: 40 },
  calories: { min: 0, max: 10_000 },
  rest_after_seconds: { min: 0, max: 10 * 60, step: 1 },
};

// "Entre un nombre entre 0 et 1 000." (French thousands separator).
export function formatRangeMessage(limit: SetLimit): string {
  const format = new Intl.NumberFormat("fr-FR");
  return `Entre un nombre entre ${format.format(limit.min)} et ${format.format(limit.max)}.`;
}

// A planned value: a number within its limits, or null (no objective, RM-022).
function boundedValue(limit: SetLimit) {
  const message = formatRangeMessage(limit);
  let schema = z
    .number({ error: message })
    .min(limit.min, { error: message })
    .max(limit.max, { error: message });
  if (limit.step !== undefined) {
    const step = limit.step;
    schema = schema.refine(
      (value) => Number.isInteger(Math.round((value / step) * 1e6) / 1e6),
      {
        error:
          step === 1
            ? "Entre un nombre entier."
            : `Entre une valeur par pas de ${step.toLocaleString("fr-FR")}.`,
      },
    );
  }
  return schema.nullable();
}

// --- Types ------------------------------------------------------------------

export type PlannedSetValues = {
  reps: number | null;
  weight_kg: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  speed_kmh: number | null;
  resistance: number | null;
  incline_percent: number | null;
  calories: number | null;
  rest_after_seconds: number | null;
};

export type DraftExercise = {
  // Local key for the lists of the editor; never sent to the server
  key: string;
  exercise_id: number;
  // Display fields, known from the catalog
  name: string;
  measure_codes: MeasureCode[];
  default_rest_seconds: number | null;
  sets: PlannedSetValues[];
};

export type DraftBlock = {
  key: string;
  block_type: BlockType;
  name: string | null;
  instructions: string | null;
  exercises: DraftExercise[];
};

export type SessionDraft = {
  name: string;
  planned_date: string;
  planned_time: string | null;
  blocks: DraftBlock[];
};

// --- Schema -----------------------------------------------------------------

export const plannedSetSchema = z.object({
  reps: boundedValue(SET_LIMITS.reps),
  weight_kg: boundedValue(SET_LIMITS.weight_kg),
  duration_seconds: boundedValue(SET_LIMITS.duration_seconds),
  distance_meters: boundedValue(SET_LIMITS.distance_meters),
  speed_kmh: boundedValue(SET_LIMITS.speed_kmh),
  resistance: boundedValue(SET_LIMITS.resistance),
  incline_percent: boundedValue(SET_LIMITS.incline_percent),
  calories: boundedValue(SET_LIMITS.calories),
  rest_after_seconds: boundedValue(SET_LIMITS.rest_after_seconds),
});

export const draftExerciseSchema = z.object({
  exercise_id: z.number().int().positive({ error: "Exercice invalide." }),
  default_rest_seconds: boundedValue(SET_LIMITS.rest_after_seconds),
  sets: z
    .array(plannedSetSchema)
    .min(1, { error: "Au moins une série." })
    .max(MAX_SETS_PER_EXERCISE, {
      error: `${MAX_SETS_PER_EXERCISE} séries au maximum.`,
    }),
});

export const draftBlockSchema = z
  .object({
    block_type: z.enum(AVAILABLE_BLOCK_TYPES, {
      error: "Ce type de bloc n'est pas encore disponible.",
    }),
    name: z
      .string()
      .max(160, { error: "160 caractères au maximum." })
      .nullable(),
    instructions: z
      .string()
      .max(2000, { error: "2 000 caractères au maximum." })
      .nullable(),
    exercises: z.array(draftExerciseSchema).max(MAX_EXERCISES_PER_BLOCK, {
      error: `${MAX_EXERCISES_PER_BLOCK} exercices au maximum par bloc.`,
    }),
  })
  // A Note block holds free text and no exercise (RM-020).
  .refine(
    (block) => block.block_type !== "note" || block.exercises.length === 0,
    { error: "Un bloc Note ne contient pas d'exercice.", path: ["exercises"] },
  );

export const sessionDraftSchema = z.object({
  name: z
    .string({ error: REQUIRED_MESSAGE })
    .min(1, { error: REQUIRED_MESSAGE })
    .pipe(z.string().max(160, { error: "160 caractères au maximum." })),
  planned_date: dateSchema,
  planned_time: timeSchema.nullable(),
  blocks: z
    .array(draftBlockSchema)
    .max(MAX_BLOCKS, { error: `${MAX_BLOCKS} blocs au maximum.` }),
});

// What the server receives once cleaned (the local keys are gone).
export type SessionDraftInput = z.output<typeof sessionDraftSchema>;

// --- Helpers ----------------------------------------------------------------

export function createEmptySet(): PlannedSetValues {
  return {
    reps: null,
    weight_kg: null,
    duration_seconds: null,
    distance_meters: null,
    speed_kmh: null,
    resistance: null,
    incline_percent: null,
    calories: null,
    rest_after_seconds: null,
  };
}

export function createEmptyDraft(plannedDate: string): SessionDraft {
  return {
    name: "",
    planned_date: plannedDate,
    planned_time: null,
    blocks: [],
  };
}

export function countDraftExercises(draft: SessionDraft): number {
  return draft.blocks.reduce(
    (total, block) => total + block.exercises.length,
    0,
  );
}

// "Classique · Force", or "Classique · Bloc 1" without a title (US-13).
export function getBlockLabel(block: DraftBlock, index: number): string {
  const title =
    block.name !== null && block.name.trim() !== ""
      ? block.name.trim()
      : `Bloc ${index + 1}`;
  return `${BLOCK_TYPE_LABELS[block.block_type]} · ${title}`;
}

// "0 bloc", "1 bloc", "2 blocs".
export function formatBlockCount(count: number): string {
  return `${count} ${count > 1 ? "blocs" : "bloc"}`;
}

// "0 exercice", "1 exercice", "6 exercices".
export function formatExerciseCountShort(count: number): string {
  return `${count} ${count > 1 ? "exercices" : "exercice"}`;
}

// --- Exercises of a block (US-14, US-15) ------------------------------------

// What the catalog hands to the editor for each chosen exercise.
export type SelectedExercise = {
  exercise_id: number;
  name: string;
  measure_codes: MeasureCode[];
};

// The four set layouts of US-15, decided by the measures of the exercise.
export type ExerciseProfile =
  | "reps_weight"
  | "bodyweight"
  | "duration"
  | "cardio"
  | "none";

const CARDIO_CODES: MeasureCode[] = [
  "distance",
  "speed",
  "resistance",
  "incline",
  "calories",
];

export function getExerciseProfile(codes: MeasureCode[]): ExerciseProfile {
  if (codes.some((code) => CARDIO_CODES.includes(code))) {
    return "cardio";
  }
  if (codes.includes("reps")) {
    return codes.includes("weight") ? "reps_weight" : "bodyweight";
  }
  if (codes.includes("duration")) {
    return "duration";
  }
  return "none";
}

// The first set of a new exercise: 10 reps, or 1 min, or a 10 min stage
// (cardio); the weight stays empty (US-15).
export function createDefaultSet(codes: MeasureCode[]): PlannedSetValues {
  const set = createEmptySet();
  switch (getExerciseProfile(codes)) {
    case "reps_weight":
    case "bodyweight":
      return { ...set, reps: 10 };
    case "duration":
      return { ...set, duration_seconds: 60 };
    case "cardio":
      return { ...set, duration_seconds: 600 };
    default:
      return set;
  }
}

// "1 min 30", "45 s", "2 min", "1 h 05".
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  if (hours > 0) {
    return `${hours} h ${String(minutes).padStart(2, "0")}`;
  }
  if (minutes === 0) {
    return `${rest} s`;
  }
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest}`;
}

const numberFormat = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 2,
});

function describeSet(set: PlannedSetValues, codes: MeasureCode[]): string[] {
  const parts: string[] = [];
  if (set.reps !== null) {
    parts.push(`${numberFormat.format(set.reps)} rép.`);
  }
  if (set.weight_kg !== null) {
    // Without a "weight" measure, the load is an added weight (bodyweight).
    const unit = codes.includes("weight") ? "kg" : "kg lest";
    parts.push(`${numberFormat.format(set.weight_kg)} ${unit}`);
  }
  if (set.duration_seconds !== null) {
    parts.push(formatDuration(set.duration_seconds));
  }
  if (set.distance_meters !== null) {
    parts.push(`${numberFormat.format(set.distance_meters / 1000)} km`);
  }
  if (set.speed_kmh !== null) {
    parts.push(`${numberFormat.format(set.speed_kmh)} km/h`);
  }
  if (set.incline_percent !== null) {
    parts.push(`${numberFormat.format(set.incline_percent)} %`);
  }
  if (set.resistance !== null) {
    parts.push(`résistance ${numberFormat.format(set.resistance)}`);
  }
  if (set.calories !== null) {
    parts.push(`${numberFormat.format(set.calories)} kcal`);
  }
  return parts;
}

function sameValues(a: PlannedSetValues, b: PlannedSetValues): boolean {
  return (Object.keys(a) as (keyof PlannedSetValues)[]).every(
    (key) => a[key] === b[key],
  );
}

// "1 série · 10 rép. · 40 kg", "3 séries · 8 rép.", "1 étape · 10 min",
// "3 étapes". The values are shown only when every set has the same ones.
export function formatSetSummary(
  exercise: Pick<DraftExercise, "sets" | "measure_codes">,
): string {
  const count = exercise.sets.length;
  const isCardio = getExerciseProfile(exercise.measure_codes) === "cardio";
  let noun: string;
  if (isCardio) {
    noun = count > 1 ? "étapes" : "étape";
  } else {
    noun = count > 1 ? "séries" : "série";
  }
  const first = exercise.sets[0];
  if (first === undefined) {
    return `0 ${noun}`;
  }
  const allSame = exercise.sets.every((set) => sameValues(set, first));
  const parts = allSame ? describeSet(first, exercise.measure_codes) : [];
  return [`${count} ${noun}`, ...parts].join(" · ");
}

// "1 sélectionné", "3 sélectionnés".
export function formatSelectedCount(count: number): string {
  return `${count} ${count > 1 ? "sélectionnés" : "sélectionné"}`;
}
