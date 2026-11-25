import * as z from "zod";
import type { MeasureCode } from "./catalog.js";
import { addYears, todayInParis } from "./dates.js";
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
  // "Pectoraux · Barre", shown under the name of the configuration screen
  meta?: string | null;
  measure_codes: MeasureCode[];
  // Body weight exercise: its load is an added weight ("lest", A7b)
  is_bodyweight?: boolean;
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
export function getBlockLabel(
  block: Pick<DraftBlock, "block_type" | "name">,
  index: number,
): string {
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
  meta?: string | null;
  measure_codes: MeasureCode[];
  is_bodyweight?: boolean;
};

// The four set layouts of US-15, decided by the measures of the exercise
// (RM-010); "none" for an exercise without any measure.
export type MeasureProfile =
  | "weighted"
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

// isBodyweight comes from the equipment of the exercise ("Poids du corps").
// Those exercises often declare the weight measure too, but their load is an
// added weight, so they follow the bodyweight layout (A7b).
export function getMeasureProfile(
  codes: MeasureCode[],
  isBodyweight = false,
): MeasureProfile {
  if (codes.some((code) => CARDIO_CODES.includes(code))) {
    return "cardio";
  }
  if (codes.includes("reps")) {
    return isBodyweight || !codes.includes("weight")
      ? "bodyweight"
      : "weighted";
  }
  if (codes.includes("duration")) {
    return "duration";
  }
  return "none";
}

// The first set of a new exercise: 10 reps, or 1 min, or a 10 min stage
// (cardio); the weight stays empty (US-15).
export function createDefaultSet(
  codes: MeasureCode[],
  isBodyweight = false,
): PlannedSetValues {
  const set = createEmptySet();
  switch (getMeasureProfile(codes, isBodyweight)) {
    case "weighted":
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

// The values of one set, in order: ["10 rép.", "40 kg"].
export function describeSet(
  set: PlannedSetValues,
  codes: MeasureCode[],
  isBodyweight = false,
): string[] {
  const parts: string[] = [];
  if (set.reps !== null) {
    parts.push(`${numberFormat.format(set.reps)} rép.`);
  }
  if (set.weight_kg !== null) {
    // A body weight exercise carries an added weight ("lest"), A7b.
    const unit =
      getMeasureProfile(codes, isBodyweight) === "bodyweight"
        ? "kg lest"
        : "kg";
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
  exercise: Pick<DraftExercise, "sets" | "measure_codes" | "is_bodyweight">,
): string {
  const count = exercise.sets.length;
  const isCardio = getMeasureProfile(exercise.measure_codes) === "cardio";
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
  const parts = allSame
    ? describeSet(first, exercise.measure_codes, exercise.is_bodyweight)
    : [];
  return [`${count} ${noun}`, ...parts].join(" · ");
}

// "4 × 8 · 60 kg", "3 × 1 min": the short line of a planned exercise, as
// the high fidelity mockups write it (03-2, CAL-04).
export function formatSetLine(
  sets: PlannedSetValues[],
  codes: MeasureCode[],
  isBodyweight = false,
): string | null {
  const first = sets[0];
  if (first === undefined) {
    return null;
  }
  const allSame = sets.every((set) => sameValues(set, first));
  const parts = describeSet(first, codes, isBodyweight);
  if (!allSame || parts.length === 0) {
    return `${sets.length} × …`;
  }
  // The repetitions join the count with a ×, the rest follows with a dot
  const [head, ...rest] = parts;
  const headValue = (head ?? "").replace(" rép.", "");
  return [`${sets.length} × ${headValue}`, ...rest].join(" · ");
}

// "1 sélectionné", "3 sélectionnés".
export function formatSelectedCount(count: number): string {
  return `${count} ${count > 1 ? "sélectionnés" : "sélectionné"}`;
}

// "10 rép. · 40 kg" for a folded set; "Aucun objectif" when every field is empty.
export function formatSetValues(
  set: PlannedSetValues,
  codes: MeasureCode[],
  isBodyweight = false,
): string {
  const parts = describeSet(set, codes, isBodyweight);
  return parts.length === 0 ? "Aucun objectif" : parts.join(" · ");
}

// --- Set fields (US-15) ------------------------------------------------------

// The value fields of a set, without the rest (which every set may have).
export type SetValueField = Exclude<
  keyof PlannedSetValues,
  "rest_after_seconds"
>;

const FIELD_BY_MEASURE: Record<MeasureCode, SetValueField> = {
  reps: "reps",
  weight: "weight_kg",
  duration: "duration_seconds",
  distance: "distance_meters",
  speed: "speed_kmh",
  resistance: "resistance",
  incline: "incline_percent",
  calories: "calories",
};

// Display order of the fields on the configuration screen (A7).
const FIELD_ORDER: SetValueField[] = [
  "reps",
  "weight_kg",
  "duration_seconds",
  "distance_meters",
  "speed_kmh",
  "incline_percent",
  "resistance",
  "calories",
];

// The fields an exercise may fill, from its measures (RM-010). A bodyweight
// exercise may also carry an added weight (the "lest"), stored as weight_kg.
// Used by the client to build the screen and by the server to refuse a value
// that does not belong to the exercise (US-23).
export function getSetFields(
  codes: MeasureCode[],
  isBodyweight = false,
): SetValueField[] {
  const fields = new Set(codes.map((code) => FIELD_BY_MEASURE[code]));
  if (getMeasureProfile(codes, isBodyweight) === "bodyweight") {
    fields.add("weight_kg");
  }
  return FIELD_ORDER.filter((field) => fields.has(field));
}

// The fields of a set that hold a value although the exercise does not
// measure them: ["duration_seconds"] for a duration on a bench press.
export function getDisallowedSetFields(
  set: PlannedSetValues,
  codes: MeasureCode[],
  isBodyweight = false,
): SetValueField[] {
  const allowed = getSetFields(codes, isBodyweight);
  return FIELD_ORDER.filter(
    (field) => set[field] !== null && !allowed.includes(field),
  );
}

export const MEASURE_LABELS: Record<MeasureCode, string> = {
  reps: "Répétitions",
  weight: "Charge",
  duration: "Durée",
  distance: "Distance",
  speed: "Vitesse",
  resistance: "Résistance",
  incline: "Inclinaison",
  calories: "Calories",
};

// "Répétitions · Charge", or "Répétitions · Lest" for a bodyweight exercise.
export function formatTrackedMeasures(
  codes: MeasureCode[],
  isBodyweight = false,
): string {
  const isBody = getMeasureProfile(codes, isBodyweight) === "bodyweight";
  const labels = codes
    // A body weight exercise shows "Lest", never "Charge" (A7b)
    .filter((code) => !(isBody && code === "weight"))
    .map((code) => MEASURE_LABELS[code]);
  if (isBody) {
    labels.push("Lest");
  }
  return labels.join(" · ");
}

// The label of a field on screen, with its unit (DT-11: km shown, meters stored).
export function getSetFieldLabel(
  field: SetValueField,
  profile: MeasureProfile,
): string {
  switch (field) {
    case "reps":
      return "Répétitions";
    case "weight_kg":
      return profile === "bodyweight" ? "Lest (kg)" : "Charge (kg)";
    case "duration_seconds":
      return "Durée (min:s)";
    case "distance_meters":
      return "Distance (km)";
    case "speed_kmh":
      return "Vitesse (km/h)";
    case "incline_percent":
      return "Inclinaison (%)";
    case "resistance":
      return "Résistance";
    case "calories":
      return "Calories";
  }
}

// "Série 1" or, for cardio, "Étape 1" (a stage is a set in the database).
export function getSetLabel(profile: MeasureProfile, index: number): string {
  return `${profile === "cardio" ? "Étape" : "Série"} ${index + 1}`;
}

// Checks one value against its limits: null when fine, the message otherwise.
export function validateSetValue(
  field: keyof PlannedSetValues,
  value: number | null,
): string | null {
  const result = plannedSetSchema.shape[field].safeParse(value);
  return result.success ? null : (result.error.issues[0]?.message ?? null);
}

// "1:30" from 90 seconds, "10:00" from 600, "1:02:05" above an hour.
export function formatMinSec(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  const minSec = `${hours > 0 ? String(minutes).padStart(2, "0") : minutes}:${String(rest).padStart(2, "0")}`;
  return hours > 0 ? `${hours}:${minSec}` : minSec;
}

// Seconds from "1:30", "01:30", "1:02:05" or a plain "90"; null when unreadable.
export function parseMinSec(text: string): number | null {
  const trimmed = text.trim();
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }
  const match = /^(?:(\d+):)?(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (match === null) {
    return null;
  }
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  if (seconds > 59 || (match[1] !== undefined && minutes > 59)) {
    return null;
  }
  return hours * 3600 + minutes * 60 + seconds;
}

// --- Saving a free session (US-23) --------------------------------------------

// How far a free session may be planned: a past date is a session declared
// after the fact (up to one year back), a future one up to two years ahead.
export const MAX_PAST_YEARS = 1;
export const MAX_FUTURE_YEARS = 2;

export function isPlannedDateInRange(date: string, today: string): boolean {
  return (
    date >= addYears(today, -MAX_PAST_YEARS) &&
    date <= addYears(today, MAX_FUTURE_YEARS)
  );
}

// What POST /api/appointments receives: the draft, with the date within its
// range. "Today" is computed in Paris when the request is checked (rule 7).
export const freeSessionSchema = sessionDraftSchema.extend({
  planned_date: dateSchema
    .refine((date) => date >= addYears(todayInParis(), -MAX_PAST_YEARS), {
      error: "La date ne peut pas remonter à plus d'un an.",
    })
    .refine((date) => date <= addYears(todayInParis(), MAX_FUTURE_YEARS), {
      error: "La date ne peut pas dépasser deux ans.",
    }),
});

export type FreeSessionInput = z.output<typeof freeSessionSchema>;

// The answer of a successful save.
export type FreeSessionCreated = { appointment_id: number };
